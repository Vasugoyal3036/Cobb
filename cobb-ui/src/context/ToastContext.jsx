import React, { createContext, useContext, useState, useCallback } from 'react';
import { Zap, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 3)); // Keep max 3 toasts

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              // Custom action can be passed via toast.onClick
              if (toast.onClick) toast.onClick();
              removeToast(toast.id);
            }}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur text-white rounded-2xl shadow-2xl border border-slate-800/90 p-4 min-w-[340px] max-w-sm flex items-start gap-3.5 animate-slide-in relative overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
          >
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  {toast.title || 'Notification'}
                </p>
                {toast.billNumber && (
                  <span className="text-[10px] font-mono text-slate-400">
                    #{toast.billNumber}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-1 leading-snug">
                {toast.customer || toast.msg}
              </p>
              {toast.amount && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {/* Add formatCurrency logic here if needed */}
                    ₹{toast.amount}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {toast.paymentMode || 'Cash'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer absolute top-3.5 right-3.5"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Toast Visual Progress Countdown Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-400 origin-left animate-toast-timer" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
