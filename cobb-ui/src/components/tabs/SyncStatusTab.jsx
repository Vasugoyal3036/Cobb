import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, Clock, Database, AlertCircle, Server } from 'lucide-react';

const SyncStatusTab = ({ darkMode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date(Date.now() - 1000 * 60 * 2)); // 2 mins ago mock
  
  const [pendingItems, setPendingItems] = useState([
    { id: 1, type: 'Bill', ref: '#STST27-00725', time: 'Just now' },
    { id: 2, type: 'Alteration', ref: 'A-1045', time: '5 mins ago' }
  ]);

  const [syncHistory, setSyncHistory] = useState([
    { id: 101, action: 'Uploaded 3 Bills', status: 'success', time: '2 mins ago' },
    { id: 102, action: 'Updated Alteration A-1044', status: 'success', time: '15 mins ago' },
    { id: 103, action: 'Pulled HO Dispatches', status: 'success', time: '1 hour ago' },
  ]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = () => {
    if (!isOnline) return;
    setIsSyncing(true);
    
    // Mock sync process
    setTimeout(() => {
      if (pendingItems.length > 0) {
        const newHistory = pendingItems.map(item => ({
          id: Date.now() + Math.random(),
          action: `Uploaded ${item.type} ${item.ref}`,
          status: 'success',
          time: 'Just now'
        }));
        setSyncHistory(prev => [...newHistory, ...prev]);
        setPendingItems([]);
      }
      setLastSynced(new Date());
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Database className="w-7 h-7 text-blue-500" />
            Cloud Sync Engine
          </h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            Monitor local database sync status with Head Office Firebase.
          </p>
        </div>
        
        <button
          onClick={handleForceSync}
          disabled={!isOnline || isSyncing}
          className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg
            ${!isOnline 
              ? (darkMode ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
              : isSyncing
                ? 'bg-blue-500/50 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 hover:scale-105'
            }`}
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing Now...' : 'Force Sync'}
        </button>
      </div>

      {/* Main Status Hero */}
      <div className={`p-8 rounded-3xl border relative overflow-hidden transition-all duration-500 ${
        !isOnline 
          ? (darkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200')
          : (darkMode ? 'bg-[#121829] border-[#232e47] shadow-xl' : 'bg-white border-slate-200 shadow-xl')
      }`}>
        
        {/* Background glow */}
        {isOnline && (
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
              !isOnline 
                ? (darkMode ? 'bg-red-900/30 text-red-500' : 'bg-red-100 text-red-600')
                : isSyncing
                  ? 'bg-blue-500 text-white animate-pulse'
                  : (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
            }`}>
              {!isOnline ? <CloudOff className="w-10 h-10" /> : isSyncing ? <RefreshCw className="w-10 h-10 animate-spin" /> : <Cloud className="w-10 h-10" />}
            </div>
            
            {isOnline && !isSyncing && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-[#121829] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-3xl font-black mb-2 ${
              !isOnline 
                ? 'text-red-500' 
                : isSyncing 
                  ? 'text-blue-500' 
                  : 'text-emerald-500'
            }`}>
              {!isOnline ? 'OFFLINE MODE' : isSyncing ? 'SYNCING DATA...' : 'SYSTEM ONLINE'}
            </h3>
            <p className={`text-lg mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {!isOnline 
                ? 'Check your internet connection. Bills are saved locally and will upload automatically.' 
                : 'Local database is actively connected to the Head Office Cloud.'}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium">
              <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <Server className="w-4 h-4 text-blue-500" />
                Local Server: Running
              </span>
              <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <Clock className="w-4 h-4 text-emerald-500" />
                Last Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Queue */}
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <AlertCircle className={`w-5 h-5 ${pendingItems.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              Pending Uploads
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              pendingItems.length > 0 
                ? (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              {pendingItems.length} items
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
              <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>All local data is fully synced.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map(item => (
                <div key={item.id} className={`p-4 rounded-xl flex items-center justify-between border ${
                  darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex flex-col">
                    <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.type} {item.ref}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Added {item.time}
                    </span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync History */}
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Clock className="w-5 h-5 text-blue-500" />
            Recent Sync History
          </h3>
          
          <div className="space-y-4">
            {syncHistory.map((item, idx) => (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  {idx !== syncHistory.length - 1 && (
                    <div className={`w-0.5 h-full my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  )}
                </div>
                <div className="pb-4">
                  <p className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {item.action}
                  </p>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SyncStatusTab;
