import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - loaded from environment variables.
// If no Firebase project is configured, the app runs fully offline (local SQL only).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDabxrr3v81IWbRI-u27a2bUa5DOGmDu78',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cobb-store.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cobb-store',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cobb-store.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1010797128815',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1010797128815:web:2adc68eef43a09d004719a',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5F78Z1WTRV'
};

// Firebase is active if projectId is present
export const hasConfig = Boolean(firebaseConfig.projectId);

let app;
let firestoreDb = null;
let firebaseStorage = null;
export let authPromise = Promise.resolve();

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    // Initialize Firestore with offline persistence
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    firebaseStorage = getStorage(app);
    authPromise = import('firebase/auth').then(({ getAuth, signInAnonymously }) => {
       const auth = getAuth(app);
       return signInAnonymously(auth).then(() => console.log('Firebase Anonymous Auth successful.')).catch(e => console.error('Anonymous Auth Failed:', e));
    });
    console.log('Firebase initialized successfully with offline persistence.');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.log('Firebase not configured. Running in local-only mode - phone access requires a tunnel link.');
}

export const db = firestoreDb;
export const storage = firebaseStorage;

// Queue WhatsApp message to Firestore if online, or local array if offline.
export const queueWhatsAppMessage = async (phone, message) => {
  if (hasConfig && db) {
    try {
      await addDoc(collection(db, 'whatsapp_queue'), {
        phone,
        message,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error("Error queueing message to Firebase", e);
      return false;
    }
  }
  return false;
};
