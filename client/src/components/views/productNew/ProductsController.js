import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getProductsDb, getWarehouses, getTypes } from '../../../services/api';
import aggregateProducts from '../../common/aggregateProducts';

export default function ProductsController({ children }) {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ Nazwa: '', Rozmiar: '', Typ: '' });
  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('type');
  const [serverTotal, setServerTotal] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [types, setTypes] = useState([]);
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const fetchProducts = useCallback(async (pageArg) => {
    setLoading(true);
    try {
      const pageParam = pageArg || (params.page ? Number(params.page) : currentPage) || 1;
      const options = {
        q: (filters.Nazwa || '').toString().trim() || null,
        sort: sortBy || null,
        type: (filters.Typ || '').toString().trim() || null,
        availability: availability || null,
      };
      const data = await getProductsDb(null, pageParam, itemsPerPage, options);
      setRawProducts(data.products || []);
      setServerTotal(data && data.totalProducts ? Number(data.totalProducts) : null);
      if (pageParam && !Number.isNaN(pageParam)) setCurrentPage(pageParam);
    } catch (e) {
      console.warn('[ProductsController] fetch failed', e);
      setRawProducts([]);
      setServerTotal(null);
    } finally {
      setLoading(false);
    }
  }, [params.page, currentPage, filters, availability, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // sync page from URL param (if present) and update on pathname changes
  useEffect(() => {
    try {
      const pageParam = params.page || (() => {
        const m = location.pathname.match(/\/(\d+)(?:\/)?$/);
        return m ? m[1] : null;
      })();
      const p = pageParam ? parseInt(pageParam, 10) : NaN;
      if (!Number.isNaN(p) && p > 0) setCurrentPage(p);
    } catch (e) {
      // ignore
    }
  }, [location.pathname, params.page]);

  // Check for a pending filter set by other views (eg. TypesView). If present apply it once and clear.
  useEffect(() => {
    try {
      const pending = localStorage.getItem('pendingFilterType');
      if (pending) {
        setFilters(prev => ({ ...prev, Typ: pending }));
        try { localStorage.removeItem('pendingFilterType'); } catch (_) {}
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // track filter changes silently
  useEffect(() => {}, [filters]);

  // When page or filters/sort/availability change, refetch products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // fetch warehouses and types in parallel
    let mounted = true;
    (async () => {
      try {
        const [ws, ts] = await Promise.all([getWarehouses().catch(() => []), getTypes().catch(() => [])]);
        if (!mounted) return;
        setWarehouses(ws || []);
        // getTypes may return array of objects { id, name } or strings; normalize to array of names (strings)
        if (Array.isArray(ts)) {
          const names = ts.map(t => (typeof t === 'string' ? t : (t && (t.name ?? (t.id ?? String(t)))))).map(String);
          setTypes(names);
        } else {
          setTypes([]);
        }
      } catch (e) {
        console.warn('[ProductsController] fetch meta failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const products = useMemo(() => aggregateProducts(rawProducts), [rawProducts]);

  const norm = (s) => (s ?? '').toString().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');

  const filtered = useMemo(() => {
    let list = products || [];
    const nameFilter = (filters.Nazwa || '').toString().trim();
    const filterType = (filters.Typ || '').toString().trim();
    const filterSize = (filters.Rozmiar || '').toString().trim();

    // Apply filters as an AND across fields: name (tokens must appear in product name), type (partial), and size.
    // Name: substring match similar to EditView
    if (nameFilter) {
      const q = norm(nameFilter);
      list = list.filter(p => (norm(p.name || p.Nazwa || '')).includes(q));
    }

    // Type: match exactly (normalized) as EditView does
    if (filterType) {
      const qt = norm(filterType);
      list = list.filter(p => norm(p.type ?? '') === qt);
    }

    // Size: match either the explicit size field or the product name (some items store size in name)
    if (filterSize) {
      const qs = norm(filterSize);
      list = list.filter(p => {
        const sizeField = norm(p.size || p.Rozmiar || '');
        const nameField = norm(p.name || p.Nazwa || '');
        return (sizeField && sizeField.includes(qs)) || (nameField && nameField.includes(qs));
      });
    }
    if (availability === 'available') {
      list = list.filter(p => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }
    if (availability === 'unavailable') {
      list = list.filter(p => !(p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn)));
    }
    const isAvailable = (p) => (p.rawRows || []).some(r => Boolean(r.warehouseId || r.warehouse || r.Magazyn));
    list = [...list].sort((a, b) => {
      if (availability === 'all') {
        const avA = isAvailable(a);
        const avB = isAvailable(b);
        if (avA !== avB) return avA ? -1 : 1;
      }
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'size') {
        const numa = Number((a.size || '').replace(/[^0-9]/g, '')) || 0;
        const numb = Number((b.size || '').replace(/[^0-9]/g, '')) || 0;
        return numa - numb;
      }
      return 0;
    });
    return list;
  }, [products, filters, availability, sortBy]);

  const totalPages = serverTotal ? Math.max(1, Math.ceil(serverTotal / itemsPerPage)) : Math.max(1, Math.ceil((filtered.length || 0) / itemsPerPage));
  const items = serverTotal ? products : filtered.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const refresh = () => fetchProducts();
  const setFilter = (f) => {
    setFilters(prev => ({ ...prev, ...f }));
    try {
      const base = location.pathname.replace(/\/(new|\d+)$/,'');
      navigate(`${base}/1`);
    } catch (e) {}
  };
  const setSortByWrapped = (v) => { setSortBy(v); try { const base = location.pathname.replace(/\/(new|\d+)$/,''); navigate(`${base}/1`); } catch (e) {} };
  const setAvailabilityWrapped = (v) => { setAvailability(v); try { const base = location.pathname.replace(/\/(new|\d+)$/,''); navigate(`${base}/1`); } catch (e) {} };
  const setPage = (p) => {
    setCurrentPage(p);
    try {
      const base = location.pathname.replace(/\/(new|\d+)$/,'');
      navigate(`${base}/${p}`);
    } catch (e) {
      // ignore navigation errors
    }
  };
  const toggleViewMode = () => setViewMode(v => (v === 'list' ? 'card' : 'list'));
  const setViewModeDirect = (v) => setViewMode(v);

  return children({
    items,
    totalCount: filtered.length || 0,
    totalPages,
    currentPage,
    setPage,
    viewMode,
    toggleViewMode,
    setViewMode: setViewModeDirect,
    sortBy,
    setSortBy: setSortByWrapped,
    availability,
    setAvailability: setAvailabilityWrapped,
    setFilter,
    filters,
    refresh,
    loading
    , warehouses, types
  });
}
