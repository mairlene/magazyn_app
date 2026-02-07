const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const { authMiddleware } = require('../middleware/auth');

// POST /api/products/delete-from-warehouse
// Body: { productId, warehouseId }
// Requires authentication
router.post('/', authMiddleware, async (req, res) => {
  const { productId, warehouseId } = req.body || {};
  const pid = Number(productId);
  const wid = Number(warehouseId);
  if (!pid || !wid) return res.status(400).json({ error: 'Missing productId or warehouseId' });
  try {
    const stock = await prisma.stock.findFirst({ where: { productId: pid, warehouseId: wid } });
    if (!stock) return res.status(404).json({ error: 'Stock row not found' });

    // remove related stockChange entries for this product+warehouse
    const deletedChanges = await prisma.stockChange.deleteMany({ where: { productId: pid, warehouseId: wid } });
    // remove the stock row
    await prisma.stock.delete({ where: { id: stock.id } });

    logger.warn('[API] deleteFromWarehouse removed stock', { productId: pid, warehouseId: wid, removedChanges: deletedChanges.count });
    return res.json({ success: true, removedStockId: stock.id, removedChanges: deletedChanges.count });
  } catch (err) {
    logger.error('[API] deleteFromWarehouse error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
