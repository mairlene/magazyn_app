import React from "react";

function TypeSelector({ types = [], selectedType, onSelectType }) {
  return (
    <div>
      <label className="block mb-2 font-semibold">Typ:</label>
      <select
        value={selectedType}
        onChange={(e) => onSelectType(e.target.value)}
        className="p-2 border rounded"
      >
        <option value="">Wszystkie typy</option>
        {types.map((type, index) => (
          <option key={index} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TypeSelector;