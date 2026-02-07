import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = useCallback((message, opts = {}) => {
    // Normalize message to string
    const text = typeof message === 'string' ? message : (message && (message.message || message.text || String(message))) || String(message);
    setToast({ message: text, type: opts.type || 'info', timeout: opts.timeout ?? 3000 });
    if ((opts.timeout ?? 3000) > 0) {
      setTimeout(() => setToast(null), opts.timeout ?? 3000);
    }
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastContext;
