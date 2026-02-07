export const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$|\s+/g, '');

// Helper to build full request URL robustly. If BASE is empty, returns the
// provided path (which should begin with '/'). If BASE is set, it will be
// prefixed (no duplicated slashes). Use this to avoid subtle errors when
// REACT_APP_API_URL is present or absent.
export function buildUrl(path) {
  if (!path) path = '';
  if (!path.startsWith('/')) path = '/' + path;
  if (!BASE) return path;
  // BASE has been normalized to have no trailing slash above
  return `${BASE}${path}`;
}

// Minimal: do not print runtime BASE information in console.

// Helper: include Authorization header when a token is present in localStorage
// Get auth headers. Prefer an explicit `token` argument; fall back to reading
// from localStorage for backward compatibility. Avoids sprinkling
// localStorage access across the codebase and allows callers to provide
// a token from `useSession`.
export function getAuthHeaders(token) {
  if (typeof window === 'undefined') return {};
  const t = token || (() => { try { return localStorage.getItem('token'); } catch (_) { return null; } })();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function getWarehouses() {
  // Simple in-memory cache to avoid duplicate network requests when multiple components
  // call getWarehouses at the same time or on mount. The cache lives for the page
  // lifetime; call `invalidateWarehousesCache()` to force a reload if needed.
  if (typeof window === 'undefined') {
    const headers = getAuthHeaders();
    const url = buildUrl('/api/warehouses');
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error("Błąd pobierania magazynów");
    return r.json();
  }
  if (!getWarehouses._promise && getWarehouses._cache) {
    return getWarehouses._cache;
  }
  if (getWarehouses._promise) return getWarehouses._promise;
  const headers = getAuthHeaders();
  const url = buildUrl('/api/warehouses');
  // fetching warehouses
  getWarehouses._promise = fetch(url, { headers })
    .then(r => {
      if (!r.ok) throw new Error('Błąd pobierania magazynów');
      return r.json();
    })
    .then(data => {
      getWarehouses._cache = data;
      getWarehouses._promise = null;
      return data;
    })
    .catch(err => {
      getWarehouses._promise = null;
      throw err;
    });
  return getWarehouses._promise;
}

// Allow other modules to invalidate cache when warehouses change
export function invalidateWarehousesCache() {
  if (typeof getWarehouses !== 'function') return;
  getWarehouses._cache = null;
  getWarehouses._promise = null;
}

export async function getProductsDb(warehouseId, page, limit, options = {}) {
  // Cancel previous in-flight products request to avoid spamming the server
  if (typeof window !== 'undefined') {
    try {
      if (!getProductsDb._lastController) getProductsDb._lastController = null;
      if (getProductsDb._lastController) {
        try { getProductsDb._lastController.abort(); } catch (e) {}
        getProductsDb._lastController = null;
      }
      getProductsDb._lastController = new AbortController();
    } catch (e) {
      // AbortController might not be available in some environments; ignore
      getProductsDb._lastController = null;
    }
  }
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouseId', warehouseId);
  if (limit) params.set('limit', String(limit));
  // options may include q, sort, type, availability
  const q = options.q || options.q === '' ? options.q : null;
  const sort = options.sort || null;
  const type = options.type || null;
  const availability = options.availability || null;
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);
  if (type) params.set('type', type);
  if (availability) params.set('availability', availability);
  // prefer path-based page URLs for clarity (e.g. /api/products-db/page/2)
  const query = params.toString() ? ('?' + params.toString()) : '';
  const basePath = page ? `/api/products-db/page/${encodeURIComponent(page)}` : '/api/products-db';
  const url = buildUrl(basePath + query);
  // fetching products DB
  const headers = getAuthHeaders();
  const signal = (getProductsDb._lastController && getProductsDb._lastController.signal) ? getProductsDb._lastController.signal : undefined;
  let r;
  try {
    r = await fetch(url, { headers, signal });
  } catch (e) {
    // If the request was aborted, return null so callers can ignore the result
    if (e && (e.name === 'AbortError' || e.code === 'ERR_ABORTED')) return null;
    throw e;
  } finally {
    // clear controller if it matches the one used for this request
    try {
      if (getProductsDb._lastController && getProductsDb._lastController.signal === signal) getProductsDb._lastController = null;
    } catch (e) {}
  }
  // check response status programmatically
  if (!r.ok) throw new Error("Błąd pobierania produktów z bazy");
  const data = await r.json();

  // Defensive sanitization: ensure no product field is a plain object (which would crash React when rendered).
  if (data && Array.isArray(data.products)) {
    const sanitized = data.products.map(p => {
      const out = {};
      for (const k of Object.keys(p)) {
        const v = p[k];
        if (v !== null && typeof v === 'object') {
          // convert objects to JSON string to avoid React trying to render them directly
          try {
            out[k] = JSON.stringify(v);
            // sanitized a complex product field
          } catch (e) {
            out[k] = String(v);
          }
        } else out[k] = v;
      }
      return out;
    });
    return { ...data, products: sanitized };
  }

  return data;
}

export async function getTypes() {
  const url = buildUrl('/api/types');
  const headers = getAuthHeaders();
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error('Błąd pobierania typów');
  const d = await r.json();
  if (d && d.types) return d.types;
  return d.types || [];
}

// Fetch normalized stocks for a product (returns { success, stocks, count } or throws)
export async function getProductStocks(productId) {
  if (!productId) throw new Error('Missing productId');
  const headers = { Accept: 'application/json', ...getAuthHeaders() };
  const url = buildUrl(`/api/products/${productId}/stocks`);
  // fetching product stocks
  const r = await fetch(url, { headers });
  const text = await r.text();
  const contentType = r.headers.get('content-type') || '';
  if (!r.ok) {
    // try to extract server error message
    const msg = text || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON response for stocks but got ' + contentType + ' — ' + text.slice(0, 300));
  }
  return JSON.parse(text);
}

// Keep a short-lived map of inflight requests to avoid spamming the same
// endpoint when many components request the same product stocks at once.
const _inflightStocks = {};

export async function getProductStocksDedup(productId, { force = false } = {}) {
  if (!productId) throw new Error('Missing productId');
  if (!force && _inflightStocks[productId]) return _inflightStocks[productId];

  _inflightStocks[productId] = (async () => {
    try {
      const res = await getProductStocks(productId);
      return res;
    } finally {
      // clear entry regardless of success/failure so future calls can retry
      delete _inflightStocks[productId];
    }
  })();

  return _inflightStocks[productId];
}

// Fetch stock change history for a product (returns { success, history, count } or throws)
export async function getProductHistory(productId) {
  if (!productId) throw new Error('Missing productId');
  const headers = { Accept: 'application/json', ...getAuthHeaders() };
  const url = buildUrl(`/api/products/${productId}/history`);
  // fetching product history
  const r = await fetch(url, { headers });
  const text = await r.text();
  const contentType = r.headers.get('content-type') || '';
  if (!r.ok) {
    const msg = text || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON response for history but got ' + contentType + ' — ' + text.slice(0, 300));
  }
  return JSON.parse(text);
}

// Fetch only the most recent stock change for a product
export async function getProductLastHistory(productId) {
  if (!productId) throw new Error('Missing productId');
  const headers = { Accept: 'application/json', ...getAuthHeaders() };
  const url = buildUrl(`/api/products/${productId}/history/latest`);
  // fetching product last history
  const r = await fetch(url, { headers });
  const text = await r.text();
  const contentType = r.headers.get('content-type') || '';
  if (!r.ok) {
    const msg = text || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON response for last-history but got ' + contentType + ' — ' + text.slice(0, 300));
  }
  return JSON.parse(text);
}


// Resolve an image/url that may be stored as a relative path ("/uploads/...")
// or as an absolute URL. Returns an absolute URL suitable for <img src>.
export function resolveImageUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed === '') return '';
  // If it's an absolute URL, but points to an uploads path, prefer resolving
  // it to the local API `BASE` so we don't rely on external hosts.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (u.pathname && u.pathname.startsWith('/uploads/')) {
        return BASE ? `${BASE}${u.pathname}` : u.pathname;
      }
    } catch (e) {
      // invalid URL -> fall through and return original
    }
    return trimmed;
  }
  // handle relative paths with or without a leading slash (e.g. "/uploads/x.jpg" or "uploads/x.jpg")
  if (trimmed.startsWith('/')) return BASE ? `${BASE}${trimmed}` : trimmed;
  // if it's a relative path without leading slash, prefix with slash + BASE when available
  if (!trimmed.startsWith('/')) {
    return BASE ? `${BASE}/${trimmed}` : `/${trimmed}`;
  }
  // fallback: return as-is
  return trimmed;
}

