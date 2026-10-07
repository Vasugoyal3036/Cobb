import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, ExternalLink } from 'lucide-react';

export default function PwaInstallBanner({ darkMode }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode on home screen
    const standalone = (
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && window.navigator.standalone === true) ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
    );
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if user dismissed banner in this session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('cobb_pwa_dismissed')) return;

    // Mobile / iOS detection
    const userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
    const isAppleIos = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || (window.innerWidth <= 768);

    setIsIos(isAppleIos);
    setIsMobile(isMobileDevice);

    // If on mobile, show banner after 1.5 seconds regardless
    if (isMobileDevice) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome PWA prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // If browser hasn't fired beforeinstallprompt or is in browser mode, guide user
      alert("To install the app on Android:\n1. Tap the 3 dots (⋮) in the top-right corner of Chrome.\n2. Tap 'Install app' or 'Add to Home screen'.\n\nIt will create a direct 1-tap shortcut to Cobb Store!");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cobb_pwa_dismissed', 'true');
    }
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className={`fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom duration-300 ${
      darkMode ? 'bg-[#0f172a]/95 border-blue-500/30 text-white shadow-blue-950/60' : 'bg-white/95 border-blue-200 text-slate-900 shadow-blue-900/15'
    }`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black tracking-wide uppercase">Cobb Store App</h4>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/20 text-blue-400">Mobile PWA</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            {isIos ? (
              <>Tap the <Share2 className="w-3 h-3 inline text-blue-400 mx-0.5" /> <b>Share button</b> in Safari and tap <PlusSquare className="w-3 h-3 inline text-blue-400 mx-0.5" /> <b>"Add to Home Screen"</b> for instant 1-tap access.</>
            ) : deferredPrompt ? (
              'Install directly to your phone home screen for instant 1-tap access to live Cobb Store POS & Telemetry.'
            ) : (
              <>In Chrome, tap the menu (<b>⋮</b>) and select <b>"Install app"</b> or <b>"Add to Home screen"</b> to save the shortcut.</>
            )}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {!isIos && (
              <button
                onClick={handleInstall}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{deferredPrompt ? 'Add to Home Screen' : 'Install Shortcut'}</span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
