import axios from 'axios';
import { db, authPromise } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const DEFAULT_SALESMEN = ['Vikas', 'Pawan', 'Simran', 'Akhil'];
export const DEFAULT_RATE_PER_CUP = 10; // Rs 10 / cup

export const getLocalTodayDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset);
  return local.toISOString().split('T')[0];
};

export const createEmptyTeaRecord = (dateStr = getLocalTodayDate(), salesmenList = DEFAULT_SALESMEN, rate = DEFAULT_RATE_PER_CUP) => {
  const salesmenMap = {};
  salesmenList.forEach(name => {
    salesmenMap[name] = {
      name,
      cups: 0,
      amount: 0,
      lastLogged: null
    };
  });

  return {
    date: dateStr,
    ratePerCup: rate,
    totalCups: 0,
    totalAmount: 0,
    salesmen: salesmenMap,
    logs: [],
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Fetch today's tea records for salesmen with offline / cloud fallback
 */
export async function fetchTodayTeaRecord(API_BASE = '', storeId = 'DEMO_STORE_001') {
  const today = getLocalTodayDate();

  // 1. Try local or tunnel backend API if available
  if (API_BASE) {
    try {
      const res = await axios.get(`${API_BASE}/api/expenses/tea/today?storeId=${storeId}&date=${today}`, { timeout: 4000 });
      if (res?.data?.success && res.data.record) {
        return res.data.record;
      }
    } catch (e) {
      // Fall through to Firestore
    }
  }

  // 2. Cloud Firestore fallback (Phone Link)
  if (db) {
    try {
      if (authPromise) await authPromise;
      const snap = await getDoc(doc(db, 'stores', storeId, 'data', 'tea_expenses'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.date === today) {
          return data;
        }
      }
    } catch (err) {
      console.warn('[teaExpenses] Firestore read note:', err.message);
    }
  }

  // 3. Fallback from localStorage or empty record
  try {
    const cached = localStorage.getItem(`cobb_tea_record_${today}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  return createEmptyTeaRecord(today);
}

/**
 * Add or subtract tea cups for a salesman
 */
export async function logSalesmanTea(API_BASE = '', storeId = 'DEMO_STORE_001', { salesman, cups = 1, ratePerCup = DEFAULT_RATE_PER_CUP, note = '' }) {
  if (!salesman) throw new Error('Salesman name is required');
  const today = getLocalTodayDate();

  let updatedRecord = null;

  // 1. Try backend API
  if (API_BASE) {
    try {
      const res = await axios.post(`${API_BASE}/api/expenses/tea/log`, {
        salesman,
        cups,
        ratePerCup,
        note,
        storeId
      }, { timeout: 4500 });

      if (res?.data?.success && res.data.record) {
        updatedRecord = res.data.record;
      }
    } catch (apiErr) {
      console.warn('[teaExpenses] API log note:', apiErr.message);
    }
  }

  // 2. If API failed or remote on phone link, apply optimistic update and write to Firestore
  if (!updatedRecord) {
    const current = await fetchTodayTeaRecord(API_BASE, storeId);
    const dayRecord = current.date === today ? current : createEmptyTeaRecord(today);

    if (!dayRecord.salesmen[salesman]) {
      dayRecord.salesmen[salesman] = { name: salesman, cups: 0, amount: 0, lastLogged: null };
    }

    const s = dayRecord.salesmen[salesman];
    const prev = s.cups || 0;
    const nextCups = Math.max(0, prev + cups);
    s.cups = nextCups;
    s.amount = nextCups * (ratePerCup || dayRecord.ratePerCup || DEFAULT_RATE_PER_CUP);
    s.lastLogged = new Date().toISOString();

    let total = 0;
    Object.values(dayRecord.salesmen).forEach(item => { total += (item.cups || 0); });
    dayRecord.totalCups = total;
    dayRecord.totalAmount = total * (ratePerCup || dayRecord.ratePerCup || DEFAULT_RATE_PER_CUP);
    dayRecord.lastUpdated = new Date().toISOString();

    const now = new Date();
    dayRecord.logs.unshift({
      id: `tea_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      salesman,
      cupsAdded: cups,
      totalCupsForDay: nextCups,
      ratePerCup: ratePerCup || DEFAULT_RATE_PER_CUP,
      amount: cups * (ratePerCup || DEFAULT_RATE_PER_CUP),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: now.toISOString(),
      note: (note || '').trim() || (cups > 0 ? 'Tea Break' : 'Correction')
    });

    updatedRecord = dayRecord;
  }

  // 3. Cache in localStorage and sync to Firestore
  try {
    localStorage.setItem(`cobb_tea_record_${today}`, JSON.stringify(updatedRecord));
  } catch (e) {}

  if (db) {
    try {
      if (authPromise) await authPromise;
      await setDoc(doc(db, 'stores', storeId, 'data', 'tea_expenses'), updatedRecord, { merge: true });
    } catch (fsErr) {
      console.warn('[teaExpenses] Firestore sync note:', fsErr.message);
    }
  }

  return updatedRecord;
}

/**
 * Set exact tea count for a salesman (for corrections)
 */
export async function setSalesmanTeaCount(API_BASE = '', storeId = 'DEMO_STORE_001', { salesman, totalCups = 0, ratePerCup = DEFAULT_RATE_PER_CUP, note = '' }) {
  if (!salesman) throw new Error('Salesman name is required');
  const today = getLocalTodayDate();
  let updatedRecord = null;

  if (API_BASE) {
    try {
      const res = await axios.post(`${API_BASE}/api/expenses/tea/set`, {
        salesman,
        totalCups,
        ratePerCup,
        note,
        storeId
      }, { timeout: 4500 });

      if (res?.data?.success && res.data.record) {
        updatedRecord = res.data.record;
      }
    } catch (e) {}
  }

  if (!updatedRecord) {
    const current = await fetchTodayTeaRecord(API_BASE, storeId);
    const dayRecord = current.date === today ? current : createEmptyTeaRecord(today);

    if (!dayRecord.salesmen[salesman]) {
      dayRecord.salesmen[salesman] = { name: salesman, cups: 0, amount: 0, lastLogged: null };
    }

    const s = dayRecord.salesmen[salesman];
    s.cups = Math.max(0, parseInt(totalCups, 10) || 0);
    s.amount = s.cups * (ratePerCup || DEFAULT_RATE_PER_CUP);
    s.lastLogged = new Date().toISOString();

    let total = 0;
    Object.values(dayRecord.salesmen).forEach(item => { total += (item.cups || 0); });
    dayRecord.totalCups = total;
    dayRecord.totalAmount = total * (ratePerCup || DEFAULT_RATE_PER_CUP);
    dayRecord.lastUpdated = new Date().toISOString();

    updatedRecord = dayRecord;
  }

  try {
    localStorage.setItem(`cobb_tea_record_${today}`, JSON.stringify(updatedRecord));
  } catch (e) {}

  if (db) {
    try {
      if (authPromise) await authPromise;
      await setDoc(doc(db, 'stores', storeId, 'data', 'tea_expenses'), updatedRecord, { merge: true });
    } catch (fsErr) {}
  }

  return updatedRecord;
}

/**
 * Listen for live real-time updates to tea expenses across phones and admin panel
 */
export function subscribeToTeaExpenses(storeId = 'DEMO_STORE_001', onUpdate) {
  if (!db) return () => {};

  try {
    const unsub = onSnapshot(doc(db, 'stores', storeId, 'data', 'tea_expenses'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && onUpdate) {
          onUpdate(data);
        }
      }
    }, (err) => {
      console.warn('[teaExpenses] Snapshot listener warning:', err.message);
    });

    return unsub;
  } catch (e) {
    return () => {};
  }
}

