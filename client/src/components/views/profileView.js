import React, { useEffect, useState } from 'react';
import { BASE, getAuthHeaders } from '../../services/api';
import { SaveButton, CancelButton } from '../buttons/button';

export default function ProfileView({ user, onUpdate, onChangePassword, token = null }) {
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState(false);
  const [userWarehouse, setUserWarehouse] = useState(user.userWarehouse || "");
  const [warehouses, setWarehouses] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/warehouses`, { headers: { ...getAuthHeaders(token) } })
      .then(r => r.json())
      .then(list => setWarehouses(list || []))
      .catch(() => setWarehouses([]));
  }, [token]);

  useEffect(() => {
    if (user && user.userWarehouse) {
      setUserWarehouse(user.userWarehouse);
    }
  }, [user]);

  // Zamykaj edycję i resetuj pola przy opuszczeniu widoku profilu
  useEffect(() => {
    return () => {
      setEditName(false);
      setName(user.name);
      setEditWarehouse(false);
      setUserWarehouse(user.userWarehouse || "");
    };
  }, [user.name, user.userWarehouse]);

  useEffect(() => {
    if (!showPasswordModal) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess("");
    }
  }, [showPasswordModal]);

  const handleSaveName = async () => {
    setEditName(false);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ id: user.id, name })
      });
      const result = await res.json();
      if (result.success) {
        setName(result.user.name);
        onUpdate && onUpdate(result.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        setAvatarUrl(reader.result);
        setLoading(true);
        try {
          const res = await fetch(`${BASE}/api/auth/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
            body: JSON.stringify({ id: user.id, avatarUrl: reader.result })
          });
          const result = await res.json();
          if (result.success) {
            setAvatarUrl(result.user.avatarUrl);
            onUpdate && onUpdate(result.user);
          }
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWarehouseSelect = async (e) => {
    const name = e.target.value;
    setUserWarehouse(name);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ id: user.id, userWarehouse: name || null })
      });
      const result = await res.json();
      if (result.success) {
        setUserWarehouse(result.user.userWarehouse || "");
        onUpdate && onUpdate(result.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Wszystkie pola są wymagane.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Nowe hasło i potwierdzenie muszą być takie same.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ id: user.id, oldPassword, newPassword })
      });
      const result = await res.json();
      if (result.success) {
        setPasswordSuccess("Hasło zostało zmienione.");
        setShowPasswordModal(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Przekaż nowe hasło do backendu (np. do onUpdate)
        if (onUpdate) {
          onUpdate({ ...user, password: newPassword });
        }
      } else {
        setPasswordError(result.message || "Nie udało się zmienić hasła.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-8 mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-[#2a3b6e]">Mój profil</h2>
      <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
        <div className="relative mb-4 md:mb-0">
          <label htmlFor="avatar-upload">
            <img src={avatarUrl || `https://ui-avatars.com/api/?name=${name || user.email.split('@')[0]}`}
              alt="avatar"
              className="w-20 h-20 rounded-full border border-[#d1d5db] object-cover aspect-square cursor-pointer" />
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </label>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 items-center">
            <div className="text-gray-600 text-right pr-2 hidden md:block">Imię i nazwisko:</div>
            <div>
              <div className="flex flex-row items-center gap-2">
                    {editName ? (
                  <> 
                    <input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 text-[#2a3b6e] font-semibold" />
                    <SaveButton onClick={handleSaveName} disabled={loading}>Zapisz</SaveButton>
                    <CancelButton onClick={() => { setEditName(false); setName(user.name); }}>Anuluj</CancelButton>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-lg text-[#2a3b6e]">{name}</span>
                    <button className="bg-[#e5e7eb] text-[#2a3b6e] px-3 py-1 rounded-xl font-semibold text-xs ml-2 border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => setEditName(true)}>Zmień</button>
                  </>
                )}
              </div>
            </div>
            <div className="text-gray-600 text-right pr-2 hidden md:block">Email:</div>
            <div><span className="font-semibold text-[#6b7280]">{user.email}</span></div>
            <div className="text-gray-600 text-right pr-2 hidden md:block">Hasło:</div>
            <div>
              <button className="bg-[#2a3b6e] text-white px-3 py-1 rounded-xl font-semibold text-xs shadow hover:bg-[#1d294f] transition" onClick={() => setShowPasswordModal(true)}>Zmień hasło</button>
            </div>
            <div className="text-gray-600 text-right pr-2 hidden md:block">Rola:</div>
            <div><span className="font-semibold text-[#2a3b6e]">{user.role || 'admin'}</span></div>
            <div className="text-gray-600 text-right pr-2 hidden md:block">Domyślny magazyn:</div>
            <div>
              <div className="flex flex-row items-center gap-2">
                    {editWarehouse ? (
                  <>
                    <select
                      value={userWarehouse}
                      onChange={e => setUserWarehouse(e.target.value)}
                      className="border rounded px-2 py-1 text-[#2a3b6e] font-semibold bg-white"
                      disabled={loading}
                    >
                      <option value="">Wybierz magazyn...</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                    <SaveButton onClick={async () => { await handleWarehouseSelect({target: {value: userWarehouse}}); setEditWarehouse(false); }} disabled={loading}>Zapisz</SaveButton>
                    <CancelButton onClick={() => { setEditWarehouse(false); setUserWarehouse(user.userWarehouse || ""); }}>Anuluj</CancelButton>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-[#2a3b6e]">{userWarehouse || '-'}</span>
                    <button className="bg-[#e5e7eb] text-[#2a3b6e] px-3 py-1 rounded-xl font-semibold text-xs ml-2 border border-[#d1d5db] hover:bg-[#d1d5db] transition" onClick={() => setEditWarehouse(true)}>Zmień</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl" onClick={() => setShowPasswordModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4 text-[#2a3b6e]">Zmiana hasła</h3>
            {passwordError && <div className="text-red-600 mb-2 text-sm">{passwordError}</div>}
            {passwordSuccess && <div className="text-green-600 mb-2 text-sm">{passwordSuccess}</div>}
            <div className="mb-4">
              <label className="block text-gray-600 mb-1">Stare hasło</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
            <div className="mb-4">
              <label className="block text-gray-600 mb-1">Nowe hasło</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
            <div className="mb-6">
              <label className="block text-gray-600 mb-1">Potwierdź nowe hasło</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="bg-gray-300 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-gray-400 transition" onClick={() => setShowPasswordModal(false)}>Anuluj</button>
              <button className="bg-[#2a3b6e] text-white px-4 py-2 rounded-xl font-semibold text-xs shadow hover:bg-[#1d294f] transition" onClick={handleChangePassword} disabled={loading}>Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
