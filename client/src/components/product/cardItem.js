import React from 'react';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import QtyStepper from '../common/QtyStepper';
import { EditButton, DeleteButton } from '../buttons/button';
import styles from './product-grid.module.css';
import ProductItem from './productItem';

export default function CardItem({ product, mode = 'search', viewMode = 'grid', onUse, onEdit, onDelete, onTypeClick, onWarehouseClick, userId, availableQty, selected = false, checked = false, onSelectCheckbox = null, massQuantity = 1, onMassQuantityChange = null, stockKey = null }) {
  return (
    <ProductItem product={product} massQuantity={massQuantity} onMassQuantityChange={(v) => onMassQuantityChange && onMassQuantityChange(stockKey || `${product?.id ?? ''}-${product?.warehouseId ?? ''}`, v)} onSelectCheckbox={() => onSelectCheckbox && onSelectCheckbox(stockKey || `${product?.id ?? ''}-${product?.warehouseId ?? ''}`)}>
      {({ image, imageFailed, setImageFailed, name, size, type, available, quantity, handleQtyChange, handleCheckbox, renderAvailability, showDetailsModal, setShowDetailsModal, handleImageError }) => (
        <div className={`${styles.card} ${selected ? 'ring-2 ring-sky-200/40 bg-sky-50' : ''}`} onClick={() => setShowDetailsModal(true)}>
          <div className={styles.cardImage} onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }}>
            {type && <div className={styles.cardBadge}>{type}</div>}
            {image && !imageFailed ? (
              <img src={image} alt={name} className="rounded-lg border border-[#e5e7eb] object-cover w-full h-full" onError={() => { try { handleImageError(); } catch (_) { setImageFailed(true); } }} />
            ) : (
              <div className="rounded-lg border border-[#e5e7eb] object-cover bg-white w-full h-full" />
            )}
          </div>

          <div style={{ width: '100%' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={styles.cardTitle}>{name}{size ? ` ${size}` : ''}</div>
              </div>
              {mode === 'search' && (
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={(e) => { e.stopPropagation(); handleCheckbox(stockKey || `${product?.id ?? ''}-${product?.warehouseId ?? ''}`); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 md:w-5 md:h-5 rounded border ml-0 md:ml-3"
                  style={{ accentColor: '#2a3b6e' }}
                  aria-label="Zaznacz produkt"
                />
              )}
            </div>

            <div className={styles.cardDetails}>
              {renderAvailability()}
            </div>

            <div className={styles.cardActions}>
              {mode === 'use' && (
                <>
                  <div className="flex items-center gap-2">
                    <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={(e) => { e.stopPropagation(); handleQtyChange(Math.max(1, quantity - 1)); }} disabled={quantity <= 1}>-</button>
                    <span className="w-10 md:w-16 text-center border rounded text-sm px-2 py-1 font-semibold bg-[#f7f8fa] text-[#2a3b6e] select-none" style={{width: 48}}>{quantity}</span>
                    <button className="bg-gray-300 px-3 py-1 rounded text-sm font-semibold border border-[#d1d5db] hover:bg-gray-400 transition" onClick={(e) => { e.stopPropagation(); handleQtyChange(Math.min(Number(available) || Infinity, quantity + 1)); }} disabled={quantity >= available}>+</button>
                  </div>
                  <button aria-label="Użyj" className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center gap-2" onClick={(e) => { e.stopPropagation(); if (typeof onUse === 'function') onUse(product, quantity); }} disabled={available < 1}>
                    <VerticalAlignBottomOutlinedIcon fontSize="small" />
                    <span className="hidden md:inline">Użyj</span>
                  </button>
                </>
              )}

              {mode === 'transfer' && (
                <button aria-label="Przenieś" className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl shadow text-xs font-semibold hover:bg-[#1d294f] transition flex items-center gap-2" onClick={(e) => { e.stopPropagation(); if (typeof onEdit === 'function') onEdit(product); }} disabled={available < 1}>
                  <SwapHorizIcon fontSize="small" />
                  <span className="hidden md:inline">Przenieś</span>
                </button>
              )}

              {mode === 'search' && (
                <div className="flex items-center gap-2">
                  <QtyStepper value={quantity} min={1} max={available || Infinity} onChange={(v) => handleQtyChange(v)} className="mx-0" />
                </div>
              )}

              {mode !== 'search' && mode !== 'use' && mode !== 'transfer' && (
                <>
                  <EditButton onClick={(e) => { e.stopPropagation(); if (typeof onEdit === 'function') onEdit(product); else { try { window.dispatchEvent(new CustomEvent('open-edit-view', { detail: { productId: product?.id, listItem: product } })); } catch (err) { console.warn('no edit handler', err); } } }} className="" children={null} />
                  <DeleteButton onClick={(e) => { e.stopPropagation(); if (typeof onDelete === 'function') onDelete(product); else console.warn('delete handler not provided'); }} className="" children={null} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </ProductItem>
  );
}
