// Import action resolution endpoint
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/products/import-action
// { action: "increase" | "reject", product: { Nazwa, Typ, Magazyn, IlośćImportowana } }
router.post("/import-action", async (req, res) => {
  try {
    const { action, product } = req.body;
    if (!action || !product) return res.status(400).json({ error: "Brak danych" });

    // Find product by name + type and include stocks with warehouse to find the correct stock record
    const found = await prisma.product.findFirst({
      where: {
        name: product.Nazwa,
        type: product.Typ,
      },
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!found) return res.status(404).json({ error: "Produkt nie znaleziony" });

    const warehouseName = (product.Magazyn || product.warehouse || "").toString().trim();
    const matchingStock = (found.stocks || []).find(s => String(s.warehouse?.name || "").trim() === warehouseName);
    if (!matchingStock) return res.status(404).json({ error: "Stan produktu w magazynie nie znaleziony" });

    if (action === "increase") {
      await prisma.stock.update({
        where: { id: matchingStock.id },
        data: { quantity: Number(matchingStock.quantity) + Number(product.IlośćImportowana) },
      });
      return res.json({ success: true });
    }
    // Odrzuć - nic nie robimy
    return res.json({ success: true });
  } catch (e) {
    logger.error('[API /api/products/import-action] Error:', e);
    res.status(500).json({ error: "Błąd akcji importu" });
  }
});

module.exports = router;
