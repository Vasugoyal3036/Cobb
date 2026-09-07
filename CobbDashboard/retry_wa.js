const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-admin.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function run() {
    const collections = await db.listCollections();
    console.log("Collections:", collections.map(c => c.id));
    
    const queueRef = db.collection('whatsapp_queue');
    const snapshot = await queueRef.get();
    
    console.log(`Found ${snapshot.size} documents in whatsapp_queue total.`);
}
run().catch(console.error);
