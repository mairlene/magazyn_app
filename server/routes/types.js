const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// Public: list types
router.get('/', async (req, res) => {
  try {
    const types = await prisma.type.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, types });
  } catch (err) {
    logger.error('[TYPES] list error', err);
    res.status(500).json({ error: 'Błąd pobierania typów' });
  }
});

// Admin routes
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.toString().trim()) return res.status(400).json({ error: 'Brak nazwy typu' });
  try {
    const trimmed = name.toString().trim();
    const exists = await prisma.type.findUnique({ where: { name: trimmed } });
    if (exists) return res.status(400).json({ error: 'Typ już istnieje' });
    const created = await prisma.type.create({ data: { name: trimmed } });
    res.json({ success: true, type: created });
  } catch (err) {
    logger.error('[TYPES] create error', err);
    res.status(500).json({ error: 'Błąd tworzenia typu' });
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Brak danych' });
  try {
    const updated = await prisma.type.update({ where: { id }, data: { name } });
    res.json({ success: true, type: updated });
  } catch (err) {
    logger.error('[TYPES] update error', err);
    res.status(500).json({ error: 'Błąd aktualizacji typu' });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Brak id' });
  try {
    const count = await prisma.product.count({ where: { typeId: id } });
    if (count > 0) return res.status(400).json({ error: 'Istnieją produkty przypisane do tego typu' });
    await prisma.type.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[TYPES] delete error', err);
    res.status(500).json({ error: 'Błąd usuwania typu' });
  }
});

module.exports = router;
