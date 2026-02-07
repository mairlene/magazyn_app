import React, { useEffect, useMemo, useState } from 'react';
import { getProductsDb, getTypes, BASE, getAuthHeaders } from '../../services/api';
import AppButton, { EditButton, DeleteButton, SaveButton, CancelButton } from '../buttons/button';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import formatError from '../../utils/formatError';

export default function TypesView({ setView, token = null }) {
  const [products, setProducts] = useState([]);
  const [typesList, setTypesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const DEFAULT_PAGE = 1;
        const DEFAULT_LIMIT = 100;
        const [resp, t] = await Promise.all([getProductsDb(null, DEFAULT_PAGE, DEFAULT_LIMIT), getTypes()]);
        if (!mounted) return;
        setProducts((resp && resp.products) || []);
        setTypesList(t || []);
      } catch (e) {
        if (!mounted) return;
        setProducts([]);
        setTypesList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [adding, setAdding] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editTypeId, setEditTypeId] = useState(null);
  const [editNewName, setEditNewName] = useState('');
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // aggregates: products count and totalQty per type id and per type name (legacy)
  const typeStats = useMemo(() => {
    const byId = {};
    const byName = {};
    for (const p of products) {
      const tid = p.typeId ?? null;
      const tname = (p.type || p.typeName || '').toString();
      const qty = Number(p.availableQty ?? p.quantity ?? p.Ilość ?? 0) || 0;
      if (tid) {
        if (!byId[tid]) byId[tid] = { productsSet: new Set(), totalQty: 0 };
        byId[tid].productsSet.add(p.id ?? p.productId ?? `${p.name||''}-${p.size||''}-${tid}`);
        byId[tid].totalQty += qty;
      }
      if (tname) {
        if (!byName[tname]) byName[tname] = { productsSet: new Set(), totalQty: 0 };
        byName[tname].productsSet.add(p.id ?? p.productId ?? `${p.name||''}-${p.size||''}-${tname}`);
        byName[tname].totalQty += qty;
      }
    }
    const finalize = (map) => {
      const out = {};
      for (const k of Object.keys(map)) out[k] = { productsCount: map[k].productsSet.size, totalQty: map[k].totalQty };
      return out;
    };
    return { byId: finalize(byId), byName: finalize(byName) };
  }, [products]);

  

  const createType = async () => {
    const t = (newTypeName || '').trim();
    if (!t) return setError('Nazwa typu nie może być pusta');
    setCreating(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/types`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Błąd tworzenia typu');
      } else {
        const newList = await getTypes();
        setTypesList(newList || []);
        setNewTypeName(''); setAdding(false);
      }
    } catch (e) { setError('Błąd tworzenia typu'); }
    finally { setCreating(false); }
  };

  const saveEditType = async () => {
    const newName = (editNewName || '').trim();
    if (!newName) return setError('Nazwa nie może być pusta');
    setCreating(true); setError(null);
    try {
      // editTypeId holds the type id
      const found = typesList.find(tt => tt.id === editTypeId);
      if (!found) { setError('Nie znaleziono typu do edycji'); setCreating(false); return; }
      const res = await fetch(`${BASE}/api/types/${found.id}`, { method: 'PUT', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error || 'Błąd aktualizacji typu');
        } else {
          const newList = await getTypes();
          setTypesList(newList || []);
          setEditTypeId(null); setEditNewName('');
        }
    } catch (e) { setError('Błąd aktualizacji typu'); }
    finally { setCreating(false); }
  };

  const deleteType = async (id) => {
    const found = typesList.find(tt => tt.id === id);
    if (!found) return setError('Nie znaleziono typu');
    // quick client-side guard: prevent deleting types that have products
    const statsById = typeStats?.byId?.[id];
    const statsByName = typeStats?.byName?.[found.name];
    const productsCount = statsById?.productsCount ?? statsByName?.productsCount ?? 0;
    const totalQty = statsById?.totalQty ?? statsByName?.totalQty ?? 0;
    if (productsCount > 0 || totalQty > 0) return setError('Istnieją produkty przypisane do tego typu');
    // open confirmation modal
    setDeleteTarget(found);
    setShowDeleteModal(true);
  };

  const confirmDeleteType = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setCreating(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/types/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Błąd usuwania typu');
      } else {
        const newList = await getTypes();
        setTypesList(newList || []);
        setShowDeleteModal(false);
        setDeleteTarget(null);
      }
    } catch (e) { setError('Błąd usuwania typu'); }
    finally { setCreating(false); }
  };

  if (loading) return <div className="p-4">Ładowanie typów...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#2a3b6e] mb-4">Typy produktów</h2>
      {error && <div className="text-red-600 mb-2">{formatError(error)}</div>}
            <div className="w-full mt-2 mb-4">
        <div className="mx-auto w-full max-w-[1200px]">
          {!adding ? (
            <div className="flex justify-end">
              <AppButton icon={<AddIcon fontSize="small" />} variant="primary" onClick={() => setAdding(true)}>Dodaj typ</AppButton>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow hover:shadow-md transition w-full">
              <div className="flex flex-col">
                <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Nazwa</label>
                <input
                  className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
                  placeholder="Nowy typ"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 justify-end">
                <SaveButton onClick={createType} disabled={creating}>{creating ? '...' : 'Zapisz'}</SaveButton>
                <CancelButton onClick={() => { setAdding(false); setNewTypeName(''); setError(null); }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {typesList.length === 0 ? (
        <div className="text-gray-500">Brak typów</div>
    ) : (
  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center mx-auto w-full max-w-[1200px]">
          {typesList.map(tt => {
            const statsById = typeStats?.byId?.[tt.id];
            const statsByName = typeStats?.byName?.[tt.name];
            const productsCount = statsById?.productsCount ?? statsByName?.productsCount ?? 0;
            const totalQty = statsById?.totalQty ?? statsByName?.totalQty ?? 0;
            return (
              <div key={tt.id} onClick={() => { try { localStorage.setItem('pendingFilterType', tt.name || ''); } catch(_) {} ; setView('productNew'); }} className="bg-white rounded-xl p-4 md:p-6 shadow hover:shadow-md transition cursor-pointer w-full sm:w-80 md:w-[520px] h-30 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-3 w-full flex-wrap">
                  <CategoryIcon className="w-7 h-7 text-[#2a3b6e]" />
                  <div className="flex-1 min-w-0 pr-0 md:pr-28">
                    {editTypeId === tt.id ? (
                        <input value={editNewName} onChange={e => setEditNewName(e.target.value)} onClick={e => e.stopPropagation()} className="border px-2 py-1 rounded w-36 sm:w-40 lg:w-auto" />
                    ) : (
                      <div className="text-lg font-semibold text-[#2a3b6e] truncate" title={tt.name}>{tt.name}</div>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    {editTypeId === tt.id ? (
                      <>
                        <SaveButton onClick={saveEditType} disabled={creating}>{creating ? '...' : 'Zapisz'}</SaveButton>
                        <CancelButton onClick={(e) => { e.stopPropagation(); setEditTypeId(null); setEditNewName(''); setError(null); }}>Anuluj</CancelButton>
                      </>
                    ) : (
                      <>
                        <EditButton onClick={(e) => { e.stopPropagation(); setEditTypeId(tt.id); setEditNewName(tt.name); setError(null); }} />
                        <DeleteButton onClick={async (e) => { e.stopPropagation(); await deleteType(tt.id); }} />
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 mt-3 flex gap-4">
                  <div className="font-semibold text-[#2a3b6e]">Produkty: <span className="text-gray-700">{productsCount}</span></div>
                  <div className="font-semibold text-[#2a3b6e]">Ilość: <span className="text-gray-700">{totalQty}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 420}}>
            <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Potwierdź usunięcie</h2>
            <div className="mb-4 text-[#2a3b6e] font-semibold text-center">
              {(() => {
                const label = deleteTarget ? `${deleteTarget.name || deleteTarget.Nazwa || ''}`.trim() : '';
                return `Czy na pewno usunąć typ ${label}?`;
              })()}
            </div>
            <div className="flex gap-2 mt-2">
              <SaveButton onClick={confirmDeleteType} disabled={creating}>Potwierdź</SaveButton>
              <CancelButton onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={creating}>Anuluj</CancelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
