import React from 'react';

export default function InfoBubble() {
  const info = `Wymagane rozszerzenie pliku: .xlsx, .xls lub .csv.\nPlik powinien zawierać kolumny: Nazwa, Rozmiar, Typ, Magazyn, Ilość.\nNagłówki mogą być w języku polskim lub angielskim (np. Name, Size, Type, Warehouse, Quantity).\nMagazyn może być pusty — wtedy import utworzy tylko produkt bez stanu.\nJeśli opcja tworzenia magazynów jest włączona, brakujące magazyny zostaną utworzone.`;
  return (
    <div className="w-12 h-12 rounded-full bg-[#2a3b6e] text-white flex items-center justify-center shadow cursor-default" title={info}>
      i
    </div>
  );
}
