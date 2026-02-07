import React, { useState, useEffect } from 'react';
import { resolveImageUrl, getProductStocksDedup as getProductStocks } from '../../services/api';
import Modal from '../common/Modal';
import HistoryList from './HistoryList';
import { EditButton } from '../buttons/button';

export default function ProductDetailsModal({ product, open = false, onClose = () => {} }) {
  const [stockRows, setStockRows] = useState([]);
  
  const [imageFailed, setImageFailed] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  

  const name = product?.name ?? product?.Nazwa ?? '';
  const size = product?.size ?? product?.Rozmiar ?? '';
  const type = product?.type ?? product?.Typ ?? '';
  const warehouse = typeof product?.warehouse === 'string' ? product.warehouse : (product?.warehouse?.name ?? product?.warehouseName ?? '');

  const rawImage = product?.imageThumb ?? product?.imageUrl ?? product?.image ?? '';
  let image = '';
  if (typeof rawImage === 'string') image = resolveImageUrl(rawImage) || rawImage || '';

  // Fetch stocks and history when modal opens for the selected product
  useEffect(() => {
    if (!open || !product?.id) return;
    const fetchStocks = async () => {
      setLoadingStocks(true);
      try {
        const data = await getProductStocks(product.id);
        const stocks = Array.isArray(data.stocks) ? data.stocks : [];
        const normalized = stocks.map(s => ({
          warehouseId: s.warehouseId || (s.warehouse && s.warehouse.id) || null,
          warehouseName: s.warehouseName || (s.warehouse && s.warehouse.name) || '—',
          quantity: typeof s.quantity === 'number' ? s.quantity : Number(s.quantity) || 0,
        }));
        setStockRows(normalized);
      } catch (err) {
         
        console.error('[ProductDetailsModal] fetchStocks error', err.message || err);
        setStockRows([]);
      } finally {
        setLoadingStocks(false);
      }
    };

    fetchStocks();
  }, [open, product?.id]);

  // helper to refresh stocks is intentionally omitted; ProductDetailsModal will fetch on open

  if (!open) return null;

  // Identify current warehouse name for marking and compute totals
  const currentWhName = warehouse || '';
  const warehousesCount = stockRows.length;
  const totalQuantity = stockRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const isAvailable = totalQuantity > 0;
  return (
    <Modal open={open} onClose={onClose} contentClassName="max-w-lg w-full relative pb-6" contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {image && !imageFailed ? (
            <img
              src={image}
              alt={name}
              className="rounded-md border object-cover cursor-pointer"
              style={{ width: 80, height: 80 }}
              onClick={() => setShowImageModal(true)}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div style={{ width: 80, height: 80 }} className="rounded-md bg-white border" />
          )}
        </div>

        <div className="flex-1">
          <div>
            <h2 className="text-lg font-bold text-[#2a3b6e]">{name}{size ? ` ${size}` : ''}</h2>
          </div>
          {type && <div className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 inline-block mb-1 truncate">{type}</div>}

          <div className="mt-4">
            {isAvailable ? (
              <div className="mt-1 flex items-center justify-between">
                <div>
                  <span className="text-sm inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-800">
                    Dostępny w {warehousesCount} <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
                    </svg>
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900">{totalQuantity}</div>
              </div>
            ) : (
              <div className="mt-1">
                <div className="text-sm inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</div>
              </div>
            )}
            {loadingStocks ? (
              <div className="text-sm text-gray-500 mt-2">Ładowanie magazynów...</div>
            ) : (
              stockRows.length === 0 ? (
                <div className="text-sm text-gray-500 mt-2">Brak powiązań z magazynami</div>
              ) : (
                <div className="mt-2">
                  {stockRows.map((r, i) => {
                    const isCurrent = r.warehouseName === currentWhName;
                    return (
                      <div key={i} className={`flex justify-between items-center text-sm py-1 border-b last:border-b-0 text-gray-700`}>
                        <div className={`truncate pr-2 ${isCurrent ? 'text-indigo-800 font-semibold' : ''}`}>{r.warehouseName || '—'}</div>
                        <div className={`${isCurrent ? 'font-semibold text-indigo-800' : 'font-semibold'}`}>{r.quantity}</div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

      </div>
      <div className="mt-4 flex justify-end">
        <EditButton onClick={() => {
          // Close the details modal immediately so the inline/full edit form is visible
          try { onClose(); } catch (_) {}
          try {
            window.dispatchEvent(new CustomEvent('open-edit-view', { detail: { productId: product?.id, listItem: product, stockRows } }));
          } catch (e) {
            try { localStorage.setItem('pendingEditId', String(product?.id || '')); } catch (_) {}
            try { localStorage.setItem('pendingEditItem', JSON.stringify({ product: product, stockRows })); } catch (_) {}
            // Request navigation to the new product edit view
            window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'productNew' } }));
          }
        }}>przejdź do edycji</EditButton>
      </div>

      <HistoryList productId={product?.id} />

  {showImageModal && (
        <Modal open={showImageModal} onClose={() => setShowImageModal(false)} contentClassName={'max-w-[90vw] w-full relative flex flex-col items-center p-0'} contentStyle={{ maxHeight: '90vh' }} showClose={true}>
          {image && !imageFailed ? (
            <div className="w-full flex items-center justify-center p-2">
              <img src={image} alt={name} className="max-w-full max-h-[80vh] rounded-md object-contain" />
            </div>
          ) : (
            <div className="text-sm text-gray-600 p-4">Brak podglądu</div>
          )}
        </Modal>
      )}

    {/* EditProductModal kept in repo for now, but navigation now opens full-screen EditView via MainApp event listener. */}
    </Modal>
  );
}
