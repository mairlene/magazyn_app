import React, { useEffect, useState } from 'react';
import { getProductHistory, getProductLastHistory, getAuthHeaders } from '../../services/api';

export default function HistoryList({ productId, token = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let mounted = true;
    const fetchLatest = async () => {
      // determine whether auth header will be sent
      setLoading(true);

      const maxAttempts = 3;
      let attempt = 0;
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          const data = await getProductLastHistory(productId);
          const h = Array.isArray(data.history) ? data.history : [];
          if (!mounted) return;
          // If we got data, set and stop retrying
          if (h.length > 0) {
            setRows(h);
            setExpanded(false);
            break;
          }

          // No rows returned. If there's no auth token, allow retry; otherwise stop and show button.
          try {
            const auth = getAuthHeaders(token);
            const authPresent = !!auth.Authorization;
            if (!authPresent && attempt < maxAttempts) {
                // wait a bit for token to appear (backoff)
                 
                await sleep(200 * attempt);
                continue; // retry
              }
          } catch (e) {
            // ignore logging errors
          }

          // nothing found or auth present but empty result: stop retrying and show affordance
          setRows([]);
          setExpanded(false);
          break;
          } catch (err) {
          if (attempt < maxAttempts) {
             
            await sleep(200 * attempt);
            continue;
          }
          // final failure
          console.warn('[HistoryList] getProductLastHistory failed after attempts', err && err.message ? err.message : err);
          if (!mounted) return;
          setRows([]);
          setExpanded(false);
        }
      }

      if (mounted) setLoading(false);
    };

    fetchLatest();
    return () => { mounted = false; };
  }, [productId, token]);

  const loadFull = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      // determine whether auth header will be sent for full history

      const data = await getProductHistory(productId);
      const h = Array.isArray(data.history) ? data.history : [];
      setRows(h);
      setExpanded(true);
    } catch (err) {
       
      console.error('[HistoryList] loadFull error', err && err.message ? err.message : err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-4 mb-4">
        {loading && <div className="text-sm text-gray-500">Ładowanie historii...</div>}
        {!loading && rows.length === 0 && (
          <div>
            <div className="text-sm text-gray-500">Brak historii</div>
            <div className="mt-2">
              <button className="text-sm text-indigo-600 hover:underline" onClick={loadFull}>wyświetl historię zmian</button>
            </div>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="text-sm text-gray-700">
            {!expanded ? (
              <div>
                {(function () {
                  const h = rows[0];
                  if (!h) return null;
                  const actionLabel = (action) => {
                    switch (action) {
                      case 'add': return 'dodano';
                      case 'remove': return 'usunięto';
                      case 'import': return 'zaimportowano';
                      case 'use': return 'pobrano';
                      case 'transfer-add': return 'przeniesiono do';
                      case 'transfer-remove': return 'przeniesiono z';
                      case 'set': return 'zmieniono ilość';
                      case 'transfer': return 'przeniesiono';
                      default: return action;
                    }
                  };

                    return (
                    <div className="py-2 border-b last:border-b-0">
                      <div className="flex">
                        <div style={{ minWidth: 160 }} className="pr-3">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</div>
                            <div className="text-xs text-gray-500 truncate" title={h.userName || ''}>{h.userName || h.userId}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center min-w-0">
                          <div style={{ width: 140 }} className="text-sm text-gray-700 font-medium mr-2">{actionLabel(h.action)}</div>
                          <div className="text-sm text-gray-500 truncate">{h.warehouseName || '—'}</div>
                        </div>
                        <div style={{ minWidth: 64 }} className="text-sm font-semibold text-gray-700 text-right ml-4">{h.quantity}</div>
                      </div>
                      {h.note && <div className="text-xs text-gray-600 italic text-left" style={{ marginLeft: 160 }}>{h.note}</div>}
                    </div>
                  );
                })()}
                <div className="mt-2 mb-2">
                  <button className="text-sm text-indigo-600 hover:underline" onClick={loadFull}>wyświetl historię zmian</button>
                </div>
              </div>
            ) : (
              <div className="mb-4 pb-2">
                {rows.map((h, idx) => (
                  <div key={idx} className="py-2 border-b last:border-b-0">
                    <div className="flex">
                      <div style={{ minWidth: 160 }} className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</div>
                          <div className="text-xs text-gray-500 truncate" title={h.userName || ''}>{h.userName || h.userId}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center min-w-0">
                        <div style={{ width: 140 }} className="text-sm text-gray-700 font-medium mr-2">{(function(action){
                          switch(action){
                            case 'add': return 'dodano';
                            case 'remove': return 'usunięto';
                            case 'import': return 'zaimportowano';
                            case 'use': return 'pobrano';
                            case 'transfer-add': return 'przeniesiono do';
                            case 'transfer-remove': return 'przeniesiono z';
                            case 'transfer': return 'przeniesiono';
                            case 'set': return 'zmieniono ilość';
                            default: return action;
                          }
                        })(h.action)}</div>
                        <div className="text-sm text-gray-500 truncate">{h.warehouseName || '—'}</div>
                      </div>
                      <div style={{ minWidth: 64 }} className="text-sm font-semibold text-gray-700 text-right ml-4">{h.quantity}</div>
                    </div>
                    {h.note && <div className="text-xs text-gray-600 italic text-left" style={{ marginLeft: 160 }}>{h.note}</div>}
                  </div>
                ))}
                    <div className="mt-2 mb-6">
                  <button className="text-sm text-indigo-600 hover:underline" onClick={() => setExpanded(false)}>zamknij historię zmian</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
