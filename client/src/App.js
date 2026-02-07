import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import useSession from './hooks/useSession';
import LoginForm from "./components/forms/loginForm";
import RegisterForm from "./components/forms/registerForm";
import MainApp from "./components/mainApp";
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  // Session state managed by hook
  const { userId, token, user, restoring, login, logout } = useSession();
  const navigate = useNavigate();
  // Update-available banner state: shown when index.js detects a new build fingerprint.
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    const onUpdate = (e) => { setUpdateAvailable(true); };
    window.addEventListener('app:update-available', onUpdate);
    // fallback: localStorage flag
    if (typeof window !== 'undefined' && localStorage.getItem('app:updateAvailable')) setUpdateAvailable(true);
    return () => window.removeEventListener('app:update-available', onUpdate);
  }, []);

  // ---- Login / Logout handlers ----
  const handleLogin = async ({ id, token } = {}) => {
    await login({ id, token });
    navigate('/app/products', { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // ---- Render (route-based) ----
  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin border-4 border-t-transparent border-gray-300 rounded-full w-12 h-12 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-[#2a3b6e] mb-2">Przywracanie sesji...</div>
          <div className="text-sm text-gray-600 mb-4">Sprawdzam zapisane logowanie…</div>

          {/* simplified: session errors handled in hook; show only spinner while restoring */}
        </div>
      </div>
    );
  }
  

  return (
    <>
      {updateAvailable && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-2 rounded shadow">
          <div className="flex items-center gap-3">
            <div>Nowa wersja aplikacji dostępna.</div>
            <div className="ml-2">
              <button className="mr-2 underline" onClick={() => { try { window.appDoCleanup(); } catch (e) { window.location.reload(); } }}>Odśwież</button>
              <button onClick={() => { setUpdateAvailable(false); localStorage.removeItem('app:updateAvailable'); }}>Pomiń</button>
            </div>
          </div>
        </div>
      )}

    <Routes>
      <Route path="/login" element={<LoginForm onLogin={handleLogin} onSwitchToRegister={() => { navigate('/register'); }} />} />
      <Route path="/register" element={<RegisterForm onRegister={handleLogin} onSwitchToLogin={() => { navigate('/login'); }} />} />

      <Route path="/app/*" element={userId ? <ErrorBoundary><MainApp userId={userId} token={token} user={user} onLogout={handleLogout} /></ErrorBoundary> : <Navigate to="/login" replace />} />

      <Route path="/" element={userId ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
