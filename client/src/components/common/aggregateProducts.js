// Helper to aggregate raw product rows into unique products by id or name+size
export function aggregateProducts(rawProducts) {
  const map = new Map();
  for (const p of rawProducts || []) {
    const key = p.id ?? `${(p.name||'').toString().trim()}::${(p.size||'').toString().trim()}`;
    if (!map.has(key)) map.set(key, { rows: [], sample: p });
    map.get(key).rows.push(p);
  }

  const out = [];
  for (const v of map.values()) {
    const sample = v.sample || {};
    const totalQty = v.rows.reduce((s, r) => s + (Number(r.availableQty ?? r.quantity ?? r.Ilość ?? 0) || 0), 0);
    const warehouses = Array.from(new Set(v.rows.map(r => r.warehouse || r.Magazyn).filter(Boolean)));
    out.push({
      id: sample.id ?? null,
      name: sample.name ?? sample.Nazwa ?? '',
      size: sample.size ?? sample.Rozmiar ?? '',
      type: sample.type ?? sample.Typ ?? '',
      imageThumb: sample.imageThumb ?? sample.imageUrl ?? sample.image ?? '',
      availableQty: totalQty,
      warehousesCount: warehouses.length,
      warehouseId: v.rows[0]?.warehouseId ?? null,
      rawRows: v.rows,
    });
  }
  return out;
}

export default aggregateProducts;
