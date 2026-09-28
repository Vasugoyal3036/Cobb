import React, { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, X, Sparkles, Volume2 } from 'lucide-react';

const CheckoutNotificationToast = ({ notification, onClose, onOpenBill }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 8000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[420px] z-[9999] animate-bounce-in shadow-2xl transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-emerald-500/40 shadow-emerald-950/40 p-4 backdrop-blur-xl">
        {/* Glow ambient light */}
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          {/* Cash / Bag Icon with pulse */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/30">
            <ShoppingBag className="w-5 h-5 text-white animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                Live Sale Alert
              </span>
              <span className="text-[11px] text-slate-400">Just now</span>
            </div>

            <h4 className="text-sm font-extrabold text-white tracking-tight leading-snug truncate">
              {notification.title || `🧾 New Sale: ₹${Number(notification.amount || 0).toLocaleString('en-IN')}`}
            </h4>

            <p className="text-xs text-slate-300/90 mt-1 leading-relaxed line-clamp-2 font-medium">
              {notification.body || 'New checkout processed on POS.'}
            </p>

            <button
              type="button"
              onClick={() => onOpenBill(notification)}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>View Bill Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutNotificationToast;
