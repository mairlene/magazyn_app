import React from "react";
import styles from '../forms/product-form.module.css';

export default function ConfirmButton({ onClick, disabled, children, className }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        `${styles['btn-main']} ${className ?? ''} ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`
      }
      type="button"
    >
      {children}
    </button>
  );
}
