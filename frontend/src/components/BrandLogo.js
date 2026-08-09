import React from 'react';

function LogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="bnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#bnGrad)" />

      {/* open book */}
      <g transform="translate(8,18)" fill="#fff">
        <path d="M6 2c4 0 8 1.5 10 3.2V30c-2-1.4-6-3.2-10-3.2S2 28.6 0 30V5.2C2.5 3.2 4.8 2 6 2z" opacity="0.95" />
        <path d="M26 2c-4 0-8 1.5-10 3.2V30c2-1.4 6-3.2 10-3.2s8 1.8 10 3.2V5.2C33.5 3.2 31.2 2 29 2z" opacity="0.95" />
      </g>

      {/* graduation cap */}
      <g transform="translate(18,8)">
        <polygon points="16,6 32,12 16,18 0,12" fill="#1E40AF" />
        <rect x="14" y="18" width="4" height="6" rx="1" fill="#1E40AF" />
      </g>
    </svg>
  );
}

export default function BrandLogo({ compact = false }) {
  return (
    <span className={`brand-logo ${compact ? 'compact' : ''}`}>
      <LogoIcon />
      {!compact && (
        <span className="brand-wordmark">
          <span className="brand-wordmark-primary">Study</span>
          <span className="brand-wordmark-accent">Nest</span>
        </span>
      )}
    </span>
  );
}
