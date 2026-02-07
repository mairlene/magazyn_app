const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/products/import-row
// body: { row, userId, options?, confirmAction? }
// confirmAction: 'increase' | 'reject' when duplicate encountered
router.post('/import-row', async (req, res) => {
  try {
    // Process a single import row

    const { row, userId, options = {}, confirmAction } = req.body;
    if (!row || !userId) return res.status(400).json({ error: 'Missing data' });

    /**
     * @openapi
     * /api/products/import-row:
     *   post:
     *     summary: Import a single spreadsheet row into products/stocks
     *     tags:
     *       - products
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               row:
     *                 type: object
     *                 description: Row object parsed from Excel with fields like Nazwa, Rozmiar, Typ, Magazyn, Ilość
     *               userId:
     *                 type: integer
     *               options:
     *                 type: object
     *                 properties:
     *                   createWarehouses:
     *                     type: boolean
     *               confirmAction:
     *                 type: string
     *                 description: 'increase|reject' when resolving duplicates
     *     responses:
     *       200:
     *         description: Result of processing the row, including statuses like created, updated, duplicate, missingWarehouse
     */
    const name = (row.Nazwa || row.name || '').toString().trim();
    const size = (row.Rozmiar || row.size || '').toString().trim();
    const type = (row.Typ || row.type || '').toString().trim();
    const warehouseName = (row.Magazyn || row.warehouse || row.Lokalizacja || '').toString().trim();
    const quantity = Number(row.Ilość ?? row.quantity ?? 0) || 0;

    // Ensure Type record exists (and obtain typeId) when a type string is provided
    let typeId = null;
    if (type) {
      let t = await prisma.type.findUnique({ where: { name: type } });
      if (!t) {
        try {
          t = await prisma.type.create({ data: { name: type } });
        } catch (e) {
          // handle race where another request created the same type
          t = await prisma.type.findUnique({ where: { name: type } });
        }
      }
      if (t) typeId = t.id;
    }

    // Ensure product (bind to typeId when creating)
    let product = await prisma.product.findFirst({ where: { name, size } });
    if (!product) {
      const data = { name, size };
      if (type) data.type = type;
      if (typeId) data.typeId = typeId;
      product = await prisma.product.create({ data });
    } else {
      // If product exists but lacks typeId and we have one, attempt to update it
      if (typeId && !product.typeId) {
        try {
          product = await prisma.product.update({ where: { id: product.id }, data: { typeId, type: product.type || type } });
        } catch (e) {
          // ignore update errors
        }
      }
    }

    // If no warehouse specified, only create product
    if (!warehouseName) {
      return res.json({ status: 'createdProductOnly', productId: product.id });
    }

    // Find warehouse. For interactive per-row import we do NOT create warehouses automatically;
    // instead return a sentinel status so the client can prompt the user.
    let warehouse = null;
    if (warehouseName) {
      warehouse = await prisma.warehouse.findFirst({ where: { name: warehouseName } });
      if (!warehouse) {
        // If caller passed explicit option to create warehouses, create it.
        if (options && options.createWarehouses === true) {
          warehouse = await prisma.warehouse.create({ data: { name: warehouseName } });
        } else {
          // Inform client that warehouse is missing so it can prompt the user
          return res.json({ status: 'missingWarehouse', warehouseName });
        }
      }
    }

    // Find stock for product in warehouse
    let stock = await prisma.stock.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
    if (stock) {
      // Duplicate detected
      if (!confirmAction) {
        return res.json({ status: 'duplicate', product: { id: product.id, name: product.name }, warehouse: { id: warehouse.id, name: warehouse.name }, existingQty: stock.quantity, incomingQty: quantity });
      }
      if (confirmAction === 'increase') {
        const newQty = Number(stock.quantity) + Number(quantity);
        await prisma.stock.update({ where: { id: stock.id }, data: { quantity: newQty } });
        await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId: Number(userId) } });
        return res.json({ status: 'updated', quantity: newQty });
      }
      if (confirmAction === 'reject') {
        return res.json({ status: 'skipped' });
      }
    } else {
      // Create stock
      const created = await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: Number(quantity) } });
      await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId: Number(userId) } });
      return res.json({ status: 'created', quantity: created.quantity });
    }
  } catch (e) {
    logger.error('[API /api/products/import-row] Server error:', e);
    return res.status(500).json({ error: 'Row import error' });
  }
});

module.exports = router;
