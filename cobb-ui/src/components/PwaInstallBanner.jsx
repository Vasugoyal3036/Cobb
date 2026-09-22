import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2 } from 'lucide-react';

export default function PwaInstallBanner({ darkMode }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone window
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if user dismissed banner in this session
    if (sessionStorage.getItem('ors_pwa_dismissed')) return;

    // iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleIos = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIos(isAppleIos);

    if (isAppleIos) {
      // Delay showing for iOS to not block initial render
      const timer = setTimeout(() => setShowBanner(true), 3000);
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
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('ors_pwa_dismissed', 'true');
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom duration-300 ${
      darkMode ? 'bg-[#0f172a]/95 border-blue-500/30 text-white' : 'bg-white/95 border-blue-200 text-slate-900 shadow-blue-900/10'
    }`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black tracking-wide uppercase">Install ORS Mobile App</h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {isIos ? (
              <>Tap the <Share2 className="w-3 h-3 inline text-blue-400 mx-0.5" /> Share button in Safari and select <strong>"Add to Home Screen"</strong> for instant full-screen access.</>
            ) : (
              'Install to your phone home screen for instant access to live store telemetry and offline bills.'
            )}
          </p>

          {!isIos && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
