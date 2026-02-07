const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
// const { authMiddleware } = require('../middleware/auth');

// POST /api/transfer
// router.post('/', authMiddleware, async (req, res) => {
router.post('/', async (req, res) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity, userId, note, confirmMerge } = req.body;
  // Guard: do not process transfers where source and target warehouses are the same
  try {
    const fromId = typeof fromWarehouseId === 'string' ? parseInt(fromWarehouseId, 10) : fromWarehouseId;
    const toId = typeof toWarehouseId === 'string' ? parseInt(toWarehouseId, 10) : toWarehouseId;
    if (fromId === toId) {
      return res.status(400).json({ error: 'Produkty znajdują się już w wybranym magazynie' });
    }
  } catch (e) {
    // if parsing fails, continue to validation down the line
  }
  try {
    // 1. Find source stock
    const sourceStock = await prisma.stock.findFirst({ where: { productId, warehouseId: fromWarehouseId } });
    if (!sourceStock || sourceStock.quantity < quantity) {
      return res.status(400).json({ error: 'Brak wystarczającej ilości produktu w magazynie źródłowym.' });
    }
    // 1b. Pre-check: if target already has this product, treat as conflict (no automatic merge)
    const existingTargetStock = await prisma.stock.findFirst({ where: { productId, warehouseId: toWarehouseId } });
    if (existingTargetStock && !confirmMerge) {
      // Return a structured conflict so the client can show the confirm/merge modal.
      // NOTE: return 200 with conflict flag so frontend can show a modal instead of treating it as an error status.
      return res.json({
        error: 'Produkt już istnieje w magazynie docelowym.',
        conflict: true,
        conflicts: [{ productId, warehouseId: toWarehouseId, existingQuantity: existingTargetStock.quantity, requestedQuantity: quantity }]
      });
    }

    // 2. Update or delete source stock depending on remaining quantity
    if (sourceStock.quantity === quantity) {
      // If transferring the entire amount, remove the stock row
      await prisma.stock.delete({ where: { id: sourceStock.id } });
    } else {
      await prisma.stock.update({ where: { id: sourceStock.id }, data: { quantity: sourceStock.quantity - quantity } });
    }
    // Log stock change (remove)
    const intUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const stockChangeRemove = await prisma.stockChange.create({
      data: {
        type: 'transfer-remove',
        quantity,
        productId,
        warehouseId: fromWarehouseId,
        userId: intUserId
      }
    });
    // 2b. Find or create target stock
    let targetStock = await prisma.stock.findFirst({
      where: { productId, warehouseId: toWarehouseId }
    });
    let updatedTarget;
    if (targetStock) {
      // If existing target and client asked to merge (confirmMerge===true) we increase the quantity.
      updatedTarget = await prisma.stock.update({ where: { id: targetStock.id }, data: { quantity: targetStock.quantity + quantity } });
    } else {
      targetStock = await prisma.stock.create({ data: { productId, warehouseId: toWarehouseId, quantity } });
    }
    // Log stock change (add)
    const stockChangeAdd = await prisma.stockChange.create({
      data: {
        type: 'transfer-add',
        quantity,
        productId,
        warehouseId: toWarehouseId,
        userId: intUserId
      }
    });
    // 3. Log transfer
    const transferLog = await prisma.transfer.create({
      data: {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        userId: intUserId,
        note
      }
    });
    // 4. Log to Archive if toWarehouse is Archive
    const archiveWarehouse = await prisma.warehouse.findFirst({ where: { id: toWarehouseId, name: 'Archiwum' } });
    if (archiveWarehouse) {
      const archiveLog = await prisma.archive.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          quantity,
          userId: intUserId,
          note
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('[TRANSFER] Error:', err);
    if (err && err.stack) logger.error('[TRANSFER] Error stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
