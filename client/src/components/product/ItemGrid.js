import React, { useState, useEffect, useRef } from "react";
import styles from './product-grid.module.css';
import CardItem from './cardItem';
import ListItem from './listItem';

export default function ItemGrid({
  products,
  mode,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onUse,
  selectedIds = [],
  onSelectCheckbox,
  onTypeClick,
  onWarehouseClick,
  transferWarehouse,
  massQuantities,
  onMassQuantityChange,
  onSingleTransfer,
  warehouses,
}) {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (gridRef.current && !gridRef.current.contains(e.target)) {
        setExpandedCardId(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!products || products.length === 0) {
    return <p className="text-gray-500">Brak produktów do wyświetlenia</p>;
  }

  return (
    <div ref={gridRef} className={viewMode === 'grid' ? styles.gridRoot : styles.listRoot}>
      {products.map((p, idx) => {
        const imageEphemeral = (p.imageThumb || p.imageUrl || p.updatedAt || '')
          .toString()
          .replace(/\s+/g, '-')
          .slice(0, 64);
        const stockKey = `${p.id}-${p.warehouseId ?? idx}-${imageEphemeral}`;
        const commonProps = {
          product: p,
          mode,
          onEdit,
          onDelete,
          onUse,
          checked: selectedIds?.includes(stockKey),
          onSelectCheckbox,
          stockKey,
          onTypeClick,
          onWarehouseClick,
          isExpanded: expandedCardId === stockKey,
          onToggle: () => setExpandedCardId(expandedCardId === stockKey ? null : stockKey),
          userId: p.userId,
          transferWarehouse: mode === 'transfer' ? (typeof transferWarehouse !== 'undefined' ? transferWarehouse : null) : null,
          warehouses,
          massQuantity: massQuantities?.[stockKey] || 1,
          onMassQuantityChange,
          availableQty: p.availableQty,
          onSingleTransfer,
        };

        return (
          viewMode === 'grid'
            ? <CardItem key={stockKey} {...commonProps} />
            : <ListItem key={stockKey} {...commonProps} />
        );
      })}
    </div>
  );
}
