const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// POST /api/products/delete
// Expect JSON body: { productId }
// Authentication is required; user identity is taken from the token (req.user)
router.post('/', authMiddleware, async (req, res) => {
  const { productId } = req.body || {};
  // Prefer authenticated user id from middleware; fall back to userId in payload if present
  const authUserId = req.user && (req.user.id || req.user.userId || req.user.user_id) ? (req.user.id || req.user.userId || req.user.user_id) : null;
  const providedUserId = req.body && req.body.userId ? Number(req.body.userId) : null;
  const userId = authUserId || providedUserId || null;
  const id = Number(productId);
  if (!id) return res.status(400).json({ error: 'Missing productId' });
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Fetch current stocks for logging
    const stocks = await prisma.stock.findMany({ where: { productId: id } });

    // Delete related records that reference product to avoid FK constraint errors.
    // Perform in a transaction and remove dependent rows first.
    await prisma.$transaction(async (tx) => {
      // remove stock change records (referencing product)
      await tx.stockChange.deleteMany({ where: { productId: id } });
      // remove transfers, cart items and archives that reference product
      await tx.transfer.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.archive.deleteMany({ where: { productId: id } });
      // remove stock rows
      await tx.stock.deleteMany({ where: { productId: id } });
      // finally remove the product
      await tx.product.delete({ where: { id } });
    });

    // After product was removed from DB, attempt to remove image files if they are not
    // referenced by any other product. Protect against accidental deletion by ensuring
    // the paths look like uploads (start with '/uploads/').
    try {
      const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
      const candidateUrls = [];
      if (product && product.imageUrl) candidateUrls.push(product.imageUrl);
      if (product && product.imageThumb) candidateUrls.push(product.imageThumb);
      for (const url of candidateUrls) {
        if (!url || typeof url !== 'string') continue;
        if (!url.startsWith('/uploads/')) continue;
        // check if other products reference the same url
        const count = await prisma.product.count({ where: { AND: [ { id: { not: id } }, { OR: [ { imageUrl: url }, { imageThumb: url } ] } ] } });
        if (count > 0) {
          logger.info('[UPLOAD CLEAN] not removing file still referenced by other products', url);
          continue;
        }
        const filename = url.replace('/uploads/', '');
        const fp = path.join(uploadDir, filename);
        try {
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            logger.info('[UPLOAD CLEAN] removed orphan file', fp);
          }
        } catch (e) {
          logger.warn('[UPLOAD CLEAN] failed to remove file', fp, e && e.message);
        }
      }
    } catch (e) {
      logger.warn('[UPLOAD CLEAN] cleanup-after-delete error', e && e.message);
    }

    logger.warn('[API DELETE PRODUCT] deleted product', id, 'stocksRemoved=', stocks.length, 'byUser=', userId);
    return res.json({ success: true, removedStocks: stocks.length });
  } catch (err) {
    logger.error('[API DELETE PRODUCT] Error deleting product', id, err && err.message);
    return res.status(500).json({ error: err && err.message ? String(err.message) : 'Server error' });
  }
});

// DELETE /api/products/:id
// Allow deletion via HTTP DELETE with product id in the path.
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

    // After successful delete, attempt upload cleanup for any files that
    // belonged to the removed product and are not referenced by other products.
    try {
      const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
      const candidateUrls = [];
      if (product && product.imageUrl) candidateUrls.push(product.imageUrl);
      if (product && product.imageThumb) candidateUrls.push(product.imageThumb);
      for (const url of candidateUrls) {
        if (!url || typeof url !== 'string') continue;
        if (!url.startsWith('/uploads/')) continue;
        // check if other products reference the same url
        const count = await prisma.product.count({ where: { AND: [ { id: { not: id } }, { OR: [ { imageUrl: url }, { imageThumb: url } ] } ] } });
        if (count > 0) {
          logger.info('[UPLOAD CLEAN] not removing file still referenced by other products', url);
          continue;
        }
        const filename = url.replace('/uploads/', '');
        const fp = path.join(uploadDir, filename);
        try {
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            logger.info('[UPLOAD CLEAN] removed orphan file', fp);
          }
        } catch (e) {
          logger.warn('[UPLOAD CLEAN] failed to remove file', fp, e && e.message);
        }
      }
    } catch (e) {
      logger.warn('[UPLOAD CLEAN] cleanup-after-delete error', e && e.message);
    }

    logger.warn('[API DELETE PRODUCT] deleted product', id, 'stocksRemoved=', stocks.length, 'byUser=', userId);
    return res.json({ success: true, removedStocks: stocks.length });
  } catch (err) {
    logger.error('[API DELETE PRODUCT] Error deleting product', id, err && err.message);
    return res.status(500).json({ error: err && err.message ? String(err.message) : 'Server error' });
  }
});

module.exports = router;
