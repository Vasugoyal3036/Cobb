import { db, hasConfig, authPromise } from './firebase';
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Synthesize a pleasant two-tone cash register chime using Web Audio API
export const playCheckoutChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: 880 Hz (A5 - High bell chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    // Graceful fallback if audio is autoplay-restricted
    console.debug('[CheckoutAlert] Audio chime skipped:', err);
  }
};

// Check if browser notifications are currently granted
export const isNotificationGranted = () => {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
};

// Request notification permission and register FCM device token
export const registerForPushNotifications = async (storeId = 'DEMO_STORE_001') => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, reason: 'Notifications not supported in this browser' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'Notification permission denied by user' };
    }

    localStorage.setItem('cobb_checkout_notifications_enabled', 'true');

    // Register Service Worker if not registered
    let swReg = null;
    if ('serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.ready.catch(() => null);
      if (!swReg) {
        swReg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
      }
    }

    // Attempt Firebase Cloud Messaging registration if configured
    if (hasConfig && db) {
      try {
        if (authPromise) await authPromise;

        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
        const supported = await isSupported().catch(() => false);

        if (supported) {
          const { app } = await import('./firebase');
          const messaging = getMessaging(app);

          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
          const token = await getToken(messaging, {
            serviceWorkerRegistration: swReg || undefined,
            vapidKey: vapidKey
          }).catch((err) => {
            console.warn('[CheckoutAlert] FCM getToken notice:', err.message);
            return null;
          });

          if (token) {
            // Sanitize token for doc id
            const tokenDocId = token.replace(/[^a-zA-Z0-9_-]/g, '').slice(-40) || 'device_' + Date.now();
            const tokenRef = doc(db, 'stores', storeId, 'fcm_tokens', tokenDocId);
            await setDoc(tokenRef, {
              token,
              platform: navigator.platform || 'web',
              userAgent: navigator.userAgent || 'unknown',
              enabledAt: serverTimestamp(),
              lastActive: serverTimestamp()
            }, { merge: true });

            console.log('[CheckoutAlert] 📲 FCM Device Token registered in Firestore successfully.');
            return { success: true, permission, token };
          }
        }
      } catch (fcmErr) {
        console.warn('[CheckoutAlert] FCM push token setup fallback to web notifications:', fcmErr.message);
      }
    }

    // Play confirmation chime
    playCheckoutChime();

    return { success: true, permission };
  } catch (error) {
    console.error('[CheckoutAlert] Registration error:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listener for new checkouts via Firestore
export const subscribeToCheckoutNotifications = (storeId = 'DEMO_STORE_001', onNewSaleCallback) => {
  if (!hasConfig || !db) return () => {};

  let initialLoadDone = false;
  const processedNotificationIds = new Set();

  const notifRef = collection(db, 'stores', storeId, 'checkout_notifications');
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(5));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!initialLoadDone) {
      // First snapshot seeds existing notifications so we don't trigger alert for old checkouts
      snapshot.forEach((doc) => {
        processedNotificationIds.add(doc.id);
      });
      initialLoadDone = true;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const notifDoc = change.doc;
        const notifId = notifDoc.id;

        if (!processedNotificationIds.has(notifId)) {
          processedNotificationIds.add(notifId);
          const data = notifDoc.data();

          // 1. Play Cash Register Chime
          playCheckoutChime();

          // 2. Vibrate phone if supported
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 100, 200]);
            } catch (e) {}
          }

          // 3. Trigger Browser Web Notification if permitted and page is hidden / background
          if (isNotificationGranted() && typeof window !== 'undefined') {
            try {
              const sysNotif = new Notification(data.title || '🧾 New Sale Recorded', {
                body: data.body || 'A new checkout has been processed.',
                icon: '/ors-logo.png',
                badge: '/favicon.svg',
                tag: `cobb-sale-${data.billNumber || notifId}`
              });

              sysNotif.onclick = () => {
                window.focus();
                if (typeof onNewSaleCallback === 'function') {
                  onNewSaleCallback(data, true);
                }
              };
            } catch (notifErr) {
              console.debug('[CheckoutAlert] System notification trigger fallback:', notifErr);
            }
          }

          // 4. Send to in-app banner handler
          if (typeof onNewSaleCallback === 'function') {
            onNewSaleCallback(data, false);
          }
        }
      }
    });
  }, (err) => {
    console.warn('[CheckoutAlert] Firestore notification listener warning:', err.message);
  });

  return unsubscribe;
};

// Trigger a test checkout alert with chime sound, Firestore push, and device banner
export const triggerTestCheckoutNotification = async (storeId = 'DEMO_STORE_001') => {
  const testBillNo = 'TEST-' + Math.floor(1000 + Math.random() * 9000);
  const testAmounts = [1499, 2499, 3999, 4999, 6999];
  const testAmount = testAmounts[Math.floor(Math.random() * testAmounts.length)];
  const staffList = ['Vikas', 'Simran', 'Rahul', 'Pooja'];
  const staff = staffList[Math.floor(Math.random() * staffList.length)];
  const payModes = ['UPI', 'Cash', 'Card'];
  const pay = payModes[Math.floor(Math.random() * payModes.length)];

  const title = `🧾 Test Sale Alert: ₹${testAmount.toLocaleString('en-IN')} | Bill #${testBillNo}`;
  const body = `Items: 2 • Pay: ${pay} • Staff: ${staff} • Cust: Parbhat Goyal`;

  const payload = {
    billId: testBillNo,
    billNumber: testBillNo,
    amount: testAmount,
    qty: 2,
    paymentMode: pay,
    salesperson: staff,
    customer: 'Parbhat Goyal (Test)',
    title,
    body,
    url: '/?tab=livebills',
    isTest: true,
    createdAt: Date.now()
  };

  // 1. Play Cash Register Chime immediately
  playCheckoutChime();

  // 2. Vibrate phone if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  // 3. Write to Firestore so all connected phones / devices trigger simultaneously
  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', testBillNo);
      await setDoc(notifRef, {
        ...payload,
        timestamp: serverTimestamp()
      });
      console.log('[CheckoutAlert] 🧪 Test sale alert written to Firestore:', testBillNo);
    } catch (e) {
      console.warn('[CheckoutAlert] Firestore test push notice:', e.message);
    }
  }

  // 4. Trigger Web Notification on this device
  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, {
        body,
        icon: '/ors-logo.png',
        badge: '/favicon.svg',
        tag: `cobb-sale-${testBillNo}`
      });
      sysNotif.onclick = () => {
        window.focus();
      };
    } catch (e) {}
  }

  return payload;
};

// Trigger a test System ON or System OFF alert
export const triggerTestSystemStatusAlert = async (status = 'online', storeId = 'DEMO_STORE_001') => {
  const isOnline = status === 'online';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const title = isOnline 
    ? `🟢 Test: Store System Online | ${timeStr}`
    : `🔴 Test: Store System Turned OFF | ${timeStr}`;
  const body = isOnline
    ? `Cobb Pundri POS booted up on ${dateStr} at ${timeStr}. Store system is now active.`
    : `Cobb Pundri POS shut down on ${dateStr} at ${timeStr} (Clean Shutdown). Store system is now closed.`;

  const payload = {
    billId: `test_sys_${status}_${Date.now()}`,
    type: 'system_status',
    status,
    title,
    body,
    url: '/?tab=dashboard',
    isTest: true,
    createdAt: Date.now()
  };

  playCheckoutChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([250, 100, 250]); } catch (e) {}
  }

  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', payload.billId);
      await setDoc(notifRef, {
        ...payload,
        timestamp: serverTimestamp()
      });

      // Update system_status doc so header pill updates immediately
      const sysRef = doc(db, 'stores', storeId, 'data', 'system_status');
      await setDoc(sysRef, {
        status,
        isOnline,
        lastHeartbeat: serverTimestamp(),
        lastSeenMillis: Date.now(),
        [isOnline ? 'lastBootTimeFormatted' : 'lastShutdownTimeFormatted']: `${dateStr}, ${timeStr}`
      }, { merge: true });

      console.log(`[CheckoutAlert] 🧪 Test system ${status} alert written to Firestore.`);
    } catch (e) {
      console.warn('[CheckoutAlert] Firestore test system alert warning:', e.message);
    }
  }

  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, {
        body,
        icon: '/ors-logo.png',
        badge: '/favicon.svg',
        tag: 'cobb-system-status'
      });
      sysNotif.onclick = () => {
        window.focus();
      };
    } catch (e) {}
  }

  return payload;
};

// 1. Trigger Test VIP Mega Sale Alert (e.g. ₹18,500)
export const triggerTestBigTicketAlert = async (storeId = 'DEMO_STORE_001') => {
  const testBillNo = `TEST-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = 18500;
  const title = `💎 VIP MEGA SALE: ₹${amount.toLocaleString('en-IN')} | Bill #${testBillNo}`;
  const body = `🎉 Staff: Rohit closed a massive ₹${amount.toLocaleString('en-IN')} ticket (6 items) for Asham Sohi! Pay: UPI`;

  const payload = {
    billId: testBillNo,
    billNumber: testBillNo,
    type: 'big_ticket_sale',
    amount,
    grossAmount: 22000,
    discountAmount: 3500,
    discountPercent: 16,
    qty: 6,
    paymentMode: 'UPI',
    salesperson: 'Rohit',
    customer: 'Asham Sohi',
    title,
    body,
    url: '/?tab=livebills',
    isTest: true,
    createdAt: Date.now()
  };

  playCheckoutChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([300, 100, 300]); } catch (e) {}
  }

  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', testBillNo);
      await setDoc(notifRef, { ...payload, timestamp: serverTimestamp() });
    } catch (e) {}
  }

  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, { body, icon: '/ors-logo.png', badge: '/favicon.svg', tag: `cobb-vip-${testBillNo}` });
      sysNotif.onclick = () => window.focus();
    } catch (e) {}
  }

  return payload;
};

// 2. Trigger Test Heavy Discount Warning Alert (e.g. 45% OFF)
export const triggerTestHeavyDiscountAlert = async (storeId = 'DEMO_STORE_001') => {
  const testBillNo = `TEST-DISC-${Math.floor(1000 + Math.random() * 9000)}`;
  const netAmount = 4400;
  const grossAmount = 8000;
  const discountAmount = 3600;
  const discountPct = 45;
  const title = `⚠️ HEAVY DISCOUNT (${discountPct}% OFF) | Bill #${testBillNo}`;
  const body = `⚠️ Staff: Sahil gave ₹${discountAmount.toLocaleString('en-IN')} (${discountPct}%) discount on ₹${grossAmount.toLocaleString('en-IN')} bill for Walk-in! Net: ₹${netAmount.toLocaleString('en-IN')}`;

  const payload = {
    billId: testBillNo,
    billNumber: testBillNo,
    type: 'heavy_discount',
    amount: netAmount,
    grossAmount,
    discountAmount,
    discountPercent: discountPct,
    qty: 3,
    paymentMode: 'Cash',
    salesperson: 'Sahil',
    customer: 'Walk-in',
    title,
    body,
    url: '/?tab=livebills',
    isTest: true,
    createdAt: Date.now()
  };

  playCheckoutChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (e) {}
  }

  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', testBillNo);
      await setDoc(notifRef, { ...payload, timestamp: serverTimestamp() });
    } catch (e) {}
  }

  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, { body, icon: '/ors-logo.png', badge: '/favicon.svg', tag: `cobb-disc-${testBillNo}` });
      sysNotif.onclick = () => window.focus();
    } catch (e) {}
  }

  return payload;
};

// 3. Trigger Test Cancelled / Void Bill Alert
export const triggerTestCancelledBillAlert = async (storeId = 'DEMO_STORE_001') => {
  const testBillNo = `TEST-VOID-${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = 4200;
  const title = `🚫 BILL CANCELLED / VOIDED: ₹${amount.toLocaleString('en-IN')} | Bill #${testBillNo}`;
  const body = `⚠️ Warning: Bill #${testBillNo} worth ₹${amount.toLocaleString('en-IN')} was cancelled at POS counter by Counter Staff!`;

  const payload = {
    billId: `cancelled_${testBillNo}`,
    billNumber: testBillNo,
    type: 'cancelled_bill',
    amount,
    salesperson: 'Counter Staff',
    customer: 'Walk-in',
    title,
    body,
    url: '/?tab=livebills',
    isTest: true,
    createdAt: Date.now()
  };

  playCheckoutChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([400, 200, 400]); } catch (e) {}
  }

  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', payload.billId);
      await setDoc(notifRef, { ...payload, timestamp: serverTimestamp() });
    } catch (e) {}
  }

  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, { body, icon: '/ors-logo.png', badge: '/favicon.svg', tag: `cobb-void-${testBillNo}` });
      sysNotif.onclick = () => window.focus();
    } catch (e) {}
  }

  return payload;
};

// 4. Trigger Test EOD Closing Digest Alert
export const triggerTestEodSummaryAlert = async (storeId = 'DEMO_STORE_001') => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const grossSales = 48650;
  const billCount = 24;
  const cash = 22400;
  const pettyCashSpent = 600;
  const netDrawer = 21800;
  const upi = 26250;
  const topCat = 'CASUAL SHIRTS';

  const title = `📊 Daily Store Closing Digest: ₹${grossSales.toLocaleString('en-IN')}`;
  const body = `Total: ₹${grossSales.toLocaleString('en-IN')} (${billCount} Bills) • Cash: ₹${cash.toLocaleString('en-IN')} • Drawer: ₹${netDrawer.toLocaleString('en-IN')} • UPI: ₹${upi.toLocaleString('en-IN')} • Top: ${topCat}`;

  const payload = {
    billId: `test_eod_${Date.now()}`,
    type: 'eod_summary',
    title,
    body,
    summary: {
      grossSales,
      billCount,
      cash,
      pettyCashSpent,
      netExpectedDrawerCash: netDrawer,
      card: 0,
      upi,
      discounts: 14200,
      topCategory: topCat,
      topCategoryUnits: 18,
      exchangeBills: 1,
      exchangeValue: 1290,
      upsellCollected: 450
    },
    date: dateStr,
    time: timeStr,
    url: '/?tab=dashboard&view=eod',
    isTest: true,
    createdAt: Date.now()
  };

  playCheckoutChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  if (hasConfig && db) {
    try {
      if (authPromise) await authPromise;
      const notifRef = doc(db, 'stores', storeId, 'checkout_notifications', payload.billId);
      await setDoc(notifRef, { ...payload, timestamp: serverTimestamp() });
    } catch (e) {}
  }

  if (isNotificationGranted() && typeof window !== 'undefined') {
    try {
      const sysNotif = new Notification(title, { body, icon: '/ors-logo.png', badge: '/favicon.svg', tag: 'cobb-eod-test' });
      sysNotif.onclick = () => window.focus();
    } catch (e) {}
  }

  return payload;
};


