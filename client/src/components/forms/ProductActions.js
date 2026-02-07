import React from 'react';
import ConfirmButton from "../common/ConfirmButton";
import { CancelButton } from '../buttons/button';
import styles from './product-form.module.css';

export default function ProductActions({ isEditing, loading, canEditValidated, canAddValidated, onConfirmEditClick, onAddClick, onCancelEdit }) {
  return (
    <div className="flex gap-3 mt-2 w-full justify-end form-actions">
      {isEditing ? (
        <>
          <ConfirmButton disabled={loading || !canEditValidated} onClick={onConfirmEditClick} className={styles['btn-main']}>Zatwierdź edycję</ConfirmButton>
          <CancelButton onClick={onCancelEdit} className={styles['btn-cancel']}>Anuluj</CancelButton>
        </>
      ) : (
        <>
          <ConfirmButton disabled={loading || !canAddValidated} onClick={onAddClick} className={styles['btn-main']}>Dodaj produkt</ConfirmButton>
          <CancelButton onClick={onCancelEdit} className={styles['btn-cancel']}>Anuluj</CancelButton>
        </>
      )}
    </div>
  );
}
