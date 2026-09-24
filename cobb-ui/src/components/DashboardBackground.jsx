import React from 'react';

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function DashboardBackground({ theme }) {
  if (theme === 'mesh-gradient') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[60px] md:blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-rose-600/10 blur-[60px] md:blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue-600/15 blur-[60px] md:blur-[120px]" />
      </div>
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020208]">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
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

  // Default: noise-grain
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #050d14 0%, #080510 50%, #0a0614 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(20,80,100,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(60,20,90,0.3) 0%, transparent 60%)' }} />
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }} />
    </div>
  );
}

export function getThemeCardCSS(theme) {
  if (theme === 'neon-accents') {
    return `
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
      .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
        background-color: rgba(10, 10, 15, 0.8) !important;
        backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important;
        border-radius: 1.5rem !important; color: #ffffff !important;
        border: 1px solid rgba(59, 130, 246, 0.4) !important;
        box-shadow: 0 0 20px 0 rgba(59, 130, 246, 0.15), inset 0 0 15px 0 rgba(168, 85, 247, 0.1) !important;
      }
      .dark-mode .bg-white:hover, .dark-mode [class*="bg-slate-900"]:hover,
      .dark-mode .rounded-2xl.border:hover, .dark-mode .rounded-xl.border:hover,
      .dark-mode [class*="rounded-2xl"][class*="border"]:hover, .dark-mode [class*="rounded-xl"][class*="border"]:hover,
      .dark-mode .hover\\:shadow-md:hover {
        border-color: rgba(59, 130, 246, 0.7) !important;
        box-shadow: 0 0 30px 0 rgba(59, 130, 246, 0.25), inset 0 0 20px 0 rgba(168, 85, 247, 0.15) !important;
      }
      @media (max-width: 768px) {
        .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
        .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
        .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
        .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
          backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
          background-color: #0b0c10 !important;
        }
      }
    `;
  }
  if (theme === 'monochrome') {
    return `
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
      .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
        background-color: rgba(30, 30, 32, 0.45) !important;
        backdrop-filter: blur(40px) saturate(150%) !important; -webkit-backdrop-filter: blur(40px) saturate(150%) !important;
        border-radius: 1.5rem !important; color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05) !important;
      }
      @media (max-width: 768px) {
        .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
        .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
        .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
        .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
          backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
          background-color: #1a1a1c !important;
        }
      }
    `;
  }
  // Default glass style for all other themes
  return `
    .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
    .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
    .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
    .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
      background-color: rgba(12, 14, 18, 0.6) !important;
      backdrop-filter: blur(28px) saturate(130%) !important; -webkit-backdrop-filter: blur(28px) saturate(130%) !important;
      border-radius: 1.5rem !important; color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.07) !important;
      box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.04) !important;
    }
    .dark-mode .bg-white:hover, .dark-mode [class*="bg-slate-900"]:hover,
    .dark-mode .rounded-2xl.border:hover, .dark-mode .rounded-xl.border:hover,
    .dark-mode [class*="rounded-2xl"][class*="border"]:hover, .dark-mode [class*="rounded-xl"][class*="border"]:hover,
    .dark-mode .hover\\:shadow-md:hover {
      background-color: rgba(18, 20, 26, 0.7) !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
    }
    @media (max-width: 768px) {
      .dark-mode .bg-white, .dark-mode [class*="bg-slate-900"], .dark-mode [class*="bg-slate-950"],
      .dark-mode [class*="bg-gray-900"], .dark-mode [class*="bg-gray-950"],
      .dark-mode .rounded-2xl.border, .dark-mode .rounded-xl.border,
      .dark-mode [class*="rounded-2xl"][class*="border"], .dark-mode [class*="rounded-xl"][class*="border"] {
        backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        background-color: #12141a !important;
      }
    }
  `;
}

export const THEMES = [
  { key: 'noise-grain',   label: 'Noise Grain',    color: '#0a4055', accent: '#3c1458' },
  { key: 'mesh-gradient', label: 'Mesh Gradient',  color: '#312e81', accent: '#9f1239' },
  { key: 'aurora',        label: 'Aurora',          color: '#1e0545', accent: '#0c4a6e' },
  { key: 'grid-pattern',  label: 'Grid Pattern',   color: '#111827', accent: '#374151' },
  { key: 'wallpaper',     label: 'Wallpaper',       color: '#042f2e', accent: '#1e1b4b' },
  { key: 'neon-accents',  label: 'Neon',            color: '#1e3a5f', accent: '#5b21b6' },
  { key: 'monochrome',    label: 'Monochrome',      color: '#1c1c1e', accent: '#3a3a3c' },
];
