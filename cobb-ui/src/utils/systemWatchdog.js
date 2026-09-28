import { db, hasConfig, authPromise } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { playCheckoutChime, isNotificationGranted } from './checkoutNotifications';

/**
 * System Watchdog Service
 * Listens to POS cloud heartbeat and detects unexpected power cuts or PC shutdowns within 2 minutes.
 */
export function subscribeToSystemWatchdog(storeId = 'DEMO_STORE_001', onStatusUpdate, onPowerCutAlert) {
  if (!hasConfig || !db) return () => {};

  let currentData = {
    status: 'online',
    isOnline: true,
    lastSeenMillis: Date.now(),
    machineName: 'Store POS',
    lastBootTimeFormatted: 'Recently',
    lastShutdownTimeFormatted: 'None'
  };

  let hasDispatchedPowerCutAlert = false;
  let unsubscribeSnapshot = null;

  // 1. Listen to real-time updates from cloud_sync.js
  const docRef = doc(db, 'stores', storeId, 'data', 'system_status');
  unsubscribeSnapshot = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const lastSeen = data.lastSeenMillis || Date.now();
      const isStillFresh = Date.now() - lastSeen < 120000;
      const isOnline = data.status === 'online' && isStillFresh;

      currentData = {
        ...data,
        isOnline,
        lastSeenMillis: lastSeen
      };

      if (isOnline) {
        hasDispatchedPowerCutAlert = false;
      }

      if (typeof onStatusUpdate === 'function') {
        onStatusUpdate(currentData);
      }
    }
  }, (err) => {
    console.debug('[SystemWatchdog] Snapshot warning:', err.message);
  });

  // 2. 15-second heartbeat watchdog checking for power cuts
  const watchdogInterval = setInterval(() => {
    if (!currentData || !currentData.lastSeenMillis) return;
    const elapsed = Date.now() - currentData.lastSeenMillis;

    // If marked online but no heartbeat received for > 2 minutes (120s)
    if (currentData.status === 'online' && elapsed > 120000 && !hasDispatchedPowerCutAlert) {
      hasDispatchedPowerCutAlert = true;
      const mins = Math.floor(elapsed / 60000);

      const powerCutAlert = {
        billId: `power_cut_${Date.now()}`,
        type: 'system_status',
        status: 'unresponsive',
        title: '⚠️ Store POS Stopped Responding',
        body: `No heartbeat received for ${mins} minutes. Possible power cut, inverter trip, or sudden PC shutdown at Cobb Pundri.`,
        url: '/?tab=dashboard',
        isPowerCut: true,
        createdAt: Date.now()
      };

      // Play chime
      playCheckoutChime();

      // Vibrate if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([400, 200, 400]); } catch (e) {}
      }

      // Native browser notification
      if (isNotificationGranted() && typeof window !== 'undefined') {
        try {
          new Notification(powerCutAlert.title, {
            body: powerCutAlert.body,
            icon: '/ors-logo.png',
            badge: '/favicon.svg',
            tag: 'cobb-power-cut'
          });
        } catch (e) {}
      }

      if (typeof onPowerCutAlert === 'function') {
        onPowerCutAlert(powerCutAlert);
      }

      if (typeof onStatusUpdate === 'function') {
        onStatusUpdate({
          ...currentData,
          isOnline: false,
          status: 'unresponsive'
        });
      }
    }
  }, 15000);

  return () => {
    if (typeof unsubscribeSnapshot === 'function') unsubscribeSnapshot();
    clearInterval(watchdogInterval);
  };
}
