import React, { useState } from 'react';

export default function ConfirmCreateWarehouseModal({ name, onDecision, loading }) {
  const [applyAll, setApplyAll] = useState(false);
  if (!name) return null;
  return (
    <div className="fixed inset-0 bg-[#e5e7eb] bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 min-w-[320px] flex flex-col items-center border border-[#d1d5db]" style={{maxWidth: 520}}>
        <h2 className="text-lg font-bold mb-2 text-[#2a3b6e]">Brak magazynu</h2>
        <div className="mb-3 text-center text-[#2a3b6e]">
          Nie znaleziono magazynu o nazwie <b>{name}</b>.<br />Czy chcesz utworzyć ten magazyn i zaimportować powiązane pozycje?
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input id="applyAllCreate" type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="applyAllCreate" className="text-sm text-[#2a3b6e] select-none">Zastosuj dla wszystkich pozostałych</label>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="bg-[#2a3b6e] text-white px-4 py-1 rounded-xl shadow font-semibold hover:bg-[#1d294f] transition" onClick={() => onDecision('create', applyAll)} disabled={loading}>Utwórz</button>
          <button className="bg-[#e5e7eb] text-[#2a3b6e] px-4 py-1 rounded-xl shadow font-semibold border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => onDecision('skip', applyAll)} disabled={loading}>Pomiń</button>
        </div>
      </div>
    </div>
  );
}
