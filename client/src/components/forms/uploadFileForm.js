import React, { useRef } from "react";
import { useToast } from '../common/ToastContext';

export default function UploadFileForm({ onFile }) {
  const inputRef = useRef();
  const { showToast } = useToast();

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ok = allowed.some(ext => name.endsWith(ext));
    if (!ok) {
      showToast('Nieprawidłowe rozszerzenie pliku. Dozwolone: .xlsx, .xls, .csv', { type: 'error', timeout: 4000 });
      // reset input so user can re-select
      try { e.target.value = null; } catch (_) {}
      return;
    }
    onFile(file);
  };

  return (
    <div className="mb-4 p-4 border rounded bg-gray-50">
      <h2 className="mb-2 font-semibold">Importuj produkty z pliku:</h2>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        ref={inputRef}
        onChange={handleChange}
        className="p-1"
      />
    </div>
  );
}
