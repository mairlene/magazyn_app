import React, { useState, useRef } from "react";
import UploadFileForm from "../../forms/uploadFileForm";
import InfoBubble from "./InfoBubble";
import ConfirmDuplicateModal from './ConfirmDuplicateModal';
import ConfirmCreateWarehouseModal from './ConfirmCreateWarehouseModal';
import { parseExcelFile } from "../../utils/excelImporter";
import { BASE, getAuthHeaders } from '../../../services/api';
import { useToast } from '../../common/ToastContext';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function ImportExcelView({ onBack, onRefresh, token = null, userId: propUserId = null }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [, setImportedRows] = useState([]);
  const [, setProcessingIndex] = useState(-1);
  const [currentDuplicateRow, setCurrentDuplicateRow] = useState(null);
  const [currentMissingWarehouse, setCurrentMissingWarehouse] = useState(null);
  const [onMissingDecision, setOnMissingDecision] = useState(null);
  const [processingLoading, setProcessingLoading] = useState(false);
  const { showToast } = useToast();

  const [, setApplyAllDecision] = useState(null);
  const applyAllDecisionRef = useRef(null);
  const importRowResolverRef = useRef(null);
  const importRowResolverTimeoutRef = useRef(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileName(file?.name || "");
  };

  const handleImportConfirm = async () => {
    if (!selectedFile) return;
    try {
      const userId = propUserId || localStorage.getItem('userId');
      if (!userId) throw new Error('Brak zalogowanego użytkownika (userId). Zaloguj się ponownie.');
      const rows = await parseExcelFile(selectedFile);
      setImportedRows(rows);
      setProcessingIndex(0);

      // Note: process rows one-by-one; when encountering a missing warehouse
      // the server will respond with { status: 'missingWarehouse', warehouseName }
      // and we will prompt the user via modal to create or skip that warehouse.
      // Note: types will be created automatically on the server when missing.

      for (let i = 0; i < rows.length; i++) {
        setProcessingLoading(true);
        const row = rows[i];
        const wname = (row.Magazyn || '').toString().trim();

        // Try importing this single row. Server will return 'missingWarehouse' when appropriate.
        let detectRes = await fetch(`${BASE}/api/products/import-row`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify({ row, userId }),
        });
        if (!detectRes.ok) {
          const txt = await detectRes.text().catch(() => null);
          throw new Error(txt || 'Błąd serwera podczas przetwarzania wiersza');
        }
        const detectBody = await detectRes.json();

        // If warehouse is missing, ask user whether to create it; if created, retry this row.
        if (detectBody && detectBody.status === 'missingWarehouse') {
          // Ask user
          setCurrentMissingWarehouse(detectBody.warehouseName || wname || '');
          await new Promise((resolve) => {
            const resolver = async (decision, applyAll) => {
              // decision: 'create' or 'skip'
              try {
                if (decision === 'create') {
                  // Instead of calling admin endpoint, ask server to create the warehouse
                  // by retrying import-row with options.createWarehouses === true.
                  const retryRes = await fetch(`${BASE}/api/products/import-row`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                    body: JSON.stringify({ row, userId, options: { createWarehouses: true } }),
                  });
                  if (!retryRes.ok) {
                    const txt = await retryRes.text().catch(() => null);
                    throw new Error(txt || 'Błąd przy ponownym przetwarzaniu wiersza');
                  }
                }
              } finally {
                resolve();
              }
            };
            setOnMissingDecision(() => resolver);
          });
          setCurrentMissingWarehouse(null);
          setProcessingLoading(false);
          setProcessingIndex(i + 1);
          continue;
        }

        if (detectBody.status === 'duplicate') {
          if (applyAllDecisionRef.current) {
            await fetch(`${BASE}/api/products/import-row`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
              body: JSON.stringify({ row, userId, confirmAction: applyAllDecisionRef.current === 'increase' ? 'increase' : 'reject' }),
            });
          } else {
            setProcessingLoading(false);
            await new Promise((resolve) => {
              setCurrentDuplicateRow({ ...row, IlośćImportowana: row.Ilość || row.quantity || 0 });
              importRowResolverRef.current = resolve;
              importRowResolverTimeoutRef.current = setTimeout(() => {
                if (importRowResolverRef.current) {
                  try { importRowResolverRef.current(); } catch (e) {}
                  importRowResolverRef.current = null;
                }
              }, 5 * 60 * 1000);
            });
            if (importRowResolverTimeoutRef.current) {
              clearTimeout(importRowResolverTimeoutRef.current);
              importRowResolverTimeoutRef.current = null;
            }
          }
        }
        setProcessingLoading(false);
        setProcessingIndex(i + 1);
      }
      await onRefresh?.();
      showToast('Import zakończony', { type: 'info', timeout: 2500 });
      setImportedRows([]);
      setSelectedFile(null);
      setFileName('');
    } catch (err) {
      showToast(err?.message || "Błąd podczas importu pliku", { type: 'error', timeout: 3500 });
    } finally {
      setProcessingLoading(false);
      setProcessingIndex(-1);
      setApplyAllDecision(null);
      applyAllDecisionRef.current = null;
      if (importRowResolverRef.current) importRowResolverRef.current = null;
      if (importRowResolverTimeoutRef.current) {
        clearTimeout(importRowResolverTimeoutRef.current);
        importRowResolverTimeoutRef.current = null;
      }
    }
  };

  return (
    <div className="bg-[#f5f6fa] min-h-screen p-6 rounded-xl shadow-md">
      <button onClick={onBack} className="mb-4 px-4 py-2 rounded-xl shadow bg-[#e5e7eb] text-[#2a3b6e] font-bold hover:bg-[#d1d5db] transition">← Powrót</button>
      <div className="flex items-center gap-3 mb-4">
        
        <h1 className="text-2xl font-bold mb-0 text-[#2a3b6e]">
          <UploadFileIcon /> Import z pliku</h1>
      </div>
      <div className="bg-white rounded-xl shadow p-4 border border-[#e5e7eb] mb-4 flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm text-gray-700 mb-2">Wymagane rozszerzenie pliku: <span className="font-semibold">.xlsx</span>, <span className="font-semibold">.xls</span> lub <span className="font-semibold">.csv</span>.</div>
          <div className="font-semibold text-[#2a3b6e]">Wymagane kolumny (w tej kolejności):</div>
          <ol className="list-decimal list-inside text-sm mt-2 text-gray-700">
            <li><b>Nazwa</b></li>
            <li><b>Rozmiar</b></li>
            <li><b>Typ</b></li>
            <li><b>Magazyn</b></li>
            <li><b>Ilość</b> — ilość sztuk produktu w magazynie</li>
          </ol>
          <div className="text-xs text-gray-600 mt-2">Pierwszy wiersz pliku powinien zawierać nagłówki.</div>
        </div>
        <div className="shrink-0"><InfoBubble /></div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 border border-[#e5e7eb] mb-4">
        <UploadFileForm onFile={handleFileSelect} />
        {selectedFile && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm">Wybrano plik: <b>{fileName}</b></span>
            <button className="bg-blue-600 text-white px-3 py-1 rounded-lg shadow hover:bg-blue-700 transition" onClick={handleImportConfirm}>Importuj dane</button>
          </div>
        )}
      </div>

      <ConfirmDuplicateModal
        row={currentDuplicateRow}
        loading={processingLoading}
        onDecision={async (decision, applyAll) => {
          if (applyAll) {
            setApplyAllDecision(decision === 'increase' ? 'increase' : 'reject');
            applyAllDecisionRef.current = decision === 'increase' ? 'increase' : 'reject';
          }
              const userId = propUserId || localStorage.getItem('userId');
              await fetch(`${BASE}/api/products/import-row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ row: currentDuplicateRow, userId, confirmAction: decision === 'increase' ? 'increase' : 'reject' }),
              });
          setCurrentDuplicateRow(null);
          if (typeof importRowResolverRef.current === 'function') {
            importRowResolverRef.current();
            importRowResolverRef.current = null;
          }
        }}
      />

      <ConfirmCreateWarehouseModal
        name={currentMissingWarehouse}
        loading={processingLoading}
        onDecision={async (decision, applyAll) => {
          try {
            if (typeof onMissingDecision === 'function') {
              onMissingDecision(decision === 'create' ? 'create' : 'skip', applyAll);
            }
          } finally {
            // clear temporary resolver handler
            setOnMissingDecision(null);
          }
        }}
      />

    </div>
  );
}
