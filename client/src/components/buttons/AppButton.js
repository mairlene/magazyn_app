import React from 'react';

/**
 * Generic app button with consistent padding and optional icon.
 * - children: label text
 * - icon: React node (icon component)
 * - variant: 'primary' | 'danger' | 'ghost' (controls colors)
 * - hideLabelOnMobile: when true the label is hidden on small screens but padding stays
 */
export default function AppButton({
  children,
  icon = null,
  variant = 'primary',
  hideLabelOnMobile = true,
  ariaLabel = null,
  onClick = null,
  className = '',
  disabled = false,
  type = 'button'
}) {
  // Use inline-flex and prevent flex children from stretching the button on small screens.
  // Keep a minimum tappable size on mobile, but allow natural sizing on md+ where labels are shown.
  const base = 'inline-flex flex-shrink-0 items-center justify-center px-3 py-1 rounded-xl shadow text-sm font-semibold transition';
  const variants = {
    primary: 'bg-[#2a3b6e] text-white hover:bg-[#1d294f]',
    danger: 'bg-[#fff5f5] text-[#7f1d1d] border border-[#f5c6c6] hover:bg-[#ffecec]',
    ghost: 'bg-transparent text-[#2a3b6e] hover:bg-slate-50'
  };

  const labelClass = hideLabelOnMobile ? 'hidden md:inline-block ml-2' : 'ml-2';

  return (
    <button
      type={type}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      {children ? <span className={labelClass}>{children}</span> : null}
    </button>
  );
}
