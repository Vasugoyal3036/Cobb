import React from 'react';

/**
 * Modern, background-free vector logo for ORS.
 * Pure glowing neon-glass text "ORS" on a completely transparent background.
 * 100% vector sharpness at any size.
 */
export default function OrsLogo({ size = 44, className = '', showGlow = true }) {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none overflow-visible ${className}`}
      style={{
        filter: showGlow ? 'drop-shadow(0 0 10px rgba(0,245,255,0.45)) drop-shadow(0 0 20px rgba(139,92,246,0.35))' : 'none'
      }}
    >
      <defs>
        {/* Continuous Neon Gradient across O -> R -> S */}
        <linearGradient id={`orsGrad-${uniqueId}`} x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#00f5ff" />
          <stop offset="25%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="85%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Specular Core Light (3D Glass Tube shine) */}
        <linearGradient id={`specular-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>

        {/* Secondary Cyber Ribbon Gradient */}
        <linearGradient id={`cyanRibbon-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f5ff" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <linearGradient id={`purpleRibbon-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      <g>
        {/* ================= LETTER O ================= */}
        {/* Glow Underlay */}
        <ellipse
          cx="22"
          cy="35"
          rx="15"
          ry="19"
          fill="none"
          stroke="#00f5ff"
          strokeWidth="7"
          opacity="0.35"
        />
        {/* Main Neon Tube */}
        <ellipse
          cx="22"
          cy="35"
          rx="15"
          ry="19"
          fill="none"
          stroke={`url(#cyanRibbon-${uniqueId})`}
          strokeWidth="5.5"
        />
        {/* Specular Highlight */}
        <ellipse
          cx="22"
          cy="35"
          rx="15"
          ry="19"
          fill="none"
          stroke={`url(#specular-${uniqueId})`}
          strokeWidth="1.4"
          strokeDasharray="16 35"
          strokeDashoffset="12"
        />

        {/* ================= LETTER R ================= */}
        {/* Glow Underlay */}
        <path
          d="M 43 54 L 43 16 L 57 16 C 64.5 16 69.5 20 69.5 27 C 69.5 33.5 64.5 37.5 57 37.5 L 43 37.5 M 55.5 37.5 L 68 54"
          fill="none"
          stroke="#6366f1"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        {/* Main Neon Tube */}
        <path
          d="M 43 54 L 43 16 L 57 16 C 64.5 16 69.5 20 69.5 27 C 69.5 33.5 64.5 37.5 57 37.5 L 43 37.5 M 55.5 37.5 L 68 54"
          fill="none"
          stroke={`url(#orsGrad-${uniqueId})`}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Specular Highlight */}
        <path
          d="M 43 53 L 43 17 L 57 17 C 63.5 17 68 20.5 68 27 C 68 32.5 63.5 36.5 57 36.5 L 43 36.5 M 56 37.5 L 67 53"
          fill="none"
          stroke={`url(#specular-${uniqueId})`}
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Connecting Fluid Flow Ribbon from R to S */}
        <path
          d="M 36 35 C 38 48 42 54 44 54"
          fill="none"
          stroke={`url(#cyanRibbon-${uniqueId})`}
          strokeWidth="2.5"
          opacity="0.6"
        />

        {/* ================= LETTER S ================= */}
        {/* Glow Underlay */}
        <path
          d="M 91 22.5 C 88 18 82.5 15.5 76 15.5 C 68 15.5 63 20.5 63 26.5 C 63 34 71 37 78.5 40 C 86 43 90 46.5 90 53 C 90 60 84 64.5 75 64.5 C 67 64.5 61.5 60.5 59 55"
          fill="none"
          stroke="#c084fc"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        {/* Main Neon Tube */}
        <path
          d="M 91 22.5 C 88 18 82.5 15.5 76 15.5 C 68 15.5 63 20.5 63 26.5 C 63 34 71 37 78.5 40 C 86 43 90 46.5 90 53 C 90 60 84 64.5 75 64.5 C 67 64.5 61.5 60.5 59 55"
          fill="none"
          stroke={`url(#purpleRibbon-${uniqueId})`}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Specular Highlight */}
        <path
          d="M 90 23 C 87.5 19 82.5 17 76 17 C 69 17 64.5 21 64.5 26.5 C 64.5 33 71.5 36 78.5 39 C 85.5 42 88.5 45.5 88.5 53 C 88.5 58.5 83.5 63 75 63 C 68 63 63 59.5 60.5 55"
          fill="none"
          stroke={`url(#specular-${uniqueId})`}
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Dynamic Star Sparks */}
        <circle cx="57" cy="27" r="1.5" fill="#ffffff" />
        <circle cx="57" cy="27" r="3.5" fill="#00f5ff" opacity="0.6" />
        
        <circle cx="76" cy="15.5" r="1" fill="#ffffff" />
        <circle cx="76" cy="15.5" r="2.5" fill="#ec4899" opacity="0.5" />
      </g>
    </svg>
  );
}
