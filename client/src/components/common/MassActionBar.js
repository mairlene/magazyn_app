import React, { useState } from 'react';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

// MassActionBar: mobile = stacked (column), large screens (lg+) = single row
export default function MassActionBar({
  selectedCount,
  totalQuantity = 0,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  transfer = null, // { warehouses: [{id,name}], selectedId, onChange }
  className = ''
}) {
  // Hook must be called unconditionally
  const [note, setNote] = useState('');

  if (!selectedCount) return null;

  const label = (confirmLabel || '').toString().toLowerCase();
  // treat Polish 'pobierz' (and english 'use') as download action
  const Icon = label.includes('pob') || label === 'use'
    ? VerticalAlignBottomOutlinedIcon
    : (label.includes('przen') ? SwapHorizIcon : CheckIcon);

  return (
    <>
      {/* spacer to prevent the fixed bar from covering content */}
      <div className="w-full h-28" aria-hidden="true" />

      <div className={`fixed bottom-0 left-0 right-0 bg-[#e5e7eb] text-[#2a3b6e] p-4 rounded-t-xl shadow-lg z-50 ${className}`}>
        {/* Top: transfer selector shown above the action row when present (for transfer actions) */}
        {transfer && (
          <div className="mb-3">
            {/* Inline label+icon on small/medium, select takes remaining space; on large screens select is 1/4 width */}
            <div className="flex items-center justify-end md:justify-between gap-3">
              <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                <svg className="w-6 h-6 text-[#2a3b6e]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-semibold text-sm">do magazynu</span>
              </div>

              <div className="flex-1">
                <select
                  value={(transfer && transfer.selectedId) || ''}
                  onChange={(e) => transfer && transfer.onChange && transfer.onChange(e)}
                  className="w-full lg:w-1/4 px-3 py-2 rounded-xl border bg-white text-sm"
                  aria-label="Wybierz magazyn"
                >
                  <option value="">Wybierz magazyn</option>
                  {transfer && transfer.warehouses && transfer.warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* note input for 'use' / 'pobierz' action */}
        {label.includes('pob') || label === 'use' ? (
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-sm">Opis</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={"opis dot. pobierania produktów (np. adres dostawy)"}
                className="ml-2 px-3 py-2 wrap rounded-xl border bg-white text-sm flex-1"
                aria-label="Opis pobierania"
              />
            </div>
          </div>
        ) : null}

        {/* main row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4">

          {/* left: summary (left aligned on md+) */}
          <div className="mb-3 sm:mb-0 sm:flex-1">
            <div className="text-sm font-bold text-[#2a3b6e]">Produkty: {selectedCount} · Ilości: {totalQuantity}</div>
          </div>

          {/* right: actions; allow wrapping on small screens so summary and buttons can occupy two lines when necessary */}
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              className="bg-white text-[#2a3b6e] px-3 py-1 sm:px-3 sm:py-1 rounded-xl shadow font-semibold border border-[#d1d5db] hover:bg-[#e5e7eb] transition flex items-center gap-2"
              onClick={onCancel}
              disabled={loading}
            >
              <CloseIcon fontSize="small" />
              <span>{cancelLabel}</span>
            </button>

            <button
              className="bg-[#2a3b6e] text-white px-3 py-1 md:px-3 md:py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition flex items-center gap-2"
              onClick={() => onConfirm && onConfirm(note)}
              disabled={loading || confirmDisabled}
            >
              <Icon fontSize="small" />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
