import React, { useEffect, useState } from 'react';
import { BASE, resolveImageUrl, getAuthHeaders } from '../../services/api';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';

const TYPE_LABEL = {
  add: 'Dodanie',
  import: 'import do',
  set: 'Ustawienie',
  delete: 'Usunięcie',
  use: 'Zużycie',
  remove: 'Usunięte',
  'transfer-add': 'Przeniesienie do',
  'transfer-remove': 'Przeniesienie z',
  transfer: 'Przeniesienie'
};

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch(e) { return d; }
}



function ActionIcon({ type }) {
  const common = 'w-8 h-8 rounded-full flex items-center justify-center';
  switch (type) {
    case 'add':
    case 'import':
      return (
        <div className={common + ' bg-green-100 text-green-800'} title="Dodanie">
          <AddIcon fontSize="small" />
        </div>
      );
    case 'use':
      return (
        <div className={common + ' bg-yellow-100 text-yellow-800'} title="Zużycie">
          <VerticalAlignBottomOutlinedIcon fontSize="small" />
        </div>
      );
    case 'delete':
    case 'remove':
      return (
        <div className={common + ' bg-red-100 text-red-800'} title="Usunięcie">
          <DeleteOutlineIcon fontSize="small" />
        </div>
      );
    case 'transfer':
    case 'transfer-add':
    case 'transfer-remove':
      return (
        <div className={common + ' bg-indigo-100 text-indigo-800'} title="Przeniesienie">
          <SwapHorizIcon fontSize="small" />
        </div>
      );
    case 'set':
    default:
      return (
        <div className={common + ' bg-gray-100 text-gray-800'} title={TYPE_LABEL[type] || type}>
          <EditNoteOutlinedIcon fontSize="small" />
        </div>
      );
  }
}

export default function UserActionsView({ token = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noteModal, setNoteModal] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/api/user-actions?page=${page}&limit=${limit}`, { headers: { ...getAuthHeaders(token) } });
        const j = await res.json();
        if (j && j.success && Array.isArray(j.items)) {
          setItems(prev => page === 1 ? j.items : [...prev, ...j.items]);
          setTotal(typeof j.total === 'number' ? j.total : null);
        } else if (Array.isArray(j)) {
          setItems(prev => page === 1 ? j : [...prev, ...j]);
        }
      } catch (err) {
        console.error('user-actions fetch error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, limit, token]);

  return (
    <div className="w-full px-2 md:px-4 lg:px-6 py-8">
      <div className="mb-4 px-2 md:px-4 lg:px-6">
        <h2 className="text-2xl font-bold text-[#2a3b6e]">Akcje użytkowników</h2>
        <p className="text-sm text-gray-600">Historia zmian magazynowych: dodania, usunięcia, przeniesienia i zużycia.</p>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="text-center py-6">Ładowanie...</div>
        ) : (
          <div>
            {items.length === 0 ? (
              <div className="py-6 text-center text-gray-500">Brak rekordów</div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div className="pr-3" style={{ minWidth: 160 }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0"><ActionIcon type={it.type} /></div>
                        <div>
                          <div className="text-xs text-gray-500">{fmtDate(it.createdAt)}</div>
                          <div className="text-xs text-gray-500 truncate" title={it.user?.name || it.userId}>{it.user?.name || it.userId || '-'}</div>
                        </div>
                      </div>
                      <div className="font-medium mt-1">{TYPE_LABEL[it.type] || it.type}</div>
                      {it.note && <div className="text-xs text-gray-600 italic mt-1">{it.note}</div>}
                    </div>
                    <div className="text-sm text-gray-700 flex-1 whitespace-nowrap overflow-hidden truncate">{it.warehouse?.name || it.warehouseId || '-'}</div>
                    <div className="font-semibold ml-2">{it.quantity}</div>
                  </div>
                ))}
              </div>
            )}

            {total === null || items.length < total ? (
              <div className="mt-4 text-center">
                <button className="px-4 py-2 bg-[#2a3b6e] text-white rounded-md" onClick={() => setPage(p => p + 1)} disabled={loading}>
                  {loading ? 'Ładowanie...' : 'Pokaż więcej'}
                </button>
              </div>
            ) : (
              <div className="mt-4 text-center text-sm text-gray-500">Wczytano wszystkie rekordy ({items.length})</div>
            )}
          </div>
        )}
      </div>
      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setNoteModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-36 flex-shrink-0 flex items-center justify-center">
                { (noteModal.product?.imageThumb || noteModal.product?.imageUrl) ? (
                  <img
                    src={resolveImageUrl(noteModal.product.imageThumb || noteModal.product.imageUrl)}
                    alt={noteModal.product?.name}
                    className="w-32 h-32 object-cover rounded-xl border border-[#d1d5db]"
                    onError={(e) => {
                      try {
                        const full = noteModal.product?.imageUrl;
                        if (full) e.target.src = resolveImageUrl(full);
                      } catch (_) {}
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">Brak</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#2a3b6e] mb-1">{noteModal.product?.name}</h3>
                {noteModal.product?.size && <div className="text-sm text-gray-600 mb-1">Rozmiar: {noteModal.product.size}</div>}
                <div className="text-sm text-gray-600 mb-1">Typ: {noteModal.product?.type || '-'}</div>
                <div className="text-sm text-gray-600 mb-1">Magazyn: {noteModal.warehouse?.name || noteModal.warehouseId || '-'}</div>
                <div className="text-sm text-gray-600 mb-1">Ilość: <span className="font-semibold">{noteModal.quantity}</span></div>
                <div className="text-sm text-gray-600 mb-1">Data: {fmtDate(noteModal.createdAt)}</div>
                <div className="text-sm text-gray-600 mb-1">Użytkownik: {noteModal.user?.name || noteModal.userId || '-'}</div>
                <div className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{noteModal.note || '-'}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="bg-gray-200 text-gray-700 px-4 py-1 rounded-xl font-semibold" onClick={() => setNoteModal(null)}>Zamknij</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
