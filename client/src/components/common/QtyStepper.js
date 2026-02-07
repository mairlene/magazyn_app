import React from 'react';

export default function QtyStepper({ value = 1, onChange = () => {}, min = 1, max = Infinity, disabled = false, className = '' }) {
  const dec = (e) => { e && e.stopPropagation(); if (disabled) return; let v = Number(value) || 0; v = Math.max(min, v - 1); if (v > max) v = max; onChange(v); };
  const inc = (e) => { e && e.stopPropagation(); if (disabled) return; let v = Number(value) || 0; v = Math.min(max, v + 1); if (v < min) v = min; onChange(v); };
  const onInput = (e) => {
    e && e.stopPropagation();
    if (disabled) return;
    // use text input to avoid native number spinners; accept only digits
    const raw = String(e.target.value || '').replace(/[^0-9]/g, '');
    let v = raw === '' ? min : Number(raw);
    if (Number.isNaN(v) || v < min) v = min;
    if (v > max) v = max;
    onChange(v);
  };

  return (
    <div className={`inline-flex items-center ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || (Number(value) <= min)}
        className="px-3 sm:px-2 py-1 bg-gray-200 rounded text-sm disabled:opacity-60"
        aria-label="zmniejsz"
      >
        -
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={isFinite(max) ? max : undefined}
        value={String(value)}
        onChange={onInput}
        readOnly={disabled}
        className="mx-1 md:mx-2 w-8 md:w-24 text-center border rounded px-1 py-0.5 bg-[#f7f8fa] text-[#2a3b6e] text-sm"
        aria-label="ilość"
      />

      <button
        type="button"
        onClick={inc}
        disabled={disabled || (Number(value) >= max)}
        className="px-3 sm:px-2 py-1 bg-gray-200 rounded text-sm disabled:opacity-60"
        aria-label="zwiększ"
      >
        +
      </button>
    </div>
  );
}
