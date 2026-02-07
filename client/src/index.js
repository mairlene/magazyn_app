import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
// Production-safe: minimal SW/cache cleanup helper.
// This helper unregisters service workers and removes caches, but does NOT
// delete localStorage or IndexedDB. That avoids accidental data loss while
// still ensuring the browser will fetch fresh assets after reload.
async function unregisterSWsAndClearCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister().catch(() => {})));
    }
  } catch (err) {
    // service worker unregister failed
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      // Remove only caches we can delete; let unknown caches be removed conservatively.
      await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
    }
  } catch (err) {
    // cache clear failed
  }
}

async function ensureFreshBuildThenRegisterSW() {
  // Only run complex logic in production builds
  if (process.env.NODE_ENV !== 'production') {
    // still attempt to register SW in non-production for testing, but keep it soft
    try {
      if ('serviceWorker' in navigator) {
        const res = await fetch('/service-worker.js', { method: 'HEAD' }).catch(() => null);
        if (res && res.ok) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      }
    } catch (err) {}
    return;
  }

  try {
    // Prefer asset-manifest.json (CRA) which lists current built files.
    let fingerprint = null;
    try {
      const resp = await fetch('/asset-manifest.json', { cache: 'no-cache' });
      if (resp && resp.ok) {
        const json = await resp.json();
        // simple fingerprint string: JSON of files object (not cryptographically strong but sufficient)
        fingerprint = JSON.stringify(json.files || json);
      }
    } catch (err) {
      // asset-manifest not available; fall back to manifest.json HEAD
      try {
        const head = await fetch('/manifest.json', { method: 'HEAD', cache: 'no-cache' });
        if (head && head.ok) {
          fingerprint = head.headers.get('etag') || head.headers.get('last-modified') || null;
        }
      } catch (e) {}
    }

    const prev = localStorage.getItem('app:assetFingerprint');
    if (fingerprint && prev && prev !== fingerprint) {
      try {
        window.dispatchEvent(new CustomEvent('app:update-available', { detail: { fingerprint } }));
      } catch (e) {
        localStorage.setItem('app:updateAvailable', fingerprint);
      }
      // do not overwrite stored fingerprint until user accepts update
    } else if (fingerprint && (!prev || prev !== fingerprint)) {
      localStorage.setItem('app:assetFingerprint', fingerprint);
    }
  } catch (err) {
    // fingerprint detection failed
  }

  // Register service worker if present.
  try {
    if ('serviceWorker' in navigator) {
      const res = await fetch('/service-worker.js', { method: 'HEAD' }).catch(() => null);
      if (res && res.ok) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  } catch (err) {}
}

// Expose a function the UI can call to run the cleanup + reload on user confirmation.
window.appDoCleanup = async function appDoCleanup() {
  try {
    await unregisterSWsAndClearCaches();
    // Set a flag so next load records the new fingerprint (optional)
    try {
      localStorage.setItem('app:didCleanup', '1');
    } catch (e) {}
    // reload so the client fetches fresh assets
    window.location.reload();
  } catch (err) {
    console.warn('appDoCleanup failed', err);
    try { window.location.reload(); } catch (_) {}
  }
};

window.addEventListener('load', () => {
  // Run fingerprint check and register service worker if available.
  // No automatic destructive cleanup is performed here.
  ensureFreshBuildThenRegisterSW();
});

