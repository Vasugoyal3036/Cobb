import React from 'react';

/**
 * Goyal House Of Fashion — Luxury Architectural Monogram Logo
 * Architectural 'G' integrated with a bespoke clothes hanger in brushed brass gold.
 */
export default function OrsLogo({ size = 44, className = '', showGlow = true, showWordmark = false }) {
  const uniqueId = React.useId().replace(/:/g, '');

  if (showWordmark) {
    return (
      <svg
        width={size * 1.25}
        height={size * 1.15}
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none overflow-visible ${className}`}
        style={{
          filter: showGlow
            ? 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.45)) drop-shadow(0 0 28px rgba(217, 119, 6, 0.25))'
            : 'none'
        }}
      >
        <defs>
          <linearGradient id={`goyalGold-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2A3" />
            <stop offset="25%" stopColor="#F59E0B" />
            <stop offset="65%" stopColor="#D97706" />
            <stop offset="90%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <radialGradient id={`backlight-${uniqueId}`} cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Backlight Halo */}
        <circle cx="100" cy="55" r="50" fill={`url(#backlight-${uniqueId})`} />

        {/* G + Hanger Emblem */}
        <g transform="translate(10, 5)">
          <path d="M 100 35 C 100 24 108 20 114 24 C 119 28 116 34 112 36 C 109 37 108 40 108 43" 
                fill="none" stroke={`url(#goyalGold-${uniqueId})`} strokeWidth="3" strokeLinecap="round" />
          <polygon points="108,43 112,49 104,49" fill={`url(#goyalGold-${uniqueId})`} />
          <path d="M 45 78 C 65 65 92 52 108 49 C 116 52 126 55 135 58 L 134 62 C 124 59 116 56 108 53 C 90 57 66 69 44 82 Z" 
                fill={`url(#goyalGold-${uniqueId})`} />
          <path d="M 125 35 L 125 24 C 114 16 95 15 80 23 C 62 32 54 52 57 71 C 60 88 74 100 95 101 C 114 101 126 91 127 75 L 98 75 L 98 68 L 134 68 L 134 105 L 126 105 L 126 95 C 120 102 110 107 95 107 C 70 107 51 92 48 70 C 44 48 56 25 78 14 C 98 4 122 8 132 18 L 125 35 Z" 
                fill={`url(#goyalGold-${uniqueId})`} />
          <rect x="119" y="62" width="13" height="42" fill={`url(#goyalGold-${uniqueId})`} />
          <rect x="117" y="102" width="17" height="3" fill={`url(#goyalGold-${uniqueId})`} />
        </g>

        {/* Wordmark Typography: G O Y Λ L */}
        <g fill={`url(#goyalGold-${uniqueId})`} transform="translate(10, 132)">
          <path d="M 22 14 C 18 14 14 11 14 7 C 14 3 18 0 22 0 C 26 0 29 2 30 5 L 28 6 C 27 3.5 25 2 22 2 C 19 2 16.5 4.5 16.5 7 C 16.5 9.5 19 12 22 12 C 24.5 12 26.5 10.5 27 9 L 22 9 L 22 7.5 L 29 7.5 L 29 13 C 27 13.8 24.5 14 22 14 Z" />
          <ellipse cx="50" cy="7" rx="7" ry="7" fill="none" stroke={`url(#goyalGold-${uniqueId})`} strokeWidth="2.2" />
          <path d="M 72 0 L 76.5 6.5 L 81 0 L 83.5 0 L 78 7.5 L 78 14 L 75 14 L 75 7.5 L 69.5 0 Z" />
          <path d="M 103 0 L 109 14 L 106 14 L 103 6.5 L 100 14 L 97 14 L 103 0 Z" />
          <path d="M 125 0 L 127.5 0 L 127.5 11.5 L 136 11.5 L 136 14 L 125 14 Z" />
        </g>

        {/* HOUSE OF FASHION */}
        <text x="100" y="162" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="4.5" fill={`url(#goyalGold-${uniqueId})`} fontFamily="sans-serif">
          HOUSE OF FASHION
        </text>
        <line x1="88" y1="170" x2="112" y2="170" stroke={`url(#goyalGold-${uniqueId})`} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Pure Emblem Form for Compact / Icon usage (Square 100x100 ViewBox)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none overflow-visible ${className}`}
      style={{
        filter: showGlow
          ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.45)) drop-shadow(0 0 20px rgba(217, 119, 6, 0.25))'
          : 'none'
      }}
    >
      <defs>
        <linearGradient id={`goyalGold-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A3" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="65%" stopColor="#D97706" />
          <stop offset="90%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id={`backlight-${uniqueId}`} cx="50%" cy="50%" r="48%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Backlight Halo */}
      <circle cx="50" cy="50" r="46" fill={`url(#backlight-${uniqueId})`} />

      {/* G + Hanger Emblem Scaled to Fit 100x100 */}
      <g transform="translate(-27, -2) scale(0.86)">
        <path d="M 100 35 C 100 24 108 20 114 24 C 119 28 116 34 112 36 C 109 37 108 40 108 43" 
              fill="none" stroke={`url(#goyalGold-${uniqueId})`} strokeWidth="3.2" strokeLinecap="round" />
        <polygon points="108,43 112,49 104,49" fill={`url(#goyalGold-${uniqueId})`} />
        <path d="M 45 78 C 65 65 92 52 108 49 C 116 52 126 55 135 58 L 134 62 C 124 59 116 56 108 53 C 90 57 66 69 44 82 Z" 
              fill={`url(#goyalGold-${uniqueId})`} />
        <path d="M 125 35 L 125 24 C 114 16 95 15 80 23 C 62 32 54 52 57 71 C 60 88 74 100 95 101 C 114 101 126 91 127 75 L 98 75 L 98 68 L 134 68 L 134 105 L 126 105 L 126 95 C 120 102 110 107 95 107 C 70 107 51 92 48 70 C 44 48 56 25 78 14 C 98 4 122 8 132 18 L 125 35 Z" 
              fill={`url(#goyalGold-${uniqueId})`} />
        <rect x="119" y="62" width="13" height="42" fill={`url(#goyalGold-${uniqueId})`} />
        <rect x="117" y="102" width="17" height="3" fill={`url(#goyalGold-${uniqueId})`} />
      </g>
    </svg>
  );
}
