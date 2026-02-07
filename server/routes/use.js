const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/use
router.post('/', async (req, res) => {
  const { productId, warehouseId, quantity, userId, note } = req.body;
  if (!productId || !warehouseId || !quantity || !userId) {
    logger.error('[API /api/use] Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Find stock in the specified warehouse
    const sourceStock = await prisma.stock.findFirst({
      where: { productId, warehouseId }
    });
    if (!sourceStock || sourceStock.quantity < quantity) {
      logger.error('[API /api/use] Not enough stock in source warehouse');
      return res.status(400).json({ error: 'Not enough stock in source warehouse' });
    }
    // Remove quantity from source warehouse
    if (sourceStock.quantity === quantity) {
      await prisma.stock.delete({ where: { id: sourceStock.id } });
    } else {
      await prisma.stock.update({ where: { id: sourceStock.id }, data: { quantity: sourceStock.quantity - quantity } });
    }
    // Log stock change (use)
    await prisma.stockChange.create({
      data: {
        type: 'use',
        quantity,
        productId,
        warehouseId,
        userId: Number(userId)
      }
    });
    // Log to archive for audit/history (optionally save provided note/description)
    await prisma.archive.create({
      data: {
        productId,
        warehouseId,
        quantity,
        userId: Number(userId),
        note: note || null
      }
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('[API /api/use] Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
