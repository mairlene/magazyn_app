const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');

router.get("/", async (_req, res) => {
  try {
    const list = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
    res.json(list);
  } catch (e) {
    logger.error('[WAREHOUSES] Error fetching list:', e);
    res.status(500).json({ error: "Błąd pobierania magazynów" });
  }
});

// DELETE /api/warehouses/:id
// Deletes a warehouse only when it has no related records (stocks, cart items, archive, stock changes, transfers)
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Brak id magazynu' });
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) return res.status(404).json({ error: 'Nie znaleziono magazynu' });

    const stockCount = await prisma.stock.count({ where: { warehouseId: id } });
    const cartCount = await prisma.cartItem.count({ where: { warehouseId: id } });
    const archiveCount = await prisma.archive.count({ where: { warehouseId: id } });
    const stockChangeCount = await prisma.stockChange.count({ where: { warehouseId: id } });
    const transferCount = await prisma.transfer.count({ where: { OR: [{ fromWarehouseId: id }, { toWarehouseId: id }] } });

    if (stockCount > 0 || cartCount > 0 || archiveCount > 0 || stockChangeCount > 0 || transferCount > 0) {
      return res.status(400).json({ error: 'Magazyn ma powiązane rekordy i nie może być usunięty' });
    }

    await prisma.warehouse.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[WAREHOUSES] delete error:', err);
    res.status(500).json({ error: 'Błąd usuwania magazynu' });
  }
});

module.exports = router;