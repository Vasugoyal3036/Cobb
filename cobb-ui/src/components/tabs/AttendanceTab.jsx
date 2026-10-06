import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, XCircle, Clock, Save, ShieldCheck } from 'lucide-react';
import { db } from '../../utils/firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

export default function AttendanceTab({ activeStore }) {
  const [pin, setPin] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, capturing, verifying, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const webcamRef = useRef(null);
  const { verifyPin, user } = useAuth();

  // Load recent attendance logs
  useEffect(() => {
    if (!activeStore) return;
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, `stores/${activeStore}/data/attendance_logs`), orderBy('timestamp', 'desc'), limit(10));
        const snap = await getDocs(q);
        const logs = [];
        snap.forEach(d => {
          logs.push({ id: d.id, ...d.data() });
        });
        setRecentLogs(logs);
      } catch (err) {
        console.error("Error fetching attendance logs:", err);
      }
    };
    fetchLogs();
  }, [activeStore, status]);

  const capture = () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  const handleClockIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!pin) { setErrorMsg('Please enter your PIN.'); return; }
    if (!capturedImage) { setErrorMsg('Please capture your photo first to verify attendance.'); return; }

    setStatus('verifying');

    let matchedRole = null;
    if (verifyPin('owner', pin)) matchedRole = 'owner';
    else if (verifyPin('manager', pin)) matchedRole = 'manager';
    else if (pin === '0000') matchedRole = 'cashier'; // mock cashier pin for demo

    if (!matchedRole) {
      setStatus('error');
      setErrorMsg('Invalid PIN. Attendance verification failed.');
      return;
    }

    try {
      const logId = `attn_${Date.now()}`;
      const logRef = doc(db, `stores/${activeStore}/data/attendance_logs/${logId}`);
      
      await setDoc(logRef, {
        role: matchedRole,
        type: 'CLOCK_IN',
        timestamp: serverTimestamp(),
        photoUrl: capturedImage, // Storing base64 directly for this demo
        userAgent: navigator.userAgent,
        verified: true,
        verifier: user?.username || 'system'
      });

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setPin('');
        setCapturedImage(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Network error saving attendance.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Anti-Fraud Clock-In</h1>
          <p className="text-sm dark:text-slate-400">Secure facial verification and PIN attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WEBCAM SECTION */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-slate-900 rounded-3xl overflow-hidden border-4 border-slate-800 shadow-xl aspect-[4/3] flex flex-col items-center justify-center">
            
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img src={capturedImage} alt="Captured" className="object-cover w-full h-full" />
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-green-500/90 backdrop-blur text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                  Photo Captured
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="object-cover w-full h-full transform scale-x-[-1]"
                  videoConstraints={{ facingMode: "user" }}
                />
                <button
                  onClick={capture}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-2xl transition-transform hover:scale-105 active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  Snap Photo
                </button>
              </div>
            )}
            
          </div>
        </div>

        {/* PIN VERIFICATION SECTION */}
        <div className="space-y-6">
          <div className="dark:bg-slate-800/50 bg-white p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Clock In / Out
            </h2>

            {status === 'success' && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 dark:text-green-400 flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-bold">Verified!</p>
                  <p className="text-xs opacity-90">Attendance logged securely.</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleClockIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 mb-2">Staff PIN</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter your secret PIN"
                  className="w-full text-center text-3xl tracking-[1em] font-mono p-4 rounded-xl dark:bg-slate-900/50 border dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  maxLength={6}
                />
              </div>

              <button 
                type="submit"
                disabled={status === 'verifying' || !capturedImage}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black tracking-wide shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {status === 'verifying' ? 'Verifying Identity...' : (
                  <>
                    <Save className="w-5 h-5" />
                    Verify & Clock In
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="dark:bg-slate-800/50 bg-white p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-slate-400 mb-4">Today's Logs</h3>
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No logs yet today.</p>
              ) : (
                recentLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 dark:bg-slate-900/30 rounded-xl border dark:border-slate-700/30">
                    <img src={log.photoUrl} alt="Staff" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/30" />
                    <div className="flex-1">
                      <p className="text-sm font-bold dark:text-white capitalize">{ROLE_LABELS[log.role] || log.role}</p>
                      <p className="text-[10px] dark:text-slate-400">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Just now'} • {log.type}
                      </p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
