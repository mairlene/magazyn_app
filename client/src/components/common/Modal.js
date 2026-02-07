import React, { useEffect } from 'react';

export default function Modal({ open = false, onClose = () => {}, children, contentClassName = '', contentStyle = {}, backdropClassName = '', showClose = true }) {
  // Split contentStyle so overflow is applied to the inner scroll area, not the outer container
  const { maxHeight = '80vh', overflow, ...restContentStyle } = contentStyle || {};

  // lock body scroll while modal is open (hook must be called unconditionally)
  useEffect(() => {
    const original = typeof document !== 'undefined' ? document.body.style.overflow : undefined;
    if (open && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined') document.body.style.overflow = original || '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 ${backdropClassName}`} onClick={onClose}>
      <div
        className={`bg-white rounded p-2 w-full relative ${contentClassName}`}
        style={{ ...restContentStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button is placed in the outer container so it won't scroll with the inner content */}
        {showClose && (
          <button aria-label="Zamknij" className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 rounded-full p-1 bg-white" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Inner scrollable area */}
        <div style={{ maxHeight: maxHeight, overflow: 'auto', paddingRight: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
