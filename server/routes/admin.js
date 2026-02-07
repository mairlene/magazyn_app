const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// Protect all admin routes: require authenticated admin user
router.use(authMiddleware, requireRole('admin'));

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const pageRaw = req.query.page ?? null;
    const limitRaw = req.query.limit ?? null;
    const page = pageRaw ? Math.max(1, Number(pageRaw)) : null;
    const requestedLimit = limitRaw ? Math.max(1, Number(limitRaw)) : null;
    const DEFAULT_LIMIT = 100;
    const MAX_LIMIT = 1000;
    const limit = requestedLimit ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    if (page) {
      const total = await prisma.user.count();
      const users = await prisma.user.findMany({ skip: (page - 1) * limit, take: limit });
      return res.json({ users, total, page, limit });
    }

    // no page requested -> return safe default slice and indicate truncation
    const users = await prisma.user.findMany({ take: limit });
    return res.json({ users, limit, truncated: users.length === limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/delete-user
router.post('/delete-user', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Brak ID użytkownika' });
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/update-role
router.post('/update-role', async (req, res) => {
  const { id, role } = req.body;
  if (!id || !role) return res.status(400).json({ error: 'Brak danych' });
  try {
    const user = await prisma.user.update({ where: { id: Number(id) }, data: { role } });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/update-warehouse
router.post('/update-warehouse', async (req, res) => {
  const { id, newName } = req.body;
  if (!id || !newName) return res.status(400).json({ error: 'Brak danych' });
  try {
    const target = await prisma.warehouse.findFirst({ where: { name: newName } });
    // jeśli istnieje magazyn o docelowej nazwie i to nie ten sam rekord -> zwróć konflikty
      if (target && target.id !== Number(id)) { 
      const sourceId = Number(id);
      const targetId = target.id;
      // pobierz stany magazynowe z magazynu źródłowego wraz z informacjami o produkcie
      // Find potential conflicts but limit the number reviewed to avoid huge memory use
      const MAX_CONFLICTS = 500;
      const sourceStocksPreview = await prisma.stock.findMany({ where: { warehouseId: sourceId }, include: { product: true }, take: MAX_CONFLICTS });
      const conflicts = [];
      for (const s of sourceStocksPreview) {
        const tgt = await prisma.stock.findFirst({ where: { warehouseId: targetId, productId: s.productId } });
        if (tgt) {
          conflicts.push({
            productId: s.productId,
            name: s.product?.name || null,
            size: s.product?.size || null,
            sourceQuantity: s.quantity,
            targetQuantity: tgt.quantity
          });
        }
      }
      // Indicate if we truncated the preview
      const truncated = sourceStocksPreview.length >= MAX_CONFLICTS;
      return res.status(409).json({ error: 'Istnieje magazyn o takiej nazwie', conflict: true, targetId, conflicts, truncated });
    }

    // brak kolizji nazwy -> zwykła aktualizacja
      const updated = await prisma.warehouse.update({ where: { id: Number(id) }, data: { name: newName } }); 
    res.json({ success: true, warehouse: updated });
  } catch (err) {
    logger.error('[ADMIN] update-warehouse error:', err);
    res.status(500).json({ error: 'Błąd aktualizacji magazynu' });
  }
});

// POST /api/admin/merge-warehouses
// body: { sourceId, targetId, userId }
// Merges stocks from source into target. If product exists in target, quantities are summed; otherwise stock records are moved.
router.post('/merge-warehouses', async (req, res) => {
  const { sourceId, targetId, userId } = req.body;
  if (!sourceId || !targetId || !userId) return res.status(400).json({ error: 'Brak danych (wymagane sourceId, targetId, userId)' });
  try {
    const sId = Number(sourceId);
    const tId = Number(targetId);
    if (sId === tId) return res.status(400).json({ error: 'Source and target must differ' });

    const sourceWarehouse = await prisma.warehouse.findUnique({ where: { id: sId } });
    const targetWarehouse = await prisma.warehouse.findUnique({ where: { id: tId } });
    if (!sourceWarehouse || !targetWarehouse) return res.status(404).json({ error: 'Nie znaleziono magazynów' });

    // Process source stocks in batches to avoid loading all rows into memory
    const BATCH_SIZE = 200;
    let lastId = 0;
    while (true) {
      const batch = await prisma.stock.findMany({ where: { warehouseId: sId, id: { gt: lastId } }, take: BATCH_SIZE, orderBy: { id: 'asc' } });
      if (!batch || batch.length === 0) break;
      for (const stock of batch) {
        const tgt = await prisma.stock.findFirst({ where: { warehouseId: tId, productId: stock.productId } });
        if (tgt) {
          await prisma.stock.update({ where: { id: tgt.id }, data: { quantity: tgt.quantity + stock.quantity } });
          await prisma.stock.delete({ where: { id: stock.id } });
          await prisma.stockChange.create({ data: { type: 'transfer', quantity: stock.quantity, productId: stock.productId, warehouseId: tId, userId: Number(userId) } });
        } else {
          await prisma.stock.update({ where: { id: stock.id }, data: { warehouseId: tId } });
          await prisma.stockChange.create({ data: { type: 'transfer', quantity: stock.quantity, productId: stock.productId, warehouseId: tId, userId: Number(userId) } });
        }
        lastId = stock.id;
      }
      if (batch.length < BATCH_SIZE) break;
    }

    // po przeniesieniu stocków, usuń pusty magazyn źródłowy
      await prisma.warehouse.delete({ where: { id: sId } }); 

    res.json({ success: true, message: 'Magazyny scalone pomyślnie' });
  } catch (err) {
    logger.error('[ADMIN] merge-warehouses error:', err);
    res.status(500).json({ error: 'Błąd scalania magazynów' });
  }
});

// POST /api/admin/delete-warehouse
router.post('/delete-warehouse', async (req, res) => {
  const { id, name } = req.body;
  try {
    let warehouse;
    if (id) warehouse = await prisma.warehouse.findUnique({ where: { id: Number(id) } });
    else if (name) warehouse = await prisma.warehouse.findFirst({ where: { name } });
    if (!warehouse) return res.status(404).json({ error: 'Nie znaleziono magazynu' });
    const wid = warehouse.id;

    // check related records counts
    const stockCount = await prisma.stock.count({ where: { warehouseId: wid } });
    const stockAgg = await prisma.stock.aggregate({ where: { warehouseId: wid }, _sum: { quantity: true } });
    const stockQuantitySum = (stockAgg._sum && stockAgg._sum.quantity) ? Number(stockAgg._sum.quantity) : 0;
    const cartCount = await prisma.cartItem.count({ where: { warehouseId: wid } });
    const archiveCount = await prisma.archive.count({ where: { warehouseId: wid } });
    const stockChangeCount = await prisma.stockChange.count({ where: { warehouseId: wid } });
    const transferCount = await prisma.transfer.count({ where: { OR: [{ fromWarehouseId: wid }, { toWarehouseId: wid }] } });

    const counts = { stockCount, stockQuantitySum, cartCount, archiveCount, stockChangeCount, transferCount };

    // Allow deletion only when total quantity in stock is zero.
    if (stockQuantitySum > 0) {
      // There is still quantity in stock -> cannot delete
      return res.status(400).json({ error: 'Magazyn zawiera produkty i nie może być usunięty', counts });
    }

    // If there are only historical records (transfers, stockChange, archive, cart items),
    // remove those records first to allow deletion of the warehouse.
    try {
      await prisma.$transaction([
        prisma.transfer.deleteMany({ where: { OR: [{ fromWarehouseId: wid }, { toWarehouseId: wid }] } }),
        prisma.stockChange.deleteMany({ where: { warehouseId: wid } }),
        prisma.archive.deleteMany({ where: { warehouseId: wid } }),
        prisma.cartItem.deleteMany({ where: { warehouseId: wid } }),
        prisma.stock.deleteMany({ where: { warehouseId: wid } }),
        prisma.warehouse.delete({ where: { id: wid } })
      ]);
      res.json({ success: true, warning: 'Usunięto powiązane historyczne rekordy (transfery/logi/archiwum/koszyk) przed usunięciem magazynu.' });
    } catch (delErr) {
      logger.error('[ADMIN] delete-warehouse delete error:', delErr);
      if (delErr && delErr.code) {
        return res.status(500).json({ error: delErr.message, code: delErr.code });
      }
      return res.status(500).json({ error: 'Błąd usuwania magazynu' });
    }
  } catch (err) {
    logger.error('[ADMIN] delete-warehouse error:', err);
    res.status(500).json({ error: 'Błąd usuwania magazynu' });
  }
});

// POST /api/admin/update-type
router.post('/update-type', async (req, res) => {
  const { oldType, newType } = req.body;
  if (!oldType || !newType) return res.status(400).json({ error: 'Brak danych' });
  try {
    // Find existing Type row for oldType
    const existing = await prisma.type.findUnique({ where: { name: oldType } });
    if (!existing) return res.status(404).json({ error: 'Nie znaleziono typu' });
    // Check if newType name already exists (and is not the same record)
    const conflict = await prisma.type.findUnique({ where: { name: newType } });
    if (conflict && conflict.id !== existing.id) return res.status(400).json({ error: 'Typ o takiej nazwie już istnieje' });
    // Update the Type row
    await prisma.type.update({ where: { id: existing.id }, data: { name: newType } });
    // Also update legacy product.type strings for compatibility
    await prisma.product.updateMany({ where: { type: oldType }, data: { type: newType } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[ADMIN] update-type error:', err);
    res.status(500).json({ error: 'Błąd aktualizacji typu' });
  }
});

// POST /api/admin/delete-type
router.post('/delete-type', async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Brak danych' });
  try {
    const found = await prisma.type.findUnique({ where: { name: type } });
    if (!found) return res.status(404).json({ error: 'Nie znaleziono typu' });
    const count = await prisma.product.count({ where: { OR: [{ typeId: found.id }, { type }] } });
    if (count > 0) return res.status(400).json({ error: 'Istnieją produkty przypisane do tego typu' });
    await prisma.type.delete({ where: { id: found.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[ADMIN] delete-type error:', err);
    res.status(500).json({ error: 'Błąd usuwania typu' });
  }
});

// POST /api/admin/create-warehouse
router.post('/create-warehouse', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.toString().trim()) return res.status(400).json({ error: 'Brak nazwy magazynu' });
  try {
    const trimmed = name.toString().trim();
    const capitalizeFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const newName = capitalizeFirst(trimmed);
    const exists = await prisma.warehouse.findFirst({ where: { name: newName } });
    if (exists) return res.status(400).json({ error: 'Magazyn o takiej nazwie już istnieje' });
    const created = await prisma.warehouse.create({ data: { name: newName } });
    res.json({ success: true, warehouse: created });
  } catch (err) {
    logger.error('[ADMIN] create-warehouse error:', err);
    res.status(500).json({ error: 'Błąd tworzenia magazynu' });
  }
});

// POST /api/admin/create-type
router.post('/create-type', async (req, res) => {
  const { type } = req.body;
  if (!type || !type.toString().trim()) return res.status(400).json({ error: 'Brak nazwy typu' });
  try {
    const trimmed = type.toString().trim();
    const exists = await prisma.type.findUnique({ where: { name: trimmed } });
    if (exists) return res.status(400).json({ error: 'Typ już istnieje' });
    const created = await prisma.type.create({ data: { name: trimmed } });
    res.json({ success: true, type: created });
  } catch (err) {
    logger.error('[ADMIN] create-type error:', err);
    res.status(500).json({ error: 'Błąd tworzenia typu' });
  }
});

module.exports = router;
