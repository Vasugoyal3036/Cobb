import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db, hasConfig } from './firebase';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Accurately parses userAgent and client capabilities to describe the login device
 */
export function getDeviceDetails() {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Server / Node',
      os: 'Unknown',
      browser: 'Unknown',
      displayMode: 'Server'
    };
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  
  // 1. Detect OS & Platform
  let os = 'Unknown OS';
  if (/iphone/.test(ua)) os = 'iOS (iPhone)';
  else if (/ipad/.test(ua)) os = 'iPadOS (iPad)';
  else if (/android/.test(ua)) os = 'Android';
  else if (/windows nt 10\.0/.test(ua)) os = 'Windows 10/11';
  else if (/windows/.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/.test(ua)) os = 'macOS';
  else if (/linux/.test(ua)) os = 'Linux';

  // 2. Detect Device Form Factor
  let deviceType = 'Desktop PC';
  const isMobile = /mobile|android|iphone|ipod/.test(ua) || window.innerWidth < 768;
  const isTablet = /ipad|tablet/.test(ua) || (window.innerWidth >= 768 && window.innerWidth <= 1024);

  if (isTablet) {
    deviceType = `${os} Tablet`;
  } else if (isMobile) {
    deviceType = `${os} Phone`;
  } else {
    deviceType = `${os} Workstation`;
  }

  // 3. Detect Browser
  let browser = 'Web Browser';
  if (/edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = 'Chrome';
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = 'Safari';
  else if (/firefox\//.test(ua)) browser = 'Firefox';
  else if (/samsungbrowser\//.test(ua)) browser = 'Samsung Internet';

  // 4. Detect Display Mode (PWA vs Browser Tab)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const displayMode = isPWA ? 'Home Screen App (PWA)' : 'Web Browser Tab';

  return {
    os,
    deviceType,
    browser,
    displayMode,
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`
  };
}

/**
 * Logs an authentication event (Login Success, Login Failure, Lock/Logout)
 * Directly saves to Cloud Firestore (stores/{storeId}/login_logs) and local server audit
 */
export async function logAuthEvent({
  role = 'owner',
  userName = 'Staff',
  storeId = 'DEMO_STORE_001',
  action = 'LOGIN_SUCCESS',
  status = 'success',
  reason = null,
  method = 'PIN'
}) {
  const device = getDeviceDetails();
  const timestamp = new Date().toISOString();

  const auditEntry = {
    role,
    userName,
    storeId,
    action,
    status,
    reason: reason || null,
    method,
    deviceType: device.deviceType,
    os: device.os,
    browser: device.browser,
    displayMode: device.displayMode,
    screen: device.screen,
    timestamp
  };

  // 1. Save to Cloud Firestore
  if (hasConfig && db) {
    try {
      const logsRef = collection(db, 'stores', storeId, 'login_logs');
      await addDoc(logsRef, {
        ...auditEntry,
        createdAt: serverTimestamp()
      });

      // Also create an instant notification alert if owner or manager logs in
      if (status === 'success' && (role === 'owner' || role === 'manager')) {
        const notifRef = collection(db, 'stores', storeId, 'checkout_notifications');
        const roleIcon = role === 'owner' ? '👑' : '👔';
        await addDoc(notifRef, {
          title: `${roleIcon} ${userName} Signed In`,
          body: `Accessed Cobb CRM from ${device.deviceType} (${device.browser})`,
          type: 'auth_access',
          role,
          createdAt: serverTimestamp()
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[AuditLogger] Firestore cloud log error:', err.message);
    }
  }

  // 2. Also save to local backend if running
  try {
    axios.post(`${API_BASE}/api/auth/login-audit`, auditEntry, { timeout: 3000 }).catch(() => {});
  } catch (e) {
    // Silent local fail
  }

  return auditEntry;
}

/**
 * Real-time listener for login logs of a store
 */
export function subscribeLoginLogs(storeId, onUpdate) {
  if (!hasConfig || !db) {
    // Fallback to local API
    axios.get(`${API_BASE}/api/auth/login-audit`)
      .then(res => onUpdate(res.data?.logs || []))
      .catch(() => onUpdate([]));
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'stores', storeId, 'login_logs'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onUpdate(logs);
    }, (err) => {
      console.warn('[AuditLogger] Fallback query without index:', err.message);
      // Fallback without server orderBy if index pending
      getDocs(collection(db, 'stores', storeId, 'login_logs'))
        .then(snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          onUpdate(list.slice(0, 60));
        })
        .catch(() => onUpdate([]));
    });
  } catch (err) {
    console.error('[AuditLogger] Error subscribing to login logs:', err);
    return () => {};
  }
}
