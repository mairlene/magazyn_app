const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
// const { authMiddleware } = require('../middleware/auth');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

/**
 * @openapi
 * /api/products-db:
 *   get:
 *     summary: List products (optionally paginated) with stock rows
 *     tags:
 *       - products
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: integer
 *         description: Filter stocks by warehouse id
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query matched against name/size/type
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: 'type|name|size'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *         description: 'available|unavailable'
 *     responses:
 *       200:
 *         description: List of product stock rows (and pagination meta when requested)
 */
// GET /api/products-db?warehouseId=1 or /api/products-db/page/:page
// router.get(["/","/page/:page"], authMiddleware, async (req, res) => {
router.get(["/", "/page/:page"], async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;
    // support page in path (/page/:page) or query (?page=)
    const pageRaw = req.params && req.params.page ? req.params.page : (req.query.page ?? null);
    const page = pageRaw ? Math.max(1, Number(pageRaw)) : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;
    // Additional server-side filters/sort
    let q = req.query.q ? String(req.query.q).trim() : null;
    const sort = req.query.sort ? String(req.query.sort).trim() : null; // 'type'|'name'|'size'
    const typeFilter = req.query.type ? String(req.query.type).trim() : null;
    const availability = req.query.availability ? String(req.query.availability).trim() : null; // 'available'|'unavailable'|null

    // Server-side validation for search query length and size limits
    const MIN_Q_LENGTH = 3;
    const MAX_Q_LENGTH = 100;
    if (q && q.length > MAX_Q_LENGTH) q = q.slice(0, MAX_Q_LENGTH);
    if (q && q.length < MIN_Q_LENGTH) q = null;

    // Build product-level WHERE clause using optional filters
    const productWhere = {};
    if (q) {
      // search in name, size, type or related type name
      productWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { size: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } },
        { typeRel: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (typeFilter) {
      productWhere.AND = productWhere.AND || [];
      productWhere.AND.push({ OR: [{ type: typeFilter }, { typeRel: { name: typeFilter } }] });
    }
    if (availability === 'available') {
      productWhere.stocks = warehouseId ? { some: { warehouseId } } : { some: {} };
    }
    if (availability === 'unavailable') {
      productWhere.stocks = warehouseId ? { none: { warehouseId } } : { none: {} };
    }

    // Choose ordering where possible. Prisma supports ordering by related field.
    let orderBy = undefined;
    if (sort === 'type') orderBy = [{ typeRel: { name: 'asc' } }, { name: 'asc' }];
    else if (sort === 'name') orderBy = { name: 'asc' };

    // Pagination support with safe defaults to avoid returning large payloads
    let products;
    let totalProducts = null;
    const requestedLimit = limit;
    const DEFAULT_LIMIT = 200;
    const MAX_LIMIT = 1000;
    const effectiveLimit = requestedLimit ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    if (page) {
      totalProducts = await prisma.product.count({ where: productWhere });
      products = await prisma.product.findMany({
        where: productWhere,
        skip: (page - 1) * effectiveLimit,
        take: effectiveLimit,
        orderBy,
        include: {
          stocks: {
            where: warehouseId ? { warehouseId } : {},
            include: { warehouse: true },
          },
          typeRel: true,
        },
      });
    } else {
      // No page requested -> return safe default slice
      products = await prisma.product.findMany({
        where: productWhere,
        orderBy,
        take: effectiveLimit,
        include: {
          stocks: {
            where: warehouseId ? { warehouseId } : {},
            include: { warehouse: true },
          },
          typeRel: true,
        },
      });
    }

    // Build a result list: one entry per stock row; if a product has no stocks, include one entry with availableQty = 0
    const result = [];
    for (const p of products) {
      const typeName = (p.typeRel && p.typeRel.name) || p.type;
      if (p.stocks && p.stocks.length > 0) {
        for (const s of p.stocks) {
          result.push({
            id: p.id,
            name: p.name,
            size: p.size,
            type: typeName,
            availableQty: s.quantity || 0,
            warehouseId: s.warehouseId,
            warehouse: s.warehouse?.name || null,
            imageThumb: p.imageThumb || null,
            imageUrl: p.imageUrl || null,
          });
        }
      } else {
        // no stock rows -> include product as unavailable (no warehouse)
        result.push({
          id: p.id,
          name: p.name,
          size: p.size,
          type: typeName,
          availableQty: 0,
          warehouseId: null,
          warehouse: null,
          imageThumb: p.imageThumb || null,
          imageUrl: p.imageUrl || null,
        });
      }
    }

    result.sort((a, b) => {
      // typ
      if ((a.type || "") < (b.type || "")) return -1;
      if ((a.type || "") > (b.type || "")) return 1;
      // nazwa
      if ((a.name || "") < (b.name || "")) return -1;
      if ((a.name || "") > (b.name || "")) return 1;
      // rozmiar jako liczba
      const extractNumber = (str) => {
        if (!str) return NaN;
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : NaN;
      };
      const numA = extractNumber(a.size);
      const numB = extractNumber(b.size);
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numA - numB;
    });

    const payload = { products: result };
    if (totalProducts !== null) payload.totalProducts = totalProducts;
    if (page !== null) payload.page = page;
    payload.limit = effectiveLimit;
    if (!page) payload.truncated = products.length === effectiveLimit;
    res.json(payload);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Błąd pobierania produktów z bazy" });
  }
});

module.exports = router;