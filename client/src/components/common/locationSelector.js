import React, { useEffect, useState } from "react";
import { getWarehouses } from "../../services/api";

function WarehouseSelector({ warehouses = [], selectedWarehouse, onSelectWarehouse }) {
  const [localWarehouses, setLocalWarehouses] = useState(warehouses || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If parent provided warehouses, use them. Otherwise fetch from API.
    if (Array.isArray(warehouses) && warehouses.length > 0) {
      setLocalWarehouses(warehouses);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getWarehouses();
        if (!mounted) return;
        // API may return { id, name } objects or simple strings
        setLocalWarehouses(Array.isArray(res) ? res : []);
      } catch (e) {
        // error handling only; do not expose internal stack
        if (mounted) setLocalWarehouses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [warehouses]);

  return (
    <div>
      <label className="block mb-2 font-semibold">Magazyn:</label>
      <select
        value={selectedWarehouse}
        onChange={(e) => onSelectWarehouse(e.target.value)}
        className="p-2 border rounded"
        disabled={loading}
      >
        <option value="">Wszystkie magazyny</option>
        {localWarehouses.map((warehouse, index) => {
          const value = typeof warehouse === 'object' ? (warehouse.name ?? warehouse.id ?? '') : warehouse;
          const label = typeof warehouse === 'object' ? (warehouse.name ?? String(warehouse)) : warehouse;
          const key = typeof warehouse === 'object' ? (warehouse.id ?? index) : index;
          return (
            <option key={key} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default WarehouseSelector;