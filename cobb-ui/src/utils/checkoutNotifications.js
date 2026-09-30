import { db, hasConfig, authPromise } from './firebase';
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Sound removed per user preference - no-op chime function maintained for backward-compatibility
export const playCheckoutChime = () => {};

// Check if browser notifications are currently enabled
export const isNotificationGranted = () => {
  if (typeof window === 'undefined') return false;
  return ('Notification' in window && Notification.permission === 'granted');
};

/**
 * Triggers a native system notification that appears in the Android / iOS Notification Bar / Status Bar.
 * On mobile devices (Android Chrome, iOS PWA), new Notification() fails with Illegal Constructor;
 * ServiceWorkerRegistration.showNotification() is the ONLY method that posts to the phone's notification bar.
 */
export const showSystemNotification = async (title, options = {}) => {
  if (typeof window === 'undefined') return false;

  // Verify permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const origin = window.location.origin || 'https://cobb-store.web.app';
  const logoPng = `${origin}/ors-logo.png`;

  const defaultOptions = {
    icon: logoPng,
    badge: logoPng,
    vibrate: [300, 100, 300, 100, 300],
    renotify: true,
    requireInteraction: true,
    silent: false,
    ...options
  };

  // Mobile Android/iOS requirement: icons and badges MUST NOT be SVG, must be raster PNG/JPG
  if (defaultOptions.badge && defaultOptions.badge.endsWith('.svg')) {
    defaultOptions.badge = logoPng;
  }
  if (defaultOptions.icon && defaultOptions.icon.endsWith('.svg')) {
    defaultOptions.icon = logoPng;
  }

  // 1. Primary for Mobile Android / iOS PWA: Service Worker showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(resolve => setTimeout(() => resolve(null), 1200))
      ]);

      if (!reg && navigator.serviceWorker.getRegistration) {
        reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      }

      if (!reg && navigator.serviceWorker.register) {
        reg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
        if (reg) {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise(resolve => setTimeout(() => resolve(null), 1200))
          ]);
        }
      }

      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('[CheckoutAlert] ServiceWorker showNotification note:', swErr.message);
    }
  }

  // 2. Desktop browser fallback
  try {
    const notif = new Notification(title, defaultOptions);
    if (options.onclick) notif.onclick = options.onclick;
    return true;
  } catch (e) {
    console.warn('[CheckoutAlert] Desktop Notification fallback failed:', e.message);
    return false;
  }
};

// Request notification permission and register FCM device token
export const registerForPushNotifications = async (storeId = 'DEMO_STORE_001', isUserAction = false) => {
  if (typeof window === 'undefined') {
    return { success: false, reason: 'Window is not defined' };
  }

  // If system Notification API is not supported (e.g. older iOS Safari), enable in-app toasts & chime
  if (!('Notification' in window)) {
    localStorage.setItem('cobb_checkout_notifications_enabled', 'true');
    if (isUserAction) playCheckoutChime();
    return { success: true, permission: 'in_app_only', reason: 'In-app chimes active' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      localStorage.setItem('cobb_checkout_notifications_enabled', 'false');
      return { success: false, permission, reason: 'Notification permission denied' };
    }

    localStorage.setItem('cobb_checkout_notifications_enabled', 'true');

    // Register Service Worker for Mobile Notification Bar display
    let swReg = null;
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
        await navigator.serviceWorker.ready.catch(() => null);
      } catch (swErr) {
        console.warn('[CheckoutAlert] SW register note:', swErr.message);
      }
    }

    // Register Firebase Cloud Messaging device token for background push
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BAzF7nMwaadSHCnfIKmm8E6m5szGLJfgfEPZhDYR-rDKcwy0Ce6insWwnHquke3wDeLE9xDKz3CNUFTzre6ID3s';

    if (hasConfig && db) {
      try {
        if (authPromise) await authPromise;

        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
        const supported = await isSupported().catch(() => false);

        if (supported) {
          const { app } = await import('./firebase');
          const messaging = getMessaging(app);

          const token = await getToken(messaging, {
            serviceWorkerRegistration: swReg || undefined,
            vapidKey: vapidKey
          }).catch((err) => {
            console.warn('[CheckoutAlert] FCM getToken notice:', err.message);
            return null;
          });

          if (token) {
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
          }
        }
      } catch (fcmErr) {
        console.warn('[CheckoutAlert] FCM push token setup notice:', fcmErr.message);
      }
    }

    // Only fire confirmation notification & chime if explicitly triggered by user action (e.g. clicking Enable)
    // Never on passive link/app opening
    if (isUserAction) {
      playCheckoutChime();
      await showSystemNotification('🔔 Phone Alerts Active', {
        body: 'Cobb Garments: Real-time checkout alerts will now appear in your phone notification bar.',
        tag: 'cobb-alert-enabled',
        data: { url: '/?tab=livebills' }
      });
    }

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

    snapshot.docChanges().forEach(async (change) => {
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

          // 3. Trigger Native Phone Notification Bar Alert
          await showSystemNotification(data.title || '🧾 New Sale Recorded', {
            body: data.body || 'A new checkout has been processed.',
            icon: '/ors-logo.png',
            badge: '/ors-logo.png',
            tag: `cobb-sale-${data.billNumber || notifId}`,
            data: { url: `/?tab=livebills&bill=${encodeURIComponent(data.billNumber || '')}` }
          });

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

  const sampleItemSets = [
    'Denim Jeans, Casual Shirt',
    'Cotton Chinos, Polo T-Shirt',
    'Formal Trouser, Linen Shirt',
    'Printed Kurta, Slim Denim'
  ];
  const itemNames = sampleItemSets[Math.floor(Math.random() * sampleItemSets.length)];
  const discountAmt = Math.round(testAmount * 0.15);
  const grossAmt = testAmount + discountAmt;
  const discountPct = Math.round((discountAmt / grossAmt) * 100);

  const title = `🧾 New Sale: ₹${testAmount.toLocaleString('en-IN')} | Bill #${testBillNo}`;
  const body = `🛍️ 2 Items: ${itemNames}\n💳 Pay: ${pay} | Gross: ₹${grossAmt.toLocaleString('en-IN')} | Disc: ₹${discountAmt.toLocaleString('en-IN')} (${discountPct}% OFF)\n👤 Customer: Parbhat Goyal (98123-45678) • Staff: ${staff}`;

  const payload = {
    billId: testBillNo,
    billNumber: testBillNo,
    amount: testAmount,
    grossAmount: grossAmt,
    discountAmount: discountAmt,
    discountPercent: discountPct,
    qty: 2,
    paymentMode: pay,
    salesperson: staff,
    customer: 'Parbhat Goyal (98123-45678)',
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

  // 4. Trigger Native Phone Notification Bar Alert
  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: `cobb-sale-${testBillNo}`,
    data: { url: `/?tab=livebills&bill=${encodeURIComponent(testBillNo)}` }
  });

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

  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: 'cobb-system-status'
  });

  return payload;
};

// 1. Trigger Test VIP Mega Sale Alert (e.g. ₹18,500)
export const triggerTestBigTicketAlert = async (storeId = 'DEMO_STORE_001') => {
  const testBillNo = `TEST-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = 18500;
  const title = `💎 VIP MEGA SALE: ₹${amount.toLocaleString('en-IN')} | Bill #${testBillNo}`;
  const body = `🛍️ 6 Items: Premium Suit, 2 Shirts, Blazer + 2 more\n💳 Pay: UPI | Gross: ₹22,000 | Disc: ₹3,500 (16% OFF)\n👤 Customer: Asham Sohi (98765-43210) • Staff: Rohit`;

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
    customer: 'Asham Sohi (98765-43210)',
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

  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: `cobb-vip-${testBillNo}`,
    data: { url: `/?tab=livebills&bill=${encodeURIComponent(testBillNo)}` }
  });

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
  const body = `🛍️ 3 Items: Denim Jeans, Linen Shirt, Trouser\n💳 Pay: Cash | Gross: ₹8,000 | Disc: ₹3,600 (45% OFF)\n👤 Customer: Walk-in • Staff: Sahil`;

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

  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: `cobb-disc-${testBillNo}`,
    data: { url: `/?tab=livebills&bill=${encodeURIComponent(testBillNo)}` }
  });

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

  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: `cobb-void-${testBillNo}`,
    data: { url: `/?tab=livebills` }
  });

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

  await showSystemNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    tag: 'cobb-eod-test',
    data: { url: '/?tab=dashboard&view=eod' }
  });

  return payload;
};


