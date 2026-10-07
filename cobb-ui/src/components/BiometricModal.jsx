import React, { useState, useEffect } from 'react';
import { X, Fingerprint, CheckCircle2, AlertCircle, Trash2, Smartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getEnrolledPasskey,
  registerDeviceBiometrics,
  clearEnrolledPasskey,
  authenticateWithBiometrics,
  isBiometricAvailable
} from '../utils/webauthn';

export default function BiometricModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [enrolled, setEnrolled] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');
    setEnrolled(getEnrolledPasskey());

    isBiometricAvailable().then(avail => {
      setSupported(avail);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegister = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await registerDeviceBiometrics(user);
      setEnrolled(result);
      setSuccess(`Face ID / Fingerprint successfully registered for ${user.name || user.username}! You can now use 1-tap sign-in on this device.`);
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError') {
        setError('Biometric registration was cancelled.');
      } else {
        setError(e.message || 'Failed to register biometrics on this device.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authenticateWithBiometrics();
      setSuccess('Biometric test passed! Your Face ID / Fingerprint is verified and ready for 1-tap login.');
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError') {
        setError('Biometric test was cancelled.');
      } else {
        setError(e.message || 'Biometric verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    clearEnrolledPasskey();
    setEnrolled(null);
    setSuccess('Biometric passkey removed from this browser.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl p-6 bg-slate-900 border border-white/10 text-white shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Phone Biometrics / Passkey</h3>
              <p className="text-xs text-slate-400">1-Tap Face ID & Fingerprint Sign-in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Device status card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Current User:</span>
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                {user?.name || user?.username} ({user?.username})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Device Status:</span>
              {enrolled ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enrolled as {enrolled.name || enrolled.username}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Not Enrolled</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Platform Biometrics:</span>
              <span className={supported ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {supported ? 'Face ID / Fingerprint Available' : 'Hardware not detected'}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Why register this device?</span>
            </p>
            <p className="text-[11.5px] text-slate-400">
              When enrolled, you can sign in instantly using your phone's Face ID or Fingerprint scanner from the login screen. No need to type passwords repeatedly.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>{enrolled ? 'Re-register Face ID / Fingerprint' : 'Register Face ID / Fingerprint on This Phone'}</span>
                </>
              )}
            </button>

            {enrolled && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleTest}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Test Sensor</span>
                </button>
                <button
                  onClick={handleRemove}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Passkey</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
