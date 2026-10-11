import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, authPromise } from './utils/firebase';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [storeData, setStoreData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    if (!db) return;
    
    let unsubStores = () => {};
    let unsubInv = () => {};

    authPromise.then(() => {
      // Listen to the 'stores' collection for live HQ data
      const qStores = query(collection(db, 'stores'));
      unsubStores = onSnapshot(qStores, (snapshot) => {
        if (!snapshot.empty) {
          const liveStores = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || doc.id,
              current: data.currentRevenue || 0,
              previous: data.previousRevenue || 0,
              walkins: data.walkins || 0,
              inventoryAlerts: data.inventoryAlerts || 0
            };
          });
          
          setStoreData(liveStores);
        }
      }, (error) => {
        console.error("Error fetching live store data:", error);
      });

      // Listen to live inventory for the main store
      const qInv = query(collection(db, 'stores', 'DEMO_STORE_001', 'inventory'));
      unsubInv = onSnapshot(qInv, (snapshot) => {
        if (!snapshot.empty) {
          const liveInv = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setInventoryData(liveInv);
        }
      });
    });

    return () => {
      unsubStores();
      unsubInv();
    };
  }, []);

  return (
    <div className="hq-layout">
      {/* Sidebar */}
      <aside className="hq-sidebar">
        <div className="hq-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          Goyal-House Of Fashion
        </div>
        
        <nav className="hq-nav">
          <div className={`hq-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Global Overview
          </div>
          <div className={`hq-nav-item ${activeTab === 'stores' ? 'active' : ''}`} onClick={() => setActiveTab('stores')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            Store Performance
          </div>
          <div className={`hq-nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Master Inventory
          </div>
          <div className={`hq-nav-item ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Global Campaigns
          </div>
          <div className={`hq-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            System Settings
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="hq-main">
        {activeTab === 'overview' && (
          <>
            <header className="hq-header">
              <div>
                <h1 className="hq-title">Global Overview</h1>
                <p className="hq-subtitle">Real-time metrics across all 12 franchise locations.</p>
              </div>
              <div className="hq-actions">
                <button>Generate Report</button>
              </div>
            </header>

            {/* Global KPIs */}
            <section className="hq-stats-grid">
              <div className="hq-stat-card">
                <div className="hq-stat-title">Total Revenue (Today)</div>
                <div className="hq-stat-value">₹{(storeData.reduce((acc, store) => acc + (store.current), 0)).toLocaleString()}</div>
                <div className="hq-stat-trend" style={{color: 'var(--success)'}}>Live aggregated data</div>
              </div>
              <div className="hq-stat-card">
                <div className="hq-stat-title">Active Walk-ins (Live)</div>
                <div className="hq-stat-value">{storeData.reduce((acc, store) => acc + (store.walkins || 0), 0)}</div>
                <div className="hq-stat-trend" style={{color: 'var(--text-muted)'}}>Across {storeData.length} stores</div>
              </div>
              <div className="hq-stat-card">
                <div className="hq-stat-title">Global Inventory Alerts</div>
                <div className="hq-stat-value">{storeData.reduce((acc, store) => acc + (store.inventoryAlerts || 0), 0)}</div>
                <div className="hq-stat-trend" style={{color: 'var(--text-muted)'}}>Requires action</div>
              </div>
              <div className="hq-stat-card">
                <div className="hq-stat-title">Top Performing Store</div>
                <div className="hq-stat-value">{storeData.length > 0 ? storeData.reduce((prev, current) => (prev.current > current.current) ? prev : current).name : '--'}</div>
                <div className="hq-stat-trend" style={{color: 'var(--text-muted)'}}>{storeData.length > 0 ? 'Highest sales volume' : 'No sales recorded yet'}</div>
              </div>
            </section>

            {/* Advanced Chart Area */}
            <section className="hq-chart-area">
              <div className="chart-header">
                <h3>Revenue Across Branches</h3>
                <div className="chart-legend">
                  <span className="legend-item"><span className="dot current"></span> This Week</span>
                  <span className="legend-item"><span className="dot previous"></span> Last Week</span>
                </div>
              </div>
              <div className="bar-chart-container">
                {storeData.map((store, idx) => {
                  const maxRevenue = Math.max(...storeData.map(s => Math.max(s.current, s.previous)), 1);
                  const currentPct = (store.current / maxRevenue) * 100;
                  const previousPct = (store.previous / maxRevenue) * 100;
                  return (
                  <div className="chart-bar-group" key={store.id}>
                    <div className="bars">
                      <div className="bar current" style={{ height: `${currentPct}%`, animationDelay: `${idx * 0.1}s` }}></div>
                      <div className="bar previous" style={{ height: `${previousPct}%`, animationDelay: `${idx * 0.1}s` }}></div>
                    </div>
                    <span className="bar-label">{store.name}</span>
                  </div>
                )})}
              </div>
            </section>
          </>
        )}

        {activeTab === 'stores' && (
          <div className="hq-view-container">
            <h1 className="hq-title" style={{marginBottom: '24px'}}>Live Store Health</h1>
            <div className="hq-stats-grid">
              {storeData.map(store => (
                <div className="hq-stat-card" key={store.id}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{fontSize: '20px', fontWeight: '700'}}>{store.name}</h3>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '14px', fontWeight: '600'}}>
                      <span className="dot current" style={{width: '8px', height: '8px', borderRadius: '4px', background: 'var(--success)', boxShadow: '0 0 10px var(--success)'}}></span>
                      Online
                    </div>
                  </div>
                  <div style={{marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)'}}>
                    Billing Sync: <strong style={{color: 'white'}}>Live</strong> <br/>
                    Today's Revenue: <strong style={{color: 'white'}}>₹{(store.current).toLocaleString()}</strong>
                  </div>
                  <button style={{marginTop: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: 'white', cursor: 'pointer'}}>View Cameras</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="hq-view-container">
            <h1 className="hq-title" style={{marginBottom: '8px'}}>Global Campaign Builder</h1>
            <p className="hq-subtitle" style={{marginBottom: '32px'}}>Blast SMS updates to the customer database across all franchises.</p>
            
            <div className="hq-stat-card" style={{maxWidth: '800px'}}>
              <h3 style={{marginBottom: '16px'}}>Compose SMS</h3>
              <textarea 
                placeholder="Type your promotional message here... e.g., 'Flash Sale at Goyal-House Of Fashion!'" 
                style={{width: '100%', height: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', color: 'white', fontSize: '16px', resize: 'none', marginBottom: '16px'}}
              ></textarea>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{color: 'var(--text-muted)'}}>Target Audience: <strong>All Loyalty Members (14,205)</strong></span>
                <div className="hq-actions">
                  <button>Launch Campaign 🚀</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="hq-view-container">
            <h1 className="hq-title" style={{marginBottom: '24px'}}>Master Inventory Control</h1>
            <div className="hq-stat-card" style={{padding: '24px'}}>
              <div style={{display: 'flex', gap: '16px', marginBottom: '24px'}}>
                <input type="text" placeholder="Search by SKU, Name, or Category..." style={{flex: 1, padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none'}} />
                <button style={{padding: '12px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}>Search</button>
              </div>
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)', color: 'var(--text-muted)'}}>
                    <th style={{padding: '12px'}}>SKU</th>
                    <th style={{padding: '12px'}}>Item Name</th>
                    <th style={{padding: '12px'}}>Global Stock</th>
                    <th style={{padding: '12px'}}>Status</th>
                    <th style={{padding: '12px'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{padding: '24px', textAlign: 'center', color: 'var(--text-muted)'}}>
                        No inventory data available. System is waiting for sync.
                      </td>
                    </tr>
                  ) : (
                    inventoryData.map(item => (
                      <tr key={item.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                        <td style={{padding: '12px'}}>{item.sku}</td>
                        <td style={{padding: '12px'}}>{item.name}</td>
                        <td style={{padding: '12px'}}>{item.stock}</td>
                        <td style={{padding: '12px'}}>{item.status}</td>
                        <td style={{padding: '12px'}}><button style={{background: 'var(--accent)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px'}}>Manage</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="hq-view-container">
            <h1 className="hq-title" style={{marginBottom: '24px'}}>System Configurations</h1>
            <div className="hq-stats-grid">
              <div className="hq-stat-card">
                <h3>Auto-Reorder Engine</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>Automatically generate Purchase Orders when stock falls below 15 units.</p>
                <button style={{background: 'var(--success)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px'}}>Active</button>
              </div>
              <div className="hq-stat-card">
                <h3>Global Discount Rules</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>Enforce max 20% manager discount limit across all POS terminals.</p>
                <button style={{background: 'var(--success)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px'}}>Active</button>
              </div>
              <div className="hq-stat-card">
                <h3>AI CCTV Analysis</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>Detect footfall and queue length using store cameras.</p>
                <button style={{background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px'}}>Enable (Beta)</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
