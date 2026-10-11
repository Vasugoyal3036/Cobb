import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, authPromise } from './utils/firebase';
import BarcodeScanner from './BarcodeScanner';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [scannedResult, setScannedResult] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [storeData, setStoreData] = useState(null);

  React.useEffect(() => {
    if (!db) return;
    let unsub = () => {};
    authPromise.then(() => {
      import('firebase/firestore').then(({ doc, onSnapshot }) => {
        unsub = onSnapshot(doc(db, 'stores', 'DEMO_STORE_001'), (docSnap) => {
          if (docSnap.exists()) {
            setStoreData(docSnap.data());
          }
        });
      });
    });
    return () => unsub();
  }, []);

  const handleScan = async (text) => {
    // Only process if it's a new scan to prevent rapid-fire triggers
    if (scannedResult === text) return;
    
    setScannedResult(text);
    if (navigator.vibrate) navigator.vibrate(200);
    
    if (db) {
      setIsQuerying(true);
      try {
        // Query the live inventory in the DEMO_STORE database
        const inventoryRef = collection(db, 'stores', 'DEMO_STORE_001', 'inventory');
        const q = query(inventoryRef, where('barcode', '==', text));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setItemDetails(querySnapshot.docs[0].data());
        } else {
          // If not in DB, show it as an unregistered item
          setItemDetails({
            name: "Unregistered Item (Not in DB)",
            price: "₹???",
            stock: 0,
            isUnknown: true
          });
        }
      } catch (err) {
        console.error("Backend query failed:", err);
      } finally {
        setIsQuerying(false);
      }
    }
  };

  const resetScanner = () => {
    setScannedResult(null);
    setItemDetails(null);
  };

  return (
    <div className="mobile-layout">
      <header className="mobile-header">
        <h1 className="mobile-title">
          {activeTab === 'home' && 'My Store'}
          {activeTab === 'scan' && 'Scanner'}
          {activeTab === 'alerts' && 'Alerts'}
          {activeTab === 'team' && 'Team'}
        </h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, backgroundColor: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 8px var(--danger)' }}></div>
          </div>
          <div className="profile-pic"></div>
        </div>
      </header>

      <main className="mobile-content">
        {activeTab === 'home' && (
          <div className="tab-view">
            <div className="mobile-card" style={{background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0,0,0,0.5))', border: '1px solid rgba(139, 92, 246, 0.3)'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{fontSize: '28px', fontWeight: 'bold', margin: 0}}>₹{storeData ? storeData.currentRevenue.toLocaleString() : '...'}</h2>
                <span style={{ background: 'var(--bg)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Live</span>
              </div>
              <div style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>Today's Sales • Cobb Pundri</div>
              <div style={{width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{width: `${storeData ? Math.min(100, (storeData.currentRevenue / Math.max(1, storeData.previousRevenue)) * 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', borderRadius: '4px'}}></div>
              </div>
            </div>
            
            <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '18px', padding: '0 8px' }}>Manager Action Items</h3>
            <div className="mobile-card">
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0'}}>
                {storeData && storeData.inventoryAlerts > 0 ? (
                  <span style={{color: 'var(--danger)'}}>⚠️ {storeData.inventoryAlerts} Inventory Alerts Require Attention</span>
                ) : (
                  <span>No pending tasks at the moment.</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'scan' && (
          <div className="scanner-container">
            <div className="scanner-header">
              <h3>Scan Barcode or QR</h3>
              <p>Point the camera at any inventory tag.</p>
            </div>
            
            <BarcodeScanner 
              onScanSuccess={handleScan}
              onScanError={(err) => { /* ignore constant scan errors */ }}
            />

            {scannedResult && (
              <div style={{ marginTop: '20px', width: '100%' }}>
                {isQuerying ? (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', textAlign: 'center' }}>
                    Querying Cloud Database...
                  </div>
                ) : (
                  <div style={{ 
                    padding: '16px', 
                    background: itemDetails?.isUnknown ? 'rgba(255, 69, 58, 0.2)' : 'rgba(50, 215, 75, 0.2)', 
                    border: `1px solid ${itemDetails?.isUnknown ? 'var(--danger)' : 'var(--success)'}`,
                    borderRadius: '12px' 
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>BARCODE: {scannedResult}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{itemDetails?.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Price: <strong>{itemDetails?.price}</strong></span>
                      <span>Stock: <strong>{itemDetails?.stock} units</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="scanner-actions" style={{ marginTop: scannedResult ? '20px' : '0' }}>
              <button className="btn-secondary" onClick={resetScanner}>Scan Again</button>
              {scannedResult && !itemDetails?.isUnknown && <button className="btn-primary">Add to Transfer</button>}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="tab-view">
            <div className="mobile-card">
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0'}}>
                You're all caught up! No active alerts.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="tab-view">
            <div className="mobile-card">
              <div className="card-title">Live Floor Roster</div>
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0'}}>
                No staff currently clocked in.
              </div>
            </div>
            
            <button className="btn-secondary" style={{ width: '100%' }}>View Full Timesheet</button>
          </div>
        )}
      </main>

      <nav className="mobile-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Home
        </div>
        <div className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h3"></path><path d="M20 7V4h-3"></path><path d="M4 17v3h3"></path><path d="M20 17v3h-3"></path><rect x="7" y="7" width="10" height="10"></rect></svg>
          Scan
        </div>
        <div className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Alerts
        </div>
        <div className={`nav-item ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Team
        </div>
      </nav>
    </div>
  );
}

export default App;
