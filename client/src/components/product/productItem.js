import React, { useEffect, useState } from 'react';
import { resolveImageUrl } from '../../services/api';
import ProductDetailsModal from './ProductDetailsModal';

// Render-prop base component that centralizes shared product item logic
export default function ProductItem({ product, massQuantity = 1, onMassQuantityChange, onSelectCheckbox, children }) {
  const [quantity, setQuantity] = useState(massQuantity || 1);
  const [imageFailed, setImageFailed] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => { setQuantity(massQuantity || 1); }, [massQuantity]);

  const rawImage = product?.imageThumb ?? product?.imageUrl ?? product?.image ?? '';
  // track a mutable imageSrc so we can attempt fallback from thumbnail -> full image
  const computeInitialImageSrc = () => {
    if (typeof rawImage === 'string') return resolveImageUrl(rawImage) || rawImage || '';
    if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) return objectUrl || '';
    return '';
  };
  const [imageSrc, setImageSrc] = useState(computeInitialImageSrc);

  useEffect(() => {
    // update object URL handling and reset imageSrc when rawImage changes
    if (rawImage && (rawImage instanceof File || rawImage instanceof Blob || typeof rawImage === 'object')) {
      try {
        const url = URL.createObjectURL(rawImage);
        setObjectUrl(url);
        return () => { try { URL.revokeObjectURL(url); } catch (e) {} };
      } catch (e) { setObjectUrl(null); }
    } else {
      if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch (e) {} setObjectUrl(null); }
    }
    // reset imageSrc when rawImage changes
    setImageSrc(computeInitialImageSrc());
    setImageFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawImage]);

  const name = product?.name ?? product?.Nazwa ?? '';
  const size = product?.size ?? product?.Rozmiar ?? '';
  const type = product?.type ?? product?.Typ ?? '';
  const available = product?.availableQty ?? 0;

  const handleQtyChange = (v) => {
    const val = Math.max(1, Math.min(Number(available) || Infinity, Number(v) || 1));
    setQuantity(val);
    if (typeof onMassQuantityChange === 'function') onMassQuantityChange(v);
  };

  const handleImageError = () => {
    // if the current source came from imageThumb and a different full image URL exists, try that
    try {
      const thumb = product?.imageThumb || null;
      const full = product?.imageUrl || null;
      if (thumb && full) {
        const resolvedThumb = resolveImageUrl(thumb);
        const resolvedFull = resolveImageUrl(full);
        if (resolvedThumb && imageSrc && imageSrc === resolvedThumb && resolvedFull && resolvedFull !== resolvedThumb) {
          setImageSrc(resolvedFull);
          setImageFailed(false);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setImageFailed(true);
  };

  const handleCheckbox = (key) => {
    if (typeof onSelectCheckbox === 'function') onSelectCheckbox(key);
  };

  const renderAvailability = () => {
    if (product && Array.isArray(product.rawRows)) {
      const totalQty = product.availableQty ?? product.rawRows.reduce((s, r) => s + (Number(r.availableQty ?? r.quantity ?? r.Ilość ?? 0) || 0), 0);
      const whCount = (product.warehousesCount ?? Array.from(new Set((product.rawRows || []).map(r => r.warehouse || r.Magazyn).filter(Boolean))).length) || 0;
      if (totalQty > 0) {
        return (<>
          <span className="text-sm inline-flex items-center whitespace-nowrap px-2 py-1 rounded bg-green-50 text-green-800">Dostępny w {whCount}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
            </svg>
          </span>
          <span className="font-bold px-1"> {totalQty}</span>
        </>);
      }
      return (<span className="text-sm inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</span>);
    }
    if (product && (product.warehouse || product.warehouseName)) {
      if (available > 0) return (<><span className="text-sm inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-800">Dostępny
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
        </svg>
      </span><span className="font-bold px-1"> {available}</span></>);
      return (<span className="text-sm inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</span>);
    }
    return (<span className="text-sm inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-800">Niedostępny</span>);
  };

  const shared = {
    image: imageSrc,
    imageFailed,
    setImageFailed,
    name,
    size,
    type,
    available,
    quantity,
    setQuantity,
    handleQtyChange,
    handleCheckbox,
    renderAvailability,
    showDetailsModal,
    setShowDetailsModal,
    handleImageError,
  };

  return (
    <>
      {typeof children === 'function' ? children(shared) : children}
      <ProductDetailsModal product={product} open={shared.showDetailsModal} onClose={() => shared.setShowDetailsModal(false)} />
    </>
  );
}
