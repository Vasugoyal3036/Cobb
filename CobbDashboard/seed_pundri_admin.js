const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account key
const serviceAccountPath = 'd:/cobbbb/CobbDashboard/firebase-admin.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seedData() {
  console.log("Seeding Cobb Pundri data...");
  const storeRef = db.collection('stores').doc('DEMO_STORE_001');
  
  await storeRef.set({
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

  const inventoryRef = db.collection('stores').doc('DEMO_STORE_001').collection('inventory');
  const items = [
    { sku: 'SH-M-01', barcode: '1001', name: 'Premium Cotton Shirt', stock: 45, price: '₹1,299', status: 'Healthy', isUnknown: false },
    { sku: 'DN-S-42', barcode: '1002', name: 'Slim Fit Denim Jeans', stock: 8, price: '₹1,899', status: 'Low Stock', isUnknown: false },
    { sku: 'WT-W-99', barcode: '1003', name: 'Winter Puffer Jacket', stock: 120, price: '₹3,499', status: 'Healthy', isUnknown: false },
    { sku: 'AC-B-05', barcode: '1004', name: 'Leather Belt (Black)', stock: 2, price: '₹899', status: 'Critical', isUnknown: false },
    { sku: 'SUIT-01', barcode: '1005', name: '3-Piece Tuxedo (Navy)', stock: 14, price: '₹8,999', status: 'Healthy', isUnknown: false }
  ];

  for (const item of items) {
    await inventoryRef.doc(item.sku).set(item);
  }

  console.log("✅ Cobb Pundri data successfully added to Firestore!");
  process.exit(0);
}

seedData().catch(console.error);
