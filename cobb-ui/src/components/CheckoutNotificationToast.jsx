import React, { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, X, Sparkles, Power, PowerOff, AlertTriangle, ShieldAlert, Crown, Ban, FileText } from 'lucide-react';

const CheckoutNotificationToast = ({ notification, onClose, onOpenBill, onOpenEod }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = notification.type === 'system_status' ? 10000 : (notification.type === 'eod_summary' ? 12000 : 8000);
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

  const isSystemStatus = notification.type === 'system_status';
  const isBigTicket = notification.type === 'big_ticket_sale';
  const isHeavyDiscount = notification.type === 'heavy_discount';
  const isCancelledBill = notification.type === 'cancelled_bill';
  const isEodSummary = notification.type === 'eod_summary';

  const isOnline = notification.status === 'online';
  const isPowerCut = notification.status === 'unresponsive';

  let borderColor = 'border-emerald-500/40 shadow-emerald-950/40';
  let glowColor = 'bg-emerald-500/20';

  if (isSystemStatus) {
    if (isOnline) {
      borderColor = 'border-emerald-500/50 shadow-emerald-950/50';
      glowColor = 'bg-emerald-500/25';
    } else if (isPowerCut) {
      borderColor = 'border-amber-500/50 shadow-amber-950/50';
      glowColor = 'bg-amber-500/25';
    } else {
      borderColor = 'border-rose-500/50 shadow-rose-950/50';
      glowColor = 'bg-rose-500/25';
    }
  } else if (isBigTicket) {
    borderColor = 'border-purple-400/60 shadow-purple-950/60 ring-1 ring-purple-400/30';
    glowColor = 'bg-purple-500/30';
  } else if (isHeavyDiscount) {
    borderColor = 'border-amber-500/60 shadow-amber-950/60 ring-1 ring-amber-400/30';
    glowColor = 'bg-amber-500/30';
  } else if (isCancelledBill) {
    borderColor = 'border-rose-500/70 shadow-rose-950/70 ring-1 ring-rose-400/30';
    glowColor = 'bg-rose-500/35';
  } else if (isEodSummary) {
    borderColor = 'border-cyan-400/60 shadow-cyan-950/60 ring-1 ring-cyan-400/30';
    glowColor = 'bg-cyan-500/25';
  }

  const handleActionClick = () => {
    if (isEodSummary) {
      if (typeof onOpenEod === 'function') {
        onOpenEod(notification);
      } else if (typeof onOpenBill === 'function') {
        onOpenBill(notification);
      }
    } else if (typeof onOpenBill === 'function') {
      onOpenBill(notification);
    }
  };

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[440px] z-[9999] animate-bounce-in shadow-2xl transition-all duration-300">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border ${borderColor} p-4 backdrop-blur-xl`}>
        {/* Glow ambient light */}
        <div className={`absolute -top-12 -left-12 w-32 h-32 ${glowColor} rounded-full blur-2xl pointer-events-none`} />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          {/* Status Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-2 ${
            isSystemStatus
              ? isOnline
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-emerald-400/30 text-white'
                : isPowerCut
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 ring-amber-400/30 text-white'
                  : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30 ring-rose-400/30 text-white'
              : isBigTicket
                ? 'bg-gradient-to-br from-purple-500 via-indigo-600 to-amber-500 shadow-purple-500/40 ring-purple-400/40 text-amber-200'
                : isHeavyDiscount
                  ? 'bg-gradient-to-br from-amber-500 to-rose-600 shadow-amber-500/40 ring-amber-400/40 text-white'
                  : isCancelledBill
                    ? 'bg-gradient-to-br from-rose-600 to-red-800 shadow-rose-500/40 ring-rose-400/40 text-white'
                    : isEodSummary
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/40 ring-cyan-400/40 text-white'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-emerald-400/30 text-white'
          }`}>
            {isSystemStatus ? (
              isOnline ? (
                <Power className="w-5 h-5 animate-pulse" />
              ) : isPowerCut ? (
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              ) : (
                <PowerOff className="w-5 h-5" />
              )
            ) : isBigTicket ? (
              <Crown className="w-5 h-5 animate-bounce" />
            ) : isHeavyDiscount ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : isCancelledBill ? (
              <Ban className="w-5 h-5 animate-bounce" />
            ) : isEodSummary ? (
              <FileText className="w-5 h-5 animate-pulse" />
            ) : (
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                isSystemStatus
                  ? isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isPowerCut
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : isBigTicket
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400/40 ring-1 ring-purple-400/20'
                    : isHeavyDiscount
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400/40 ring-1 ring-amber-400/20'
                      : isCancelledBill
                        ? 'bg-rose-500/25 text-rose-200 border-rose-400/40 ring-1 ring-rose-400/20'
                        : isEodSummary
                          ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40 ring-1 ring-cyan-400/20'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isSystemStatus ? (
                  isOnline ? '🟢 System Online' : isPowerCut ? '⚠️ Power Cut / Offline' : '🔴 System Closed'
                ) : isBigTicket ? (
                  <>
                    <Crown className="w-3 h-3 mr-1 text-amber-300" />
                    💎 VIP Mega Sale
                  </>
                ) : isHeavyDiscount ? (
                  <>
                    <ShieldAlert className="w-3 h-3 mr-1 text-amber-300" />
                    ⚠️ Heavy Discount Alert
                  </>
                ) : isCancelledBill ? (
                  <>
                    <Ban className="w-3 h-3 mr-1 text-rose-300" />
                    🚫 Voided / Cancelled Sale
                  </>
                ) : isEodSummary ? (
                  <>
                    <FileText className="w-3 h-3 mr-1 text-cyan-300" />
                    📊 EOD Store Digest
                  </>
                ) : (
                  <>
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    Live Sale Alert
                  </>
                )}
              </span>
              <span className="text-[11px] text-slate-400">Just now</span>
            </div>

            <h4 className="text-sm font-black text-white tracking-tight leading-snug truncate">
              {notification.title || (isSystemStatus ? 'Store Hardware Event' : `🧾 Sale: ₹${Number(notification.amount || 0).toLocaleString('en-IN')}`)}
            </h4>

            <p className="text-xs text-slate-300/90 mt-1 leading-relaxed line-clamp-2 font-medium">
              {notification.body || (isSystemStatus ? 'Store system state updated.' : 'New checkout processed on POS.')}
            </p>

            {!isSystemStatus && (
              <button
                type="button"
                onClick={handleActionClick}
                className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                  isBigTicket
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-500/30'
                    : isHeavyDiscount
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/30'
                      : isCancelledBill
                        ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-rose-500/30'
                        : isEodSummary
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                <span>
                  {isEodSummary ? 'Open Full Closing Digest' : isCancelledBill ? 'Inspect Voided Bill' : isHeavyDiscount ? 'Audit Discount Details' : isBigTicket ? 'View VIP Bill Details' : 'View Bill Breakdown'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
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
            className={`h-full transition-all duration-75 ${
              isBigTicket
                ? 'bg-gradient-to-r from-purple-400 to-amber-300'
                : isHeavyDiscount
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                  : isCancelledBill
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : isEodSummary
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-400'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-300'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutNotificationToast;
