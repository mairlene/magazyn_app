const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/products/import-full
// Accepts JSON: { rows: [ { Nazwa, Rozmiar, Typ, Magazyn, Ilość } ], userId, options }
// Note: any ImageUrl value present in Excel is ignored; products will have imageUrl = null unless set later.
router.post("/import-full", async (req, res) => {
  try {
    const { rows, userId, options = {} } = req.body;
    if (!Array.isArray(rows) || !userId) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const updateMode = options.updateMode === 'set' ? 'set' : 'add'; // 'add' (default) or 'set'
    const createWarehouses = options.createWarehouses !== false; // default true

    const summary = {
      processed: 0,
      createdProducts: 0,
      createdWarehouses: 0,
      createdStocks: 0,
      updatedStocks: 0,
      errors: 0,
    };

    const resultRows = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      const rowIndex = i + 1;
      const name = (raw.Nazwa || raw.name || raw.Name || "").toString().trim();
      const size = (raw.Rozmiar || raw.size || raw.Size || "").toString().trim();
      const type = (raw.Typ || raw.type || raw.Type || "").toString().trim();
      const warehouseName = (raw.Magazyn || raw.warehouse || raw.Warehouse || raw.Lokalizacja || "").toString().trim();
      const quantity = Number(raw.Ilość ?? raw.quantity ?? raw.Quantity ?? 0) || 0;
      // Ensure we do NOT use any ImageUrl value from Excel
      const imageUrl = null;

      summary.processed += 1;

      if (!name) {
        summary.errors += 1;
        resultRows.push({ row: rowIndex, status: 'error', message: 'Brak nazwy (Nazwa) w wierszu' });
        continue;
      }

      try {
        // Ensure warehouse exists
        let warehouse = null;
        if (warehouseName) {
          warehouse = await prisma.warehouse.findFirst({ where: { name: warehouseName } });
          if (!warehouse) {
            if (createWarehouses) {
              warehouse = await prisma.warehouse.create({ data: { name: warehouseName } });
              summary.createdWarehouses += 1;
            } else {
              resultRows.push({ row: rowIndex, status: 'error', message: `Magazyn "${warehouseName}" nie istnieje` });
              summary.errors += 1;
              continue;
            }
          }
        }

        // Ensure Type exists and get typeId
        let typeId = null;
        if (type) {
          let t = await prisma.type.findUnique({ where: { name: type } });
          if (!t) {
            try {
              t = await prisma.type.create({ data: { name: type } });
              summary.createdTypes = (summary.createdTypes || 0) + 1;
            } catch (e) {
              t = await prisma.type.findUnique({ where: { name: type } });
            }
          }
          if (t) typeId = t.id;
        }

        // Find or create product by unique constraint name_size
        let product = null;
        try {
          product = await prisma.product.findUnique({ where: { name_size: { name, size } } });
        } catch (e) {
          // If schema doesn't have name_size unique, fallback to findFirst
          product = await prisma.product.findFirst({ where: { name, size } });
        }

        if (!product) {
          const pdata = { name, size, imageUrl };
          if (type) pdata.type = type;
          if (typeId) pdata.typeId = typeId;
          product = await prisma.product.create({ data: pdata });
          summary.createdProducts += 1;
        } else {
          // ensure we do not overwrite existing imageUrl with Excel data (imageUrl remains as is)
          if (typeId && !product.typeId) {
            try { await prisma.product.update({ where: { id: product.id }, data: { typeId, type: product.type || type } }); } catch (e) {}
          }
        }

        // If no warehouse specified, we only create product and do not create stock
        if (!warehouse) {
          resultRows.push({ row: rowIndex, status: 'createdProductOnly', productId: product.id });
          continue;
        }

        // Stock handling
        let stock = await prisma.stock.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
        if (stock) {
          const newQty = updateMode === 'set' ? Number(quantity) : Number(stock.quantity) + Number(quantity);
          await prisma.stock.update({ where: { id: stock.id }, data: { quantity: newQty } });
          summary.updatedStocks += 1;
          // record change
          await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId } });
          resultRows.push({ row: rowIndex, status: 'updated', productId: product.id, warehouseId: warehouse.id, quantity: newQty });
        } else {
          const created = await prisma.stock.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: Number(quantity) } });
          summary.createdStocks += 1;
          await prisma.stockChange.create({ data: { type: 'import', quantity: Number(quantity), productId: product.id, warehouseId: warehouse.id, userId } });
          resultRows.push({ row: rowIndex, status: 'created', productId: product.id, warehouseId: warehouse.id, quantity: created.quantity });
        }
      } catch (e) {
        summary.errors += 1;
        resultRows.push({ row: rowIndex, status: 'error', message: e.message || 'Błąd przetwarzania wiersza' });
      }
    }

    return res.json({ success: true, summary, rows: resultRows });
  } catch (e) {
    logger.error('[API /api/products/import-full] Server error:', e);
    return res.status(500).json({ error: 'Import error' });
  }
});

module.exports = router;
