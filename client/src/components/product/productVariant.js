import React, { useState } from "react";

export default function ProductVariant({ variant, onAddToCart }) {
  const [qty, setQty] = useState(1);
  const maxQty = parseInt(variant.Ilość) || 0;

  const handleIncrease = () => {
    if (qty < maxQty) setQty(qty + 1);
  };

  const handleDecrease = () => {
    if (qty > 1) setQty(qty - 1);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition">
      <div className="flex items-center gap-3">
        {/* Miniaturka */}
        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
          {variant.Zdjęcie ? (
            <img src={variant.Zdjęcie} alt={variant.Nazwa} className="object-cover w-full h-full" />
          ) : (
            <span className="text-gray-400 text-sm">Brak</span>
          )}
        </div>

        <div>
          <p className="font-semibold">{variant.Rozmiar}</p>
          <p className="text-xs text-gray-500">Dostępne: {maxQty}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Sterowanie ilością */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={handleDecrease}
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300"
            disabled={qty <= 1}
          >
            -
          </button>
          <input
            type="number"
            value={qty}
            min={1}
            max={maxQty}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 1 && val <= maxQty) setQty(val);
            }}
            className="w-12 text-center border-none outline-none"
          />
          <button
            onClick={handleIncrease}
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300"
            disabled={qty >= maxQty}
          >
            +
          </button>
        </div>

        <button
          onClick={() => onAddToCart(variant, qty)}
          disabled={maxQty === 0}
          className={`px-3 py-1 rounded text-white ${
            maxQty === 0 ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          Pobierz
        </button>
      </div>
    </div>
  );
}