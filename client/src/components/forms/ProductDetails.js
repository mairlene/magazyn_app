import React from 'react';
import ProductImageDropzone from './ProductImageDropzone';

export default function ProductDetails({ form, handleFormChange, types, sizeSuggestions, image, setImage, onFilterChange }) {
  return (
    <div className="w-full flex flex-row flex-wrap items-end gap-4 overflow-x-auto form-row">
      <div className="min-w-[120px] flex flex-col">
        <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Zdjęcie (opcjonalne)</label>
        <div className="w-32 max-w-[208px] min-w-[208px]">
          <ProductImageDropzone image={image} setImage={setImage} />
        </div>
      </div>
      <div className="min-w-[120px] flex flex-col">
        <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Nazwa</label>
        <input
          name="Nazwa"
          placeholder="Nazwa produktu"
          value={form.Nazwa}
          onChange={handleFormChange}
          className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
          autoComplete="off"
        />
      </div>
      <div className="min-w-[100px] flex flex-col">
        <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Rozmiar</label>
        <input
          name="Rozmiar"
          list="rozmiary-list"
          placeholder="Rozmiar"
          value={form.Rozmiar}
          onChange={handleFormChange}
          className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
          autoComplete="off"
        />
        <datalist id="rozmiary-list">
          {sizeSuggestions
            .filter(
              (s) =>
                s.toLowerCase() === form.Rozmiar.trim().toLowerCase() ||
                s.toLowerCase().startsWith(form.Rozmiar.trim().toLowerCase())
            )
            .map((size, idx) => (
              <option key={idx} value={size} />
            ))}
        </datalist>
      </div>
      <div className="min-w-[100px] flex flex-col">
        <label className="block mb-1 font-semibold text-[#2a3b6e] text-xs sm:text-sm">Typ</label>
        <select
          name="Typ"
          value={form.Typ || ''}
          onChange={handleFormChange}
          className="border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b6e] w-full text-xs sm:text-sm"
        >
          <option value="">-- wybierz typ --</option>
          {types && types.length > 0 ? types.map((type, idx) => (
            typeof type === 'string' ? (
              <option key={idx} value={type}>{type}</option>
            ) : (
              <option key={type.id} value={type.name || String(type.id)}>{type.name || String(type.id)}</option>
            )
          )) : null}
        </select>
      </div>
    </div>
  );
}
