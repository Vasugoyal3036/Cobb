import React, { useState } from 'react';
import { X, Power, PowerOff, AlertTriangle, Activity, Server, Clock, Zap, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerTestSystemStatusAlert } from '../utils/checkoutNotifications';

export default function SystemPowerModal({
  isOpen,
  onClose,
  systemStatus,
  onTriggerTestAlert,
  activeStore = 'DEMO_STORE_001',
  darkMode = true
}) {
  const [testingStatus, setTestingStatus] = useState(null);

  if (!isOpen) return null;

  const isOnline = systemStatus?.isOnline ?? (systemStatus?.status === 'online');
  const isUnresponsive = systemStatus?.status === 'unresponsive';

  const lastSeenSeconds = systemStatus?.lastSeenMillis
    ? Math.max(0, Math.floor((Date.now() - systemStatus.lastSeenMillis) / 1000))
    : null;

  const handleTest = async (type) => {
    setTestingStatus(type);
    try {
      if (typeof onTriggerTestAlert === 'function') {
        await onTriggerTestAlert(type);
      } else {
        await triggerTestSystemStatusAlert(type, activeStore);
      }
    } finally {
      setTimeout(() => setTestingStatus(null), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header Bar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isOnline
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : isUnresponsive
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              {isOnline ? (
                <Power className="w-5 h-5 animate-pulse" />
              ) : isUnresponsive ? (
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              ) : (
                <PowerOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold">Store System & Power Watchdog</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live Hardware Heartbeat & Power Monitor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Main Status Hero Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : isUnresponsive
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isOnline ? 'bg-emerald-500' : isUnresponsive ? 'bg-amber-500' : 'bg-rose-500'
                }`}></span>
              </span>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">
                  {isOnline ? 'Store POS Active (Online)' : isUnresponsive ? 'Unresponsive / Power Cut' : 'Store POS Turned OFF'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isOnline
                    ? `Heartbeat OK • Last pulse: ${lastSeenSeconds !== null ? `${lastSeenSeconds}s ago` : 'just now'}`
                    : isUnresponsive
                      ? `No heartbeat for >2 minutes. Possible power cut at store.`
                      : 'Clean shutdown registered from store PC.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 uppercase tracking-widest font-bold">
              {isOnline ? '20s Heartbeat' : 'Watchdog Alert'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Power className="w-3.5 h-3.5 text-emerald-400" />
                <span>Last Booted Time</span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                {systemStatus?.lastBootTimeFormatted || 'Today, Store Opening'}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Last Shutdown Time</span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                {systemStatus?.lastShutdownTimeFormatted || 'No recent shutdown'}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Store POS Host</span>
              </div>
              <p className="text-xs font-bold font-mono text-slate-200 truncate">
                {systemStatus?.machineName || 'DESKTOP-COBB-POS'}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Watchdog Protocol</span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                Auto Power Cut (2 min)
              </p>
            </div>
          </div>

          {/* Test Alert Triggers */}
          <div className="pt-2 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Test System Notifications on Phone Link:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTest('online')}
                disabled={testingStatus !== null}
                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{testingStatus === 'online' ? 'Triggering...' : 'Test System ON'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTest('offline')}
                disabled={testingStatus !== null}
                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-[0.98] cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>{testingStatus === 'offline' ? 'Triggering...' : 'Test System OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${darkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
