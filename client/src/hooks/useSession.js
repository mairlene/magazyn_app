import { useState, useEffect, useCallback } from 'react';
import { BASE, getAuthHeaders } from '../services/api';

export default function useSession() {
  const [userId, setUserId] = useState(() => {
    try { return localStorage.getItem('userId'); } catch (_) { return null; }
  });
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('token'); } catch (_) { return null; }
  });
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(userId));

  const logout = useCallback((keepOnPage = false) => {
    try {
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
    } catch (_) {}
    setUserId(null);
    setToken(null);
    setUser(null);
    // caller (App) handles navigation
  }, []);

  const login = useCallback(async ({ id, token: newToken } = {}) => {
    try {
      if (newToken) localStorage.setItem('token', newToken);
      if (id) localStorage.setItem('userId', id);
    } catch (_) {}
    if (id) setUserId(String(id));
    if (newToken) setToken(newToken);

    // fetch and set user profile immediately
    if (id) {
      try {
        const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(newToken) };
        const res = await fetch(`${BASE}/api/auth/get-user`, { method: 'POST', headers, body: JSON.stringify({ id }) });
        if (res.ok) {
          const data = await res.json();
          if (data?.success) setUser(data.user);
        }
      } catch (err) {
        console.warn('[useSession] login fetch user failed', err);
      }
    }
  }, []);

  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem('userId'); } catch (_) { return null; } })();
    const storedToken = (() => { try { return localStorage.getItem('token'); } catch (_) { return null; } })();
    if (!stored) {
      setRestoring(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      try {
        const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(storedToken) };
        const res = await fetch(`${BASE}/api/auth/get-user`, { method: 'POST', headers, body: JSON.stringify({ id: stored }), signal });
        if (!res.ok) {
          logout();
          setRestoring(false);
          return;
        }
        const data = await res.json();
        if (data?.success) {
          setUserId(stored);
          setToken(storedToken);
          setUser(data.user);
        } else logout();
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[useSession] restore error', err);
        logout();
      } finally {
        setRestoring(false);
      }
    })();

    return () => controller.abort();
  }, [logout]);

  return { userId, token, user, restoring, login, logout, setUser };
}
