import React from "react";

export default function SearchInput({ value, onChange, placeholder = "Szukaj po nazwie..." }) {
  return (
    <div className="mb-4">
      <label className="block mb-2 font-semibold">Nazwa:</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}