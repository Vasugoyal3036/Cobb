import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeLoginLogs } from '../utils/auditLogger';
import { Shield, ShieldAlert, X, Smartphone, Monitor, Clock, User, Filter, RefreshCw, CheckCircle, AlertTriangle, Lock } from 'lucide-react';

export default function LoginAuditModal({ isOpen, onClose }) {
  const { activeStore, user, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filterRole, setFilterRole] = useState('ALL'); // 'ALL' | 'owner' | 'manager' | 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeLoginLogs(activeStore, (fetchedLogs) => {
      setLogs(fetchedLogs || []);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen, activeStore]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterRole === 'owner' && log.role !== 'owner') return false;
    if (filterRole === 'manager' && log.role !== 'manager') return false;
    if (filterRole === 'failed' && log.status !== 'failed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (log.userName || '').toLowerCase().includes(q);
      const matchRole = (log.role || '').toLowerCase().includes(q);
      const matchDevice = (log.deviceType || '').toLowerCase().includes(q);
      const matchBrowser = (log.browser || '').toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchDevice && !matchBrowser) return false;
    }
    return true;
  });

  const formatTime = (ts) => {
    if (!ts) return 'Unknown time';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return String(ts);
    }
  };

  const getRelativeTime = (ts) => {
    if (!ts) return '';
    try {
      const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Access & Login Audit Logs
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cloud Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every Owner and Manager sign-in is tracked with timestamp and device telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Lock Current Session"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock / Sign Out</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-3 sm:p-4 bg-slate-950/20 border-b border-white/[0.06] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Logs', count: logs.length },
              { id: 'owner', label: '👑 Owner', count: logs.filter(l => l.role === 'owner').length },
              { id: 'manager', label: '👔 Manager', count: logs.filter(l => l.role === 'manager').length },
              { id: 'failed', label: '⚠️ Failed', count: logs.filter(l => l.status === 'failed').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterRole === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 opacity-80">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search user, device, browser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 pl-8 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 divide-y divide-white/[0.04]">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Shield className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <p className="text-sm font-semibold">No login records found</p>
              <p className="text-xs text-slate-600">New sign-ins from phones and desktop will appear here in real-time.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isOwner = log.role === 'owner';
              const isFailed = log.status === 'failed';
              const isMobile = (log.deviceType || '').toLowerCase().includes('phone') || (log.deviceType || '').toLowerCase().includes('tablet');

              return (
                <div
                  key={log.id || idx}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all ${
                    isFailed
                      ? 'bg-red-500/[0.06] border border-red-500/20'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isFailed
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isOwner
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {isFailed ? <AlertTriangle className="w-4 h-4" /> : isOwner ? '👑' : '👔'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {log.userName || (isOwner ? 'Parbhat Goyal' : 'Store Manager')}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isFailed
                              ? 'bg-red-500/20 text-red-300'
                              : isOwner
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {log.role}
                          </span>
                          {isFailed ? (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                              • Blocked: {log.reason || 'Incorrect PIN'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Signed In
                            </span>
                          )}
                        </div>

                        {/* Device & Browser Telemetry */}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            {isMobile ? <Smartphone className="w-3.5 h-3.5 text-blue-400" /> : <Monitor className="w-3.5 h-3.5 text-indigo-400" />}
                            <span>{log.deviceType || 'Web Device'}</span>
                          </span>

                          <span>•</span>
                          <span>{log.browser || 'Web Browser'}</span>

                          {log.displayMode && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">{log.displayMode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {getRelativeTime(log.timestamp)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">
            Showing <b>{filteredLogs.length}</b> records • Real-time Firestore sync
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
