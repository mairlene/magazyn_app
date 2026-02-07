/* *** used endpoint ***
  GET /api/warehouses            -> returns list of warehouses (used by getWarehouses)
  GET /api/products-db?warehouseId=  -> returns products from DB (used by getProductsDb)
*/
import React, { useEffect, useMemo, useState } from 'react';
import { getWarehouses, getProductsDb, BASE, getAuthHeaders } from '../../services/api';
import { buildSearchFilter, normalizeString } from '../common/searchHelpers';
import ProductFilterBar from '../common/ProductFilterBar';
import ProductOptionsBar from '../common/ProductOptionsBar';
import MassActionBar from '../common/MassActionBar';
import { useToast } from '../common/ToastContext';
import ItemGrid from '../product/ItemGrid';
import Pagination from './pagination';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// actionView: simplified inventory-like view (visible to experimental user)
export default function ActionView({ onBack, user, setView, initialFilterWarehouse = null, token = null }) {
  const [warehouses, setWarehouses] = useState([]);
  const [productsDb, setProductsDb] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [sortBy, setSortBy] = useState('type');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'list');
  const [currentPage, setCurrentPage] = useState(1);

  // mass selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [massQuantities, setMassQuantities] = useState({});
  const [massActionMode, setMassActionMode] = useState('use'); // 'use' | 'transfer'
  const [transferWarehouseId, setTransferWarehouseId] = useState(null);
  const { showToast } = useToast();

  const itemsPerPage = 60;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ws, prodResp] = await Promise.all([getWarehouses(), getProductsDb(null, 1, itemsPerPage)]);
        if (!mounted) return;
        setWarehouses(ws || []);
        setProductsDb((prodResp && prodResp.products) || []);
        // default warehouse selection: user's assigned warehouse if present
        // prefer explicit initialFilterWarehouse if provided (e.g., opened from header)
        if (initialFilterWarehouse) setFilterWarehouse(initialFilterWarehouse);
        else if (user && user.userWarehouse) setFilterWarehouse(user.userWarehouse);
      } catch (err) {
        console.error('[actionView] data fetch error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, initialFilterWarehouse]);

  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);

  const types = useMemo(() => Array.from(new Set(productsDb.map(p => p.type).filter(Boolean))), [productsDb]);
  const warehousesList = useMemo(() => warehouses.map(w => w.name), [warehouses]);

  const filtered = useMemo(() => {
    let list = productsDb || [];
    // Tokenized, diacritics-insensitive search (shared helper)
    if ((search || '').trim()) {
      const predicate = buildSearchFilter(search);
      list = list.filter(predicate);
    }
    if (filterType) list = list.filter(p => normalizeString(p.type ?? '') === normalizeString(filterType));
    if (filterWarehouse) list = list.filter(p => normalizeString(p.warehouse ?? '') === normalizeString(filterWarehouse));
    // sort
    list = [...list].sort((a, b) => {
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
  }, [productsDb, search, filterType, filterWarehouse, sortBy]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handleSelectCheckbox = (stockKey) => {
    setSelectedIds((prev) => {
      if (prev.includes(stockKey)) return prev.filter(id => id !== stockKey);
      // add default quantity 1 when selecting
      setMassQuantities((mq) => ({ ...mq, [stockKey]: mq[stockKey] || 1 }));
      return [...prev, stockKey];
    });
  };

  const handleMassQuantityChange = (stockKey, value) => {
    setMassQuantities((prev) => ({ ...prev, [stockKey]: value }));
  };

  // When changing warehouse filter, clear any mass selection to avoid acting on items from the previous warehouse
  const handleSetFilterWarehouse = (value) => {
    setFilterWarehouse(value);
    setCurrentPage(1);
    setSelectedIds([]);
    setMassQuantities({});
  };

  const totalSelectedQuantity = selectedIds.reduce((sum, id) => {
    const v = massQuantities[id];
    const n = typeof v === 'number' ? v : Number(v || 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const handleMassConfirm = async (note) => {
    if (selectedIds.length === 0) {
      showToast && showToast('Brak zaznaczonych produktów', { type: 'error' });
      return;
    }

    if (massActionMode === 'transfer') {
      if (!transferWarehouseId) {
        showToast && showToast('Wybierz magazyn docelowy przed przeniesieniem', { type: 'error' });
        return;
      }

      const toWarehouseId = Number(transferWarehouseId);

      // Block: if any selected item's source warehouse equals the target, abort and notify
      for (const stockKey of selectedIds) {
        const parts = stockKey.split('-');
        const fromWarehouseId = Number(parts[1]);
        if (fromWarehouseId === toWarehouseId) {
          showToast && showToast('Produkty znajdują się już w wybranym magazynie', { type: 'error' });
          return;
        }
      }

      const userId = (user && user.id) ? user.id : Number(localStorage.getItem('userId') || 0);
      if (!userId) {
        showToast && showToast('Brak zalogowanego użytkownika (userId)', { type: 'error' });
        return;
      }

      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(token) };
      const results = { success: 0, failed: 0, totalQuantity: 0, errors: [] };

      for (const stockKey of selectedIds) {
        try {
          const parts = stockKey.split('-');
          const productId = Number(parts[0]);
          const fromWarehouseId = Number(parts[1]);
          const qty = Number(massQuantities[stockKey] || 1) || 1;

          // initial transfer attempt (no confirmMerge)
          let res = await fetch(`${BASE || ''}/api/transfer`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId, fromWarehouseId, toWarehouseId, quantity: qty, userId })
          });

          let json = null;
          try { json = await res.json(); } catch (e) { json = null; }

          if (res.ok && json && json.conflict) {
            // server signals conflict (target has product). Retry with confirmMerge to merge quantities.
            const res2 = await fetch(`${BASE || ''}/api/transfer`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ productId, fromWarehouseId, toWarehouseId, quantity: qty, userId, confirmMerge: true })
            });
            if (!res2.ok) {
              let errMsg = res2.statusText || 'Błąd serwera';
              try { const j = await res2.json(); errMsg = j?.error || j?.message || errMsg; } catch (_) {}
              results.failed += 1;
              results.errors.push({ stockKey, status: res2.status, message: errMsg });
              continue;
            }
            // success after merge
            results.success += 1;
            results.totalQuantity += qty;
            continue;
          }

          if (!res.ok) {
            let errMsg = res.statusText || 'Błąd serwera';
            try { errMsg = json?.error || json?.message || errMsg; } catch (_) {}
            results.failed += 1;
            results.errors.push({ stockKey, status: res.status, message: errMsg });
          } else {
            results.success += 1;
            results.totalQuantity += qty;
          }
        } catch (err) {
          results.failed += 1;
          results.errors.push({ stockKey, message: err?.message || String(err) });
        }
      }

      // Refresh products from server to reflect updated stocks
      try {
        const prodResp = await getProductsDb(null, 1, itemsPerPage);
        setProductsDb((prodResp && prodResp.products) || []);
      } catch (err) {
        console.error('[actionView] refresh products after transfer error', err);
      }

      // Show summary toast
      if (results.failed === 0) {
        showToast && showToast(`Przeniesiono ${results.success} produktów ${results.totalQuantity} sztuk`, { type: 'success' });
      } else if (results.success > 0) {
        showToast && showToast(`Częściowo przeniesiono ${results.success} produktów ${results.totalQuantity} sztuk; ${results.failed} nie powiodło się`, { type: 'warning', timeout: 6000 });
        console.error('[actionView] bulk transfer errors', results.errors);
      } else {
        showToast && showToast(`Przeniesienie nie powiodło się (${results.failed} błędów)`, { type: 'error', timeout: 6000 });
        console.error('[actionView] bulk transfer errors', results.errors);
      }

      setSelectedIds([]);
      setMassQuantities({});
      return;
    }

    if (massActionMode === 'use') {
      // For each selected stockKey, call POST /api/use with productId, warehouseId, quantity and userId
      const userId = (user && user.id) ? user.id : Number(localStorage.getItem('userId') || 0);
      if (!userId) {
        showToast && showToast('Brak zaznaczonych produktów', { type: 'error' });
        return;
      }

      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(token) };
  const results = { success: 0, failed: 0, totalQuantity: 0, errors: [] };

      // execute sequentially to preserve server load ordering and easier failure handling
      for (const stockKey of selectedIds) {
        try {
          // stockKey format: `${productId}-${warehouseId}-${imageEphemeral}`
          const parts = stockKey.split('-');
          const productId = Number(parts[0]);
          const warehouseId = Number(parts[1]);
          const qty = Number(massQuantities[stockKey] || 1) || 1;

          const res = await fetch(`${BASE || ''}/api/use`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId, warehouseId, quantity: qty, userId, note })
          });
          if (!res.ok) {
            let errMsg = res.statusText || 'Błąd serwera';
            try { const j = await res.json(); errMsg = j?.error || j?.message || errMsg; } catch (_) {}
            results.failed += 1;
            results.errors.push({ stockKey, status: res.status, message: errMsg });
          } else {
            results.success += 1;
            results.totalQuantity += qty;
          }
        } catch (err) {
          results.failed += 1;
          results.errors.push({ stockKey, message: err?.message || String(err) });
        }
      }

      // Refresh products from server to reflect updated stocks
      try {
          const prodResp = await getProductsDb(null, 1, itemsPerPage);
        setProductsDb((prodResp && prodResp.products) || []);
      } catch (err) {
        console.error('[actionView] refresh products after use error', err);
      }

      // Show summary toast: include number of products and total quantity used
      if (results.failed === 0) {
        showToast && showToast(`Oznaczono pobranie ${results.success} produktów ${results.totalQuantity} sztuk`, { type: 'success' });
      } else if (results.success > 0) {
        showToast && showToast(`Oznaczono pobranie ${results.success} produktów; przeniesienie ${results.failed} produktów nie powiodło się`, { type: 'warning', timeout: 6000 });
        console.error('[actionView] bulk use errors', results.errors);
      } else {
        showToast && showToast(`Nie udało się przenieść produktów`, { type: 'error', timeout: 6000 });
        console.error('[actionView] bulk use errors', results.errors);
      }

      setSelectedIds([]);
      setMassQuantities({});
      return;
    }

    // transfer handling remains placeholder for now
    const actionText = massActionMode === 'transfer' ? 'przeniesienie' : 'akcję';
    showToast && showToast(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} wykonane na ${selectedIds.length} produktach`, { type: 'info', timeout: 3000 });
    setSelectedIds([]);
    setMassQuantities({});
  };

  const handleMassCancel = () => {
    setSelectedIds([]);
    setMassQuantities({});
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#2a3b6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z"/></svg>
          <h2 className="text-2xl font-bold text-[#2a3b6e]">Magazyn</h2>
        </div>
        <select value={filterWarehouse} onChange={e => { handleSetFilterWarehouse(e.target.value); }} className="w-full md:w-1/2 px-3 py-2 rounded-xl border bg-white mt-3">
          <option value="">Wszystkie magazyny</option>
          {warehousesList.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <p className="text-sm text-gray-600 mt-2">Wybierz magazyn, filtruj po typie i wyszukaj po nazwie/rozmiarze.</p>
      </div>

      {/* Filter bar (type + search) */}
      <ProductFilterBar
        search={search}
        setSearch={(v) => { setSearch(v); setCurrentPage(1); }}
        filterType={filterType}
        setFilterType={(v) => { setFilterType(v); setCurrentPage(1); }}
        filterWarehouse={filterWarehouse}
        setFilterWarehouse={handleSetFilterWarehouse}
        types={types}
        warehouses={warehousesList}
        showWarehouse={false}
      />

      {/* small found-count moved closer to the list (rendered above the product list) */}

      {/* Sort and view options */}
      <ProductOptionsBar
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOptions={[{ value: 'type', label: 'Typ' }, { value: 'name', label: 'Nazwa' }, { value: 'size', label: 'Rozmiar' }]}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Mass-action tab pills (switches confirm action) */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-transparent rounded-xl">
            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${massActionMode === 'use' ? 'bg-[#2a3b6e] text-white' : 'bg-white text-[#2a3b6e] border border-[#e5e7eb]'}`} 
              onClick={() => { setMassActionMode('use'); setTransferWarehouseId(null); }}
              aria-pressed={massActionMode === 'use'}
            >
              <VerticalAlignBottomOutlinedIcon fontSize="small" />
              <span>Pobierz</span>
            </button>

            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${massActionMode === 'transfer' ? 'bg-[#2a3b6e] text-white' : 'bg-white text-[#2a3b6e] border border-[#e5e7eb]'}`}
              onClick={() => {
                setMassActionMode('transfer');
                // default transfer target: currently selected warehouse filter or first available
                const defaultTarget = (warehouses && warehouses.length > 0) ? (warehouses.find(w => w.name === filterWarehouse)?.id ?? warehouses[0].id) : null;
                setTransferWarehouseId(defaultTarget);
              }}
              aria-pressed={massActionMode === 'transfer'}
            >
              <SwapHorizIcon fontSize="small" />
              <span>Przenieś</span>
            </button>
          </div>
        </div>

        {/* Pills displayed here; transfer target select is in MassActionBar */}
      </div>

      {/* Product list placeholder (initially render list) */}
      <div className="mt-4">
        <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-xs text-gray-500">Znaleziono {filtered.length} produktów{filtered.length !== paginated.length ? ` (wyświetlanych: ${paginated.length})` : ''}.</p>
          <div className="flex-shrink-0">
            <Pagination totalPages={Math.max(1, Math.ceil(filtered.length / itemsPerPage))} currentPage={currentPage} onChangePage={(n) => { setCurrentPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        </div>
        {loading ? (
          <div className="text-gray-500">Ładowanie...</div>
        ) : paginated.length === 0 ? (
          <div className="text-gray-500">Brak produktów.</div>
        ) : (
          viewMode === 'grid' ? (
            <div className="bg-white rounded shadow p-4">
              <ItemGrid
                products={paginated}
                mode="search"
                viewMode={viewMode}
                warehouses={warehouses}
                selectedIds={selectedIds}
                onSelectCheckbox={handleSelectCheckbox}
                massQuantities={massQuantities}
                onMassQuantityChange={handleMassQuantityChange}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <ItemGrid
                products={paginated}
                mode="search"
                viewMode={viewMode}
                warehouses={warehouses}
                selectedIds={selectedIds}
                onSelectCheckbox={handleSelectCheckbox}
                massQuantities={massQuantities}
                onMassQuantityChange={handleMassQuantityChange}
              />
            </div>
          )
        )}
      </div>

      {/* Duplicate pagination below the list (identical behavior to the one above) */}
      <div className="mt-4 flex items-center justify-center">
        <Pagination totalPages={Math.max(1, Math.ceil(filtered.length / itemsPerPage))} currentPage={currentPage} onChangePage={(n) => { setCurrentPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>

      {/* pagination moved above next to the found-count */}

      {/* bottom mass action bar: label and optional transfer target selector */}
      <MassActionBar
        selectedCount={selectedIds.length}
        totalQuantity={totalSelectedQuantity}
        confirmLabel={massActionMode === 'use' ? 'Pobierz' : 'Przenieś'}
        cancelLabel="Anuluj"
        onConfirm={handleMassConfirm}
        onCancel={handleMassCancel}
        loading={false}
        confirmDisabled={massActionMode === 'transfer' && !transferWarehouseId}
        transfer={massActionMode === 'transfer' ? {
          warehouses,
          selectedId: transferWarehouseId,
          onChange: (e) => setTransferWarehouseId(e.target.value),
        } : null}
      />
    </div>
  );
}
