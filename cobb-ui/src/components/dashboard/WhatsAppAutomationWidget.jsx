import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';

const WhatsAppAutomationWidget = ({
  automationDispatches,
  darkMode,
  setActiveTab
}) => {
  const dispatches = automationDispatches || {};
  const checkoutsCount = typeof dispatches.checkoutsSent === 'number' ? dispatches.checkoutsSent : 0;
  const exchangesCount = typeof dispatches.exchangesSent === 'number' ? dispatches.exchangesSent : 0;
  const notOnWhatsAppCount = typeof dispatches.notOnWhatsAppCount === 'number' ? dispatches.notOnWhatsAppCount : 0;
  const totalFailed = notOnWhatsAppCount;
  const sentCount = checkoutsCount + exchangesCount;
  const totalAttempts = sentCount + totalFailed;
  const checkoutPct = totalAttempts > 0 ? Math.round((checkoutsCount / totalAttempts) * 100) : 0;
  const exchangePct = totalAttempts > 0 ? Math.round((exchangesCount / totalAttempts) * 100) : 0;
  const failedPct = totalAttempts > 0 ? Math.max(0, 100 - checkoutPct - exchangePct) : 0;

  const latestReason = dispatches.latestReason || (
    totalFailed > 0
      ? `⚠️ ${totalFailed} not on WhatsApp • ${sentCount} delivered`
      : sentCount > 0
        ? `${sentCount} slips delivered today`
        : 'Monitoring POS checkouts...'
  );

  return (
    <div className={`rounded-2xl border shadow-sm p-5 flex flex-col justify-between h-[320px] transition-all ${
      darkMode 
        ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' 
        : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl border ${
            darkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold text-xs uppercase tracking-wider truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Automation Slips
            </h3>
            <p className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              WhatsApp POS delivery
            </p>
          </div>
        </div>
        <button 
          onClick={() => typeof setActiveTab === 'function' && setActiveTab('automation')} 
          className={`text-xs font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
            darkMode 
              ? 'bg-blue-950/40 text-blue-400 border-blue-800/50 hover:bg-blue-900/50' 
              : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <span>Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-2.5 my-1">
        {/* Bills Sent */}
        <div className={`p-3 rounded-xl border text-center transition-all ${
          darkMode 
            ? 'bg-[#121829] border-[#1c2436]' 
            : 'bg-blue-50/50 border-blue-100'
        }`}>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Bills</span>
          <div className={`text-2xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>{checkoutsCount}</div>
          <span className={`text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{checkoutPct}%</span>
        </div>

        {/* Exchanges Sent */}
        <div className={`p-3 rounded-xl border text-center transition-all ${
          darkMode 
            ? 'bg-[#121829] border-[#1c2436]' 
            : 'bg-amber-50/50 border-amber-100'
        }`}>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">Exch</span>
          <div className={`text-2xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>{exchangesCount}</div>
          <span className={`text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{exchangePct}%</span>
        </div>

        {/* Failed / Not on WhatsApp */}
        <div className={`p-3 rounded-xl border text-center transition-all ${
          totalFailed > 0
            ? darkMode ? 'bg-rose-950/30 border-rose-900/40' : 'bg-rose-50/70 border-rose-200'
            : darkMode ? 'bg-[#121829] border-[#1c2436]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-0.5">No WA</span>
          <div className={`text-2xl font-black font-mono ${totalFailed > 0 ? 'text-rose-400' : (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>{totalFailed}</div>
          <span className={`text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{failedPct}%</span>
        </div>
      </div>

      {/* Status Callout */}
      <div className={`px-3.5 py-2.5 rounded-xl border text-xs truncate font-medium ${
        totalFailed > 0 
          ? darkMode 
            ? 'bg-rose-950/30 border-rose-900/40 text-rose-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
          : darkMode 
            ? 'bg-[#121829] border-[#1c2436] text-slate-300' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
      }`} title={latestReason}>
        {latestReason}
      </div>

      {/* Tri-Color Segmented Bar */}
      <div className="space-y-1.5">
        <div className={`w-full h-2 rounded-full overflow-hidden flex p-0.5 gap-0.5 ${
          darkMode ? 'bg-slate-800/80' : 'bg-slate-100'
        }`}>
          {totalAttempts === 0 ? (
            <div className={`w-full h-full rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          ) : (
            <>
              {checkoutsCount > 0 && (
                <div className="h-full rounded-l-full bg-blue-500" style={{ width: `${checkoutPct}%` }} />
              )}
              {exchangesCount > 0 && (
                <div className="h-full bg-amber-500" style={{ width: `${exchangePct}%` }} />
              )}
              {totalFailed > 0 && (
                <div className="h-full rounded-r-full bg-rose-500" style={{ width: `${failedPct}%` }} />
              )}
            </>
          )}
        </div>
        <div className={`flex justify-between items-center text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            POS Engine Active
          </span>
          <span className="font-mono">{sentCount} delivered total</span>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAutomationWidget;
