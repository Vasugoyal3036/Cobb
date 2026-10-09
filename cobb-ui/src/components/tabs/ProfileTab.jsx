import React, { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { THEMES } from '../DashboardBackground';
import { 
  User, Shield, Moon, Sun, Bell, Fingerprint, 
  Palette, LogOut, ChevronRight, Key, Smartphone, 
  Monitor, BellRing, Volume2, ShieldCheck, History
} from 'lucide-react';
import BiometricModal from '../BiometricModal';
import LoginAuditModal from '../LoginAuditModal';

const SectionHeader = ({ icon: Icon, title, description, darkMode }) => (
  <div className="mb-4">
    <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      <Icon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      {title}
    </h3>
    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
      {description}
    </p>
  </div>
);

export default function ProfileTab({ 
  darkMode, 
  setDarkMode, 
  dashTheme, 
  setDashTheme,
  notificationsEnabled,
  onEnableNotifications,
  playCheckoutChime
}) {
  const { user, role, logout, activeStore } = useAuth();
  
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);


  return (
    <div className={`max-w-4xl mx-auto py-8 px-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* Header Profile Card */}
      <div className={`relative overflow-hidden rounded-3xl p-8 mb-8 flex items-center gap-6 shadow-xl ${
        darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10' : 'bg-gradient-to-br from-white to-slate-50 border border-slate-200'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white/10">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl font-black mb-1">{user?.username || 'Guest User'}</h1>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              role === 'owner' ? 'bg-purple-500/20 text-purple-400' : 
              role === 'manager' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {ROLE_LABELS[role] || role}
            </span>
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Branch: {activeStore || 'None'}
            </span>
          </div>
        </div>

        <button 
          onClick={logout}
          className={`relative z-10 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            darkMode 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          }`}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Appearance & Themes */}
        <div className={`p-6 rounded-3xl shadow-lg border ${
          darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <SectionHeader icon={Palette} title="Appearance" description="Customize your workspace UI and colors." darkMode={darkMode} />
          
          <div className="space-y-4 mt-6">
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-white shadow'}`}>
                  {darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <p className="font-bold">Dark Mode</p>
                  <p className="text-xs opacity-70">Toggle application dark theme</p>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {darkMode && (
              <div className="space-y-3">
                <p className="text-sm font-semibold pl-1">Dashboard Accent Theme</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setDashTheme(t.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        dashTheme === t.key 
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                          : darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full shrink-0 shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${t.color}, ${t.accent})` }}
                      />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access */}
        <div className={`p-6 rounded-3xl shadow-lg border ${
          darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <SectionHeader icon={Shield} title="Security & Access" description="Manage passkeys, biometrics, and sessions." darkMode={darkMode} />
          
          <div className="space-y-3 mt-6">
            <button 
              onClick={() => setShowBiometricModal(true)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-slate-800/50 border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5' : 'bg-slate-50 border-slate-200 hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Fingerprint className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold">Phone Biometrics</p>
                  <p className="text-xs opacity-70">Login instantly with Face ID / Fingerprint</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>

            <button 
              onClick={() => setShowAuditLog(true)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-slate-800/50 border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5' : 'bg-slate-50 border-slate-200 hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <History className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-bold">Login Audit Log</p>
                  <p className="text-xs opacity-70">View recent sign-ins and session details</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
            
            <button className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all opacity-60 cursor-not-allowed ${
              darkMode ? 'bg-slate-800/30 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <Key className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-bold">Change Password / PIN</p>
                  <p className="text-xs">Contact admin to reset credentials</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* System & Notifications */}
        <div className={`md:col-span-2 p-6 rounded-3xl shadow-lg border ${
          darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <SectionHeader icon={Monitor} title="System & Notifications" description="Configure alerts, sounds, and push notifications." darkMode={darkMode} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BellRing className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold">Push Notifications</p>
                  <p className="text-xs opacity-70">Receive alerts when app is closed</p>
                </div>
              </div>
              <button 
                onClick={onEnableNotifications}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  notificationsEnabled 
                    ? 'bg-emerald-500/20 text-emerald-500 cursor-default' 
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/20'
                }`}
              >
                {notificationsEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Volume2 className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold">Checkout Chime</p>
                  <p className="text-xs opacity-70">Play sound on successful billing</p>
                </div>
              </div>
              <button 
                onClick={playCheckoutChime}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30`}
              >
                Test Sound
              </button>
            </div>
          </div>
        </div>

      </div>

      {showBiometricModal && <BiometricModal onClose={() => setShowBiometricModal(false)} darkMode={darkMode} />}
      {showAuditLog && <LoginAuditModal onClose={() => setShowAuditLog(false)} darkMode={darkMode} />}
    </div>
  );
}
