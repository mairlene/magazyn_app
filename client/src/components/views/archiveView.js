import React, { useEffect, useState } from "react";
import { BASE, resolveImageUrl, getAuthHeaders } from '../../services/api';
import formatError from '../../utils/formatError';
import { useToast } from '../common/ToastContext';

export default function ArchiveView({ user, userId, token = null }) {
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const [noteModal, setNoteModal] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchArchive() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${BASE}/api/archive/by-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders(token) },
          body: JSON.stringify({ userId, page, limit }),
        });
        const data = await res.json();
        if (!cancelled) {
          setArchivedProducts(prev => page === 1 ? (data.products || []) : [...prev, ...(data.products || [])]);
          setTotal(typeof data.total === 'number' ? data.total : null);
        }
      } catch (err) {
        if (!cancelled) {
          setArchivedProducts([]);
          setError("Błąd pobierania archiwum");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (userId) fetchArchive();
    return () => { cancelled = true; };
  }, [userId, user, page, limit, token]);

  const handleRestore = async (item) => {
    setError("");
    // clear previous error; success state is handled via toasts
    try {
      const res = await fetch(`${BASE}/api/archive/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(token) },
        body: JSON.stringify({ archiveId: item.id, userId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Produkt przywrócony', { type: 'info', timeout: 3000 });
        setArchivedProducts(archivedProducts.filter((p) => p.id !== item.id));
      } else {
        setError(data.error || "Błąd przywracania produktu");
      }
    } catch (err) {
      setError("Błąd przywracania produktu");
    }
  };

  // Helper: can restore (admin always, others only same day)
  const canRestore = (item) => {
    if (user?.role === "admin") return true;
    const usedDate = new Date(item.usedAt);
    const now = new Date();
    return usedDate.toDateString() === now.toDateString();
  };

  return (
    <div className="bg-[#f5f6fa] min-h-screen p-6 rounded-xl shadow-md px-2 md:px-4 lg:px-6">
      <h2 className="text-2xl font-bold text-[#2a3b6e] mb-6">Archiwum produktów</h2>
  {error && <div className="text-red-600 mb-2 text-center">{formatError(error)}</div>}
      {loading ? (
        <p className="text-gray-500 text-center mt-8">Ładowanie...</p>
      ) : archivedProducts.length === 0 ? (
        <div className="text-gray-500 text-center mt-8">Brak produktów w archiwum.</div>
      ) : (
        <div className="mt-4">
          {/* Widok listy jak w ProductGrid (list view) */}
          <div className="w-full mx-auto max-w-4xl">
            {/* Header: hidden on small screens to save space; columns match row layout */}
            <div className="hidden md:flex flex-row items-center gap-4 w-full font-bold text-[#2a3b6e] text-base mb-2" style={{ maxWidth: 900 }}>
                <div className="w-14 min-w-[56px] text-center">Zdjęcie</div>
                <div className="flex-1 min-w-[180px]">Nazwa</div>
                <div className="w-40 text-center">Magazyn</div>
                <div className="w-44 text-center">Data</div>
                <div className="w-40 text-center">Użytkownik</div>
                <div className="w-36 text-center">Akcja</div>
              </div>
            {archivedProducts.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0" style={{ maxWidth: 900 }}>
                  <div className="pr-3" style={{ minWidth: 160 }}>
                    <div className="text-xs text-gray-500">{new Date(item.usedAt).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 truncate" title={item.user?.name || item.user?.email}>{item.user?.name || item.user?.email || '-'}</div>
                    <div className="font-medium mt-1">{item.product?.name}</div>
                    {item.note && <div className="text-xs text-gray-600 italic mt-1">{item.note}</div>}
                  </div>
                  <div className="text-sm text-gray-700 flex-1 whitespace-nowrap overflow-hidden truncate">{item.warehouse?.name}</div>
                  <div className="font-semibold ml-2">{item.quantity}</div>
                </div>
            ))}
            {total === null || archivedProducts.length < total ? (
              <div className="mt-4 text-center">
                <button className="px-4 py-2 bg-[#2a3b6e] text-white rounded-md" onClick={() => setPage(p => p + 1)} disabled={loading}>
                  {loading ? 'Ładowanie...' : 'Pokaż więcej'}
                </button>
              </div>
            ) : (
              <div className="mt-4 text-center text-sm text-gray-500">Wczytano wszystkie rekordy ({archivedProducts.length})</div>
            )}
              {/* Note modal (shows full note) */}
              {noteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setNoteModal(null)}>
                  <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-36 flex-shrink-0 flex items-center justify-center">
                        {(noteModal.product?.imageThumb || noteModal.product?.imageUrl) ? (
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
                        <div className="text-sm text-gray-600 mb-1">Magazyn: {noteModal.warehouse?.name || '-'}</div>
                        <div className="text-sm text-gray-600 mb-1">Ilość: <span className="font-semibold">{noteModal.quantity}</span></div>
                        <div className="text-sm text-gray-600 mb-1">Data użycia: {new Date(noteModal.usedAt).toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mb-1">Użytkownik: {noteModal.user?.name || noteModal.user?.email || '-'}</div>
                        <div className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{noteModal.note || '-'}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button className="bg-gray-200 text-gray-700 px-4 py-1 rounded-xl font-semibold" onClick={() => setNoteModal(null)}>Zamknij</button>
                      {canRestore(noteModal) ? (
                        <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl font-semibold hover:bg-[#1d294f]" onClick={() => { handleRestore(noteModal); setNoteModal(null); }}>Przywróć</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
