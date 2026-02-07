import React, { useEffect, useState } from 'react';
import { getWarehouses, getProductsDb } from '../../services/api';
import { BASE, getAuthHeaders, invalidateWarehousesCache } from '../../services/api';
import AppButton, { EditButton, DeleteButton, SaveButton, CancelButton } from '../buttons/button';
import AddIcon from '@mui/icons-material/Add';
import formatError from '../../utils/formatError';

export default function WarehouseView({ onBack, setView, onSelectWarehouse, token = null }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState({}); // { byId: { [id]: { productsCount, totalQty } }, byName: { [name]: { ... } } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editWarehouseId, setEditWarehouseId] = useState(null);
  const [editWarehouseName, setEditWarehouseName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // fetch warehouses and a safe page of products in parallel
        const DEFAULT_PAGE = 1;
        const DEFAULT_LIMIT = 100;
        const [list, productsResp] = await Promise.all([getWarehouses(), getProductsDb(null, DEFAULT_PAGE, DEFAULT_LIMIT)]);
        const products = (productsResp && productsResp.products) || [];
        if (mounted) setWarehouses(list || []);

        // compute aggregates per warehouseId and per warehouse name
        const byId = {};
        const byName = {};
        for (const p of products) {
          const wid = p.warehouseId ?? null;
          const wname = (p.warehouse || p.Magazyn || '').toString();
          // Prefer availableQty (standard field), fall back to quantity / Ilość for older records
          const qty = Number(p.availableQty ?? p.quantity ?? p.Ilość ?? 0) || 0;

          // byId
          if (wid) {
            if (!byId[wid]) byId[wid] = { productsSet: new Set(), productsCount: 0, totalQty: 0 };
            // Count unique product rows per warehouse. Use product id when available, otherwise fallback to composite key
            byId[wid].productsSet.add((p.id ?? p.productId ?? `${p.name||''}-${p.size||''}-${wid}`));
            byId[wid].totalQty += qty;
          }

          // byName
          if (wname) {
            if (!byName[wname]) byName[wname] = { productsSet: new Set(), productsCount: 0, totalQty: 0 };
            byName[wname].productsSet.add((p.id ?? p.productId ?? `${p.name||''}-${p.size||''}-${wname}`));
            byName[wname].totalQty += qty;
          }
        }

        // finalize counts (convert sets to counts)
        const finalize = (map) => {
          const out = {};
          for (const k of Object.keys(map)) {
            out[k] = { productsCount: map[k].productsSet.size, totalQty: map[k].totalQty };
          }
          return out;
        };
        if (mounted) setWarehouseStats({ byId: finalize(byId), byName: finalize(byName) });
      } catch (err) {
        console.error('[WarehouseView] getWarehouses/getProductsDb error:', err);
        if (mounted) setError('Błąd pobierania magazynów');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const confirmDeleteWarehouse = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id); setError(null);
    try {
      const res = await fetch(`${BASE}/api/admin/delete-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Błąd usuwania magazynu');
      } else {
        invalidateWarehousesCache();
        const fresh = await getWarehouses();
        setWarehouses((fresh && fresh) || []);
        setShowDeleteModal(false);
        setDeleteTarget(null);
      }
    } catch (e) {
      setError('Błąd usuwania magazynu');
    } finally { setDeletingId(null); }
  };

  return (
    <div className="p-4">
      <div className="mb-6 px-2 md:px-4 lg:px-6">
        <h2 className="text-2xl font-bold text-[#2a3b6e]">Magazyny</h2>
        <p className="text-sm text-gray-600 mt-1">Przegląd i wybór magazynów. Kliknij magazyn, aby wyświetlić jego stany produktów.</p>
            <div className="w-full mt-4 mb-2">
          <div className="mx-auto w-full max-w-[1200px]">
            {!adding ? (
              <div className="flex justify-end">
                <AppButton icon={<AddIcon fontSize="small" />} variant="primary" onClick={() => setAdding(true)}>Dodaj magazyn</AppButton>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 md:p-6 shadow hover:shadow-md transition w-full">
                <div className="flex flex-col">
                  <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Nazwa</label>
                  <input className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm" placeholder="Nazwa magazynu" value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} />
                </div>
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <SaveButton onClick={async () => {
                    const name = (newWarehouseName || '').trim();
                    if (!name) return setError('Nazwa magazynu nie może być pusta');
                    setCreating(true); setError(null);
                    try {
                      const res = await fetch(`${BASE}/api/admin/create-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setError(body.error || 'Błąd tworzenia magazynu');
                      } else {
                        // refresh list
                        invalidateWarehousesCache();
                        const fresh = await getWarehouses();
                        setWarehouses((fresh && fresh) || []);
                        setNewWarehouseName('');
                        setAdding(false);
                      }
                    } catch (e) {
                      setError('Błąd tworzenia magazynu');
                    } finally { setCreating(false); }
                  }} disabled={creating}>{creating ? '...' : 'Zapisz'}</SaveButton>
                  <CancelButton onClick={() => { setAdding(false); setNewWarehouseName(''); setError(null); }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Ładowanie magazynów...</div>
      ) : error ? (
        <div className="text-red-500">{formatError(error)}</div>
      ) : warehouses.length === 0 ? (
        <div className="text-gray-500">Brak magazynów.</div>
      ) : (
        <div className="flex items-start gap-3 justify-center">
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center mx-auto w-full max-w-[1200px]">
            {warehouses.map((w) => (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => { if (!editWarehouseId && !savingId && !deletingId) onSelectWarehouse && onSelectWarehouse(w); }}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !editWarehouseId && !savingId && !deletingId) onSelectWarehouse && onSelectWarehouse(w); }}
                className="bg-white rounded-xl p-4 shadow hover:shadow-md transition cursor-pointer w-full sm:w-80 md:w-[520px] h-30 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex items-center gap-3 w-full flex-wrap">
                  <svg className="w-7 h-7 text-[#2a3b6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" /></svg>
                  <div className="flex-1 min-w-0 pr-0 md:pr-28">
                    {editWarehouseId === w.id ? (
                      <div>
                        <input className="border px-2 py-1 rounded w-36 sm:w-40 lg:w-auto" value={editWarehouseName} onChange={e => setEditWarehouseName(e.target.value)} onClick={e => e.stopPropagation()} />
                        {w.location && <div className="text-sm text-gray-600 mt-1">{w.location}</div>}
                      </div>
                    ) : (
                      <div>
                        <div className="text-lg font-semibold text-[#2a3b6e] truncate" title={w.name}>{w.name}</div>
                        {w.location && <div className="text-sm text-gray-600 mt-1">{w.location}</div>}
                      </div>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    {/* Edit / Delete buttons */}
                    {editWarehouseId === w.id ? (
                      <div className="flex items-center gap-2">
                        <SaveButton onClick={async (e) => {
                          e.stopPropagation();
                          const name = (editWarehouseName || '').trim();
                          if (!name) return setError('Nazwa magazynu nie może być pusta');
                          setSavingId(w.id); setError(null);
                          try {
                            const res = await fetch(`${BASE}/api/admin/update-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, newName: name }) });
                            const body = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              if (res.status === 409 && body.conflict) {
                                setError(body.error || 'Konflikt przy zmianie nazwy magazynu');
                              } else setError(body.error || 'Błąd aktualizacji magazynu');
                            } else {
                              invalidateWarehousesCache();
                              const fresh = await getWarehouses();
                              setWarehouses((fresh && fresh) || []);
                              setEditWarehouseId(null);
                              setEditWarehouseName('');
                            }
                          } catch (e) {
                            setError('Błąd aktualizacji magazynu');
                          } finally { setSavingId(null); }
                        }} disabled={savingId === w.id}>{savingId === w.id ? '...' : 'Zapisz'}</SaveButton>
                        <CancelButton onClick={(e) => { e.stopPropagation(); setEditWarehouseId(null); setEditWarehouseName(''); setError(null); }}>Anuluj</CancelButton>
                      </div>
                    ) : (
                      <>
                        <EditButton onClick={(e) => { e.stopPropagation(); setEditWarehouseId(w.id); setEditWarehouseName(w.name || ''); setError(null); }} />
                        <DeleteButton onClick={(e) => {
                          e.stopPropagation();
                          // Check if warehouse contains products
                          const statsById = warehouseStats?.byId?.[w.id];
                          const statsByName = warehouseStats?.byName?.[w.name];
                          const productsCount = statsById?.productsCount ?? statsByName?.productsCount ?? 0;
                          const totalQty = statsById?.totalQty ?? statsByName?.totalQty ?? 0;
                          if (totalQty > 0 || productsCount > 0) {
                            return setError('Magazyn zawiera produkty i nie może być usunięty');
                          }
                          setDeleteTarget(w);
                          setShowDeleteModal(true);
                        }} />
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 mt-3 flex gap-4">
                  {(() => {
                    const statsById = warehouseStats?.byId?.[w.id];
                    const statsByName = warehouseStats?.byName?.[w.name];
                    const productsCount = statsById?.productsCount ?? statsByName?.productsCount ?? 0;
                    const totalQty = statsById?.totalQty ?? statsByName?.totalQty ?? 0;
                    return (
                      <>
                        <div className="font-semibold text-[#2a3b6e]">Produkty: <span className="text-gray-700">{productsCount}</span></div>
                        <div className="font-semibold text-[#2a3b6e]">Ilość: <span className="text-gray-700">{totalQty}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 420}}>
            <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Potwierdź usunięcie</h2>
            <div className="mb-4 text-[#2a3b6e] font-semibold text-center">
              {(() => {
                const label = deleteTarget ? `${deleteTarget.name || ''}`.trim() : '';
                return `Czy na pewno usunąć magazyn ${label}?`;
              })()}
            </div>
            <div className="flex gap-2 mt-2">
              <SaveButton onClick={confirmDeleteWarehouse} disabled={deletingId === (deleteTarget && deleteTarget.id)}>Potwierdź</SaveButton>
              <CancelButton onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deletingId === (deleteTarget && deleteTarget.id)}>Anuluj</CancelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
