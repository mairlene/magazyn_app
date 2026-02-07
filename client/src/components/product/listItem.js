import React from 'react';
import ProductItem from './productItem';
import QtyStepper from '../common/QtyStepper';
import { EditButton, DeleteButton } from '../buttons/button';

export default function ListItem({ product, checked = false, onSelectCheckbox, massQuantity = 1, onMassQuantityChange, availableQty, mode = null, onEdit = null, onDelete = null, stockKey = null }) {
  let resolvedStockKey = stockKey;
  if (!resolvedStockKey) {
    const imageEphemeral = (product?.imageThumb || product?.imageUrl || product?.updatedAt || '').toString().replace(/\s+/g, '-').slice(0, 64);
    resolvedStockKey = `${product?.id ?? ''}-${product?.warehouseId ?? ''}-${imageEphemeral}`;
  }

  return (
    <div className="w-full mb-2">
  <ProductItem product={product} massQuantity={massQuantity} onMassQuantityChange={(v) => onMassQuantityChange && onMassQuantityChange(resolvedStockKey, v)} onSelectCheckbox={() => onSelectCheckbox && onSelectCheckbox(resolvedStockKey)}>
        {({ image, imageFailed, setImageFailed, name, size, type, available, quantity, handleQtyChange, handleCheckbox, renderAvailability, showDetailsModal, setShowDetailsModal }) => (
          <div
            className={`w-full rounded-lg p-2 border border-[#e5e7eb] transition-colors duration-150 ${checked ? 'bg-sky-50 ring-1 ring-sky-200/40' : 'hover:bg-slate-50'} md:max-w-3xl md:mx-auto md:p-3`}
            onClick={() => setShowDetailsModal(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {image && !imageFailed ? (
                  <img
                    src={image}
                    alt={name || 'image'}
                    className="rounded-md object-cover border cursor-pointer"
                    style={{ width: 56, height: 56 }}
                    onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="rounded-md bg-white border" style={{ width: 56, height: 56 }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                  {type && <div className="text-xs md:text-sm px-1 md:px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 inline-flex items-center mb-1 md:mb-0 whitespace-nowrap max-w-max">{type}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm md:text-base lg:text-lg text-[#2a3b6e] truncate">{name}{size ? ` ${size}` : ''}</div>
                  </div>
                  <div className="text-xs md:text-sm mt-1 md:mt-0 md:ml-2 flex flex-row items-center">
                    {renderAvailability()}
                  </div>
                </div>
              </div>

              {mode === 'search' ? (
                <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-end">
                  <div className="order-2 md:order-1">
                    <QtyStepper value={quantity} min={1} max={available || Infinity} onChange={(v) => handleQtyChange(v)} className="mx-0" />
                  </div>

                  <div className="order-1 md:order-2">
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => { e.stopPropagation(); handleCheckbox(resolvedStockKey); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border ml-0 md:ml-3"
                      style={{ accentColor: '#2a3b6e' }}
                      aria-label="Zaznacz produkt"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <EditButton onClick={(e) => { e.stopPropagation(); if (typeof onEdit === 'function') onEdit(product); else { try { window.dispatchEvent(new CustomEvent('open-edit-view', { detail: { productId: product?.id, listItem: product } })); } catch (err) { console.warn('no edit handler', err); } } }} className="" />
                  <DeleteButton onClick={(e) => { e.stopPropagation(); if (typeof onDelete === 'function') onDelete(product); else console.warn('delete handler not provided'); }} className="" />
                </div>
              )}
            </div>
          </div>
        )}
      </ProductItem>
    </div>
  );
}
