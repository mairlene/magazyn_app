import React from "react";
import { MdViewModule, MdViewList } from "react-icons/md";

export default function ProductOptionsBar({
  sortBy,
  setSortBy,
  sortOptions = [],
  viewMode,
  setViewMode,
}) {
  return (
    <div className="flex flex-row justify-between sm:justify-end items-center gap-4 py-2 px-2 bg-[#f7f8fa] border-b border-[#e5e7eb] rounded-b-xl mb-2">
      {/* Sortuj według */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#2a3b6e] font-semibold hidden sm:inline">Sortuj według:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-white text-[#2a3b6e]"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Przełącznik widoku */}
      <div className="flex items-center gap-2 sm:ml-4 ml-0">
        <span className="text-sm text-[#2a3b6e] font-semibold hidden sm:inline">Widok:</span>
        <button
          className={`px-3 py-1 rounded-xl text-xs font-semibold border border-[#d1d5db] shadow ${viewMode === 'grid' ? 'bg-[#2a3b6e] text-white' : 'bg-[#e5e7eb] text-[#2a3b6e]'}`}
          onClick={() => setViewMode('grid')}
        >
          <MdViewModule size={20} />
        </button>
        <button
          className={`px-3 py-1 rounded-xl text-xs font-semibold border border-[#d1d5db] shadow ${viewMode === 'list' ? 'bg-[#2a3b6e] text-white' : 'bg-[#e5e7eb] text-[#2a3b6e]'}`}
          onClick={() => setViewMode('list')}
        >
          <MdViewList size={20} />
        </button>
      </div>
    </div>
  );
}
