import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EditView from "./views/editView";
import { ToastProvider } from './common/ToastContext';
import Toast from './common/Toast';
import ImportExcelView from "./views/Import/importExcelView";
import Header from "./layout/header";
import ProfileView from "./views/profileView";
import ArchiveView from "./views/archiveView";
import AdminPanel from "./admin/AdminPanel";
import UserActionsView from "./views/userActionsView";
import ActionView from "./views/actionView";
import ProductView from "./views/productView";
import ProductNewView from "./views/productNew";
import TypesView from "./views/typesView";
import { BASE, getAuthHeaders, getWarehouses, getProductsDb } from "../services/api";
import WarehouseView from "./views/warehouseView";

export default function MainApp({ userId: propUserId = null, token: propToken = null, user: propUser = null, onLogout } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setViewState] = useState("actionView"); // internal view state (kept for compatibility)
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouseId, setCurrentWarehouseId] = useState(null);
  const [tempWarehouse, setTempWarehouse] = useState(null); // temporary selection from WarehouseView
  const [products, setProducts] = useState([]);
  const [selectedWarehouseName, setSelectedWarehouseName] = useState(null);
  const [pendingSearchWarehouse, setPendingSearchWarehouse] = useState(null);
  const [pendingEditId, setPendingEditId] = useState(null);
  const [pendingEditItem, setPendingEditItem] = useState(null);
  // session userId comes from parent prop (do not read localStorage here)
  const [userId, setUserId] = useState(() => propUserId || null);
  const [token, setToken] = useState(() => propToken || null);
  const [user, setUser] = useState(() => propUser || null);

  // Prefer a single auth token value for effects: use local `token` when set, otherwise fall back to propToken.
  const authToken = token ?? propToken;

  const handleSelectWarehouse = (warehouse) => {
    // temporary selection: remember the warehouse and open actionView prefiltered with it
    setTempWarehouse(warehouse);
    setSelectedWarehouseName(warehouse?.name ?? null);
    if (typeof openSearchWithWarehouse === 'function') openSearchWithWarehouse(warehouse?.name ?? null);
  };

  // Wrapper for changing view: clear temp selections and refresh full product list
  const viewToPath = (v) => {
    switch (v) {
      case 'actionView': return 'action';
      case 'productView': return 'products';
      case 'productNew': return 'products/new';
      case 'edit': return 'edit';
      case 'import': return 'import';
      case 'profile': return 'profile';
      case 'archive': return 'archive';
      case 'warehouses': return 'warehouses';
      case 'typesView': return 'types';
      case 'adminPanel': return 'admin';
      case 'userActions': return 'user-actions';
      default: return 'products';
    }
  };

  const pathToView = (path) => {
    if (!path) return 'actionView';
    if (path.startsWith('/app/action') || path.startsWith('action')) return 'actionView';
    if (path.startsWith('/app/products') || path.startsWith('products')) return 'productView';
    if (path.startsWith('/app/import') || path.startsWith('import')) return 'import';
    if (path.startsWith('/app/profile') || path.startsWith('profile')) return 'profile';
    if (path.startsWith('/app/archive') || path.startsWith('archive')) return 'archive';
    if (path.startsWith('/app/warehouses') || path.startsWith('warehouses')) return 'warehouses';
    if (path.startsWith('/app/types') || path.startsWith('types')) return 'typesView';
    if (path.startsWith('/app/admin') || path.startsWith('admin')) return 'adminPanel';
    if (path.startsWith('/app/user-actions') || path.startsWith('user-actions')) return 'userActions';
    if (path.startsWith('/app/edit') || path.startsWith('edit')) return 'edit';
    return 'productView';
  };

  const refreshProducts = useCallback(async () => {
    // Pobierz wszystkie produkty niezależnie od widoku (use service API so auth headers are included)
    try {
      const DEFAULT_PAGE = 1;
      const DEFAULT_LIMIT = 100;
      const data = await getProductsDb(currentWarehouseId, DEFAULT_PAGE, DEFAULT_LIMIT);
      setProducts(data.products || []);
      try { window.dispatchEvent(new CustomEvent('products-updated', { detail: data || {} })); } catch (e) {}
      return data;
    } catch (err) {
      console.error('[MainApp] refreshProducts error', err);
      setProducts([]);
    }
  }, [currentWarehouseId]);

  const handleSetView = useCallback((v) => {
    if (tempWarehouse) setTempWarehouse(null);
    setViewState(v);
    const p = viewToPath(v);
    try {
      console.warn('[MainApp] navigate ->', v, p);
      navigate(p);
    } catch (e) { console.warn('[MainApp] navigate failed', e); }
    refreshProducts();
  }, [tempWarehouse, navigate, refreshProducts]);

  // Open actionView with a preselected warehouse name
  const openSearchWithWarehouse = (warehouseName) => {
    setPendingSearchWarehouse(warehouseName || null);
    // set view directly so handleSetView doesn't clear the pending value
    handleSetView('actionView');
  };

  // Fetch user data after login or profile update
  // keep internal userId/token/user in sync when parent prop changes.
  // Simpler: treat parent props as the source of truth and assign them directly.
  useEffect(() => {
    setUserId(propUserId || null);
    setToken(propToken || null);
    setUser(propUser || null);
  }, [propUserId, propToken, propUser]);

  useEffect(() => {
    if (userId) {
      // user id present — do a safe fetch that tolerates non-JSON responses (429, HTML pages, etc.)
      (async () => {
        try {
          const authHeaders = getAuthHeaders(authToken);
          const res = await fetch(`${BASE}/api/auth/get-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ id: userId })
          });

          const text = await res.text();
          const ct = (res.headers.get('content-type') || '').toLowerCase();

          if (!res.ok) {
            console.warn('[MainApp] get-user non-OK response', res.status, text.slice(0, 400));
            // treat as invalid session; clear and notify via onLogout
            setUser(null);
            setUserId(null);
            if (typeof onLogout === 'function') onLogout();
            return;
          }

          if (!ct.includes('application/json')) {
            console.warn('[MainApp] get-user returned non-JSON content-type', ct, text.slice(0, 400));
            // Acceptable to treat this as failure — clear user and bail
            setUser(null);
            return;
          }

          let data;
          try { data = JSON.parse(text); } catch (e) {
            console.warn('[MainApp] get-user JSON parse failed', e, text.slice(0, 400));
            setUser(null);
            return;
          }

          // handle invalid/expired session gracefully
          if (data && data.success) {
            setUser(data.user);
          } else {
            console.warn('[MainApp] invalid user session, clearing local state');
            setUser(null);
            setUserId(null);
            if (typeof onLogout === 'function') onLogout();
          }
        } catch (err) {
          console.error('[MainApp] get-user fetch error', err);
          setUser(null);
        }
      })();
    } else {
      setUser(null);
    }
  }, [userId, onLogout, authToken]);

  useEffect(() => {
    refreshProducts();
  }, [view, refreshProducts]);

  // sync view with URL on location change
  // This effect intentionally watches `location.pathname` and `view` only.
   
  useEffect(() => {
    const current = pathToView(location.pathname);
    if (current !== view) {
      console.warn('[MainApp] location changed ->', location.pathname, 'mapped to', current);
      setViewState(current);
    }
  }, [location.pathname, view]);

  // Ensure we have an /app/* URL so the nested Routes render when MainApp mounts.
  useEffect(() => {
    if (!location.pathname.startsWith('/app')) {
      try {
        const target = viewToPath(view);
        console.warn('[MainApp] mount redirect ->', location.pathname, 'to', target);
        // navigate relative to the /app parent route so nested routes resolve correctly
        navigate(target, { replace: true });
      } catch (e) { console.warn('[MainApp] mount redirect failed', e); }
    }
  }, [location.pathname, navigate, view]);

  // Listen for global edit requests coming from nested components (e.g., ProductDetailsModal)
  // Global requests now open the new product edit view (`productNew`) so editing flows land there.
  // Global listeners intentionally set up once on mount; include `handleSetView` in deps.
  useEffect(() => {
    const handler = (e) => {
      const pid = e?.detail?.productId ?? null;
      const listItem = e?.detail?.listItem ?? null;
      const stockRows = e?.detail?.stockRows ?? null;
        if (listItem) {
        // store the whole listItem payload and open the productNew edit view
        setPendingEditItem({ product: listItem, stockRows });
        setPendingEditId(listItem?.id ?? pid ?? null);
        handleSetView('productNew');
        return;
      }
      if (pid) {
        setPendingEditId(pid);
        handleSetView('productNew');
      }
    };
    const navHandler = (e) => {
      const v = e?.detail?.view;
      if (v === 'edit') {
        // if pendingEditId or pendingEditItem in localStorage, pick them up
        try {
          const stored = localStorage.getItem('pendingEditId');
          if (stored) setPendingEditId(stored);
          const storedItem = localStorage.getItem('pendingEditItem');
          if (storedItem) {
            try { setPendingEditItem(JSON.parse(storedItem)); } catch (_) { /* ignore */ }
          }
        } catch (err) {}
        // Preserve legacy behavior: when explicit navigation to 'edit' occurs,
        // open the legacy EditView. Direct edit requests coming from components
        // that dispatch `open-edit-view` will still open `productNew` (handler above).
        handleSetView('edit');
      }
    };
    window.addEventListener('open-edit-view', handler);
    window.addEventListener('navigate', navHandler);
    return () => {
      window.removeEventListener('open-edit-view', handler);
      window.removeEventListener('navigate', navHandler);
    };
  }, [handleSetView]);

  // Fetch warehouses once
  useEffect(() => {
    getWarehouses()
      .then(d => setWarehouses(d))
      .catch(() => { /* intentionally ignore fetch errors here */ });
  }, []);

  // Periodic server-health check: if server becomes unreachable, treat as logout
  useEffect(() => {
    let stopped = false;
    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${BASE}/api/warehouses`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Server returned non-OK');
        // server reachable
      } catch (err) {
        if (stopped) return;
        console.warn('[MainApp] server unreachable, forcing logout', err);
        setUserId(null);
        setUser(null);
        if (typeof onLogout === 'function') {
          try { onLogout(); } catch (e) { console.warn('[MainApp] onLogout handler threw', e); }
        }
      }
    };

    // initial check + interval
    checkServer();
    const iv = setInterval(checkServer, 15000);
    return () => { stopped = true; clearInterval(iv); };
  }, [onLogout]);

  // If user has an assigned warehouse, set it as current once warehouses are loaded
  useEffect(() => {
    // When warehouses are loaded and no current warehouse set, prefer user's default
    if (warehouses && warehouses.length && !currentWarehouseId) {
      let found = null;
      if (user && user.userWarehouse) {
        found = warehouses.find(w => w.name === user.userWarehouse);
      }
      if (found) {
        setCurrentWarehouseId(found.id);
        setSelectedWarehouseName(found.name);
      } else {
        // fallback: use the first warehouse in the list
        const first = warehouses[0];
        if (first) {
          setCurrentWarehouseId(first.id);
          setSelectedWarehouseName(first.name);
        }
      }
    }
  }, [user, warehouses, currentWarehouseId]);

  // Clear temporary selection shortly after it's created so it doesn't persist in state.
  useEffect(() => {
    if (!tempWarehouse) return undefined;
    const t = setTimeout(() => setTempWarehouse(null), 0);
    return () => clearTimeout(t);
  }, [tempWarehouse]);

  // Logout logic
  const handleLogout = () => {
    setUserId(null);
    setUser(null);
    // notify parent app if provided so it can switch to login view without hard reload
    if (typeof onLogout === 'function') {
      try { onLogout(); } catch (e) { console.warn('[MainApp] onLogout handler threw', e); }
    } else {
      // fallback: navigate to product view and let login form elsewhere handle access
      handleSetView('productView');
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f6fa]">
        {/* Wrap app in ToastProvider so all views can use global toasts */}
        {/* ToastProvider imported lazily to avoid circular imports */}
  <Header view={view} setView={handleSetView} user={user} onLogout={handleLogout} selectedWarehouseName={selectedWarehouseName} onOpenSearchWithWarehouse={openSearchWithWarehouse} />
        <div className="p-4">
          <Routes>
            <Route path="profile" element={user ? <ProfileView user={user} onUpdate={updatedUser => setUser(updatedUser)} onChangePassword={() => alert('Zmiana hasła - do zaimplementowania')} token={token} userId={userId} /> : null} />
            <Route path="archive" element={userId ? <ArchiveView user={user} userId={userId} token={token} /> : null} />
            <Route path="warehouses" element={<WarehouseView onBack={() => handleSetView('productView')} onSelectWarehouse={handleSelectWarehouse} token={token} userId={userId} />} />
            <Route path="edit" element={(user && (user.role === 'admin' || user.role === 'editor')) ? <EditView products={products} onBack={() => handleSetView('productView')} onRefresh={refreshProducts} pendingEditId={pendingEditId} pendingEditItem={pendingEditItem} clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }} userId={userId} user={user} token={token} onImportExcel={() => handleSetView('import')} /> : null} />
            <Route path="import" element={<ImportExcelView onBack={() => handleSetView('productNew')} onRefresh={refreshProducts} token={token} userId={userId} />} />
            <Route path="action" element={<ActionView onBack={() => handleSetView('productView')} user={user} setView={handleSetView} initialFilterWarehouse={pendingSearchWarehouse} token={token} userId={userId} />} />
            <Route path="products/new" element={<ProductNewView user={user} setView={handleSetView} pendingEditId={pendingEditId} pendingEditItem={pendingEditItem} clearPendingEdit={() => { setPendingEditId(null); setPendingEditItem(null); }} token={token} />} />
            <Route path="products" element={<ProductView user={user} setView={handleSetView} token={token} onRefresh={refreshProducts} />} />
            <Route path="products/:page" element={<ProductView user={user} setView={handleSetView} token={token} onRefresh={refreshProducts} />} />
            <Route path="types" element={<TypesView setView={handleSetView} token={token} userId={userId} />} />
            <Route path="admin" element={user && user.role === 'admin' ? <AdminPanel currentUser={user} token={token} /> : null} />
            <Route path="user-actions" element={user && (user.role === 'admin' || user.role === 'editor') ? <UserActionsView token={token} userId={userId} /> : null} />
            <Route path="" element={<ActionView onBack={() => handleSetView('productView')} user={user} setView={handleSetView} initialFilterWarehouse={pendingSearchWarehouse} token={token} userId={userId} />} />
          </Routes>
          {/* Clear temporary selection whenever we're not in the former use view; keep behavior */}
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
