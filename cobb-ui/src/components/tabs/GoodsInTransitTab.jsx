import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Package, RotateCw, ExternalLink, ChevronRight, CheckCircle2, Box, X } from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const baseMockData = [
  { code: '0081308460', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '38 (97 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0081308535', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '40 (1.02 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0081308872', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '42 (1.07 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0081309138', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '44 (1.12 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0081309503', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '46 (1.17 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0082203068', article: '000061578', desc: 'CASUAL FULL SL', p1: 'GREEN', p2: '38 (97 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0082203775', article: '000061578', desc: 'CASUAL FULL SL', p1: 'GREEN', p2: '40 (1.02 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0082200380', article: '000061578', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '42 (1.07 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0082205562', article: '000061578', desc: 'CASUAL FULL SL', p1: 'PEACH.', p2: '40 (1.02 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0082206215', article: '000061578', desc: 'CASUAL FULL SL', p1: 'PEACH.', p2: '42 (1.07 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
];

const mockChallanItems = Array.from({ length: 56 }).map((_, idx) => ({
  ...baseMockData[idx % baseMockData.length],
}));

const FALLBACK_PARCELS = [
  {
    parcel_memo_no: 'WH00026127',
    parcel_memo_dt: '2026-09-29T00:00:00.000Z',
    vehicle_no: 'DL01LY5696',
    bilty_no: '1314027349',
    total_quantity: 56,
    total_boxes: 1,
    total_weight: 30,
    challan_no: 'WH/T27-021196',
    invoice_no: 'WH/T27-021196',
    invoice_amount: 29360,
    origin: 'WH',
    origin_name: 'Head Office Central WH',
    status: 'In Transit',
    items: mockChallanItems
  },
  {
    parcel_memo_no: 'WH00024923',
    parcel_memo_dt: '2026-09-23T00:00:00.000Z',
    vehicle_no: 'DL01LAF4375',
    bilty_no: '901028',
    total_quantity: 201,
    total_boxes: 1,
    total_weight: 90,
    challan_no: 'WH/T27-020174',
    invoice_no: 'WH/T27-020174',
    invoice_amount: 109506,
    origin: 'WH',
    origin_name: 'Head Office Central WH',
    status: 'Received'
  },
  {
    parcel_memo_no: 'WH00024145',
    parcel_memo_dt: '2026-09-19T00:00:00.000Z',
    vehicle_no: 'DL01LAF4375',
    bilty_no: '901844',
    total_quantity: 232,
    total_boxes: 1,
    total_weight: 105,
    challan_no: 'WH/T27-018223',
    invoice_no: 'WH/T27-018223',
    invoice_amount: 122907,
    origin: 'WH',
    origin_name: 'Head Office Central WH',
    status: 'Received'
  },
  {
    parcel_memo_no: 'WH00023267',
    parcel_memo_dt: '2026-09-14T00:00:00.000Z',
    vehicle_no: 'DL01LAF4375',
    bilty_no: '902199',
    total_quantity: 66,
    total_boxes: 1,
    total_weight: 30,
    challan_no: 'WH/T27-018749',
    invoice_no: 'WH/T27-018749',
    invoice_amount: 38430,
    origin: 'WH',
    origin_name: 'Head Office Central WH',
    status: 'Received'
  }
];

const GoodsInTransitTab = ({ darkMode, API_BASE }) => {
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [data, setData] = useState({
    activeInTransit: [],
    allParcels: FALLBACK_PARCELS,
    summary: {
      incomingCount: 0,
      incomingPieces: 56,
      incomingValue: 29360,
      monthPieces: 1021,
      monthValue: 561808,
      monthParcelsCount: 7,
      latestParcel: FALLBACK_PARCELS[0]
    }
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grouped');

  useEffect(() => {
    const fetchTransitData = async () => {
      try {
        setLoading(true);
        if (API_BASE) {
          try {
            const res = await axios.get(`${API_BASE}/api/parcels/transit`, { timeout: 4000 });
            if (res.data?.success) {
              setData(res.data);
              return;
            }
          } catch (e1) {
            // fall through to Firestore
          }
        }

        // Firestore fallback (Phone Link / offline)
        if (db) {
          try {
            const docRef = doc(db, 'stores', 'DEMO_STORE_001', 'data', 'parcels_transit');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data()) {
              const cloudData = snap.data();
              if (cloudData.allParcels || cloudData.summary) {
                setData({
                  activeInTransit: cloudData.activeInTransit || [],
                  allParcels: cloudData.allParcels || FALLBACK_PARCELS,
                  summary: {
                    incomingCount: cloudData.summary?.incomingCount ?? 0,
                    incomingPieces: cloudData.summary?.incomingPieces ?? 56,
                    incomingValue: cloudData.summary?.incomingValue ?? 29360,
                    monthPieces: cloudData.summary?.monthPieces || 1021,
                    monthValue: cloudData.summary?.monthValue || 561808,
                    monthParcelsCount: cloudData.summary?.monthParcelsCount || 7,
                    latestParcel: cloudData.summary?.latestParcel || cloudData.allParcels?.[0] || FALLBACK_PARCELS[0]
                  }
                });
                return;
              }
            }
          } catch (fsErr) {
            console.warn('[GoodsInTransitTab] Firestore getDoc error:', fsErr);
          }
        }
      } catch (err) {
        console.warn('[GoodsInTransitTab] fetchTransitData error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransitData();

    let unsubscribe = null;
    if (db) {
      try {
        const docRef = doc(db, 'stores', 'DEMO_STORE_001', 'data', 'parcels_transit');
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const cloudData = snap.data();
            if (cloudData.allParcels || cloudData.summary) {
              setData({
                activeInTransit: cloudData.activeInTransit || [],
                allParcels: cloudData.allParcels || FALLBACK_PARCELS,
                summary: {
                  incomingCount: cloudData.summary?.incomingCount ?? 0,
                  incomingPieces: cloudData.summary?.incomingPieces ?? 56,
                  incomingValue: cloudData.summary?.incomingValue ?? 29360,
                  monthPieces: cloudData.summary?.monthPieces || 1021,
                  monthValue: cloudData.summary?.monthValue || 561808,
                  monthParcelsCount: cloudData.summary?.monthParcelsCount || 7,
                  latestParcel: cloudData.summary?.latestParcel || cloudData.allParcels?.[0] || FALLBACK_PARCELS[0]
                }
              });
            }
          }
        }, (err) => console.warn('[GoodsInTransitTab] snapshot error:', err));
      } catch (e) {
        // ignore
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [API_BASE]);

  const recentDispatches = (data.allParcels && data.allParcels.length > 0)
    ? data.allParcels.map(p => ({
        id: p.parcel_memo_no || 'Unknown',
        challan: p.challan_no || p.invoice_no || 'WH',
        date: p.parcel_memo_dt ? new Date(p.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent',
        pcs: p.total_quantity || 0,
        val: (p.invoice_amount || 0).toLocaleString('en-IN'),
        status: p.status?.toLowerCase() === 'received' ? 'RECEIVED' : 'IN TRANSIT',
        vehicle: p.vehicle_no,
        ...p
      }))
    : [
        { id: 'WH00026127', challan: 'WH/T27-021196', date: '29 Sept', pcs: 56, val: '29,360', status: 'IN TRANSIT', vehicle: 'DL01LY5696' },
        { id: 'WH00024923', challan: 'WH/T27-020174', date: '23 Sept', pcs: 201, val: '1,09,506', status: 'RECEIVED', vehicle: 'DL01LAF4375' },
        { id: 'WH00024145', challan: 'WH/T27-018223', date: '19 Sept', pcs: 232, val: '1,22,907', status: 'RECEIVED', vehicle: 'DL01LAF4375' },
        { id: 'WH00023267', challan: 'WH/T27-018749', date: '14 Sept', pcs: 66, val: '38,430', status: 'RECEIVED', vehicle: 'DL01LAF4375' },
      ];

  const activeDispatch = recentDispatches.find(d => d.challan === selectedChallan) || recentDispatches[0];

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto">
      
      {/* LAYER 2: Master List (Middle Pane) */}
      <div className={`w-full lg:w-[380px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#0f1115] border-[#1c2436]' : 'bg-white border-slate-200'}`}>
        
        {/* Header / Stats */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#1c2436]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Inward Velocity
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>HO Central Warehouse</p>
            </div>
          </div>

          <div className={`rounded-xl p-3 flex justify-between ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Month Inflow</p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.summary?.monthPieces?.toLocaleString('en-IN') || '1,021'} <span className="text-xs text-slate-500 font-semibold">Pcs</span></p>
            </div>
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Value</p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(data.summary?.monthValue || 561808).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Search & List */}
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-[#1c2436]' : 'border-slate-100'}`}>
           <h3 className={`text-xs font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Recent Dispatches</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {recentDispatches.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedChallan(item.challan)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                selectedChallan === item.challan 
                  ? darkMode ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                  : darkMode ? 'bg-[#121829] border-[#232e47] hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'IN TRANSIT' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <p className={`font-mono font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>#{item.id}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  item.status === 'IN TRANSIT' 
                    ? darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-200'
                    : darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="flex justify-between items-end mt-3">
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.date} • HO Central WH</p>
                <div className="text-right">
                  <p className="text-emerald-500 font-bold text-xs">{item.pcs} pcs</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LAYER 3: Detail View (Main Pane) */}
      <div className={`flex-1 rounded-2xl border shadow-sm overflow-hidden flex flex-col relative ${darkMode ? 'bg-[#0f1115] border-[#1c2436]' : 'bg-white border-slate-200'}`}>
        {activeDispatch ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-start ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Dispatch {activeDispatch.id}
                  </h2>
                  <p className={`text-sm mt-0.5 font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Challan: {activeDispatch.challan}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-colors ${darkMode ? 'bg-[#121829] border-[#232e47] hover:bg-[#1a2333] text-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-600'}`}>
                  Print Challan <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className={`rounded-xl border p-5 mb-8 flex flex-col md:flex-row justify-between gap-4 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border inline-block ${
                    activeDispatch.status === 'IN TRANSIT'
                      ? 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                      : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                  }`}>
                    {activeDispatch.status}
                  </span>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Volume</p>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500 font-bold text-lg">{activeDispatch.pcs} Pcs</span>
                  </div>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Challan Value</p>
                  <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{activeDispatch.val}</p>
                </div>
              </div>
              
              {/* Table Data */}
              <div className="flex justify-between items-end mb-2 px-1">
                <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Purchase/Challan Details</span>
                <div className={`flex rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                  <button 
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                  >
                    Grouped
                  </button>
                  <button 
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-1 text-xs font-bold transition-colors ${viewMode === 'detailed' ? 'bg-blue-600 text-white' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                  >
                    Detailed
                  </button>
                </div>
              </div>
              
              <div className={`rounded-lg border overflow-y-auto overflow-x-auto max-h-[50vh] custom-scrollbar ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className={`text-xs uppercase font-bold sticky top-0 z-10 border-b ${darkMode ? 'bg-slate-800 text-blue-300 border-slate-700' : 'bg-blue-50 text-blue-800 border-slate-300'}`}>
                    {viewMode === 'grouped' ? (
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-700/50">Category (Desc)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Color (P1)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Size (P2)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">Total Qty</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-right">Avg MRP</th>
                        <th className="px-4 py-3 text-right">Total Value</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-700/50">Item Code</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Article No.</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Description</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para1</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para2</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para3</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">Qty</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">UOM</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-right">MRP</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {(() => {
                      const inTransitMatch = data.activeInTransit?.find(t => 
                        (t.challan_no || t.invoice_no) === activeDispatch?.challan
                      );
                      const sourceItems = inTransitMatch?.items 
                        ? inTransitMatch.items 
                        : (activeDispatch?.items || []);
                      
                      if (!sourceItems || sourceItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={viewMode === 'grouped' ? 6 : 10} className={`px-4 py-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No item-level details found for this dispatch.
                              </td>
                            </tr>
                          );
                      }

                      if (viewMode === 'grouped') {
                        // Group by category, color, and size
                        const grouped = sourceItems.reduce((acc, item) => {
                          const key = `${item.desc || 'UNKNOWN'}|${item.p1 || 'UNKNOWN'}|${item.p2 || 'UNKNOWN'}`;
                          if (!acc[key]) {
                            acc[key] = {
                              desc: item.desc || 'UNKNOWN',
                              p1: item.p1 || 'UNKNOWN',
                              p2: item.p2 || 'UNKNOWN',
                              qty: 0,
                              mrpSum: 0,
                              count: 0
                            };
                          }
                          acc[key].qty += (item.qty || 1);
                          acc[key].mrpSum += (item.mrp || 0) * (item.qty || 1);
                          acc[key].count += 1;
                          return acc;
                        }, {});
                        
                        return Object.values(grouped).map((g, idx) => (
                          <tr key={idx} className={`hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <td className={`px-4 py-2.5 font-bold border-r ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-600'}`}>{g.desc}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{g.p1}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{g.p2}</td>
                            <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>{g.qty} Pcs</td>
                            <td className="px-4 py-2.5 border-r text-right">₹{Math.round(g.mrpSum / g.qty).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">₹{g.mrpSum.toLocaleString('en-IN')}</td>
                          </tr>
                        ));
                      } else {
                        // Detailed view matching 2nd photo
                        return sourceItems.map((item, idx) => (
                          <tr key={idx} className={`hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <td className={`px-4 py-2.5 font-bold border-r ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-600'}`}>{item.code || 'UNKNOWN'}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.article || 'UNKNOWN'}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.desc || 'UNKNOWN'}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p1 || 'UNKNOWN'}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p2 || 'UNKNOWN'}</td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p3 || 'N/A'}</td>
                            <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>{item.qty || 1}</td>
                            <td className={`px-4 py-2.5 border-r text-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.uom || 'PCS'}</td>
                            <td className="px-4 py-2.5 border-r text-right font-mono">{(item.mrp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{(item.mrp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ));
                      }
                    })()}
                  </tbody>
                </table>
              </div>
              
              {activeDispatch.status === 'IN TRANSIT' && (
                <div className={`mt-8 p-6 rounded-xl border border-dashed flex flex-col items-center justify-center text-center ${darkMode ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'}`}>
                  <CheckCircle2 className={`w-10 h-10 mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <h4 className={`font-bold text-lg mb-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Ready to Receive?</h4>
                  <p className={`text-sm mb-4 max-w-sm ${darkMode ? 'text-indigo-300/70' : 'text-indigo-600/70'}`}>When the physical boxes arrive at the store, click below to scan and receive the goods into local inventory.</p>
                  <button className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                    <Box className="w-4 h-4" /> Start Inward Scan
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Package className={`w-16 h-16 mb-4 ${darkMode ? 'text-[#1c2436]' : 'text-slate-200'}`} />
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select a Dispatch</h3>
            <p className={`text-sm max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Choose an incoming shipment from the master list to view its full composition, tracking status, and start the inward scanning process.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoodsInTransitTab;
