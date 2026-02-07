import React, { useState } from 'react';

export default function ConfirmDuplicateModal({ row, onDecision, loading }) {
  const [applyAll, setApplyAll] = useState(false);
  if (!row) return null;
  return (
    <div className="fixed inset-0 bg-[#e5e7eb] bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 520}}>
        <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Produkt już istnieje w magazynie</h2>
        <div className="mb-3 text-center text-[#2a3b6e]">
          Produkt <b>{row.Nazwa}</b>{row.Rozmiar ? <span> — <span className="font-semibold">{row.Rozmiar}</span></span> : null} ({row.Typ}) znajduje się już w magazynie <b>{row.Magazyn}</b>.<br />Czy chcesz dodać do magazynu dodatkową ilość: <b>{row.Ilość ?? row.IlośćImportowana}</b> sztuk?
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input id="applyAll" type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="applyAll" className="text-sm text-[#2a3b6e] select-none">Zastosuj dla wszystkich pozostałych</label>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={() => onDecision('increase', applyAll)} disabled={loading}>Dodaj</button>
          <button className="bg-[#e5e7eb] text-[#2a3b6e] px-4 py-1 rounded-xl shadow font-semibold border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => onDecision('reject', applyAll)} disabled={loading}>Pomiń</button>
        </div>
      </div>
    </div>
  );
}
