import React from 'react';

// Replaced expensive SVG feTurbulence filter with lightweight CSS subtle grain gradient
const NOISE_SVG = 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)';

export default function DashboardBackground({ theme }) {
  if (theme === 'paper') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#FAF6F0]" />
    );
  }

  if (theme === 'contrast') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#000000]" />
    );
  }

  if (theme === 'modern') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0b0e17]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 via-transparent to-black/30" />
      </div>
    );
  }

  if (theme === 'mesh-gradient') {
    return (
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 15%, rgba(79, 70, 229, 0.16) 0%, transparent 45%), radial-gradient(circle at 85% 55%, rgba(225, 29, 72, 0.1) 0%, transparent 45%), radial-gradient(circle at 45% 95%, rgba(37, 99, 235, 0.12) 0%, transparent 45%)'
        }}
      />
    );
  }

  if (theme === 'grid-pattern') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505]" />
      </div>
    );
  }

  if (theme === 'neon-accents') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]" />
    );
  }

  if (theme === 'monochrome') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#000000]" />
    );
  }

  if (theme === 'aurora') {
    return (
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020208]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 50% at 20% 20%, rgba(37, 99, 235, 0.18) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 80% 30%, rgba(124, 58, 237, 0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 85%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)'
        }}
      />
    );
  }

  if (theme === 'wallpaper') {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/bg-abstract.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.85
        }}
      />
    );
  }

  // Default: dark layered gradients without heavy SVG noise or GPU filter recomposition
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #050d14 0%, #080510 50%, #0a0614 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(20,80,100,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(60,20,90,0.3) 0%, transparent 60%)' }} />
    </div>
  );
}

export function getThemeCardCSS(theme) {
  if (theme === 'paper') {
    return `
      body, .dark-mode, .light-mode {
        background-color: #FAF6F0 !important;
        color: #2D241E !important;
      }
      .bg-white, [class*="bg-slate-900"], [class*="bg-slate-950"],
      [class*="bg-gray-900"], [class*="bg-gray-950"],
      .rounded-2xl.border, .rounded-xl.border,
      [class*="rounded-2xl"][class*="border"], [class*="rounded-xl"][class*="border"] {
        background-color: #FFFDF9 !important;
        border-color: #E2D9CC !important;
        color: #2D241E !important;
        box-shadow: 0 1px 3px rgba(45, 36, 30, 0.05) !important;
      }
    `;
  }
  if (theme === 'contrast') {
    return `
      body, .dark-mode {
        background-color: #000000 !important;
        color: #FFFFFF !important;
      }
      .bg-white, [class*="bg-slate-900"], [class*="bg-slate-950"],
      [class*="bg-gray-900"], [class*="bg-gray-950"],
      .rounded-2xl.border, .rounded-xl.border,
      [class*="rounded-2xl"][class*="border"], [class*="rounded-xl"][class*="border"] {
        background-color: #000000 !important;
        border: 2px solid #FFFFFF !important;
        color: #FFFFFF !important;
        box-shadow: none !important;
      }
    `;
  }
  if (theme === 'modern') {
    return `
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border {
        background-color: #0f141f !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
      }
    `;
  }
  if (theme === 'neon-accents') {
    return `
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
      .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
        background-color: rgba(10, 12, 18, 0.95) !important;
        border-radius: 1.5rem !important; color: #ffffff !important;
        border: 1px solid rgba(59, 130, 246, 0.4) !important;
        box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.45) !important;
      }
      .dark-mode .bg-white:hover, .dark-mode [class*="bg-slate-900"]:hover,
      .dark-mode .rounded-2xl.border:hover, .dark-mode .rounded-xl.border:hover,
      .dark-mode [class*="rounded-2xl"][class*="border"]:hover, .dark-mode [class*="rounded-xl"][class*="border"]:hover,
      .dark-mode .hover\\:shadow-md:hover {
        border-color: rgba(59, 130, 246, 0.7) !important;
        box-shadow: 0 6px 24px 0 rgba(59, 130, 246, 0.2) !important;
      }
    `;
  }
  if (theme === 'monochrome') {
    return `
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
      .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
        background-color: #16161a !important;
        border-radius: 1.5rem !important; color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.45) !important;
      }
    `;
  }
  // High-contrast crisp surface style without GPU backdrop-filter overhead
  return `
    .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
    .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
    .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
    .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
      background-color: #0e1118 !important;
      border-radius: 1.5rem !important; color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 4px 18px 0 rgba(0, 0, 0, 0.45) !important;
    }
    .dark-mode .bg-white:hover, .dark-mode [class*="bg-slate-900"]:hover,
    .dark-mode .rounded-2xl.border:hover, .dark-mode .rounded-xl.border:hover,
    .dark-mode [class*="rounded-2xl"][class*="border"]:hover, .dark-mode [class*="rounded-xl"][class*="border"]:hover,
    .dark-mode .hover\\:shadow-md:hover {
      background-color: #131722 !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
    }
  `;
}

export const THEMES = [
  { key: 'modern',        label: '⚡ Modern Retail', color: '#0f172a', accent: '#3b82f6' },
  { key: 'paper',         label: '📜 Paper / Linen', color: '#f5efeb', accent: '#b45309' },
  { key: 'contrast',      label: '🔳 High-Contrast', color: '#000000', accent: '#ffffff' },
  { key: 'noise-grain',   label: 'Noise Grain',    color: '#0a4055', accent: '#3c1458' },
  { key: 'mesh-gradient', label: 'Mesh Gradient',  color: '#312e81', accent: '#9f1239' },
  { key: 'aurora',        label: 'Aurora',          color: '#1e0545', accent: '#0c4a6e' },
  { key: 'grid-pattern',  label: 'Grid Pattern',   color: '#111827', accent: '#374151' },
  { key: 'wallpaper',     label: 'Wallpaper',       color: '#042f2e', accent: '#1e1b4b' },
  { key: 'neon-accents',  label: 'Neon',            color: '#1e3a5f', accent: '#5b21b6' },
  { key: 'monochrome',    label: 'Monochrome',      color: '#1c1c1e', accent: '#3a3a3c' },
];
