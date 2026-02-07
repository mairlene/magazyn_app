// Legacy import endpoint (pre-scan import)
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require('../lib/logger');

// POST /api/products/import
router.post("/import", async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: "Brak danych" });
    const duplicates = [];
    for (const row of rows) {
      const warehouseName = (row.Magazyn || row.warehouse || "").toString().trim();
      // Find product by name + type, then check its stocks for the given warehouse
      const found = await prisma.product.findFirst({
        where: {
          name: row.Nazwa,
          type: row.Typ,
        },
        include: {
          stocks: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      if (found && warehouseName) {
        const matchingStock = (found.stocks || []).find(s => {
          return String(s.warehouse?.name || "").trim() === String(warehouseName).trim();
        });
        if (matchingStock) {
          duplicates.push({
            Nazwa: row.Nazwa,
            Typ: row.Typ,
            Magazyn: warehouseName,
            IlośćBazowa: matchingStock.quantity || 0,
            IlośćImportowana: row.Ilość,
            raw: row
          });
        }
      }
    }
    res.json({ duplicates });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Błąd importu" });
  }
});

module.exports = router;
