import React, { useState, useEffect, useRef } from "react";
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArchiveIcon from '@mui/icons-material/Archive';

export default function UserProfileMenu({ user, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (e) => {
      try {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
          setMenuOpen(false);
        }
      } catch (_) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className="flex items-center gap-2 bg-[#e5e7eb] rounded-full px-3 py-1 shadow hover:bg-[#d1d5db] transition"
        onClick={() => setMenuOpen((open) => !open)}
          aria-label="Menu użytkownika"
      >
        <img
          src={user?.avatarUrl || "https://ui-avatars.com/api/?name=" + (user?.name || "U")}
          alt="avatar"
          className="w-8 h-8 rounded-full border border-[#d1d5db]"
        />
        <span className="hidden md:inline font-semibold text-[#2a3b6e]">{user?.name || "Użytkownik"}</span>
        <svg width="16" height="16" fill="none" stroke="#2a3b6e" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e5e7eb] z-50">
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold flex items-center gap-2" onClick={() => { setMenuOpen(false); onSelect('profile'); }}><svg className="w-4 h-4 text-[#2a3b6e]" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM4 20v-1c0-2.21 3.58-4 8-4s8 1.79 8 4v1H4z" stroke="#2a3b6e" strokeWidth="0"/></svg>Mój profil</button>
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold flex items-center gap-2" onClick={() => { setMenuOpen(false); onSelect('archive'); }}><ArchiveIcon fontSize="small" />Archiwum</button>
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold flex items-center gap-2" onClick={() => { setMenuOpen(false); onSelect('warehouses'); }}><WarehouseIcon fontSize="small" />Magazyny</button>
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold flex items-center gap-2" onClick={() => { setMenuOpen(false); onSelect('types'); }}><CategoryIcon fontSize="small" />Typy</button>
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold flex items-center gap-2" onClick={() => { setMenuOpen(false); onSelect('products'); }}><Inventory2Icon fontSize="small" />Produkty</button>
          {user?.role === 'admin' && (
            <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold" onClick={() => { setMenuOpen(false); onSelect('adminPanel'); }}>Panel administratora</button>
          )}
          {(user?.role === 'admin' || user?.role === 'editor') && (
            <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#2a3b6e] font-semibold" onClick={() => { setMenuOpen(false); onSelect('userActions'); }}>Akcje użytkowników</button>
          )}
          <button className="w-full text-left px-4 py-2 hover:bg-[#f5f6fa] text-[#d32f2f] font-semibold border-t border-[#e5e7eb]" onClick={() => { setMenuOpen(false); onSelect('logout'); }}>Wyloguj</button>
        </div>
      )}
    </div>
  );
}
