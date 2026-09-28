import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, RotateCcw } from 'lucide-react';

/**
 * RolePinModal
 * Secure gate for Owner and Manager role-switching.
 *
 * Props:
 *  targetRole       – 'owner' | 'manager'
 *  onSuccess        – called when PIN verified
 *  onCancel         – called on dismiss
 *  darkMode         – boolean
 *  verifyPin        – (role, pin) => boolean
 *  changePin        – (role, oldPin, newPin) => { success, message }
 *  rememberOwner    – boolean
 *  setRememberOwner – (v: boolean) => void
 */
const RolePinModal = ({
  targetRole,
  onSuccess,
  onCancel,
  darkMode = true,
  verifyPin,
  changePin,
  rememberOwner,
  setRememberOwner,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [mode, setMode] = useState('verify'); // 'verify' | 'change_old' | 'change_new' | 'change_confirm'
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRef = useRef(null);

  const roleConfig = {
    owner: {
      label: 'Owner',
      emoji: '👑',
      bg: 'from-amber-900/40 to-slate-900/90',
      border: 'border-amber-500/30',
      ring: 'ring-amber-500/40',
      btn: 'bg-amber-500 hover:bg-amber-400 text-black',
      text: 'text-amber-400',
      dotActive: 'bg-amber-400',
    },
    manager: {
      label: 'Manager',
      emoji: '👔',
      bg: 'from-blue-900/40 to-slate-900/90',
      border: 'border-blue-500/30',
      ring: 'ring-blue-500/40',
      btn: 'bg-blue-500 hover:bg-blue-400 text-white',
      text: 'text-blue-400',
      dotActive: 'bg-blue-400',
    },
  };

  const cfg = roleConfig[targetRole] || roleConfig.owner;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [mode]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ── VERIFY ──────────────────────────────────────────────
  const handleVerify = useCallback(() => {
    if (!pin) return;
    if (verifyPin(targetRole, pin)) {
      setError('');
      onSuccess();
    } else {
      setError('Incorrect PIN. Please try again.');
      triggerShake();
      setPin('');
    }
  }, [pin, targetRole, verifyPin, onSuccess]);

  // ── CHANGE FLOW ─────────────────────────────────────────
  const startChangeOld = () => {
    setPin(''); setOldPin(''); setNewPin(''); setError('');
    setMode('change_old');
  };

  const submitChangeOld = () => {
    if (!oldPin) return setError('Enter your current PIN first.');
    if (!verifyPin(targetRole, oldPin)) {
      setError('Current PIN is incorrect.');
      triggerShake();
      setOldPin('');
      return;
    }
    setError('');
    setPin('');
    setMode('change_new');
  };

  const submitChangeNew = () => {
    if (pin.length < 4) return setError('New PIN must be at least 4 characters.');
    setNewPin(pin);
    setPin('');
    setError('');
    setMode('change_confirm');
  };

  const submitChangeConfirm = () => {
    if (pin !== newPin) {
      setError('PINs do not match. Try again.');
      triggerShake();
      setPin('');
      return;
    }
    const result = changePin(targetRole, oldPin, pin);
    if (result.success) {
      setSuccessMsg(`${cfg.label} PIN changed successfully!`);
      setTimeout(() => {
        setSuccessMsg('');
        setOldPin(''); setNewPin(''); setPin('');
        setMode('verify');
      }, 1800);
    } else {
      setError(result.message || 'Failed to change PIN.');
      triggerShake();
    }
  };

  // ── ENTER KEY ────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (mode === 'verify')          handleVerify();
    else if (mode === 'change_old') submitChangeOld();
    else if (mode === 'change_new') submitChangeNew();
    else if (mode === 'change_confirm') submitChangeConfirm();
  };

  // ── PER-MODE CONFIG ──────────────────────────────────────
  const modeMap = {
    verify: {
      title: `Switch to ${cfg.label}`,
      subtitle: `Enter the ${cfg.label} PIN to continue`,
      placeholder: 'Enter PIN…',
      value: pin,
      setValue: setPin,
      action: handleVerify,
      actionLabel: 'Unlock',
      icon: <Lock className="w-4 h-4" />,
    },
    change_old: {
      title: 'Change PIN — Step 1',
      subtitle: `Enter your current ${cfg.label} PIN`,
      placeholder: 'Current PIN…',
      value: oldPin,
      setValue: setOldPin,
      action: submitChangeOld,
      actionLabel: 'Next →',
      icon: <KeyRound className="w-4 h-4" />,
    },
    change_new: {
      title: 'Change PIN — Step 2',
      subtitle: 'Enter your new PIN (min. 4 characters)',
      placeholder: 'New PIN…',
      value: pin,
      setValue: setPin,
      action: submitChangeNew,
      actionLabel: 'Next →',
      icon: <KeyRound className="w-4 h-4" />,
    },
    change_confirm: {
      title: 'Change PIN — Step 3',
      subtitle: 'Re-enter your new PIN to confirm',
      placeholder: 'Confirm new PIN…',
      value: pin,
      setValue: setPin,
      action: submitChangeConfirm,
      actionLabel: 'Save PIN ✓',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  };

  const m = modeMap[mode];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Card */}
      <div
        className={`
          relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl
          bg-gradient-to-br ${cfg.bg} ${cfg.border}
          backdrop-blur-2xl transition-all duration-200
          ${shake ? 'animate-[roleShake_0.45s_ease]' : ''}
        `}
        style={{ boxShadow: '0 0 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        {/* Dismiss */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8">
          {/* Role Badge */}
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border ${cfg.border} bg-black/30 shadow-xl`}>
              {successMsg ? '✅' : cfg.emoji}
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center text-xl font-black text-white mb-1 tracking-tight">
            {successMsg ? 'PIN Updated!' : m.title}
          </h2>
          <p className={`text-center text-xs font-medium mb-6 ${cfg.text}`}>
            {successMsg || m.subtitle}
          </p>

          {!successMsg && (
            <>
              {/* PIN input */}
              <div className="relative mb-3">
                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  value={m.value}
                  onChange={(e) => { setError(''); m.setValue(e.target.value); }}
                  onKeyDown={handleKeyDown}
                  placeholder={m.placeholder}
                  maxLength={32}
                  autoComplete="off"
                  className={`
                    w-full bg-black/30 border rounded-xl px-4 py-3 pr-10
                    text-white text-sm font-mono tracking-widest
                    placeholder-slate-600 focus:outline-none transition-all
                    ${error
                      ? 'border-rose-500/60 ring-1 ring-rose-500/40'
                      : `${cfg.border} focus:ring-1 ${cfg.ring}`
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error msg */}
              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs mb-3 px-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Remember me — Owner verify mode only */}
              {mode === 'verify' && targetRole === 'owner' && (
                <label className="flex items-center gap-2.5 mb-5 cursor-pointer group select-none">
                  <div
                    role="checkbox"
                    aria-checked={rememberOwner}
                    tabIndex={0}
                    onKeyDown={e => e.key === ' ' && setRememberOwner?.(!rememberOwner)}
                    onClick={() => setRememberOwner?.(!rememberOwner)}
                    className={`
                      w-4 h-4 rounded border flex items-center justify-center transition-all
                      ${rememberOwner
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-600 hover:border-amber-400/60'
                      }
                    `}
                  >
                    {rememberOwner && <CheckCircle2 className="w-3 h-3 text-black" />}
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                    Remember me on this device
                  </span>
                </label>
              )}
              {/* spacer when no remember-me */}
              {!(mode === 'verify' && targetRole === 'owner') && <div className="mb-2" />}

              {/* Primary action */}
              <button
                onClick={m.action}
                disabled={!m.value}
                className={`
                  w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all
                  shadow-lg active:scale-95 mb-3
                  disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  ${cfg.btn}
                `}
              >
                {m.icon}
                {m.actionLabel}
              </button>

              {/* Secondary: Change PIN / Back */}
              {mode === 'verify' ? (
                <button
                  onClick={startChangeOld}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Change {cfg.label} PIN
                </button>
              ) : (
                <button
                  onClick={() => { setMode('verify'); setPin(''); setOldPin(''); setNewPin(''); setError(''); }}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 flex items-center justify-center gap-1.5"
                >
                  ← Back to unlock
                </button>
              )}
            </>
          )}
        </div>

        {/* Step dots (change flow only) */}
        {mode !== 'verify' && (
          <div className="px-8 pb-6 flex justify-center gap-2">
            {['change_old', 'change_new', 'change_confirm'].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  mode === s ? `w-6 ${cfg.dotActive}` : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes roleShake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-9px); }
          30%      { transform: translateX(9px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

export default RolePinModal;
