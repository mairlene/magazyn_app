// Helper for incremental import additions
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/products/import-add
// Accepts rows array and userId. Each row may use Polish or English field names.
router.post("/import-add", async (req, res) => {
  try {
    const { rows, userId } = req.body;
    if (!Array.isArray(rows) || !userId) {
      return res.status(400).json({ error: "Invalid data" });
    }
    for (const row of rows) {
      // Support both Polish and English column names
      const name = row.name || row.Nazwa;
      const size = row.size || row.Rozmiar || "";
      const type = row.type || row.Typ || "";
      const unit = row.unit || row.Jednostka || "";
      const warehouseName = row.warehouse || row.Magazyn;
      const quantity = row.quantity || row.Ilość || 0;

      // Find or create warehouse by name (only when provided)
      let warehouse = null;
      if (warehouseName) {
        warehouse = await prisma.warehouse.findFirst({ where: { name: warehouseName } });
        if (!warehouse) {
          warehouse = await prisma.warehouse.create({ data: { name: warehouseName } });
        }
      }

      // Find or create product by [name, size]
      // Ensure type exists and get typeId
      let typeId = null;
      if (type) {
        let t = await prisma.type.findUnique({ where: { name: type } });
        if (!t) {
          try { t = await prisma.type.create({ data: { name: type } }); } catch (e) { t = await prisma.type.findUnique({ where: { name: type } }); }
        }
        if (t) typeId = t.id;
      }

      let product = await prisma.product.findFirst({ where: { name, size } });
      if (!product) {
        const pdata = { name, size, type, unit };
        if (typeId) pdata.typeId = typeId;
        product = await prisma.product.create({ data: pdata });
      } else {
        if (typeId && !product.typeId) {
          try { await prisma.product.update({ where: { id: product.id }, data: { typeId, type: product.type || type } }); } catch (e) {}
        }
      }

      // Find stock for product in warehouse and update or create
      if (warehouse) {
        let stock = await prisma.stock.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
        if (stock) {
          await prisma.stock.update({ where: { id: stock.id }, data: { quantity: stock.quantity + Number(quantity) } });
        } else {
          await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: Number(quantity) } });
        }
        // Log to stockChange
        await prisma.stockChange.create({
          data: {
            type: "add",
            quantity: Number(quantity),
            productId: product.id,
            warehouseId: warehouse.id,
            userId: Number(userId)
          }
        });
      } else {
        // No warehouse provided -> only ensure product exists (no stock created)
      }
    }
    res.json({ success: true });
  } catch (e) {
    logger.error('[API /api/products/import-add] Server error:', e);
    res.status(500).json({ error: "Product import error" });
  }
});

module.exports = router;
