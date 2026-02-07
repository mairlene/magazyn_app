import React, { useState, useEffect } from "react";
import { BASE, resolveImageUrl } from '../../services/api';
import { UseButton, TransferButton, EditButton, DeleteButton, CancelButton } from '../buttons/button';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export default function ProductCard({
  product,
  mode,
  viewMode = 'grid',
  onUse,
  onEdit,
  onDelete,
  checked,
  onSelectCheckbox,
  warehouses = [],
  onTypeClick,
  onWarehouseClick,
  isExpanded,
  onToggle,
  userId,
  transferWarehouse,
  onSingleTransfer,
  massQuantity, // per-product quantity from ProductGrid
  onMassQuantityChange, // handler from ProductGrid
  hideInlineQuantity = false,
}) {
  // warehouses parameter is available if needed; no extra local variable needed
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Map fields to expected names
  const name = product.name ?? product.Nazwa ?? product.nazwa ?? "";
  // Normalize type and warehouse labels from possible shapes
  const type = product.type ?? product.Typ ?? product.typ ?? product.category ?? product.kategoria ?? product.categoryName ?? "";
  const warehouse = typeof product.warehouse === 'string'
    ? product.warehouse
    : (product.warehouse?.name ?? product.warehouseName ?? product.magazyn ?? product.Magazyn ?? "");
  const size = product.size ?? product.Rozmiar ?? product.rozmiar ?? "";
  const available = product.availableQty ?? 0;
  // prefer thumbnail when available
  const rawImage = product.imageThumb ?? product.imageUrl ?? product.image ?? "";
  // image may be: 1) an absolute URL string, 2) a relative path string ("/uploads/...")
  // 3) a File/Blob object (when a freshly created thumbnail file was attached client-side)
  const [objectUrl, setObjectUrl] = React.useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  let image = '';
  if (typeof rawImage === 'string') {
    image = resolveImageUrl(rawImage) || rawImage || '';
  } else if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) {
    // create an object URL for File/Blob so <img src> can render it
    image = objectUrl || '';
  } else {
    image = '';
  }

  // create/revoke object URL when rawImage (File/Blob) changes
  React.useEffect(() => {
    if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) {
      try {
        const url = URL.createObjectURL(rawImage);
        setObjectUrl(url);
        return () => {
          try { URL.revokeObjectURL(url); } catch (e) {}
          setObjectUrl(null);
        };
      } catch (e) {
        // fallthrough: no object URL available
        setObjectUrl(null);
      }
    } else {
      // cleanup any previous object URL
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        setObjectUrl(null);
      }
    }
    // reset imageFailed when rawImage changes
    setImageFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawImage]);

  // stockKey is not currently used locally; compute on demand where needed.

  // Effective userId from props or storage
  const effectiveUserId = userId || localStorage.getItem("userId") || null;

  // Small helper to show toasts
  const showToast = (type, message) => setToast({ type, message });

  const handleIncrease = () => {
    setQuantity((q) => (q < Number(available) ? q + 1 : q));
  };
  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };
  const handleUse = () => {
    setModalQuantity(quantity);
    setShowModal(true);
  };
  const confirmUse = async () => {
    setLoading(true);
    try {
      // Basic validation
      if (!product?.id) throw new Error('Brak identyfikatora produktu');
      if (!modalQuantity || modalQuantity < 1) throw new Error('Nieprawidłowa ilość');
      if (modalQuantity > Number(available)) throw new Error('Ilość przekracza dostępne zapasy');

      const payload = {
        productId: product.id,
        warehouseId: product.warehouseId,
        quantity: modalQuantity,
        userId: effectiveUserId,
        note: modalNote
      };

      const res = await fetch(`${BASE}/api/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to parse server error message
        let errMsg = res.statusText || 'Błąd serwera';
        try {
          const errBody = await res.json();
          errMsg = errBody?.message || JSON.stringify(errBody) || errMsg;
        } catch (_) {
          try { errMsg = await res.text(); } catch (_) {}
        }
        throw new Error(errMsg);
      }

      // Notify parent and show success toast
      if (typeof onUse === 'function') onUse(product, modalQuantity);
      showToast('success', 'Produkt zaktualizowany');
      setShowModal(false);
    } catch (err) {
      console.error('[ProductCard] confirmUse error:', err);
      showToast('error', err?.message || 'Błąd podczas użycia produktu');
    } finally {
      setLoading(false);
    }
  };

  // Transfer handler uses parent's onSingleTransfer
  const handleTransfer = async () => {
    setLoading(true);
    try {
      if (!product?.id) throw new Error('Brak identyfikatora produktu');
      if (!modalQuantity || modalQuantity < 1) throw new Error('Nieprawidłowa ilość');
      if (modalQuantity > Number(available)) throw new Error('Ilość przekracza dostępne zapasy');
      if (typeof onSingleTransfer === 'function') {
        await onSingleTransfer(product, modalQuantity, () => setShowModal(false));
        showToast('success', 'Przeniesiono produkt');
      }
    } catch (err) {
      console.error('[ProductCard] transfer error:', err);
      showToast('error', err?.message || 'Błąd podczas przenoszenia');
    } finally {
      setLoading(false);
    }
  };

  // Find warehouse name for transferWarehouse id
  let transferWarehouseName = "";
  if (warehouses && warehouses.length > 0 && transferWarehouse) {
    const foundById = warehouses.find(w => String(w.id) === String(transferWarehouse));
    transferWarehouseName = foundById ? foundById.name : "";
  }

  return (
    <div
      className={viewMode === 'grid'
        ? "bg-[#f7f8fa] rounded-xl shadow-lg p-4 flex flex-col items-center border border-[#e5e7eb] relative"
        : "bg-[#f7f8fa] rounded-xl shadow p-2 flex flex-row items-center border border-[#e5e7eb] mb-2 w-full product-list-row"}
      style={viewMode === 'grid'
        ? { minHeight: 160, maxWidth: 400, width: '100%' }
        : { minHeight: 60, width: '100%' }}
      onClick={onToggle}
    >
      {/* simple toast inside card for local feedback */}
      {toast && (
        // render toast inline (not absolute) so it doesn't escape card bounds
        <div className="bg-black text-white px-3 py-1 rounded-md text-xs z-50 mb-2">
          {typeof toast === 'string' ? toast : (toast && (toast.message || toast.text || String(toast))) }
        </div>
      )}
      {/* badges for type and warehouse (visible on each card) */}
      {(type || warehouse) && viewMode === 'grid' && (
        // badges for grid view (rendered in-flow so they respect parent stacking)
        <div className="flex gap-2 z-10 self-end">
          {type && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 truncate" title={`Typ: ${type}`}>
              {type}
            </span>
          )}
          {warehouse && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 truncate" title={`Magazyn: ${warehouse}`}>
              {warehouse}
            </span>
          )}
        </div>
      )}
      {/* Checkbox omitted — mass actions handled elsewhere */}
      {viewMode === 'list' ? (
        // List layout: top badges row, then a two-row content area where the left thumbnail spans middle+bottom rows.
  <div className="w-full mx-auto py-2 px-2 md:px-3" style={{ maxWidth: 900, minHeight: 72 }}>
          {/* Top bar: badges (mobile only). On md+ screens badges are shown after the product name. */}
          <div className="flex items-center justify-start gap-2 mb-2 md:hidden">
            {type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 whitespace-nowrap overflow-hidden max-w-[160px] truncate" title={`Typ: ${type}`}>{type}</span>
            )}
            {warehouse && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 whitespace-nowrap overflow-hidden max-w-[160px] truncate" title={`Magazyn: ${warehouse}`}>{warehouse}</span>
            )}
          </div>

          {/* Main content: left thumbnail, responsive layout */}
          <div className="flex flex-row items-start md:items-center gap-3">
            <div className="w-14 min-w-[56px] flex-shrink-0 flex items-center justify-center" onClick={e => {e.stopPropagation(); setShowImageModal(true);}}>
              {image && !imageFailed ? (
                <img
                  src={image}
                  alt={name}
                  className="rounded-lg shadow border border-[#e5e7eb] object-cover cursor-pointer"
                  style={{ width: 56, height: 56 }}
                  onError={(e) => {
                    try { console.error('[ProductCard] image load error', { src: e?.target?.src, productId: product?.id }); } catch (err) {}
                    setImageFailed(true);
                  }}
                />
              ) : (
                <div style={{ width: 56, height: 56 }} className="rounded-lg bg-white border border-[#e5e7eb]" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between md:flex-row md:items-center md:gap-4">
              {/* Middle: name (mobile above controls, md: left-aligned center) */}
                <div className="mb-2 md:mb-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="font-bold text-[#2a3b6e] text-sm truncate mr-3">{name} {size ? `(${size})` : ''}</div>
                    <div className="hidden md:flex items-center gap-2 ml-2">
                      {type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 truncate" title={`Typ: ${type}`}>{type}</span>
                      )}
                      {warehouse && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 truncate" title={`Magazyn: ${warehouse}`}>{warehouse}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 md:hidden">Dostępne: {available}</div>
                </div>

              {/* Controls: on mobile stacked, on md horizontal with full buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                {!hideInlineQuantity && (
                  <div className="flex items-center gap-1">
                    <button className="bg-gray-200 px-2 py-1 rounded text-xs font-semibold border border-[#d1d5db] hover:bg-gray-300 transition" onClick={e => {e.stopPropagation(); handleDecrease();}} disabled={quantity <= 1}>-</button>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" min={1} max={available} value={String(quantity)} onChange={e => { e.stopPropagation(); let v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10); if (Number.isNaN(v)) v = 1; if (v < 1) v = 1; if (v > available) v = available; setQuantity(v); }} className="w-10 text-center border rounded px-1 py-1 bg-[#f7f8fa] text-[#2a3b6e] text-sm" />
                    <button className="bg-gray-200 px-2 py-1 rounded text-xs font-semibold border border-[#d1d5db] hover:bg-gray-300 transition" onClick={e => {e.stopPropagation(); handleIncrease();}} disabled={quantity >= available}>+</button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {mode === 'use' && (
                      <UseButton onClick={(e) => { e.stopPropagation(); handleUse(); }} className="md:w-auto w-full" />
                    )}

                  {mode === 'transfer' && (
                    <TransferButton onClick={(e) => { e.stopPropagation(); setModalQuantity(quantity); setShowModal(true); }} className="md:w-auto w-full" />
                  )}

                      {mode === 'edit' && (
                        <>
                          <EditButton onClick={(e) => { e.stopPropagation(); onEdit(product); }} />
                          <DeleteButton onClick={(e) => { e.stopPropagation(); onDelete(product); }} />
                        </>
                      )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* IMAGE */}
          {image && !imageFailed ? (
            <img
              src={image}
              alt={name}
              className="rounded-lg shadow border border-[#e5e7eb] mb-2 object-cover"
              style={{width: 80, height: 80}}
              onError={(e) => {
                try { console.error('[ProductCard] image load error', { src: e?.target?.src, productId: product?.id }); } catch (err) {}
                setImageFailed(true);
              }}
            />
          ) : (
            <div className="rounded-lg shadow border border-[#e5e7eb] mb-2 object-cover bg-white" style={{ width: 80, height: 80 }} />
          )}
          {/* TITLE + SIZE obok siebie */}
          <div className="flex flex-row items-center justify-center font-bold text-[#2a3b6e] text-lg mb-1 text-center gap-2" style={{wordBreak: 'break-word'}}>
            <span>{name}</span>
            {size && <span className="text-lg text-gray-500 font-semibold">{size}</span>}
          </div>
          {/* DETAILS */}
          <div className="text-sm text-gray-700 mb-2 text-center font-semibold" style={{lineHeight: 1.4}}>
            <span>Dostępne: {available}</span>
          </div>
          {/* ACTIONS */}
          <div className="flex bottom-1 gap-2 mt-2 justify-center">
            {mode === 'edit' && (
              <>
                <button aria-label="Edytuj" className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center gap-2" onClick={e => {e.stopPropagation(); onEdit(product);}}>
                  <EditNoteOutlinedIcon fontSize="small" />
                  <span className="hidden md:inline">Edytuj</span>
                </button>
                <button aria-label="Usuń" className="bg-[#fff5f5] text-[#7f1d1d] px-3 py-1 rounded-xl shadow text-xs font-semibold border border-[#f5c6c6] hover:bg-[#ffecec] transition flex items-center gap-2" onClick={e => {e.stopPropagation(); onDelete(product);}}>
                  <CloseIcon fontSize="small" />
                  <span className="hidden md:inline">Usuń</span>
                </button>
              </>
            )}
            {mode === 'use' && (
              <>
                <div className="flex items-center gap-2">
                  <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={e => {e.stopPropagation(); handleDecrease();}} disabled={quantity <= 1}>-</button>
                  <span className="w-10 md:w-16 text-center border rounded text-sm px-2 py-1 font-semibold bg-[#f7f8fa] text-[#2a3b6e] select-none" style={{width: 48}}>{quantity}</span>
                  <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={e => {e.stopPropagation(); handleIncrease();}} disabled={quantity >= available}>+</button>
                </div>
                <button aria-label="Użyj" className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center gap-2" onClick={e => {e.stopPropagation(); handleUse();}} disabled={loading || available < 1}>
                  <VerticalAlignBottomOutlinedIcon fontSize="small" />
                  <span className="hidden md:inline">Użyj</span>
                </button>
              </>
            )}
            {mode === 'transfer' && (
              <>
                <div className="flex items-center gap-2">
                  <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={e => {e.stopPropagation(); handleDecrease();}} disabled={quantity <= 1}>-</button>
                  <span className="w-10 md:w-16 text-center border rounded text-sm px-2 py-1 font-semibold bg-[#f7f8fa] text-[#2a3b6e] select-none" style={{width: 48}}>{quantity}</span>
                  <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={e => {e.stopPropagation(); handleIncrease();}} disabled={quantity >= available}>+</button>
                </div>
                <button aria-label="Przenieś" className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center gap-2" onClick={e => {e.stopPropagation(); setModalQuantity(quantity); setShowModal(true);}} disabled={loading || available < 1}>
                  <SwapHorizIcon fontSize="small" />
                  <span className="hidden md:inline">Przenieś</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-[#e5e7eb] bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 400}}>
            {mode === 'transfer' ? (
              <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">
                Potwierdź przeniesienie produktu
              </h2>
            ) : (
              <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Potwierdź użycie produktu</h2>
            )}
            <div className="mb-2 text-[#2a3b6e] font-semibold">{name} {size ? `(${size})` : ''}</div>
            <div className="mb-2 text-gray-700">Magazyn: <span className="font-semibold">{warehouse}</span></div>
            <div className="mb-2 text-gray-700">Dostępne: <span className="font-semibold">{available}</span></div>
            <input type="text" inputMode="numeric" pattern="[0-9]*" min={1} max={available} value={String(modalQuantity)} onChange={e => {
               let val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
               if (Number.isNaN(val)) val = 1;
               if (val < 1) val = 1;
               if (val > available) val = available;
               setModalQuantity(val);
             }} className="w-10 md:w-16 text-center border rounded px-2 py-1 mb-4 bg-[#f7f8fa] text-[#2a3b6e]" />
            {/* Dodatkowy opis (opcjonalny) - only shown when archiving/using a product */}
            {mode === 'use' && (
              <textarea
                placeholder="Dodatkowy opis użycia (opcjonalnie)"
                value={modalNote}
                onChange={e => setModalNote(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4 bg-white text-sm text-[#2a3b6e]"
                rows={3}
              />
            )}
            {mode === 'transfer' && (
              <div className="mb-2 text-gray-700">Do magazynu: <span className="font-semibold">{transferWarehouseName}</span></div>
            )}
              <div className="flex gap-2 mt-2">
              <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={mode === 'transfer' ? handleTransfer : confirmUse} disabled={loading}>Potwierdź</button>
              <CancelButton onClick={() => setShowModal(false)} disabled={loading}>Anuluj</CancelButton>
            </div>
          </div>
        </div>
      )}
      {/* MODAL Z OBRAZEM */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: '90vw', maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
            {image && !imageFailed ? (
              <img
                src={image}
                alt={name}
                style={{maxWidth: '80vw', maxHeight: '80vh', borderRadius: '12px'}}
                onError={(e) => { try { console.error('[ProductCard] modal image load error', { src: e?.target?.src, productId: product?.id }); } catch (err) {} setImageFailed(true); }}
              />
            ) : (
              <div style={{width: '80vw', height: '60vh', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div className="text-sm text-gray-500">Brak podglądu</div>
              </div>
            )}
            <button className="mt-4 bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={() => setShowImageModal(false)}>Zamknij</button>
          </div>
        </div>
      )}
    </div>
  );
}