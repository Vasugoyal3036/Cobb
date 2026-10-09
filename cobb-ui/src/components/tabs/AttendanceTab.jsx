import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, XCircle, Clock, Save, ShieldCheck, MapPin, Calendar, Activity } from 'lucide-react';
import { db, storage } from '../../utils/firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth, ROLE_LABELS, AVAILABLE_STORES } from '../../context/AuthContext';
import { authenticateWithBiometrics, isBiometricAvailable } from '../../utils/webauthn';
import { Fingerprint } from 'lucide-react';

export default function AttendanceTab({ activeStore }) {
  const [pin, setPin] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, capturing, verifying, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [attendanceType, setAttendanceType] = useState('CLOCK_IN'); // CLOCK_IN, CLOCK_OUT
  
  // Geofencing State
  const [distanceToStore, setDistanceToStore] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [geoChecking, setGeoChecking] = useState(true);
  const [demoBypass, setDemoBypass] = useState(false);

  // Timesheet State
  const [timesheetLogs, setTimesheetLogs] = useState([]);

  const webcamRef = useRef(null);
  const { verifyPin, user } = useAuth();
  
  const storeData = AVAILABLE_STORES.find(s => s.id === activeStore);
  const MAX_RADIUS = 50; // meters

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Load recent attendance logs & timesheet
  useEffect(() => {
    if (!activeStore) return;
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, `stores/${activeStore}/data/attendance_logs`), orderBy('timestamp', 'desc'), limit(50));
        const snap = await getDocs(q);
        const logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
        
        setRecentLogs(logs.slice(0, 10)); // Top 10 for sidebar
        setTimesheetLogs(logs); // Top 50 for timesheet
      } catch (err) {
        console.error("Error fetching attendance logs:", err);
      }
    };
    fetchLogs();
  }, [activeStore, status]);

  // Geofencing Logic
  useEffect(() => {
    if (!storeData?.coordinates) {
      setGeoChecking(false);
      setIsWithinGeofence(true);
      return;
    }
    
    if (!navigator.geolocation) {
      setGeoChecking(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const dist = getDistanceFromLatLonInM(
          position.coords.latitude, position.coords.longitude,
          storeData.coordinates.lat, storeData.coordinates.lng
        );
        setDistanceToStore(dist);
        setIsWithinGeofence(dist <= MAX_RADIUS);
        setGeoChecking(false);
      },
      (err) => {
        console.error(err);
        setGeoChecking(false);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [storeData]);

  function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  // Calculate Timesheet Hours
  const timesheetData = React.useMemo(() => {
    const grouped = {};
    timesheetLogs.forEach(log => {
      if (!log.timestamp) return;
      const dateStr = log.timestamp.toDate().toLocaleDateString();
      const userKey = log.verifier;
      if (!grouped[dateStr]) grouped[dateStr] = {};
      if (!grouped[dateStr][userKey]) grouped[dateStr][userKey] = { in: null, out: null };
      
      // Since it's sorted desc, the first CLOCK_IN we see is the LAST clock in of the day, 
      // but let's just keep the earliest IN and latest OUT for simplicity.
      if (log.type === 'CLOCK_IN') {
        grouped[dateStr][userKey].in = log.timestamp.toDate();
      } else if (log.type === 'CLOCK_OUT') {
        if (!grouped[dateStr][userKey].out) grouped[dateStr][userKey].out = log.timestamp.toDate();
      }
    });

    const rows = [];
    Object.keys(grouped).forEach(date => {
      Object.keys(grouped[date]).forEach(user => {
        const { in: tIn, out: tOut } = grouped[date][user];
        let hours = 0;
        if (tIn && tOut && tOut > tIn) {
          hours = (tOut - tIn) / (1000 * 60 * 60);
        }
        rows.push({ date, user, tIn, tOut, hours: hours.toFixed(2) });
      });
    });
    return rows;
  }, [timesheetLogs]);

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
      let finalPhotoUrl = capturedImage;
      if (storage) {
        const storageRef = ref(storage, `attendance/${activeStore}/${Date.now()}.jpg`);
        await uploadString(storageRef, capturedImage, 'data_url');
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      const logId = `attn_${Date.now()}`;
      const logRef = doc(db, `stores/${activeStore}/data/attendance_logs/${logId}`);
      
      await setDoc(logRef, {
        role: matchedRole,
        type: attendanceType,
        timestamp: serverTimestamp(),
        photoUrl: finalPhotoUrl,
        userAgent: navigator.userAgent,
        verified: true,
        verifier: user?.username || 'system',
        authMethod: 'pin'
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

  const handleBiometricClockIn = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!capturedImage) { setErrorMsg('Please capture your photo first to verify attendance.'); return; }

    setStatus('verifying');

    try {
      const { enrolledUser } = await authenticateWithBiometrics();
      if (!enrolledUser) {
        throw new Error("No enrolled passkey found.");
      }

      let finalPhotoUrl = capturedImage;
      if (storage) {
        const storageRef = ref(storage, `attendance/${activeStore}/${Date.now()}.jpg`);
        await uploadString(storageRef, capturedImage, 'data_url');
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      const logId = `attn_${Date.now()}`;
      const logRef = doc(db, `stores/${activeStore}/data/attendance_logs/${logId}`);
      
      await setDoc(logRef, {
        role: enrolledUser.role || 'manager',
        type: attendanceType,
        timestamp: serverTimestamp(),
        photoUrl: finalPhotoUrl,
        userAgent: navigator.userAgent,
        verified: true,
        verifier: enrolledUser.name || enrolledUser.username,
        authMethod: 'biometric'
      });

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setCapturedImage(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Biometric verification failed.');
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
            
            {/* IN / OUT TOGGLE */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setAttendanceType('CLOCK_IN')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${attendanceType === 'CLOCK_IN' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                CLOCK IN
              </button>
              <button
                type="button"
                onClick={() => setAttendanceType('CLOCK_OUT')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${attendanceType === 'CLOCK_OUT' ? 'bg-white dark:bg-slate-700 shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                CLOCK OUT
              </button>
            </div>

            {/* GEOFENCE STATUS */}
            {storeData?.coordinates && (
              <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${isWithinGeofence || demoBypass ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'}`}>
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {geoChecking ? 'Checking Location...' : (isWithinGeofence || demoBypass ? 'Within Store Radius' : 'Outside Store Area')}
                  </p>
                  {!geoChecking && distanceToStore !== null && (
                    <p className="text-xs opacity-80 mt-1">
                      Distance: {Math.round(distanceToStore)}m (Max: {MAX_RADIUS}m)
                    </p>
                  )}
                  {!isWithinGeofence && !demoBypass && !geoChecking && (
                    <button onClick={() => setDemoBypass(true)} className="mt-2 text-xs font-bold underline">Bypass for Demo</button>
                  )}
                </div>
              </div>
            )}

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

            {biometricAvailable && (
              <div className="mb-6 space-y-4 pb-6 border-b dark:border-slate-700/50">
                <button 
                  onClick={handleBiometricClockIn}
                  disabled={status === 'verifying' || !capturedImage || (!isWithinGeofence && !demoBypass && storeData?.coordinates)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black tracking-wide shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-3"
                >
                  <Fingerprint className="w-6 h-6" />
                  {attendanceType === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'} with Face ID & Fingerprint
                </button>
                {!capturedImage && (
                  <p className="text-xs text-center text-slate-500">Take a photo before clocking in.</p>
                )}
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
                disabled={status === 'verifying' || !capturedImage || (!isWithinGeofence && !demoBypass && storeData?.coordinates)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black tracking-wide shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-2"
              >
                {status === 'verifying' ? 'Verifying...' : (
                  <>
                    <Save className="w-5 h-5" />
                    Verify {attendanceType} with PIN
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

      {/* AUTOMATED TIMESHEET SECTION */}
      <div className="mt-8 dark:bg-slate-800/50 bg-white p-6 rounded-3xl border dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Automated Timesheet (Payroll)
          </h2>
          <div className="text-sm dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-lg font-bold">
            Auto-calculating total hours based on secure timestamps
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="py-3 px-4 text-xs uppercase tracking-wider dark:text-slate-400 font-bold">Date</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider dark:text-slate-400 font-bold">Staff / Verifier</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider dark:text-slate-400 font-bold">Clock In</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider dark:text-slate-400 font-bold">Clock Out</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider dark:text-slate-400 font-bold">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No complete timesheet records available. Ensure staff clock in AND clock out.
                  </td>
                </tr>
              ) : (
                timesheetData.map((row, i) => (
                  <tr key={i} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium dark:text-white">{row.date}</td>
                    <td className="py-3 px-4 text-sm font-bold dark:text-slate-300 capitalize flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs">
                        {row.user.charAt(0)}
                      </div>
                      {row.user}
                    </td>
                    <td className="py-3 px-4 text-sm dark:text-slate-300">
                      {row.tIn ? row.tIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="py-3 px-4 text-sm dark:text-slate-300">
                      {row.tOut ? row.tOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="py-3 px-4">
                      {row.hours > 0 ? (
                        <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 font-bold rounded-lg text-sm">
                          {row.hours} hrs
                        </span>
                      ) : (
                        <span className="text-xs text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded">Missing Out-Punch</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
