import React from 'react';
import QtyStepper from '../common/QtyStepper';
import { DeleteButton } from '../buttons/button';

export default function StockRowsEditor({ stockRows, setStockRows, warehouses }) {
  if (!Array.isArray(stockRows)) return null;
  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#2a3b6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7z" />
        </svg>
        <span className="text-sm font-semibold text-[#2a3b6e]">Magazyny:</span>
      </div>
      <div className="space-y-2">
        {stockRows.map((r, idx) => {
          const isNew = !!r.isNew || (!r.warehouseId && !r.warehouseName);
          return (
            <div key={idx} className="flex gap-2 items-center">
              <div className="flex-1">
                {isNew ? (
                  <select
                    className="w-full border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] text-xs sm:text-sm"
                    value={r.warehouseId || r.warehouseName || ''}
                    onChange={e => {
                      const raw = e.target.value;
                      const maybeId = Number(raw);
                      if (!Number.isNaN(maybeId) && maybeId > 0) {
                        const found = warehouses.find(w => String(w.id) === String(maybeId));
                        setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, warehouseId: maybeId, warehouseName: found ? found.name : raw, isNew: false, quantity: (it.quantity && Number(it.quantity) >= 1) ? Number(it.quantity) : 1 } : it));
                      } else {
                        setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, warehouseId: null, warehouseName: raw, isNew: false, quantity: (it.quantity && Number(it.quantity) >= 1) ? Number(it.quantity) : 1 } : it));
                      }
                    }}
                  >
                    <option value="">-- wybierz magazyn --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                ) : (
                  <div className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm truncate">{r.warehouseName || (r.warehouse && r.warehouse.name) || '—'}</div>
                )}
              </div>

              <QtyStepper
                value={typeof r.quantity === 'number' ? r.quantity : (r.quantity ? Number(r.quantity) : 1)}
                min={1}
                onChange={(v) => setStockRows(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(v) } : it))}
                className="mx-0"
              />

              <DeleteButton onClick={() => setStockRows(prev => prev.filter((_, i) => i !== idx))} className="flex-shrink-0" />
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        {!(stockRows.some(r => !!r.isNew || (!r.warehouseId && !r.warehouseName))) && (
          <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded shadow" onClick={() => setStockRows(prev => [...prev, { warehouseId: null, warehouseName: '', quantity: 1, isNew: true }])}>Dodaj magazyn</button>
        )}
      </div>
    </div>
  );
}
