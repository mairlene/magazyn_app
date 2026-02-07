// Endpoint to set or create stock for a product in a warehouse
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/stock/update - set or create stock for product in warehouse
router.post('/update', async (req, res) => {
  const { productId, warehouseId, quantity, userId } = req.body;
  try {
    const pid = Number(productId);
    const wid = Number(warehouseId);
    const q = Number(quantity);
    if (!pid || !wid || isNaN(q)) return res.status(400).json({ error: 'Invalid parameters' });

    const existing = await prisma.stock.findFirst({ where: { productId: pid, warehouseId: wid } });
    let stock;
    if (existing) {
      stock = await prisma.stock.update({ where: { id: existing.id }, data: { quantity: q } });
    } else {
      stock = await prisma.stock.create({ data: { productId: pid, warehouseId: wid, quantity: q } });
    }

  // Resolve user id (prefer authenticated user if present)
  const uid = Number((req.user && req.user.id) ? req.user.id : userId);
  if (!uid || Number.isNaN(uid)) return res.status(400).json({ error: 'Missing or invalid userId for stock change' });
  const userExists = await prisma.user.findUnique({ where: { id: uid } });
  if (!userExists) return res.status(400).json({ error: `User not found for id ${uid}` });
  await prisma.stockChange.create({ data: { type: 'set', quantity: q, productId: pid, warehouseId: wid, userId: uid } });

    res.json({ success: true, stock });
  } catch (e) {
    logger.error('[API /api/stock/update] Error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
