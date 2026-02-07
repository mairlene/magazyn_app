const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require('../middleware/auth');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// PUT /api/products/:id
// Require auth for edits so we can trust req.user.id when logging stock changes
router.put("/:id", authMiddleware, async (req, res) => {
  const productId = Number(req.params.id);
  const {
    name,
    size,
    type,
    imageUrl,
    imageThumb,
    warehouseId,
    warehouseName,
    quantity,
    userId,
    typeId,
    fromWarehouseId,
    fromWarehouseName,
    confirmMerge, // optional boolean
    createWarehouses // optional flag: allow creating warehouses when name provided
  } = req.body;

  // incoming request received for edit

  // Request payload (edit parameters)
  // WALIDACJA: product fields can be updated independently. Stock/warehouse
  // logic runs only when a target 'warehouse' is provided in the request.

  try {
    // load current product
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

    // Determine the identity we want to end up with
    const finalName = (name !== undefined && name !== null) ? String(name).trim() : (existingProduct.name || '');
    const finalSize = (size !== undefined && size !== null) ? String(size).trim() : (existingProduct.size || '');

    // Support both type (string) and typeId (numeric). If client provides typeId,
    // resolve the Type.name and persist both typeId and type for consistency.
    const incomingTypeId = (typeId !== undefined && typeId !== null && String(typeId).trim() !== '') ? Number(typeId) : null;
    const incomingTypeStr = (type !== undefined && type !== null) ? String(type).trim() : null;

    let finalTypeId = incomingTypeId ?? existingProduct.typeId ?? null;
    let finalTypeName = '';
    if (finalTypeId) {
      const typeRec = await prisma.type.findUnique({ where: { id: Number(finalTypeId) } });
      finalTypeName = typeRec ? typeRec.name : (incomingTypeStr || existingProduct.type || '');
    } else {
      finalTypeName = incomingTypeStr !== null ? incomingTypeStr : (existingProduct.type || '');
    }

    // Check uniqueness: any other product (excluding current id) with same name-size-type (case-insensitive)?
    // Check uniqueness against either typeId (if present) or type string
    const conflictWhere = {
      name: { equals: finalName, mode: 'insensitive' },
      size: { equals: finalSize, mode: 'insensitive' },
      NOT: { id: productId }
    };
    if (finalTypeId) {
      conflictWhere.typeId = Number(finalTypeId);
    } else {
      conflictWhere.type = { equals: finalTypeName, mode: 'insensitive' };
    }

    const conflict = await prisma.product.findFirst({
      where: conflictWhere,
      select: { id: true, name: true, size: true, type: true, typeId: true }
    });

    if (conflict) {
      // Do not allow edit if another product already has this identity
      return res.status(409).json({ error: 'Taki produkt już istnieje', conflictWith: conflict });
    }

    // Build product update payload
    const productUpdate = {};
    if (name !== undefined) productUpdate.name = finalName;
    if (size !== undefined) productUpdate.size = finalSize;
    // Persist typeId when provided; otherwise persist type string and clear typeId
    if (incomingTypeId !== null) {
      productUpdate.typeId = Number(incomingTypeId);
      productUpdate.type = finalTypeName;
    } else if (incomingTypeStr !== null) {
      productUpdate.type = finalTypeName;
      // clear typeId when user sets a free-text type
      productUpdate.typeId = null;
    }
    if (imageUrl !== undefined) productUpdate.imageUrl = imageUrl;
    if (imageThumb !== undefined) productUpdate.imageThumb = imageThumb;
    // Keep existing thumbnail unless the client explicitly sets `imageThumb`

    // If client provided `stocks` array, replace all stock rows for this product with the provided list
    const incomingStocks = Array.isArray(req.body.stocks) ? req.body.stocks : null;

    if (incomingStocks) {
      // Validate userId: stock change records require a valid user reference.
      // Prefer authenticated user id (req.user.id) if available, otherwise fall back to payload
      const uid = Number((req.user && req.user.id) ? req.user.id : userId);
      if (!uid || Number.isNaN(uid)) {
        return res.status(400).json({ error: 'Missing or invalid userId for stock change logging' });
      }
      const userExists = await prisma.user.findUnique({ where: { id: uid } });
      if (!userExists) return res.status(400).json({ error: `User not found for id ${uid}` });
      // Validate incoming stocks: ensure all referenced warehouses exist and
      // DO NOT create new warehouses from client-supplied names. The UI must
      // send warehouse ids from the dropdown. If any warehouse cannot be
      // resolved, reject the request. Also disallow duplicate product-warehouse
      // pairs in the incoming payload.
      const resolvedStocks = [];
      const seenWarehouseIds = new Set();
      for (const r of incomingStocks) {
        const qty = Number(r.quantity || 0);
        if (isNaN(qty)) return res.status(400).json({ error: 'Invalid quantity in stocks' });
        let wid = null;
        if (r.warehouseId !== undefined && r.warehouseId !== null && String(r.warehouseId).trim() !== '') {
          const maybe = Number(r.warehouseId);
          if (Number.isNaN(maybe)) return res.status(400).json({ error: 'Invalid warehouseId in stocks' });
          const found = await prisma.warehouse.findUnique({ where: { id: maybe } });
          if (!found) return res.status(400).json({ error: `Warehouse not found for id ${maybe}` });
          wid = found.id;
        } else if (r.warehouseName !== undefined && r.warehouseName !== null && String(r.warehouseName).trim() !== '') {
          const name = String(r.warehouseName).trim();
          const found = await prisma.warehouse.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
          if (!found) return res.status(400).json({ error: `Warehouse not found for name ${name}` });
          wid = found.id;
        } else {
          return res.status(400).json({ error: 'Each stock row must include warehouseId or warehouseName' });
        }
        if (seenWarehouseIds.has(wid)) {
          return res.status(400).json({ error: `Duplicate warehouse in stocks (warehouseId=${wid}) - product-warehouse pairs must be unique` });
        }
        seenWarehouseIds.add(wid);
        resolvedStocks.push({ warehouseId: wid, quantity: qty });
      }

  // Compute diffs between existing stocks and incoming stocks, and apply only changes.
  // This preserves unchanged rows and logs a separate StockChange for each action:
  // - 'add' when a new product-warehouse link is created or when quantity increases (logs the delta)
  // - 'remove' when an existing product-warehouse link is deleted or when quantity decreases (logs the delta)
  // We'll perform changes inside a transaction for consistency.
      const existingStocks = await prisma.stock.findMany({ where: { productId } });
      const existingMap = new Map();
      for (const s of existingStocks) existingMap.set(Number(s.warehouseId), { id: s.id, quantity: Number(s.quantity || 0) });
      const incomingMap = new Map();
      for (const rs of resolvedStocks) incomingMap.set(Number(rs.warehouseId), Number(rs.quantity || 0));

      await prisma.$transaction(async (tx) => {
        // Update product fields first if any
        if (Object.keys(productUpdate).length > 0) {
          await tx.product.update({ where: { id: productId }, data: productUpdate });
        }

        // Handle removals: warehouses that exist but are not present in incoming payload
        for (const [wid, ex] of existingMap.entries()) {
          if (!incomingMap.has(wid)) {
            // delete the stock row and log removal
            await tx.stock.deleteMany({ where: { productId, warehouseId: wid } });
            await tx.stockChange.create({ data: { type: 'remove', quantity: ex.quantity, productId, warehouseId: wid, userId: uid } });
          }
        }

        // Handle additions and updates
        for (const [wid, qty] of incomingMap.entries()) {
          if (!existingMap.has(wid)) {
            // create new stock row and log full add
            await tx.stock.create({ data: { productId, warehouseId: wid, quantity: qty } });
            await tx.stockChange.create({ data: { type: 'add', quantity: qty, productId, warehouseId: wid, userId: uid } });
          } else {
            const ex = existingMap.get(wid);
            const oldQty = Number(ex.quantity || 0);
            const newQty = Number(qty || 0);
            if (oldQty !== newQty) {
              // Update stored quantity to the new value
              await tx.stock.update({ where: { id: ex.id }, data: { quantity: newQty } });
              const diff = newQty - oldQty;
              if (diff > 0) {
                // quantity increased -> log 'add' with delta
                await tx.stockChange.create({ data: { type: 'add', quantity: diff, productId, warehouseId: wid, userId: uid } });
              } else if (diff < 0) {
                // quantity decreased -> log 'remove' with delta (absolute)
                await tx.stockChange.create({ data: { type: 'remove', quantity: Math.abs(diff), productId, warehouseId: wid, userId: uid } });
              }
            }
          }
        }
      });

      const after = await prisma.product.findUnique({ where: { id: productId } });
      return res.json({ success: true, product: after });
    }

    // No stocks array: just update product fields
    if (Object.keys(productUpdate).length > 0) {
      const updated = await prisma.product.update({ where: { id: productId }, data: productUpdate });
      return res.json({ success: true, product: updated });
    }

    // Nothing to change
    return res.json({ success: true, product: existingProduct });
  } catch (e) {
    logger.error('[EDIT PRODUCT] Error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: 'Error editing product' });
  }
});

module.exports = router;
