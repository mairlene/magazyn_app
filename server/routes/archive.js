const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
// const { authMiddleware } = require('../middleware/auth');

// POST /api/archive/by-user
// router.post('/by-user', authMiddleware, async (req, res) => {
router.post('/by-user', async (req, res) => {
  // Accepts body: { userId, page, limit }
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Brak userId' });
  try {
    // Determine requester role server-side
    const requester = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!requester) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

    const page = Math.max(1, Number(req.body.page) || 1);
    let limit = Number(req.body.limit) || 50;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const skip = (page - 1) * limit;

    const where = requester.role === 'admin' ? {} : { userId: Number(userId) };

    const [total, products] = await Promise.all([
      prisma.archive.count({ where }),
      prisma.archive.findMany({
        where,
        include: { product: true, warehouse: true, user: true },
        orderBy: { usedAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.json({ products, total, page, limit });
  } catch (err) {
    logger.error('[ARCHIVE] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/archive/restore
// router.post('/restore', authMiddleware, async (req, res) => {
router.post('/restore', async (req, res) => {
  const { archiveId, userId } = req.body;
  if (!archiveId || !userId) return res.status(400).json({ error: 'Brak danych' });
  try {
    const archiveItem = await prisma.archive.findUnique({ where: { id: archiveId }, include: { product: true, warehouse: true } });
    if (!archiveItem) return res.status(404).json({ error: 'Nie znaleziono produktu w archiwum' });

    // Validate requesting user from DB (do not trust client role)
    const requester = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!requester) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

    // Admins can restore any item
    if (requester.role !== 'admin') {
      // Non-admins can only restore their own archived items and only on the same day
      if (archiveItem.userId !== Number(userId)) {
        return res.status(403).json({ error: 'Brak uprawnień do przywrócenia tego rekordu' });
      }
      const usedDate = new Date(archiveItem.usedAt).toDateString();
      const nowDate = new Date().toDateString();
      if (usedDate !== nowDate) {
        return res.status(403).json({ error: 'Można przywrócić tylko produkty z dnia dzisiejszego' });
      }
    }

    // Przywróć do magazynu
    // Dodaj ilość do stock
    const stock = await prisma.stock.findFirst({
      where: { productId: archiveItem.productId, warehouseId: archiveItem.warehouseId }
    });
    if (stock) {
      await prisma.stock.update({
        where: { id: stock.id },
        data: { quantity: { increment: archiveItem.quantity } }
      });
    } else {
      await prisma.stock.create({
        data: {
          productId: archiveItem.productId,
          warehouseId: archiveItem.warehouseId,
          quantity: archiveItem.quantity
        }
      });
    }
    // Usuń z archiwum
    await prisma.archive.delete({ where: { id: archiveId } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[ARCHIVE] Restore error:', err);
    res.status(500).json({ error: 'Błąd przywracania produktu' });
  }
});

module.exports = router;
