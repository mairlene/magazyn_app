import React, { useState, useEffect, useRef } from "react";
import ProductDetails from './ProductDetails';
import styles from './product-form.module.css';
import StockRowsEditor from './StockRowsEditor';
import ProductActions from './ProductActions';
import useProductHandlers from '../../hooks/useProductHandlers';

export default function ProductForm({
  form,
  setForm,
  types,
  warehouses,
  sizeSuggestions,
  loading,
  onAddProduct,
  onConfirmEdit,
  onCancelEdit,
  isEditing,
  editingId,
  canAdd,
  userId,
  imageUrl,
  // optional prop: when fields that also act as list filters change, emit them here
  onFilterChange,
  // optional multi-warehouse editing passed by parent (EditView)
  stockRows,
  setStockRows,
}) {
  const [image, setImage] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    // We intentionally run this effect only when entering/exiting edit mode or when the
    // initial imageUrl prop changes. We do not want to update originalForm while the
    // user is editing fields — originalForm should capture the original values at the
    // moment edit mode is entered. ESLint would normally ask to include form fields in
    // the dependency array, but that would cause originalForm to update during edits.
    if (isEditing) {
      setOriginalForm({
        Nazwa: form.Nazwa,
        Rozmiar: form.Rozmiar,
        Typ: form.Typ,
        imageUrl: form.imageUrl || imageUrl || null
      });
      // Initialize local image preview with existing image URL so user sees current photo
      const initialImage = form.imageUrl || imageUrl || null;
      console.warn('[ProductForm] init edit - image props', { formImage: form.imageUrl, imageUrl, initialImage });
      setImage(initialImage);
    } else {
      setOriginalForm(null);
      setImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, imageUrl]);

  // Check if form changed during edit
  const [originalStockRows, setOriginalStockRows] = useState(null);
  useEffect(() => {
    if (isEditing && Array.isArray(stockRows)) {
      setOriginalStockRows(JSON.stringify(stockRows || []));
    } else {
      setOriginalStockRows(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const isFormChanged = isEditing && originalForm && (
    form.Nazwa !== originalForm.Nazwa ||
    form.Rozmiar !== originalForm.Rozmiar ||
    form.Typ !== originalForm.Typ ||
    (image !== null && image !== originalForm.imageUrl) ||
    (originalStockRows && JSON.stringify(stockRows || []) !== originalStockRows)
  );

  const filterTimerRef = useRef(null);
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // update local form
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      // If this field is one of the filter fields, emit debounced filter change
      if (typeof onFilterChange === 'function' && ['Nazwa', 'Rozmiar', 'Typ'].includes(name)) {
        try {
          if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
        } catch (_) {}
        filterTimerRef.current = setTimeout(() => {
          try { onFilterChange({ [name]: newForm[name] }); } catch (_) {}
        }, 250);
      }
      return newForm;
    });
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { try { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); } catch (_) {} };
  }, []);

  // Validation for required fields
  const isTypeFilled = Boolean(form.Typ && form.Typ.trim());
  const isNameFilled = Boolean(form.Nazwa && form.Nazwa.trim());
  const isSizeFilled = Boolean(form.Rozmiar && form.Rozmiar.trim());

  // For add/edit require at least one stock row with positive quantity
  // (stock validation is handled in parent when needed)

  // Add: button enabled only if required fields (name/size/type) are filled.
  // Stocks are optional when creating a product — if present they will be sent in payload.
  const canAddValidated = isNameFilled && isSizeFilled && isTypeFilled && canAdd;
  const [validationError, setValidationError] = useState(null);
  // Use handlers from extracted hook
  const { handleAdd: _handleAdd, handleConfirmEdit: _handleConfirmEdit } = useProductHandlers({ form, setForm, stockRows, userId, image, setImage, onAddProduct, onConfirmEdit });

  // Wrap hook handlers to surface validation errors into local state
  const handleAdd = async () => {
    setUploadError(null);
    setValidationError(null);
    const res = await _handleAdd();
    if (res && res.error) setValidationError(res.error);
  };

  const handleConfirmEdit = async () => {
    setUploadError(null);
    setValidationError(null);
    const res = await _handleConfirmEdit();
    if (res && res.error) setValidationError(res.error);
  };

  // Edit: button enabled only if required fields are filled and form changed
  const canEditValidated = isEditing && isTypeFilled && isFormChanged;

  return (
    <form className="bg-white rounded-xl shadow p-4 border border-[#e5e7eb] flex flex-col mb-6">
      <ProductDetails form={form} handleFormChange={handleFormChange} types={types} sizeSuggestions={sizeSuggestions} image={image} setImage={setImage} onFilterChange={onFilterChange} />
      {/* Action buttons depending on mode */}
      {/* Multi-warehouse editor: works for both add and edit flows. Existing rows show warehouse as read-only label and editable quantity. */}
      <StockRowsEditor stockRows={stockRows} setStockRows={setStockRows} warehouses={warehouses} />
      <ProductActions
        isEditing={isEditing}
        loading={loading}
        canEditValidated={canEditValidated}
        canAddValidated={canAddValidated}
        onConfirmEditClick={handleConfirmEdit}
        onAddClick={handleAdd}
        onCancelEdit={onCancelEdit}
      />
      
      {/* Toast notification */}
      {loading && (
        <div className={styles['toast']}>
          Przetwarzanie...
        </div>
      )}
      {uploadError && (
        <div className={styles['toast']} style={{ background: '#f87171', color: '#fff' }}>
          {uploadError}
        </div>
      )}
      {validationError && (
        <div className={styles['toast']} style={{ background: '#f87171', color: '#fff' }}>
          {validationError}
        </div>
      )}
      {/* Mobile styles: ensure the flex row stacks and child min-widths don't force horizontal scroll */}
          <style>{`
        @media (max-width: 640px) {
          form > .form-row {
            flex-direction: column !important;
            gap: 8px !important;
            align-items: stretch !important;
          }
          /* Make each input group full width and remove restrictive min-widths */
          .form-row > div {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .form-row .w-32,
          .form-row .max-w-[208px],
          .form-row .min-w-[208px] {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </form>
  );
}