// Product routes: endpoints to list, add and edit products.
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const { authMiddleware } = require('../middleware/auth');

// Stable: Return product and stocks for a given product id
// This is the supported endpoint that clients should use.
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // request details logged in server tracing when enabled
    if (!id) {
      // invalid id
      return res.status(400).json({ error: 'Invalid id' });
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      // product not found
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const stocksRaw = await prisma.stock.findMany({ where: { productId: id }, include: { warehouse: true } });
    // details DB stocks length
    const stocks = stocksRaw.map(s => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse?.name || null,
      quantity: s.quantity
    }));

    const payload = { success: true, product, stocks, stockCount: stocks.length };
    // response payload prepared
    return res.json(payload);
  } catch (e) {
    logger.error('[PRODUCTS DETAILS] Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// New: Return only stocks (warehouse + quantity) for a given product id
// GET /api/products/:id/stocks
router.get("/:id/stocks", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // request stocks details logged in server tracing when enabled
    if (!id) {
      // invalid id
      return res.status(400).json({ error: 'Invalid id' });
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      // product not found
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const stocksRaw = await prisma.stock.findMany({ where: { productId: id }, include: { warehouse: true } });
    // stocks DB length
    const stocks = stocksRaw.map(s => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse?.name || null,
      quantity: s.quantity
    }));

    const payload = { success: true, stocks, count: stocks.length };
    // response payload prepared
    return res.json(payload);
  } catch (e) {
    logger.error('[PRODUCTS STOCKS] Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// New: Return full stock change history for a given product id
// GET /api/products/:id/history
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // request history details logged in server tracing when enabled
    if (!id) {
      // invalid id
      return res.status(400).json({ error: 'Invalid id' });
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      // product not found
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch stock change records for the product, newest first
    const changes = await prisma.stockChange.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: { warehouse: true, user: true }
    });
    // history DB changes length

    // Build history entries; for 'use' actions try to attach optional archive note if present
    const history = [];
    for (const c of changes) {
      const entry = {
        date: c.createdAt,
        action: c.type,
        warehouseId: c.warehouseId,
        warehouseName: c.warehouse?.name || null,
        quantity: c.quantity,
        userId: c.userId,
        userName: c.user?.name || c.user?.email || null,
        note: null
      };
      try {
        if (c.type === 'use') {
          // Try to find a matching archive entry (note) for this use event
          const archiveEntry = await prisma.archive.findFirst({
            where: {
              productId: id,
              warehouseId: c.warehouseId,
              userId: c.userId,
              quantity: c.quantity
            },
            orderBy: { usedAt: 'desc' }
          });
          if (archiveEntry) entry.note = archiveEntry.note || null;
        }
      } catch (e) {
        // ignore archive lookup errors; note will be null
      }
      history.push(entry);
    }

    const payload = { success: true, history, count: history.length };
    // response payload prepared
    return res.json(payload);
  } catch (e) {
    logger.error('[PRODUCTS HISTORY] Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// New: Return only the latest stock change for a given product id
// GET /api/products/:id/history/latest
router.get("/:id/history/latest", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // request latest history details logged in server tracing when enabled
    if (!id) {
      // invalid id
      return res.status(400).json({ error: 'Invalid id' });
    }
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      // product not found
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch the single most recent stockChange for the product
    const latest = await prisma.stockChange.findFirst({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: { warehouse: true, user: true }
    });
    // Additional debug: also fetch count and the top-most item via findMany/take to compare
    try {
      const totalCount = await prisma.stockChange.count({ where: { productId: id } });
      const topViaFindMany = await prisma.stockChange.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 1, include: { warehouse: true, user: true } });
    } catch (dbgErr) {
      // debug extra queries failed
    }

    const history = latest ? [{
      date: latest.createdAt,
      action: latest.type,
      warehouseId: latest.warehouseId,
      warehouseName: latest.warehouse?.name || null,
      quantity: latest.quantity,
      userId: latest.userId,
      userName: latest.user?.name || latest.user?.email || null
    }] : [];

    const payload = { success: true, history, count: history.length };
    // response payload prepared
    return res.json(payload);
  } catch (e) {
    logger.error('[PRODUCTS HISTORY LATEST] Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products?warehouseId=1
router.get("/", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;
    // Pagination: support ?page=<n>&limit=<m>
    const pageRaw = req.query.page ?? null;
    const limitRaw = req.query.limit ?? null;
    const page = pageRaw ? Math.max(1, Number(pageRaw)) : null;
    const requestedLimit = limitRaw ? Math.max(1, Number(limitRaw)) : null;

    const DEFAULT_LIMIT = 200; // default number of rows when client does not supply limit
    const MAX_LIMIT = 1000; // absolute cap to avoid huge responses
    const limit = requestedLimit ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    const whereClause = warehouseId ? { warehouseId } : {};

    // If pagination requested, return paginated stocks + total count; otherwise limit to DEFAULT_LIMIT
    let stocks;
    let total = null;
    if (page) {
      total = await prisma.stock.count({ where: whereClause });
      stocks = await prisma.stock.findMany({
        where: whereClause,
        include: { product: true, warehouse: true },
        skip: (page - 1) * limit,
        take: limit,
      });
    } else {
      // No explicit page -> fall back to safe default limit to avoid returning huge payloads
      stocks = await prisma.stock.findMany({
        where: whereClause,
        include: { product: true, warehouse: true },
        take: limit,
      });
    }

    const result = stocks.map((s) => ({
      id: s.product.id,
      name: s.product.name,
      size: s.product.size,
      type: s.product.type,
      availableQty: s.quantity,
      warehouseId: s.warehouseId,
      warehouse: s.warehouse?.name,
      imageUrl: s.product.imageUrl || null,
    }));

    const payload = { products: result };
    if (page) {
      payload.page = page;
      payload.limit = limit;
      payload.total = total;
    } else {
      payload.limit = limit;
      // If we didn't compute total, include a flag indicating the response was limited
      payload.truncated = stocks.length === limit;
    }
    res.json(payload);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Błąd pobierania produktów z bazy" });
  }
});

// POST /api/products
// Protect product creation with auth so we always have authenticated user info
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, size, type, warehouse, quantity, userId, imageUrl } = req.body;
    // Prefer authenticated user id if present
    const uid = Number((req.user && req.user.id) ? req.user.id : userId);
    if (!name || !size || !type || !warehouse || !quantity || !uid) {
      return res.status(400).json({ error: "Missing required fields or userId" });
    }
    const capitalizeFirst = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
    const capitalizedName = capitalizeFirst(name);
    const capitalizedType = capitalizeFirst(type);
    const capitalizedWarehouse = capitalizeFirst(warehouse);
    let product = await prisma.product.findFirst({
      where: { name: capitalizedName, size: size, type: capitalizedType }
    });
    if (!product) {
      product = await prisma.product.create({
        data: { name: capitalizedName, type: capitalizedType, size: size, imageUrl: imageUrl || null }
      });
    } else if (imageUrl && product.imageUrl !== imageUrl) {
      product = await prisma.product.update({ where: { id: product.id }, data: { imageUrl} });
    }
    // Require that warehouse already exists. Frontend should send an existing
    // warehouse (by id or name) from the dropdown. Do NOT create new warehouses
    // from product add requests coming from the UI.
    let warehouseRecord = await prisma.warehouse.findFirst({ where: { name: capitalizedWarehouse } });
    if (!warehouseRecord) {
      return res.status(400).json({ error: 'Warehouse not found. Please select an existing warehouse.' });
    }
    const existingStock = await prisma.stock.findFirst({
      where: { productId: product.id, warehouseId: warehouseRecord.id }
    });
    if (existingStock) {
      return res.status(400).json({ error: "Product already exists in this warehouse" });
    }
    await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouseRecord.id, quantity: Number(quantity) } });
    await prisma.stockChange.create({ data: { type: "add", quantity: Number(quantity), productId: product.id, warehouseId: warehouseRecord.id, userId: uid } });
    res.json({ success: true, product });
  } catch (e) {
    logger.error("[PRODUCTS] Error:", e);
    res.status(500).json({ error: "Błąd dodawania produktu" });
  }
});

module.exports = router;
