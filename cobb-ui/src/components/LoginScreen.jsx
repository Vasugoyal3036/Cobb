import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, ShoppingBag, Delete, AlertCircle, Sparkles, Check, Lock } from 'lucide-react';
import OrsLogo from './OrsLogo';

const ROLES = [
  {
    id: 'owner',
    title: 'Owner',
    name: 'Owner',
    badge: '👑 Executive HQ',
    desc: 'Full store access, financial telemetry & multi-store analytics',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300',
    ring: 'ring-amber-500/50 shadow-amber-500/20',
    pinHint: 'Default PIN: 1234'
  },
  {
    id: 'manager',
    title: 'Manager',
    name: 'Store Manager',
    badge: '👔 Floor Operations',
    desc: 'Inventory explorer, transit shipments, staff & Pocket Khata',
    color: 'from-blue-500/20 to-indigo-600/10 border-blue-500/40 text-blue-300',
    ring: 'ring-blue-500/50 shadow-blue-500/20',
    pinHint: 'Default PIN: 5678'
  },
  {
    id: 'cashier',
    title: 'Cashier',
    name: 'Counter Staff',
    badge: '🛒 Counter Billing',
    desc: 'Speed billing, live sales receipting, exchange & hold desk',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40 text-emerald-300',
    ring: 'ring-emerald-500/50 shadow-emerald-500/20',
    pinHint: 'Instant 1-Tap Access'
  }
];

const LoginScreen = ({ onSetup }) => {
  const { login, activeStore, AVAILABLE_STORES } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState('owner');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [shake, setShake] = useState(false);

  const activeStoreObj = AVAILABLE_STORES.find(s => s.id === activeStore) || AVAILABLE_STORES[0];
  const roleConfig = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  // Physical keyboard support (0-9, Backspace, Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLoading) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setError('');
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setError('');
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (selectedRole === 'cashier' || pin.length >= 4) {
          executeLogin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedRole, isLoading]);

  // Auto-submit when 4 digits entered for owner/manager
  useEffect(() => {
    if (selectedRole !== 'cashier' && pin.length === 4) {
      executeLogin(pin);
    }
  }, [pin]);

  const handleKeyClick = (digit) => {
    if (pin.length < 6) {
      setError('');
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const executeLogin = async (pinToUse = pin) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await login(selectedRole, pinToUse, rememberDevice);
      if (!res.success) {
        setError(res.message || 'Incorrect PIN. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
      }
    } catch (e) {
      setError('Connection error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-hidden select-none font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-amber-600/10 blur-[130px] pointer-events-none" />

      {/* Top Header Branding */}
      <header className="w-full max-w-md mx-auto text-center z-10 pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md mb-3 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wide text-slate-300">
            {activeStoreObj?.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
            {activeStoreObj?.code}
          </span>
        </div>

        <div className="flex justify-center mb-2">
          <OrsLogo size={58} />
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>COBB STORE</span>
          <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white tracking-widest uppercase">
            CRM POS
          </span>
        </h1>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
          Secure Store Command & Telemetry
        </p>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-3">
        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl mb-4 shadow-xl">
          {ROLES.map((r) => {
            const isSelected = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRole(r.id);
                  setPin('');
                  setError('');
                }}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer relative active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-b ${r.color} shadow-lg ring-1 ${r.ring}`
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-xs sm:text-sm font-black truncate">{r.title}</div>
                <div className="text-[10px] opacity-75 truncate">{r.name.split(' ')[0]}</div>
              </button>
            );
          })}
        </div>

        {/* PIN Entry Box */}
        <div className={`bg-slate-900/80 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl relative transition-all duration-300 ${
          shake ? 'translate-x-2 border-red-500/60' : ''
        }`}>
          {/* User Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm bg-gradient-to-br ${roleConfig.color}`}>
                {roleConfig.id === 'owner' ? '👑' : roleConfig.id === 'manager' ? '👔' : '🛒'}
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-tight">{roleConfig.name}</h3>
                <span className="text-[11px] font-bold text-slate-400">{roleConfig.badge}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/5">
                {roleConfig.pinHint}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If Cashier: 1-Tap Access option */}
          {selectedRole === 'cashier' ? (
            <div className="py-4 space-y-4 text-center">
              <p className="text-xs text-slate-300 leading-relaxed px-4">
                Counter Staff access is ready. Tapping below opens instant Speed Billing, Live Bills, and Customer Desks.
              </p>
              <button
                type="button"
                onClick={() => executeLogin('0000')}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm tracking-wider uppercase shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Open Counter Desk</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* PIN Dots Display */}
              <div className="flex flex-col items-center justify-center py-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Enter 4-Digit Security PIN</span>
                </span>
                <div className="flex items-center gap-3">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                          isFilled
                            ? selectedRole === 'owner'
                              ? 'bg-amber-400 border-amber-300 scale-110 shadow-md shadow-amber-400/50'
                              : 'bg-blue-400 border-blue-300 scale-110 shadow-md shadow-blue-400/50'
                            : 'bg-white/5 border-white/20'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Responsive Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeyClick(String(digit))}
                    className="h-12 sm:h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/20 border border-white/[0.07] text-lg sm:text-xl font-black text-white transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer font-mono"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/10 border border-white/[0.05] text-xs font-bold text-slate-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer uppercase tracking-wider"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyClick('0')}
                  className="h-12 sm:h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/20 border border-white/[0.07] text-lg sm:text-xl font-black text-white transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer font-mono"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/10 border border-white/[0.05] text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {/* Remember Device Switch */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Remember session on this device</span>
            </label>

            <span className="text-[10px] text-slate-500 font-mono">
              Cloud Audit Active
            </span>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center z-10 pt-2 pb-1 text-slate-500 text-[11px] space-y-1">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Every Owner & Manager login is recorded with timestamp & device telemetry</span>
        </p>
        <div>
          <button
            type="button"
            onClick={onSetup}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            System Diagnostics & Setup Wizard
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LoginScreen;
