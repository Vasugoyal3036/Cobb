import React, { useState, useEffect } from 'react';
import { Search, MapPin, Truck, CheckCircle2, Clock, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { db } from '../../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AVAILABLE_STORES } from '../../context/AuthContext';

export default function InterBranchTransferTab({ API_BASE, darkMode, activeStore }) {
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup', 'intransit', 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // Real data for requests in transit
  const [inTransit, setInTransit] = useState([]);

  // Subscribe to live IBT gate passes from Firestore
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'ibt_requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter passes relevant to activeStore
      setInTransit(passes.filter(p => p.from === activeStore || p.to === activeStore).sort((a,b) => b.timestamp - a.timestamp));
    });
    return () => unsubscribe();
  }, [activeStore]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || !db) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = [];
      const sq = searchQuery.trim().toLowerCase();
      // Only query other stores
      const otherStores = AVAILABLE_STORES.filter(s => s.id !== activeStore && s.id !== 'ALL');
      
      for (const store of otherStores) {
        const inventoryRef = doc(db, 'stores', store.id, 'data', 'inventory');
        const snap = await getDoc(inventoryRef);
        let matchQty = 0;
        
        if (snap.exists()) {
          const invData = snap.data();
          const items = Array.isArray(invData.items) ? invData.items : [];
          
          for (const item of items) {
             const desc = (item.ItemName || item.Description || '').toLowerCase();
             const barcode = (item.Barcode || '').toLowerCase();
             if (desc.includes(sq) || barcode.includes(sq)) {
                matchQty += (Number(item.Qty) || 0);
             }
          }
        }
        
        results.push({
          storeId: store.id,
          name: store.name,
          distance: store.location || 'Remote Branch',
          qty: matchQty
        });
      }
      setSearchResults(results.sort((a,b) => b.qty - a.qty));
    } catch (err) {
      console.error("IBT Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestStock = async (storeId, qty) => {
    if (!db) return;
    const reqId = `TR-${Math.floor(Math.random()*90000) + 10000}`;
    
    try {
      await setDoc(doc(db, 'ibt_requests', reqId), {
        article: `Item Search: ${searchQuery}`,
        size: 'Any',
        from: storeId,
        to: activeStore,
        status: 'requested',
        date: new Date().toISOString(),
        timestamp: Date.now(),
        qty: qty
      });
      alert(`Stock request ${reqId} sent to ${AVAILABLE_STORES.find(s=>s.id === storeId)?.name}`);
      setActiveTab('intransit');
    } catch (err) {
      console.error("IBT Request Error:", err);
      alert("Failed to send request.");
    }
  };

  const handleInwardTransfer = async (reqId) => {
    if (!db || !window.confirm("Confirm you have received and inwarded these items physically?")) return;
    try {
      await updateDoc(doc(db, 'ibt_requests', reqId), {
        status: 'received',
        inwardedAt: new Date().toISOString()
      });
      alert("Items successfully inwarded!");
    } catch (err) {
      console.error("Inward Error:", err);
    }
  };

  const handleDispatchTransfer = async (reqId) => {
    if (!db || !window.confirm("Confirm you have packed and dispatched these items via courier/runner?")) return;
    try {
      await updateDoc(doc(db, 'ibt_requests', reqId), {
        status: 'dispatched',
        dispatchedAt: new Date().toISOString()
      });
      alert("Gate Pass generated and dispatched!");
    } catch (err) {
      console.error("Dispatch Error:", err);
    }
  };

  const renderLookup = () => (
    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#000000] border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
      <h2 className={`text-xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Live Branch Stock Lookup</h2>
      <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search for an article or barcode to check availability across sister branches.</p>
      
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Scan Barcode or Type Article (e.g. Navy Blazer Size 40)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
              darkMode ? 'bg-[#0a0a0a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
        <button 
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
        >
          {isSearching ? 'Checking...' : 'Find Stock'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <h3 className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Availability for "{searchQuery}"</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map(res => (
              <div key={res.storeId} className={`p-4 rounded-xl border flex flex-col gap-3 ${darkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{res.name}</h4>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {res.distance} away</span>
                  </div>
                  <div className={`px-2 py-1 rounded font-bold text-sm ${res.qty > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {res.qty} Units
                  </div>
                </div>
                {res.qty > 0 && res.storeId !== activeStore && (
                  <button 
                    onClick={() => handleRequestStock(res.storeId, 1)}
                    className="mt-2 w-full py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" /> Request Transfer
                  </button>
                )}
                {res.storeId === activeStore && (
                  <div className="mt-2 text-xs text-center font-bold text-blue-500 bg-blue-500/10 py-2 rounded-lg">
                    Current Branch
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderInTransit = () => (
    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#000000] border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Active Gate Passes</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Track items on the road and inward received parcels.</p>
        </div>
        <button className="px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold rounded-lg text-sm flex items-center gap-2">
          <Truck className="w-4 h-4" /> Generate Gate Pass
        </button>
       </div>

       <div className="space-y-4">
          {inTransit.map(tr => (
            <div key={tr.id} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between ${darkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tr.status === 'requested' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {tr.status === 'requested' ? <Clock className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{tr.article}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono mt-1 text-slate-500">
                    <span>{tr.id}</span> • <span>Size {tr.size}</span> • <span>Qty: {tr.qty}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden text-sm font-bold text-slate-500">
                <span className="truncate max-w-[100px]">{AVAILABLE_STORES.find(s=>s.id===tr.from)?.name}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[100px]">{AVAILABLE_STORES.find(s=>s.id===tr.to)?.name}</span>
              </div>

              <div className="w-full md:w-auto">
                {tr.status === 'requested' && tr.from === activeStore && (
                  <button onClick={() => handleDispatchTransfer(tr.id)} className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                    <Package className="w-4 h-4" /> Pack & Dispatch
                  </button>
                )}
                {tr.status === 'requested' && tr.to === activeStore && (
                   <div className="px-3 py-1.5 rounded bg-amber-500/10 text-amber-500 font-bold text-xs uppercase tracking-wider text-center border border-amber-500/20">
                     Awaiting Dispatch from Source
                   </div>
                )}
                {tr.status === 'dispatched' && tr.to === activeStore && (
                  <button onClick={() => handleInwardTransfer(tr.id)} className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Scan & Inward
                  </button>
                )}
                {tr.status === 'dispatched' && tr.from === activeStore && (
                   <div className="px-3 py-1.5 rounded bg-blue-500/10 text-blue-500 font-bold text-xs uppercase tracking-wider text-center border border-blue-500/20">
                     On The Road
                   </div>
                )}
                {tr.status === 'received' && (
                   <div className="px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-xs uppercase tracking-wider text-center border border-emerald-500/20">
                     <CheckCircle2 className="w-3 h-3 inline mr-1"/> Inwarded Complete
                   </div>
                )}
              </div>
            </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Tab Header */}
      <div className={`p-4 rounded-2xl flex items-center gap-4 shadow-sm border ${darkMode ? 'bg-[#000000] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('lookup')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${activeTab === 'lookup' ? (darkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
          >
            Live Lookup
          </button>
          <button 
            onClick={() => setActiveTab('intransit')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'intransit' ? (darkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
          >
            In-Transit / Gate Passes
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border border-white/20">
              {inTransit.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'lookup' && renderLookup()}
      {activeTab === 'intransit' && renderInTransit()}

    </div>
  );
}
