import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration - loaded from environment variables.
// If no Firebase project is configured, the app runs fully offline (local SQL only).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Firebase is only active if at least the projectId is provided
export const hasConfig = Boolean(firebaseConfig.projectId);

let app;
let firestoreDb = null;
export let authPromise = Promise.resolve();

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    authPromise = import('firebase/auth').then(({ getAuth, signInAnonymously }) => {
       const auth = getAuth(app);
       return signInAnonymously(auth).then(() => console.log('Firebase Anonymous Auth successful.')).catch(e => console.error('Anonymous Auth Failed:', e));
    });
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.log('Firebase not configured. Running in local-only mode - phone access requires a tunnel link.');
}

export const db = firestoreDb;

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
