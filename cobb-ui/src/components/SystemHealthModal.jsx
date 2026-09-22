import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Smartphone,
  Terminal,
  Cloud,
  QrCode,
  Shield,
  Send,
  Calendar,
  Star,
  MessageCircle,
  Download,
  Check,
  X
} from 'lucide-react';

export default function SystemHealthModal({ isOpen, onClose, API_BASE = 'http://localhost:5000', darkMode }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState({});
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);
  const [inboundAlerts, setInboundAlerts] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [sendingWish, setSendingWish] = useState({});
  const [activeTab, setActiveTab] = useState('health'); // 'health' | 'alerts' | 'anniversaries'

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
      fetchInboundAlerts();
      fetchAnniversaries();
      const interval = setInterval(fetchHealth, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/system/health`);
      setHealthData(res.data);
    } catch (e) {
      setHealthData({
        overall: 'attention_required',
        services: {
          database: { status: 'unknown', name: 'Microsoft SQL Server' },
          whatsapp: { status: 'unknown', name: 'WhatsApp Gateway' },
          posListener: { status: 'unknown', name: 'POS Receipt Auto-Listener' },
          cloudSync: { status: 'unknown', name: 'Firebase Cloud Sync' }
        }
      });
    }
  };

  const fetchInboundAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/whatsapp/inbound-alerts`);
      setInboundAlerts(res.data || []);
    } catch (e) {
      setInboundAlerts([]);
    }
  };

  const fetchAnniversaries = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/crm/anniversaries-today`);
      setAnniversaries(res.data || []);
    } catch (e) {
      setAnniversaries([]);
    }
  };

  const handleRestartService = async (serviceKey) => {
    setRestarting(prev => ({ ...prev, [serviceKey]: true }));
    try {
      await axios.post(`${API_BASE}/api/system/restart-service`, { service: serviceKey });
      setTimeout(fetchHealth, 2000);
    } catch (e) {
      alert('Restart service failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setRestarting(prev => ({ ...prev, [serviceKey]: false }));
    }
  };

  const handleTriggerBackup = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const res = await axios.post(`${API_BASE}/api/system/backup-now`);
      setBackupMsg({ type: 'success', text: res.data?.message || 'Backup snapshot created successfully!' });
    } catch (e) {
      setBackupMsg({ type: 'error', text: e.response?.data?.error || 'Backup generation failed' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleDispatchWish = async (cust, occasion = 'birthday') => {
    setSendingWish(prev => ({ ...prev, [cust.Phone]: true }));
    try {
      await axios.post(`${API_BASE}/api/crm/dispatch-wishes`, {
        phone: cust.Phone,
        customerName: cust.CustomerName,
        occasion
      });
      alert(`VIP ${occasion} discount voucher dispatched to ${cust.CustomerName}!`);
    } catch (e) {
      alert('Dispatch failed: ' + e.message);
    } finally {
      setSendingWish(prev => ({ ...prev, [cust.Phone]: false }));
    }
  };

  const handleMarkAlertRead = async (id) => {
    try {
      await axios.post(`${API_BASE}/api/whatsapp/inbound-alerts/mark-read`, { id });
      setInboundAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));
    } catch (e) {}
  };

  if (!isOpen) return null;

  const services = healthData?.services || {};

  const getStatusBadge = (status) => {
    if (status === 'healthy') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Online
        </span>
      );
    }
    if (status === 'awaiting_qr') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <QrCode className="w-3 h-3" /> Scan QR
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle className="w-3 h-3" /> Offline
      </span>
    );
  };

  const unreadAlertsCount = inboundAlerts.filter(a => a.status === 'unread').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        darkMode ? 'bg-[#0c101a] border-[#1f293d] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
          darkMode ? 'border-[#1f293d] bg-[#080c14]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide">ORS System Telemetry & DevOps</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                  healthData?.overall === 'healthy'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {healthData?.overall === 'healthy' ? 'All Systems Operational' : 'Attention Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live monitoring of local POS listeners, WhatsApp bot & cloud backups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              darkMode ? 'bg-[#151d2e] border-[#25324d] text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 pt-3 border-b flex items-center gap-4 shrink-0 text-xs font-bold ${
          darkMode ? 'border-[#1f293d] bg-[#0c101a]' : 'border-slate-100 bg-white'
        }`}>
          <button
            onClick={() => setActiveTab('health')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'border-blue-500 text-blue-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Service Watchdog</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Customer Inbound Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('anniversaries')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'anniversaries'
                ? 'border-blue-500 text-blue-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Birthdays Today ({anniversaries.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: SERVICE WATCHDOG */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              
              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. Microsoft SQL Server */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-[#101624] border-[#1f2b42]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">Microsoft SQL Server</h4>
                        <p className="text-[10px] text-slate-400">RPD_AVATAR01_NEW_ST_POS</p>
                      </div>
                    </div>
                    {getStatusBadge(services.database?.status)}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Ping Latency: <strong className="text-slate-200">{services.database?.latencyMs ?? 1}ms</strong></span>
                    <span className="text-[10px] text-emerald-400">Localhost Driver</span>
                  </div>
                </div>

                {/* 2. WhatsApp Gateway */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-[#101624] border-[#1f2b42]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">WhatsApp Gateway</h4>
                        <p className="text-[10px] text-slate-400">Port 3000 • Two-Way Bot</p>
                      </div>
                    </div>
                    {getStatusBadge(services.whatsapp?.status)}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {services.whatsapp?.isReady ? 'Ready for dispatches' : 'Session connecting'}
                    </span>
                    <button
                      onClick={() => handleRestartService('whatsapp')}
                      disabled={restarting.whatsapp}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${restarting.whatsapp ? 'animate-spin' : ''}`} />
                      Restart
                    </button>
                  </div>
                </div>

                {/* 3. POS Receipt Auto-Listener */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-[#101624] border-[#1f2b42]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">POS Receipt Listener</h4>
                        <p className="text-[10px] text-slate-400">cobb_pos_listener.py</p>
                      </div>
                    </div>
                    {getStatusBadge(services.posListener?.status)}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Auto-Spawning Enabled</span>
                    <button
                      onClick={() => handleRestartService('posListener')}
                      disabled={restarting.posListener}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${restarting.posListener ? 'animate-spin' : ''}`} />
                      Restart
                    </button>
                  </div>
                </div>

                {/* 4. Firebase Cloud Sync */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-[#101624] border-[#1f2b42]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">Firebase Cloud Sync</h4>
                        <p className="text-[10px] text-slate-400">cobb-store.web.app</p>
                      </div>
                    </div>
                    {getStatusBadge(services.cloudSync?.status)}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Phone Link Bridge</span>
                    <button
                      onClick={() => handleRestartService('cloudSync')}
                      disabled={restarting.cloudSync}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${restarting.cloudSync ? 'animate-spin' : ''}`} />
                      Restart
                    </button>
                  </div>
                </div>

              </div>

              {/* Database Backup & Disaster Recovery Action Bar */}
              <div className={`p-4 rounded-xl border ${
                darkMode ? 'bg-[#0a0e17] border-[#1a2337]' : 'bg-slate-100 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                      <Shield className="w-3.5 h-3.5" />
                      Automated Nightly Backup Engine
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Backs up POS bills, customer registry & store registers into compressed archives with 14-day retention.
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerBackup}
                    disabled={backingUp}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${backingUp ? 'animate-bounce' : ''}`} />
                    <span>{backingUp ? 'Backing Up...' : 'Backup Database Now'}</span>
                  </button>
                </div>
                {backupMsg && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    backupMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{backupMsg.text}</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: INBOUND CUSTOMER ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {inboundAlerts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  No customer grievances or complaints. All counter interactions healthy!
                </div>
              ) : (
                inboundAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      alert.status === 'unread'
                        ? darkMode ? 'bg-rose-950/20 border-rose-800/50' : 'bg-rose-50 border-rose-200'
                        : darkMode ? 'bg-[#101624] border-[#1f2b42] opacity-70' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs">{alert.phone}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            alert.type === 'grievance' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {alert.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs mt-1.5 text-slate-200 font-medium">"{alert.message}"</p>
                      </div>
                      {alert.status === 'unread' && (
                        <button
                          onClick={() => handleMarkAlertRead(alert.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold border border-slate-600/40 cursor-pointer shrink-0"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: BIRTHDAYS & ANNIVERSARIES TODAY */}
          {activeTab === 'anniversaries' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Customers with registered birthdays or anniversaries today. One-click sends a personalized greeting with an exclusive 15% discount voucher valid for 7 days.
              </p>
              {anniversaries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Calendar className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-80" />
                  No customer birthdays or anniversaries registered for today.
                </div>
              ) : (
                anniversaries.map((cust, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-[#101624] border-[#1f2b42]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{cust.CustomerName || 'Customer'}</span>
                        <span className="text-[11px] text-slate-400">({cust.Phone})</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-medium mt-0.5 block">
                        🎂 Birthday Celebration Today
                      </span>
                    </div>
                    <button
                      onClick={() => handleDispatchWish(cust, 'birthday')}
                      disabled={sendingWish[cust.Phone]}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingWish[cust.Phone] ? 'Sending...' : 'Send VIP Voucher'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
