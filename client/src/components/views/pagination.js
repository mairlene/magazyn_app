import React from "react";

export default function Pagination({ totalPages, currentPage, onChangePage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-2 gap-1 sm:gap-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          aria-current={currentPage === num ? 'page' : undefined}
          className={`min-w-[28px] sm:min-w-[36px] px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm rounded transition-colors duration-150 focus:outline-none focus:ring-[#0f2a44] focus:ring-2 focus:ring-offset-2 ${
            currentPage === num
              ? "bg-[#f3f6fb] text-[#0f2a44] font-semibold"
              : "bg-gray-200 hover:bg-[#f3f6fb] text-[#0f2a44]"
          }`}
          onClick={() => onChangePage(num)}
        >
          {num}
        </button>
      ))}
    </div>
  );
}