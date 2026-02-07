const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../../middleware/auth');
const logger = require('../../lib/logger');

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const authUserId = req.user && (req.user.id || req.user.userId || req.user.user_id) ? (req.user.id || req.user.userId || req.user.user_id) : null;
  const userId = authUserId || null;
  if (!id) return res.status(400).json({ error: 'Missing product id in path' });
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stocks = await prisma.stock.findMany({ where: { productId: id } });

    await prisma.$transaction(async (tx) => {
      await tx.stockChange.deleteMany({ where: { productId: id } });
      await tx.transfer.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.archive.deleteMany({ where: { productId: id } });
      await tx.stock.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    logger.warn('[API DELETE PRODUCT] deleted product', id, 'stocksRemoved=', stocks.length, 'byUser=', userId);
    return res.json({ success: true, removedStocks: stocks.length });
  } catch (err) {
    logger.error('[API DELETE PRODUCT] Error deleting product', id, err && err.message);
    return res.status(500).json({ error: err && err.message ? String(err.message) : 'Server error' });
  }
});

module.exports = router;
