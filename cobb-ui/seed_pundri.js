import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "cobb-store.firebaseapp.com",
  projectId: "cobb-store",
  storageBucket: "cobb-store.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  const storeRef = doc(db, 'stores', 'DEMO_STORE_001');
  
  await setDoc(storeRef, {
    name: 'Cobb Pundri',
    location: 'Fatehpur Road, Pundri',
    code: 'PUNDRI',
    status: 'online',
    currentRevenue: 154200,
    previousRevenue: 110000,
    walkins: 45,
    inventoryAlerts: 2,
    lastUpdated: new Date().toISOString()
  }, { merge: true });

  const inventoryRef = collection(db, 'stores', 'DEMO_STORE_001', 'data', 'inventory');
  
  const items = [
    { sku: 'SH-M-01', barcode: '1001', name: 'Premium Cotton Shirt', stock: 45, price: '₹1,299', status: 'Healthy', isUnknown: false },
    { sku: 'DN-S-42', barcode: '1002', name: 'Slim Fit Denim Jeans', stock: 8, price: '₹1,899', status: 'Low Stock', isUnknown: false },
    { sku: 'WT-W-99', barcode: '1003', name: 'Winter Puffer Jacket', stock: 120, price: '₹3,499', status: 'Healthy', isUnknown: false },
    { sku: 'AC-B-05', barcode: '1004', name: 'Leather Belt (Black)', stock: 2, price: '₹899', status: 'Critical', isUnknown: false },
    { sku: 'SUIT-01', barcode: '1005', name: '3-Piece Tuxedo (Navy)', stock: 14, price: '₹8,999', status: 'Healthy', isUnknown: false }
  ];

  for (const item of items) {
    const itemDoc = doc(inventoryRef, item.sku);
    await setDoc(itemDoc, item);
  }

  console.log("✅ Cobb Pundri data successfully added to Firestore!");
  process.exit(0);
}

seedData().catch(console.error);
