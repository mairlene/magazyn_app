import React, { useEffect, useState } from "react";
import { BASE, getAuthHeaders } from '../../services/api';
import formatError from '../../utils/formatError';
import IconButton from '../common/IconButton';
import TabsPills from '../common/TabsPills';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import HistoryIcon from '@mui/icons-material/History';

export default function AdminPanel({ currentUser, token = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [editType, setEditType] = useState(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [editWarehouseId, setEditWarehouseId] = useState(null);
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [newWarehouseVisible, setNewWarehouseVisible] = useState(false);
  const [newWarehouseInput, setNewWarehouseInput] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetch(`${BASE}/api/auth/users`, { headers: { ...getAuthHeaders(token) } })
      .then(res => res.json())
      .then(data => {
        if (data.success) setUsers(data.users);
        else setError(data.error || "Błąd pobierania użytkowników");
      });
    // Pobierz również produkty i magazyny do zestawień
    fetch(`${BASE}/api/products-db`)
      .then(r => r.json())
      .then(d => {
        const list = d.products || [];
        setProducts(list);
      })
      .catch(() => setProducts([]));
    fetch(`${BASE}/api/warehouses`)
      .then(r => r.json())
      .then(list => setWarehouses(list || []))
      .catch(() => setWarehouses([]));
  }, [token]);

  // Fetch history when the history tab becomes active
  useEffect(() => {
    let mounted = true;
    if (activeTab === 'history') {
      setHistoryLoading(true);
      fetch(`${BASE}/api/user-actions?limit=100`, { headers: { ...getAuthHeaders(token) } })
        .then(r => r.json())
        .then(d => {
          if (!mounted) return;
          if (d && d.success && Array.isArray(d.items)) setHistoryItems(d.items);
          else if (Array.isArray(d)) setHistoryItems(d);
          else setHistoryItems([]);
        })
        .catch(() => { if (mounted) setHistoryItems([]); })
        .finally(() => { if (mounted) setHistoryLoading(false); });
    }
    return () => { mounted = false; };
  }, [activeTab, token]);
  // helper: fetch fresh products and warehouses from backend
  const refreshProductsAndWarehouses = async () => {
    try {
      const pr = await fetch(`${BASE}/api/products-db`);
      const pd = await pr.json();
      const list = pd.products || [];
      setProducts(list);
    } catch (e) {
      setProducts([]);
    }
    try {
      const wr = await fetch(`${BASE}/api/warehouses`);
      const wl = await wr.json();
      setWarehouses(wl || []);
    } catch (e) {
      setWarehouses([]);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${BASE}/api/auth/update-role`, {
        method: "POST",
        headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole })
      });
      const result = await res.json();
      if (result.success) {
        setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        setSuccess("Uprawnienia zmienione");
      } else {
        setError(result.error || "Błąd zmiany roli");
      }
    } finally {
      setLoading(false);
    }
  };

  // Agregacje: typy i liczniki
  const typesCounts = products.reduce((acc, p) => {
    const t = p.type || 'Brak';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const warehouseCounts = products.reduce((acc, p) => {
    const w = p.warehouse || 'Brak';
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {});

  const handleDeleteType = async (type) => {
    if (!window.confirm(`Na pewno usunąć typ "${type}"?`)) return;
    try {
  const res = await fetch(`${BASE}/api/admin/delete-type`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Błąd usuwania typu');
        return;
      }
      // po powodzeniu pobierz świeże dane (unikniemy duplikacji / niespójności)
      await refreshProductsAndWarehouses();
      setSuccess('Typ usunięty');
    } catch (e) {
      setError('Błąd podczas usuwania typu');
    }
  };

  const handleDeleteWarehouse = async (warehouseName) => {
    if (!window.confirm(`Na pewno usunąć magazyn "${warehouseName}"?`)) return;
    try {
  const res = await fetch(`${BASE}/api/admin/delete-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: warehouseName }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Błąd usuwania magazynu');
        return;
      }
      // po powodzeniu pobierz świeże dane aby uniknąć duplikatów/niezsynchronizowanych ilości
      await refreshProductsAndWarehouses();
      setSuccess('Magazyn usunięty');
    } catch (e) {
      setError('Błąd podczas usuwania magazynu');
    }
  };

  // Edycja typu
  const startEditType = (type) => {
    setEditType(type);
    setNewTypeName(type);
    setSuccess("");
    setError("");
  };
  const cancelEditType = () => {
    setEditType(null);
    setNewTypeName("");
  };
  const saveEditType = async () => {
    if (!editType) return;
    const trimmed = newTypeName.trim();
    if (!trimmed) return setError('Nazwa nie może być pusta');
    if (trimmed === editType) return cancelEditType();
    setEditLoading(true);
    try {
  const res = await fetch(`${BASE}/api/admin/update-type`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ oldType: editType, newType: trimmed }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Błąd aktualizacji typu');
        return;
      }
      // pobierz świeże dane z backendu aby uniknąć niespójności
      await refreshProductsAndWarehouses();
      setSuccess('Typ zaktualizowany');
      setEditType(null);
      setNewTypeName("");
    } catch (e) {
      setError('Błąd podczas aktualizacji typu');
    } finally {
      setEditLoading(false);
    }
  };

  // Edycja magazynu
  const startEditWarehouse = (w) => {
    setEditWarehouseId(w.id);
    setNewWarehouseName(w.name);
    setSuccess("");
    setError("");
  };
  const cancelEditWarehouse = () => {
    setEditWarehouseId(null);
    setNewWarehouseName("");
  };
  const saveEditWarehouse = async () => {
    const w = warehouses.find(x => x.id === editWarehouseId);
    if (!w) return;
    const trimmed = newWarehouseName.trim();
    if (!trimmed) return setError('Nazwa magazynu nie może być pusta');
    if (trimmed === w.name) return cancelEditWarehouse();
    setEditLoading(true);
    try {
  const res = await fetch(`${BASE}/api/admin/update-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editWarehouseId, newName: trimmed }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Błąd aktualizacji magazynu');
        return;
      }
      // po powodzeniu pobierz świeże dane z backendu -> unikniemy duplikacji i niespójnych ilości
      await refreshProductsAndWarehouses();
      setSuccess('Magazyn zaktualizowany');
      setEditWarehouseId(null);
      setNewWarehouseName("");
    } catch (e) {
      setError('Błąd podczas aktualizacji magazynu');
    } finally {
      setEditLoading(false);
    }
  };

  // Sortuj użytkowników: admin (aktualny) na początku
  const sortedUsers = [
    ...users.filter(u => u.id === currentUser.id),
    ...users.filter(u => u.id !== currentUser.id)
  ];
  const tabs = [
    { key: 'users', label: 'Użytkownicy', icon: <PersonOutlineIcon fontSize="small" /> },
    { key: 'history', label: 'Historia zmian', icon: <HistoryIcon fontSize="small" /> },
  ];
  const [editRoleId, setEditRoleId] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");

  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleEditRole = (id, role) => {
    setEditRoleId(id);
    setSelectedRole(role);
  };
  const handleCancelEditRole = () => {
    setEditRoleId(null);
    setSelectedRole("");
  };
  const handleSaveRole = async (id) => {
    await handleRoleChange(id, selectedRole);
    setEditRoleId(null);
    setSelectedRole("");
  };

  const createWarehouse = async () => {
    const name = newWarehouseInput.trim();
    if (!name) return setError('Nazwa magazynu nie może być pusta');
    setEditLoading(true);
    try {
  const res = await fetch(`${BASE}/api/admin/create-warehouse`, { method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Błąd tworzenia magazynu');
        return;
      }
      await refreshProductsAndWarehouses();
      setSuccess('Magazyn utworzony');
      setNewWarehouseInput('');
      setNewWarehouseVisible(false);
    } catch (e) {
      setError('Błąd podczas tworzenia magazynu');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-8 mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-[#2a3b6e] text-center">Panel administratora</h2>
  {error && <div className="text-red-600 mb-2 text-center">{formatError(error)}</div>}
  {success && <div className="text-green-600 mb-2 text-center">{formatError(success)}</div>}
      <TabsPills tabs={tabs} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

      <div className="grid grid-cols-1 gap-4">
        {activeTab === 'users' && (
          <>
            <h3 className="text-xl font-semibold mb-3">Użytkownicy</h3>
            {sortedUsers.map(u => (
              <div key={u.id} className="border border-[#e5e7eb] rounded-xl p-4 bg-[#f7f8fa] shadow">
            {/* Email full width on top for mobile */}
            <div className="font-semibold text-[#6b7280] break-words mb-3">{u.email}</div>

            <div className="flex items-start gap-4">
              <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || u.email.split('@')[0]}`} alt="avatar" className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[#d1d5db] object-cover" />

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 items-center">
                {/* Name */}
                <div className="hidden md:block text-gray-600 text-right pr-2">Imię i nazwisko:</div>
                <div className="font-semibold text-[#2a3b6e]">{u.name}</div>

                {/* Role */}
                <div className="hidden md:block text-gray-600 text-right pr-2">Rola:</div>
                <div>
                  {editRoleId === u.id ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          className="border rounded px-2 py-1 text-[#2a3b6e] font-semibold bg-white w-full max-w-[10rem]"
                          disabled={loading || u.id === currentUser.id}
                        >
                          <option value="basic">Podstawowy</option>
                          <option value="editor">Edycja</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <IconButton onClick={() => handleSaveRole(u.id)} label="Zapisz" title="Zapisz rolę" className="bg-[#2a3b6e] text-white text-xs flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} disabled={loading} />
                        <IconButton onClick={handleCancelEditRole} label="Anuluj" title="Anuluj" className="bg-gray-300 text-[#2a3b6e] text-xs ml-1 hover:bg-gray-400 flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center gap-2">
                      <span className="font-semibold text-[#2a3b6e]">{u.role === 'basic' ? 'Podstawowy' : u.role === 'editor' ? 'Edycja' : 'Admin'}</span>
                      {u.id !== currentUser.id && (
                        <IconButton onClick={() => handleEditRole(u.id, u.role)} label="Zmień" title="Zmień rolę" className="bg-[#e5e7eb] text-[#2a3b6e] text-xs border border-[#d5d5db] hover:bg-[#d1d5db] flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>} />
                      )}
                      {u.id === currentUser.id ? <span className="ml-2 text-gray-400">(Ty)</span> : null}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="hidden md:block text-gray-600 text-right pr-2">Data rejestracji:</div>
                <div className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'history' && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-3">Historia zmian</h3>
            {historyLoading ? (
              <div className="text-gray-500">Ładowanie historii...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-gray-500">Brak zapisanych zmian.</div>
            ) : (
              <div className="space-y-2">
                {historyItems.map(item => (
                  <div key={item.id} className="border border-[#e5e7eb] rounded-xl p-3 bg-[#fafafa]">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">{item.type || 'akcja'}</div>
                      <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 font-semibold text-[#2a3b6e]">{item.product?.name || item.product?.Nazwa || '—'}</div>
                    <div className="text-sm text-gray-700">Ilość: {item.quantity}</div>
                    {item.note && <div className="mt-2 text-sm text-gray-600">Notatka: {item.note}</div>}
                    <div className="mt-2 text-xs text-gray-500">Użytkownik: {item.user?.name || item.user?.email || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sekcja typów */}
      {activeTab === 'types' && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Typy produktów</h3>
          <div className="grid grid-cols-1 gap-2">
            {Object.keys(typesCounts).length === 0 && <div className="text-gray-500">Brak typów</div>}
            {Object.entries(typesCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between border border-[#e5e7eb] rounded-xl p-3 bg-[#fafafa]">
                <div className="flex-1 min-w-0">
                    {editType === type ? (
                      <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="border px-2 py-1 rounded w-full max-w-[9rem] md:max-w-[12rem]" />
                    ) : (
                      <div className="font-semibold text-[#2a3b6e]">{type}</div>
                    )}
                    <div className="text-sm text-gray-500">Ilość produktów: {count}</div>
                  </div>
                <div className="flex gap-2">
                    {editType === type ? (
                    <>
                      <IconButton onClick={saveEditType} label="Zapisz" title="Zapisz" className="bg-[#2a3b6e] text-white flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} disabled={editLoading || newTypeName.trim() === ''} />
                      <IconButton onClick={cancelEditType} label="Anuluj" title="Anuluj" className="bg-gray-300 flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>} disabled={editLoading} />
                    </>
                  ) : (
                    <>
                      <IconButton onClick={() => startEditType(type)} label="Edytuj" title={`Edytuj ${type}`} className="bg-white text-[#2a3b6e] border border-[#e5e7eb] flex-shrink-0" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>} />
                      <IconButton onClick={() => count === 0 && handleDeleteType(type)} label="Usuń" title={`Usuń ${type}`} className={`${count === 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'} flex-shrink-0`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>} disabled={count !== 0} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'warehouses' && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Magazyny <button className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2a3b6e] text-white text-sm font-bold shadow hover:bg-[#1d294f]" title="Dodaj magazyn" onClick={() => setNewWarehouseVisible(v => !v)}>+</button></h3>
          {newWarehouseVisible && (
            <div className="mb-3 flex items-center gap-2">
              <input value={newWarehouseInput} onChange={e => setNewWarehouseInput(e.target.value)} placeholder="Nowy magazyn" className="border px-2 py-1 rounded w-64" />
              <IconButton onClick={createWarehouse} label="Utwórz" title="Utwórz magazyn" className="bg-[#2a3b6e] text-white" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>} disabled={editLoading || newWarehouseInput.trim() === ''} />
              <IconButton onClick={() => { setNewWarehouseVisible(false); setNewWarehouseInput(''); }} label="Anuluj" title="Anuluj" className="bg-gray-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>} disabled={editLoading} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {warehouses.length === 0 && <div className="text-gray-500">Brak magazynów</div>}
            {warehouses.map(w => {
              const count = warehouseCounts[w.name] || 0;
              return (
                <div key={w.id} className="flex items-center justify-between border border-[#e5e7eb] rounded-xl p-3 bg-[#fafafa]">
                  <div className="flex-1 min-w-0">
                      {editWarehouseId === w.id ? (
                        <input value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} className="border px-2 py-1 rounded w-full max-w-[12rem] md:max-w-[16rem]" />
                      ) : (
                        <div className="font-semibold text-[#2a3b6e]">{w.name}</div>
                      )}
                    <div className="text-sm text-gray-500">Ilość produktów: {count}</div>
                  </div>
                  <div className="flex gap-2">
                    {editWarehouseId === w.id ? (
                      <>
                        <IconButton onClick={saveEditWarehouse} label="Zapisz" title="Zapisz" className="bg-[#2a3b6e] text-white" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>} disabled={editLoading || newWarehouseName.trim() === ''} />
                        <IconButton onClick={cancelEditWarehouse} label="Anuluj" title="Anuluj" className="bg-gray-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>} disabled={editLoading} />
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => startEditWarehouse(w)} label="Edytuj" title={`Edytuj ${w.name}`} className="bg-white text-[#2a3b6e] border border-[#e5e7eb]" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>} />
                        <IconButton onClick={() => count === 0 && handleDeleteWarehouse(w.name)} label="Usuń" title={`Usuń ${w.name}`} className={`${count === 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>} disabled={count !== 0} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
