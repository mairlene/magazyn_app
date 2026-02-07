import React, { useEffect, useRef } from 'react';

// TabsPills
// Props:
// - tabs: [{ key, label, icon (optional JSX) }]
// - activeKey
// - onChange(key)
// - className (optional)
// Notes:
// - responsive: shows pill buttons on sm+ and a native <select> on xs (mobile)
// - accessible: role=tablist, role=tab, aria-selected

export default function TabsPills({ tabs = [], activeKey, onChange = () => {}, className = '' }) {
  const listRef = useRef(null);

  useEffect(() => {
    // keyboard navigation (left/right)
    const el = listRef.current;
    if (!el) return;
    function onKey(e) {
      const keys = tabs.map(t => t.key);
      const idx = keys.indexOf(activeKey);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = keys[(idx + 1) % keys.length];
        onChange(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = keys[(idx - 1 + keys.length) % keys.length];
        onChange(prev);
      }
    }
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [activeKey, onChange, tabs]);

  return (
    <div className={`w-full ${className}`}>
      {/* Pills shown on all sizes now so mobile matches medium layout */}
      <div ref={listRef} role="tablist" aria-orientation="horizontal" className="flex gap-2 items-center">
        {tabs.map(t => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              aria-label={t.label}
              aria-controls={`panel-${t.key}`}
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-sm font-medium transition ${active ? 'bg-[#2a3b6e] text-white ring-1 ring-[#1d294f]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.icon ? <span className="w-4 h-4 flex items-center justify-center">{t.icon}</span> : null}
              {/* icon-only on small screens, label visible from md and up */}
              <span className="hidden md:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
