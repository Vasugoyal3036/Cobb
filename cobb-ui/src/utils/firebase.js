import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDabxrr3v81IWbRI-u27a2bUa5DOGmDu78",
  authDomain: "cobb-store.firebaseapp.com",
  projectId: "cobb-store",
  storageBucket: "cobb-store.firebasestorage.app",
  messagingSenderId: "1010797128815",
  appId: "1:1010797128815:web:2adc68eef43a09d004719a",
  measurementId: "G-5F78Z1WTRV"
};

// Check if config is actually provided (not just the placeholder)
export const hasConfig = true;

let app;
let firestoreDb = null;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export const db = firestoreDb;

// Queue WhatsApp message to Firestore if online, or local array if offline.
// In a full production app, this would use Firestore's native offline persistence.
export const queueWhatsAppMessage = async (phone, message) => {
  console.log('Queued WhatsApp message:', phone, message);
  
  if (db && hasConfig) {
    try {
      await addDoc(collection(db, "whatsapp_queue"), {
        phone,
        message,
        status: "pending",
        queuedAt: serverTimestamp()
      });
      console.log('Successfully queued message to Firebase Firestore.');
    } catch (error) {
      console.error('Failed to queue message to Firebase, running in offline mode:', error);
    }
  } else {
    console.log('Firebase not configured. Running in offline localhost mode.');
  }
};
