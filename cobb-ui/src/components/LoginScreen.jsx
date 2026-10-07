import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, ShoppingBag, Delete, AlertCircle, Sparkles, Check, Lock, Fingerprint, Info, X } from 'lucide-react';
import OrsLogo from './OrsLogo';
import { getEnrolledPasskey, registerDeviceBiometrics, authenticateWithBiometrics } from '../utils/webauthn';

const ROLES = [
  {
    id: 'owner',
    title: 'Owner',
    name: 'Owner',
    badge: '👑 Executive HQ',
    desc: 'Full store access, financial telemetry & multi-store analytics',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300',
    ring: 'ring-amber-500/50 shadow-amber-500/20',
    hint: 'Requires Username & Password'
  },
  {
    id: 'manager',
    title: 'Manager',
    name: 'Store Manager',
    badge: '👔 Floor Operations',
    desc: 'Inventory explorer, transit shipments, staff & Pocket Khata',
    color: 'from-blue-500/20 to-indigo-600/10 border-blue-500/40 text-blue-300',
    ring: 'ring-blue-500/50 shadow-blue-500/20',
    hint: 'Requires Username & Password'
  },
  {
    id: 'cashier',
    title: 'Cashier',
    name: 'Counter Staff',
    badge: '🛒 Counter Billing',
    desc: 'Speed billing, live sales receipting, exchange & hold desk',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40 text-emerald-300',
    ring: 'ring-emerald-500/50 shadow-emerald-500/20',
    hint: 'Instant 1-Tap Access'
  }
];

const LoginScreen = ({ onSetup }) => {
  const { login, loginWithBiometrics, activeStore, AVAILABLE_STORES } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState('owner');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [enrolledPasskey, setEnrolledPasskey] = useState(null);
  const [showPasskeyInfoModal, setShowPasskeyInfoModal] = useState(false);
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqUsername, setReqUsername] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqRole, setReqRole] = useState('manager');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');
  const { requestAccount } = useAuth();

  useEffect(() => {
    setEnrolledPasskey(getEnrolledPasskey());
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setReqLoading(true);
    setReqError('');
    const res = await requestAccount({ username: reqUsername, password: reqPassword, name: reqName, role: reqRole });
    if (res.success) {
      setReqSuccess('Request sent successfully. Pending owner approval.');
      setTimeout(() => setShowRequestModal(false), 2000);
    } else {
      setReqError(res.message);
    }
    setReqLoading(false);
  };

  const activeStoreObj = AVAILABLE_STORES.find(s => s.id === activeStore) || AVAILABLE_STORES[0];
  const roleConfig = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setUsername('');
    setPassword('');
    setError('');
  };

  const executeLogin = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await login(selectedRole, username, password);
      if (!res.success) {
        setError(res.message || 'Incorrect credentials. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (e) {
      setError('Connection error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashierLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await login('cashier');
      if (!res.success) setError(res.message || 'Error logging in.');
    } catch (e) {
      setError('Connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      setError('Biometrics not supported on this device/browser.');
      return;
    }
    
    const enrolled = getEnrolledPasskey();

    // 1. If not enrolled on this phone yet
    if (!enrolled) {
      // If the user already filled in their username & password, auto-enroll & login!
      if (username && password) {
        setIsLoading(true);
        setError('');
        try {
          const res = await login(selectedRole, username, password);
          if (!res.success) {
            setError(res.message || 'Incorrect credentials to enroll biometrics.');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
          }

          // Prompt the device's fingerprint / passkey creation
          try {
            const newEnrolled = await registerDeviceBiometrics(res.user);
            setEnrolledPasskey(newEnrolled);
          } catch (regErr) {
            console.warn('Biometric enrollment skipped or cancelled:', regErr);
          }
          return;
        } catch (e) {
          setError('Biometric registration failed.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // No credentials typed yet: show helpful passkey modal instead of OS "No passkeys available" error
      setShowPasskeyInfoModal(true);
      return;
    }

    // 2. Passkey is enrolled: Authenticate with device sensor
    setIsLoading(true);
    setError('');
    try {
      await authenticateWithBiometrics();
      const res = await loginWithBiometrics(enrolled.username);
      if (!res.success) {
        setError(res.message || 'Biometric authentication failed.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError') {
        setError('Biometric verification cancelled.');
      } else {
        setError(e.message || 'Biometric login failed. Please use ID/Password.');
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
                onClick={() => handleRoleChange(r.id)}
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
                {roleConfig.hint}
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
                onClick={handleCashierLogin}
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
            <form onSubmit={executeLogin} className="space-y-4 py-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>Username (ID)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`Enter ${roleConfig.name} ID`}
                  autoComplete="username"
                  className="w-full h-12 sm:h-14 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] focus:border-blue-500/50 focus:bg-white/[0.06] text-white text-sm sm:text-base outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  className="w-full h-12 sm:h-14 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] focus:border-blue-500/50 focus:bg-white/[0.06] text-white text-sm sm:text-base outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="flex-1 h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-wider uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <span>Login securely</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                  title="Sign in with Face ID / Fingerprint"
                  className={`w-12 sm:w-14 h-12 sm:h-14 shrink-0 rounded-2xl border disabled:opacity-50 font-black flex items-center justify-center transition-all active:scale-95 cursor-pointer relative ${
                    enrolledPasskey
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-blue-400'
                  }`}
                >
                  <Fingerprint className="w-6 h-6" />
                  {enrolledPasskey && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                  )}
                </button>
              </div>

              {enrolledPasskey ? (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>1-Tap Face ID / Passkey active for {enrolledPasskey.name || enrolledPasskey.username}</span>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>Enter ID & Password + tap 🔒 to register Face ID / Fingerprint</span>
                </div>
              )}
            </form>
          )}

          {/* Cloud Audit */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-end">
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
        <div className="flex justify-center gap-4 mt-2">
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            Request New ID
          </button>
          <button
            type="button"
            onClick={onSetup}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            System Diagnostics
          </button>
        </div>
      </footer>

      {/* Setup Biometrics Info Modal */}
      {showPasskeyInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base">Setup 1-Tap Face ID & Biometrics</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasskeyInfoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p className="text-slate-200 font-medium">
                Your phone requires enrolling a passkey once on this device before Face ID or fingerprint sign-in can work.
              </p>

              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <p className="font-bold text-blue-400">⚡ How to enable in 5 seconds:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11.5px]">
                  <li>Enter your <span className="text-white font-bold">Username</span> & <span className="text-white font-bold">Password</span> on this screen.</li>
                  <li>Tap the <span className="text-white font-bold">Biometrics Button 🔒</span> instead of regular login.</li>
                  <li>Confirm with your phone's <span className="text-white font-bold">Face ID</span> or <span className="text-white font-bold">fingerprint scanner</span> to save the passkey!</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-400">
                Once saved, you can log in on this phone with a single tap using Face ID or fingerprint without re-entering passwords.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPasskeyInfoModal(false)}
              className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider"
            >
              Got it, Enter Credentials
            </button>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" /> Request New Account
            </h3>
            {reqError && <p className="text-red-400 text-xs mb-3">{reqError}</p>}
            {reqSuccess && <p className="text-emerald-400 text-xs mb-3 font-bold">{reqSuccess}</p>}
            
            <form onSubmit={handleRequestSubmit} className="space-y-3">
              <input type="text" placeholder="Full Name" required value={reqName} onChange={e => setReqName(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm outline-none" />
              <input type="text" placeholder="Desired Username (ID)" required value={reqUsername} onChange={e => setReqUsername(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm outline-none" />
              <input type="password" placeholder="Password" required value={reqPassword} onChange={e => setReqPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm outline-none" />
              <select value={reqRole} onChange={e => setReqRole(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-slate-800 border border-white/[0.07] text-white text-sm outline-none cursor-pointer">
                <option value="manager">Store Manager</option>
                <option value="owner">Owner</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={reqLoading} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex justify-center items-center">
                  {reqLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
