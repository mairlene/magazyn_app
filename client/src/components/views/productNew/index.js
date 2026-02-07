import React, { useState, useEffect } from 'react';
import ProductsController from './ProductsController';
import SharedListContainer from './SharedListContainer';
import ProductForm from '../../forms/ProductForm';
import { useToast } from '../../common/ToastContext';
import { BASE, getAuthHeaders } from '../../../services/api';
import { addProduct, updateProduct } from './api';
import useSession from '../../../hooks/useSession';
import { getProductStocksDedup as getProductStocks } from '../../../services/api';
import ProductFilterBar from '../../common/ProductFilterBar';
import ProductOptionsBar from '../../common/ProductOptionsBar';
import Pagination from '../pagination';
import AppButton from '../../buttons/button';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// Helper component: watches for pending edit payloads and invokes onOpen when found.
function PendingEditHandler({ pendingEditId, pendingEditItem, items = [], onOpen = () => {}, clearPendingEdit = () => {} }) {
  useEffect(() => {
    let mounted = true;
    const tryOpen = async () => {
      if (!mounted) return;
      try {
        if (pendingEditItem && pendingEditItem.product) {
          await onOpen(pendingEditItem.product, pendingEditItem.stockRows || []);
          try { clearPendingEdit(); } catch (_) {}
          return;
        }

        if (pendingEditId) {
          // if items include aggregated products, try to find matching id
          const pid = Number(pendingEditId);
          if (!Number.isNaN(pid) && Array.isArray(items) && items.length) {
            const found = items.find(it => Number(it.id) === pid || String(it.id) === String(pid));
            if (found) {
              await onOpen(found, []);
              try { clearPendingEdit(); } catch (_) {}
              return;
            }
          }
        }
      } catch (e) {
        // ignore handler errors
      }
    };
    tryOpen();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditId, pendingEditItem, items]);

  return null;
}

export default function ProductNewView({ user, setView, pendingEditId = null, pendingEditItem = null, clearPendingEdit = () => {} }) {
  const { token } = useSession();
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ Nazwa: '', Rozmiar: '', Typ: '' });
  const [stockRows, setStockRows] = useState([]);
  const [originalProduct, setOriginalProduct] = useState(null);
  const [originalStockRows, setOriginalStockRows] = useState([]);
    const { showToast } = useToast();
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Listens for external requests to reset product list filters and paging.
  function ResetFiltersHandler({ setFilter, setAvailability, setPage, refresh }) {
    useEffect(() => {
      const handler = () => {
        try { setFilter({ Nazwa: '', Rozmiar: '', Typ: '' }); } catch (_) {}
        try { setAvailability('all'); } catch (_) {}
        try { setPage(1); } catch (_) {}
        try { refresh(); } catch (_) {}
      };
      window.addEventListener('resetProductFilters', handler);
      return () => window.removeEventListener('resetProductFilters', handler);
    }, [setFilter, setAvailability, setPage, refresh]);
    return null;
  }

  return (
    <ProductsController>
      {({ items, totalCount, totalPages, currentPage, setPage, viewMode, toggleViewMode, setViewMode, sortBy, setSortBy, availability, setAvailability, setFilter, filters, refresh, loading, warehouses, types }) => (
        <div className="min-h-screen p-4">
          <h2 className="text-2xl font-bold text-[#2a3b6e] mb-4">Produkty</h2>
          <p className="text-sm text-gray-600 mb-4">Przegląd wszystkich produktów w bazie.</p>

          <div className="mb-4 w-full">
            <div className="flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="mb-3 md:mb-0 md:flex-shrink-0 md:mr-2 md:w-auto">
                <select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }} className="w-full md:w-48 px-2 py-1.5 rounded-lg border shadow text-[#2a3b6e] text-sm">
                  <option value="all">Dostępność (wszystkie)</option>
                  <option value="available">Dostępne</option>
                  <option value="unavailable">Niedostępne</option>
                </select>
              </div>

              <div className="flex-1">
                <ProductFilterBar
                  search={filters.Nazwa || ''}
                  setSearch={(v) => { setFilter({ Nazwa: v }); setPage(1); }}
                  filterType={filters.Typ || ''}
                  setFilterType={(v) => { setFilter({ Typ: v }); setPage(1); }}
                  filterWarehouse={null}
                  setFilterWarehouse={() => {}}
                  types={types}
                  warehouses={warehouses}
                  showWarehouse={false}
                />
              </div>
            </div>
          </div>

          <ProductOptionsBar
            sortBy={sortBy}
            setSortBy={(v) => { setSortBy(v); setPage(1); }}
            sortOptions={[{ value: 'type', label: 'Typ' }, { value: 'name', label: 'Nazwa' }, { value: 'size', label: 'Rozmiar' }]}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          <div className="mt-3 mb-3">
            <div className="flex flex-wrap gap-2">
              <AppButton icon={<AddIcon fontSize="small" />} variant="primary" onClick={() => {
                // open inline add form in the topBar
                setEditForm({ Nazwa: '', Rozmiar: '', Typ: '' });
                setStockRows([]);
                setEditing({ isNew: true });
              }}>Dodaj produkt</AppButton>

              <AppButton icon={<UploadFileIcon fontSize="small" />} variant="primary" onClick={() => setView('import')}>Importuj z pliku</AppButton>
            </div>
          </div>

            <div className="mt-2 mb-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">Znaleziono {totalCount} produktów.</div>
            <div className="flex-shrink-0">
              <Pagination totalPages={totalPages} currentPage={currentPage} onChangePage={(n) => { setEditing(null); setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </div>
          </div>

          {/* Listen for external requests to reset filters (e.g., after edits from other views) */}
          <ResetFiltersHandler setFilter={setFilter} setAvailability={setAvailability} setPage={setPage} refresh={refresh} />

          <SharedListContainer
            topBar={editing ? (
              <div id="product-form">
                <ProductForm
                  form={editForm}
                  setForm={setEditForm}
                  types={types}
                  warehouses={warehouses}
                  sizeSuggestions={[]}
                  loading={false}
                  userId={user?.id}
                  onFilterChange={(f) => setFilter(f)}
                  stockRows={stockRows}
                  setStockRows={setStockRows}
                  canAdd={editing?.isNew}
                  // choose handler based on whether we're adding or editing
                  onAddProduct={async (payload) => {
                    try {
                      // payload ready for add
                      const res = await addProduct(payload, token);
                      if (!res.ok) {
                        const errMsg = (res.body && (res.body.error || res.body.message)) ? (res.body.error || res.body.message) : (typeof res.body === 'string' ? res.body : `HTTP ${res.status}`);
                        if (res.status === 409 || /already exists|już istnieje|produkt już istnieje/i.test(String(errMsg || ''))) {
                          showToast?.(String(errMsg || 'Produkt o tych parametrach już istnieje'), { type: 'error' });
                          return false;
                        }
                        console.error('[ProductNewView] add failed', res.status, errMsg);
                        showToast?.('Błąd dodawania produktu', { type: 'error' });
                        return false;
                      }
                      await refresh();
                      setEditing(null);
                      setEditForm({ Nazwa: '', Rozmiar: '', Typ: '' });
                      setStockRows([]);
                      showToast?.('Produkt dodany', { type: 'success' });
                      return true;
                    } catch (e) {
                      console.error('[ProductNewView] add exception', e);
                      showToast?.('Błąd dodawania produktu', { type: 'error' });
                      return false;
                    }
                  }}
                  onConfirmEdit={async (payload) => {
                    if (!editing || !editing.id) return false;
                    try {
                      // debug editing id and payload
                      // confirming edit for current item
                          // Build minimal payload by comparing with originalProduct / originalStockRows
                          const buildFinalPayload = (incomingPayload) => {
                            const out = {};
                            const norm = (s) => (s === undefined || s === null) ? '' : String(s).trim();
                            // compare product identity fields
                            const orig = originalProduct || {};
                            const nameOrig = norm(orig.name || orig.Nazwa || '');
                            const sizeOrig = norm(orig.size || orig.Rozmiar || '');
                            const typeOrig = norm(orig.type || orig.Typ || '');
                            const nameNew = norm(incomingPayload.name || incomingPayload.Nazwa || '');
                            const sizeNew = norm(incomingPayload.size || incomingPayload.Rozmiar || '');
                            const typeNew = norm(incomingPayload.type || incomingPayload.Typ || '');
                            if (nameNew !== nameOrig) out.name = incomingPayload.name || incomingPayload.Nazwa || nameNew;
                            if (sizeNew !== sizeOrig) out.size = incomingPayload.size || incomingPayload.Rozmiar || sizeNew;
                            if (typeNew !== typeOrig) out.type = incomingPayload.type || incomingPayload.Typ || typeNew;
                            // image fields
                            if (incomingPayload.imageUrl !== undefined) out.imageUrl = incomingPayload.imageUrl;
                            if (incomingPayload.imageThumb !== undefined) out.imageThumb = incomingPayload.imageThumb;

                            // Stocks: compare arrays by warehouseId (or warehouseName) and quantity
                            const origStocks = Array.isArray(originalStockRows) ? originalStockRows : [];
                            const newStocks = Array.isArray(stockRows) ? stockRows : [];
                            const stocksChanged = (() => {
                              if (origStocks.length !== newStocks.length) return true;
                              const mapOrig = new Map();
                              for (const r of origStocks) {
                                const key = String(r.warehouseId ?? r.warehouseName ?? '');
                                mapOrig.set(key, Number(r.quantity || 0));
                              }
                              for (const r of newStocks) {
                                const key = String(r.warehouseId ?? r.warehouseName ?? '');
                                const qNew = Number(r.quantity || 0);
                                const qOrig = mapOrig.has(key) ? mapOrig.get(key) : null;
                                if (qOrig === null) return true;
                                if (Number(qOrig) !== Number(qNew)) return true;
                              }
                              return false;
                            })();
                            if (stocksChanged) {
                              out.stocks = newStocks.map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
                            }

                            // If nothing changed, return null so caller can skip update
                            if (Object.keys(out).length === 0) return null;
                            // include userId for stock change logging
                            if (!out.userId) out.userId = user?.id ?? undefined;
                            return out;
                          };

                          const finalPayload = buildFinalPayload(payload);
                          if (!finalPayload) {
                            showToast?.('Brak zmian do zapisania', { type: 'info' });
                            return true;
                          }
                          // debug final payload
                          // finalPayload prepared
                          const res = await updateProduct(editing.id, finalPayload, token);
                      if (!res.ok) {
                        const errMsg = (res.body && (res.body.error || res.body.message)) ? (res.body.error || res.body.message) : (typeof res.body === 'string' ? res.body : `HTTP ${res.status}`);
                        if (res.status === 409 || /already exists|już istnieje|produkt już istnieje/i.test(String(errMsg || ''))) {
                          showToast?.(String(errMsg || 'Taki produkt już istnieje w wybranym magazynie'), { type: 'error' });
                          return false; // keep editor open
                        }
                        console.error('[ProductNewView] update failed', res.status, errMsg);
                        showToast?.('Błąd zapisu produktu', { type: 'error' });
                        return false;
                      }
                      // Clear any active filters and reset paging/view so the
                      // subsequent refresh returns the default full listing.
                      try { setFilter({ Nazwa: '', Rozmiar: '', Typ: '' }); } catch (_) {}
                      try { setAvailability('all'); } catch (_) {}
                      try { setPage(1); } catch (_) {}
                      // Refresh after resetting filters/page so data returned
                      // reflects the unfiltered product list.
                      await refresh();
                      try { setView('productNew'); } catch (_) {}
                      setEditing(null);
                      setEditForm({ Nazwa: '', Rozmiar: '', Typ: '' });
                      setStockRows([]);
                      showToast?.('Produkt zaktualizowany', { type: 'info' });
                      return true;
                    } catch (e) {
                      console.error('[ProductNewView] update exception', e);
                      showToast?.('Błąd zapisu produktu', { type: 'error' });
                      return false;
                    }
                  }}
                  onCancelEdit={async () => {
                    try { setFilter({ Nazwa: '', Rozmiar: '', Typ: '' }); } catch (_) {}
                    try { setAvailability('all'); } catch (_) {}
                    try { setPage(1); } catch (_) {}
                    try { await refresh(); } catch (_) {}
                    setEditing(null);
                    setEditForm({ Nazwa: '', Rozmiar: '', Typ: '' });
                    setStockRows([]);
                  }}
                  isEditing={!editing?.isNew}
                  editingId={editing?.id}
                />
              </div>
            ) : null}
            items={items}
            totalCount={totalCount}
            viewMode={viewMode}
            toggleViewMode={toggleViewMode}
            onEdit={async (p) => {
              console.warn('[ProductNewView] onEdit -> opening editor for product', { id: p?.id, imageThumb: p?.imageThumb, imageUrl: p?.imageUrl });
              setEditing(p);
              setOriginalProduct(p);
              setEditForm({ Nazwa: p.name || p.Nazwa || '', Rozmiar: p.size || p.Rozmiar || '', Typ: p.type || p.Typ || '' });
              // fetch stocks for this product if id available
              try {
                if (p && p.id) {
                  const res = await getProductStocks(p.id);
                  const stocks = Array.isArray(res.stocks) ? res.stocks : [];
                  const normalized = stocks.map(s => ({ warehouseId: s.warehouseId || null, warehouseName: s.warehouseName || s.warehouse || s.Magazyn || '', quantity: Number(s.quantity) || 0, id: s.id || null }));
                  setStockRows(normalized);
                  setOriginalStockRows(normalized);
                } else {
                  setStockRows([]);
                }
              } catch (e) { setStockRows([]); }
              // scroll to edit form so user sees the editor immediately
              try { document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' }); } catch (_) {}
            }}
            onDelete={(p) => {
              // open confirmation modal
              setDeleteTarget(p);
              setShowDeleteModal(true);
            }}
            totalPages={totalPages}
            currentPage={currentPage}
            setPage={(num) => { setEditing(null); setPage(num); }}
          />

          {/* If navigation requested a pending edit, consume it and open the inline editor */}
          {/**
           * pendingEditItem may be { product, stockRows } or pendingEditId may be set.
           * When received, open the inline editor the same way as onEdit.
           */}
          <PendingEditHandler
            pendingEditId={pendingEditId}
            pendingEditItem={pendingEditItem}
            items={items}
            onOpen={async (p, preloadedStocks) => {
              setEditing(p);
              setEditForm({ Nazwa: p.name || p.Nazwa || '', Rozmiar: p.size || p.Rozmiar || '', Typ: p.type || p.Typ || '' });
              try {
                if (Array.isArray(preloadedStocks) && preloadedStocks.length) {
                  const normalized = preloadedStocks.map(s => ({ warehouseId: s.warehouseId || null, warehouseName: s.warehouseName || s.warehouseName || s.warehouse || s.Magazyn || '', quantity: Number(s.quantity) || 0, id: s.id || null }));
                  setStockRows(normalized);
                  setOriginalStockRows(normalized);
                } else if (p && p.id) {
                  const res = await getProductStocks(p.id);
                  const stocks = Array.isArray(res.stocks) ? res.stocks : [];
                  const normalized = stocks.map(s => ({ warehouseId: s.warehouseId || null, warehouseName: s.warehouseName || s.warehouse || s.Magazyn || '', quantity: Number(s.quantity) || 0, id: s.id || null }));
                  setStockRows(normalized);
                  setOriginalStockRows(normalized);
                } else {
                  setStockRows([]);
                }
              } catch (e) {
                setStockRows([]);
              }
              try { document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' }); } catch (_) {}
            }}
            clearPendingEdit={clearPendingEdit}
          />

          {showDeleteModal && (
            <div className="fixed inset-0 bg-[#e5e7eb] bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 420}}>
                <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Potwierdź usunięcie</h2>
                <div className="mb-4 text-[#2a3b6e] font-semibold text-center">
                  {(() => {
                    const label = deleteTarget ? `${deleteTarget.name || deleteTarget.Nazwa || ''} ${deleteTarget.size || deleteTarget.Rozmiar || ''}`.trim() : '';
                    return `Czy na pewno usunąć produkt ${label} i wszystkie jego stany magazynowe?`;
                  })()}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={async () => {
                    if (!deleteTarget || !deleteTarget.id) return;
                    setDeleteLoading(true);
                    try {
                      const url = `${BASE || ''}/api/products/${deleteTarget.id}`;
                      const res = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) } });
                      if (!res.ok) {
                        const text = await res.text().catch(() => null);
                        console.error('[ProductNewView] delete failed', res.status, text);
                        showToast?.('Usuwanie nie powiodło się', { type: 'error' });
                        return;
                      }
                      try { await refresh(); } catch (_) {}
                      showToast?.('Produkt usunięto pomyślnie', { type: 'success' });
                    } catch (e) {
                      console.error('[ProductNewView] delete exception', e);
                      showToast?.('Błąd podczas usuwania', { type: 'error' });
                    } finally {
                      setDeleteLoading(false);
                      setShowDeleteModal(false);
                      setDeleteTarget(null);
                    }
                  }} disabled={deleteLoading}>Potwierdź</button>
                  <button className="bg-[#e5e7eb] text-[#2a3b6e] px-4 py-1 rounded-xl shadow font-semibold border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deleteLoading}>Anuluj</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ProductsController>
  );
}
