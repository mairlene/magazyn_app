const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('./lib/logger');

dotenv.config();

// Fail fast: require JWT_SECRET in production to avoid insecure fallback
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  try {
    logger.error('Missing required environment variable: JWT_SECRET. Aborting startup.');
  } catch (e) {
    // logger may not be available; fallback to stderr
    try { process.stderr.write('Missing required environment variable: JWT_SECRET. Aborting startup.\n'); } catch (e2) {}
  }
  process.exit(1);
}

const app = express();

// If the server is running behind a proxy (Cloudflare, nginx, etc.) and the
// proxy forwards the original client IP in X-Forwarded-For, express-rate-limit
// expects Express to have `trust proxy` enabled. Make this opt-in via the
// TRUST_PROXY env var so local development remains unchanged.
//
// IMPORTANT: setting `trust proxy` to the boolean `true` is intentionally
// permissive and triggers a validation in express-rate-limit. Prefer setting
// a safer value like a hop count (`1`) or a specific proxy list (e.g. 'loopback').
if (process.env.TRUST_PROXY) {
  const raw = process.env.TRUST_PROXY;
  // If user set `TRUST_PROXY=true` treat it as wanting a single-hop trust
  // (numeric `1`) to avoid the permissive boolean behavior.
  const trustValue = (raw === 'true') ? 1 : (isNaN(Number(raw)) ? raw : Number(raw));
  app.set('trust proxy', trustValue);
}

// Security headers - configure COEP/COOP to avoid forcing require-corp on all responses
// We still use helmet but disable the Cross-Origin-Embedder-Policy here because
// we only need relaxed cross-origin loading for images/uploads. If you need
// COEP for shared-array-buffer or other powerful features, re-enable it and
// ensure all cross-origin resources send the correct CORP/CORS headers.
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

// Lightweight tracing for all API requests. Disabled by default; enable by
// setting the environment variable API_TRACE=true. This avoids noisy logs
// (e.g. periodic health checks) in normal runs while still allowing easy
// tracing when diagnosing issues.
if (process.env.API_TRACE === 'true') {
  // Trace API requests, but allow callers (for example a service worker)
  // to opt out by sending the header `x-no-api-trace: 1`.
  app.use('/api', (req, _res, next) => {
      try {
      if (req.headers['x-no-api-trace'] === '1') return next();
      // tracing disabled by default; avoid noisy logs unless explicitly enabled
    } catch (e) {
      // swallow logging errors
    }
    next();
  });
}

// Parse JSON bodies (limit to reasonable size)
app.use(express.json({ limit: '5mb' }));

// Parse cookies (for future httpOnly cookie auth)
app.use(cookieParser());

// Log incoming API requests to help diagnose routing/forwarding issues
app.use('/api', (req, _res, next) => {
  try {
    // request logging placeholder
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// Rate limiter: protect auth endpoints from brute-force
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, require("./routes/authUser"));
app.use("/api/products-db", require("./routes/productsDb"));
// Product-related endpoints (grouped router)
app.use("/api/products", require("./routes/products/index.js"));
app.use("/api/warehouses", require("./routes/warehouses"));
app.use("/api/products/delete-from-warehouse", require("./routes/deleteFromWarehouse"));
app.use("/api/transfer", require("./routes/transfer"));
app.use("/api/user-actions", require("./routes/userActions"));
// deleteProduct and deleteFromWarehouse are now mounted under the
// grouped products router (e.g. /api/products/delete).
app.use("/api/use", require("./routes/use"));
app.use("/api/archive", require("./routes/archive"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/types", require("./routes/types"));
// Uploads router
app.use("/api/upload", require("./routes/uploads"));
app.use("/api/stock", require("./routes/updateStock"));
// API docs UI not mounted
// Serve uploads and set permissive cross-origin headers so images can be
// embedded/loaded from the public frontend (or proxied host). We set
// Access-Control-Allow-Origin and Cross-Origin-Resource-Policy here only for
// the uploads folder to keep the rest of the app's responses strict.
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  setHeaders: (res, filePath) => {
    // Allow the frontend origin (or '*' for public assets). Prefer setting a
    // specific origin via env in production for better security.
    const allowOrigin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    // Allow these resources to be used cross-origin (CORP)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Prevent aggressive caching of uploaded images so clients (and service workers)
    // revalidate the resource instead of serving stale copies. Make this configurable
    // via UPLOADS_CACHE_CONTROL; default to 'no-cache' which forces revalidation.
    const cacheControl = process.env.UPLOADS_CACHE_CONTROL || 'no-cache';
    res.setHeader('Cache-Control', cacheControl);
  }
}));

// Serve React build if present (safe: checks existence before mounting)
const buildPath = path.join(__dirname, '../client/build');
try {
    if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    // catch-all for client-side routing
   app.get('/*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    // client build not found - skip static mount
  }
} catch (err) {
  logger.error('[SERVER] error while mounting static build', err);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

// On first start, ensure basic seed data exists: default warehouses and default product types
// This keeps the UI usable when the DB is empty; the admin can later remove or modify them.
async function ensureSeedData() {
  try {
    const warehouseCount = await prisma.warehouse.count();
    if (warehouseCount === 0) {
      logger.warn('[SERVER] no warehouses found - creating default warehouse Magazyn główny');
      await prisma.warehouse.createMany({ data: [ { name: 'Magazyn główny' } ] });
    }

    const productCount = await prisma.product.count();
    if (productCount === 0) {
      logger.warn('[SERVER] no products found - creating default product types as placeholder products');
      // Create simple placeholder products that expose the desired types in the UI.
      const defaultTypes = ['Meble'];
      // Use a small descriptive name so admins can easily find and remove them later.
      const created = [];
      for (const t of defaultTypes) {
        const p = await prisma.product.create({ data: { type: t, name: `${t} (domyślny)`, size: null, imageUrl: null } });
        created.push(p);
      }

      // Create zero-quantity stock entries in the first warehouse so product lists remain consistent.
      const firstWarehouse = await prisma.warehouse.findFirst();
      if (firstWarehouse) {
        for (const p of created) {
          await prisma.stock.create({ data: { productId: p.id, warehouseId: firstWarehouse.id, quantity: 0 } });
        }
      }
    }
  } catch (err) {
    logger.error('[SERVER] error ensuring seed data', err);
  }
}

// Start server after ensuring seed data
(async () => {
  // In production we avoid automatically creating seed data unless
  // explicitly enabled via ENABLE_SEED=true. This prevents accidental
  // writes to a live database during deploys.
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SEED !== 'true') {
    logger.info('[SERVER] production mode: skipping seed data (set ENABLE_SEED=true to enable)');
  } else {
    await ensureSeedData();
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
})();

// Health endpoint for monitoring / readiness checks
app.get('/health', async (_req, res) => {
  try {
    // quick DB check
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ ok: true, db: true, time: Date.now() });
  } catch (err) {
    logger.error('[HEALTH] DB check failed', err && err.message ? err.message : err);
    return res.status(503).json({ ok: false, db: false, error: String(err) });
  }
});