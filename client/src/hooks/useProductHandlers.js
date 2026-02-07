import { useCallback } from 'react';
import { getProductsDb } from '../services/api';
import useProductImageUpload from './useProductImageUpload';

// Hook that exposes handlers for ProductForm: handleAdd and handleConfirmEdit.
// It is implemented as a helper that returns memoized callbacks.
export default function useProductHandlers({ form, setForm, stockRows, userId, image, setImage, onAddProduct, onConfirmEdit }) {
  const { uploadImageForAdd } = useProductImageUpload();

  const handleAdd = useCallback(async () => {
    // Basic validation should be performed by caller; keep defensive checks here
    if (!form) return;

    // Client-side uniqueness check
    try {
      const DEFAULT_PAGE = 1;
      const DEFAULT_LIMIT = 100;
      const resp = await getProductsDb(null, DEFAULT_PAGE, DEFAULT_LIMIT);
      const products = resp && resp.products ? resp.products : (Array.isArray(resp) ? resp : []);
      const norm = s => (s || '').toString().trim().toLowerCase();
      const exists = products.some(p => (norm(p.name) === norm(form.Nazwa) && norm(p.size) === norm(form.Rozmiar) && norm(p.type) === norm(form.Typ)));
      if (exists) {
        return { ok: false, error: 'Produkt o tych parametrach już istnieje' };
      }
    } catch (e) {
      // network or API error during pre-check: continue and let the server handle duplicates
       
      console.warn('Pre-submit uniqueness check failed, proceeding to submit:', e);
    }

    let imageUrl = null;
    let imageThumb = null;
    try {
      if (image) {
        const resp = await uploadImageForAdd(image, setForm);
        // uploadImageForAdd now returns the full upload response object
        if (resp) {
          imageUrl = resp.url || null;
          imageThumb = resp.thumbUrl || resp.url || null;
        }
      }
    } catch (err) {
      // surface error to caller
       
      console.error('[useProductHandlers] upload error (add)', err);
      return { ok: false, error: err.message || String(err) };
    }

    const payload = {
      name: form.Nazwa,
      size: form.Rozmiar,
      type: form.Typ,
      userId,
      imageUrl,
      imageThumb: imageThumb || form.imageThumb || null,
    };
    if (Array.isArray(stockRows) && stockRows.length > 0) {
      payload.stocks = stockRows.map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
    }

    const ok = await onAddProduct(payload);
    if (!ok) return { ok: false };
    setForm({ Nazwa: '', Rozmiar: '', Typ: '' });
    setImage(null);
    return { ok: true };
  }, [form, setForm, stockRows, userId, image, setImage, onAddProduct, uploadImageForAdd]);

  const handleConfirmEdit = useCallback(async () => {
    if (!form) return { ok: false };
    const payload = {};
    const orig = {}; // caller may supply originalForm if needed; keep minimal here
    const setIfChanged = (key, value, origKey) => {
      const incoming = value;
      const originalValue = origKey ? orig[origKey] : orig[key];
      if ((incoming || '') !== (originalValue || '')) {
        payload[key] = incoming;
      }
    };
    setIfChanged('name', form.Nazwa, 'Nazwa');
    setIfChanged('size', form.Rozmiar, 'Rozmiar');
    setIfChanged('type', form.Typ, 'Typ');
    // If the user attached a new image (local File via `image`), upload it
    // first and include the returned urls in the payload. Otherwise, include
    // any image fields already present on `form`.
    try {
      if (image && typeof image !== 'string') {
        const resp = await uploadImageForAdd(image, setForm);
        if (resp) {
          payload.imageUrl = resp.url;
          payload.imageThumb = resp.thumbUrl || resp.url;
        }
      } else {
        if (typeof form.imageUrl !== 'undefined') payload.imageUrl = form.imageUrl;
        if (typeof form.imageThumb !== 'undefined') payload.imageThumb = form.imageThumb;
      }
    } catch (err) {
      // surface upload error to caller
       
      console.error('[useProductHandlers] upload error (edit)', err);
      return { ok: false, error: err.message || String(err) };
    }

    if (Array.isArray(stockRows)) {
      payload.stocks = stockRows.map(r => ({ warehouseId: r.warehouseId || null, warehouseName: r.warehouseName || '', quantity: Number(r.quantity) || 0 }));
    }

    const ok = await onConfirmEdit({ ...payload, name: payload.name || form.Nazwa, size: payload.size || form.Rozmiar, type: payload.type || form.Typ });
    if (!ok) return { ok: false };
    setForm({ Nazwa: '', Rozmiar: '', Typ: '' });
    setImage(null);
    return { ok: true };
  }, [form, setForm, stockRows, setImage, onConfirmEdit, image, uploadImageForAdd]);

  return { handleAdd, handleConfirmEdit };
}
