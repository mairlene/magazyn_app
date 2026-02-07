import React from 'react';

// Small reusable icon button that shows icon always and a label on md+ screens.
// Props:
// - icon: React node (SVG)
// - label: string (text shown on md+)
// - onClick, className, disabled, title
export default function IconButton({ icon, label, onClick, className = '', disabled = false, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl font-semibold transition ${className}`}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
