import React from 'react';
import { useToast } from './ToastContext';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function Toast() {
  const { toast } = useToast();

  if (!toast) return null;

  // Use app's Tailwind `success` color for positive toasts and a clean single-surface look.
  const isError = toast.type === 'error';
  const bgClass = isError ? 'bg-red-600' : 'bg-success-500';

  return (
    <div
      className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-50 text-white ${bgClass} px-4 py-3 rounded-xl shadow-md flex items-center gap-3`}
      style={{ minWidth: 280, maxWidth: 720 }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center justify-center" style={{ minWidth: 20 }}>
          {isError ? <ErrorOutlineIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
        </div>
        <div className="flex-1 text-sm font-semibold text-left">{toast.message}</div>
      </div>
    </div>
  );
}
