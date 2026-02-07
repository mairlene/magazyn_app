const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// GET /api/user-actions?limit=100
// Returns recent stockChange records with product, warehouse and user info
router.get('/', async (req, res) => {
  try {
    // Pagination: ?page=1&limit=50
    const page = Math.max(1, Number(req.query.page) || 1);
    let limit = Number(req.query.limit) || 50;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const skip = (page - 1) * limit;

    // Fetch recent stockChange and archive entries, merge them so that 'use' actions
    // that saved a note in Archive will have the note included in the returned items.
    const [stockCount, archiveCount, stockRows, archiveRows] = await Promise.all([
      prisma.stockChange.count(),
      prisma.archive.count(),
      prisma.stockChange.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.max(limit, skip + limit), // fetch enough to merge & paginate
        include: { product: true, warehouse: true, user: true }
      }),
      prisma.archive.findMany({
        orderBy: { usedAt: 'desc' },
        take: Math.max(limit, skip + limit),
        include: { product: true, warehouse: true, user: true }
      })
    ]);

    // Normalize archive rows to the same shape as stockChange items, adding note
    const archiveAsItems = archiveRows.map(a => ({
      id: `archive-${a.id}`,
      type: 'use',
      quantity: a.quantity,
      createdAt: a.usedAt,
      product: a.product,
      warehouse: a.warehouse,
      user: a.user,
      note: a.note || null,
      _source: 'archive'
    }));

    const stockAsItems = stockRows.map(s => ({
      id: `stock-${s.id}`,
      type: s.type,
      quantity: s.quantity,
      createdAt: s.createdAt,
      product: s.product,
      warehouse: s.warehouse,
      user: s.user,
      note: null,
      _source: 'stock'
    }));

    // Merge and sort by createdAt desc
    const merged = [...stockAsItems, ...archiveAsItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Total is sum of both tables (for pagination UI)
    const total = stockCount + archiveCount;

    // Slice according to requested page
    const items = merged.slice(skip, skip + limit);

    res.json({ success: true, items, total, page, limit });
  } catch (err) {
    logger.error('[API /api/user-actions] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
