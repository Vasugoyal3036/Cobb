import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  MapPin,
  FileText,
  Boxes,
  Calendar,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

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
    status: 'Delivered'
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

export default function GoodsInTransitDesk({
  formatCurrency = (v) => `₹${(v || 0).toLocaleString('en-IN')}`,
  darkMode = false,
  API_BASE = '',
  targetHeight = null,
  setActiveTab
}) {
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
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);

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
          // Fall through to Firestore
        }
      }

      // Cloud / Phone Link Firestore Sync:
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
          console.warn('[GoodsInTransitDesk] Firestore getDoc error:', fsErr);
        }
      }
    } catch (err) {
      console.warn('[GoodsInTransitDesk] fetch failed, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitData();
    const interval = setInterval(fetchTransitData, 60000);

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
        }, (err) => console.warn('[GoodsInTransitDesk] snapshot listener error:', err));
      } catch (e) {
        // ignore
      }
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [API_BASE]);

  const latest = data.summary?.latestParcel || data.activeInTransit?.[0] || FALLBACK_PARCELS[0];
  const summary = data.summary || {};
  const recentList = (data.allParcels && data.allParcels.length > 0 ? data.allParcels : FALLBACK_PARCELS).slice(0, 2);

  return (
    <div 
      style={{ height: targetHeight ? `${targetHeight}px` : undefined }}
      className="flex flex-col gap-3.5 w-full h-full transition-all"
    >
      {/* TILE 1: GOODS IN TRANSIT (LIVE HO PARCEL) */}
      <div
        className={`flex-1 min-h-0 rounded-2xl border shadow-sm p-3.5 sm:p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
          darkMode
            ? 'bg-[#0e1320] border-[#1c2436] text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-inherit shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className={`text-xs font-black uppercase tracking-wider truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Goods In Transit
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    darkMode
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  HO Dispatch
                </span>
              </div>
              <p className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Incoming from Head Office Central Warehouse
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchTransitData}
            title="Refresh Consignment Status"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              darkMode
                ? 'bg-[#121829] hover:bg-[#1a2336] text-slate-300 hover:text-white border-[#1c2436]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Consignment Hero Card */}
        {latest && (
          <div
            className={`my-auto p-3 rounded-xl border transition-all ${
              darkMode
                ? 'bg-[#121829] border-[#1c2436]'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`font-mono text-xs font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  #{latest.parcel_memo_no || 'HO-PARCEL'}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border truncate ${
                    darkMode
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  Challan: {latest.challan_no || latest.invoice_no || 'Pending'}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  latest.status === 'Arrived Today'
                    ? darkMode
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : darkMode
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {latest.status || 'In Transit'}
              </span>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-inherit text-xs">
              <div>
                <span className={`text-[11px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Stock Volume
                </span>
                <span className="font-bold text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Boxes className="w-3.5 h-3.5" />
                  {latest.total_quantity} Pcs
                  <span className={`text-[10px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    ({latest.total_boxes || 1} Box)
                  </span>
                </span>
              </div>

              <div className="text-right">
                <span className={`text-[11px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Challan Value
                </span>
                <span className={`font-mono font-black text-xs mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatCurrency(latest.invoice_amount)}
                </span>
              </div>
            </div>

            {/* Transport Vehicle Line */}
            {latest.vehicle_no && (
              <div className={`flex items-center justify-between text-[11px] mt-2 pt-1.5 border-t ${darkMode ? 'border-[#1c2436] text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                <span className="flex items-center gap-1.5 truncate">
                  <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                  Vehicle: <span className="font-bold font-mono text-slate-200">{latest.vehicle_no}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px]">
                  {latest.parcel_memo_dt ? new Date(latest.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-2 border-t border-inherit flex items-center justify-between shrink-0">
          <span className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {summary.incomingCount > 0
              ? `${summary.incomingCount} Inflow (${summary.incomingPieces} pcs)`
              : 'All parcels inwarded'}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab ? setActiveTab('transit') : setSelectedParcel(latest)}
            className={`text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
              darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:underline'
            }`}
          >
            <span>View Challan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TILE 2: HEAD OFFICE INWARD VELOCITY & SUPPLY LOG */}
      <div
        className={`flex-1 min-h-0 rounded-2xl border shadow-sm p-3.5 sm:p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
          darkMode
            ? 'bg-[#0e1320] border-[#1c2436] text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-inherit shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-xs font-black uppercase tracking-wider truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                HO Inward Velocity
              </h3>
              <p className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} Restock & Supply
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab ? setActiveTab('transit') : setShowAllModal(true)}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
              darkMode
                ? 'bg-[#121829] hover:bg-[#1a2336] text-blue-400 border-[#1c2436]'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            <span>Log</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Monthly Summary KPI Banner */}
        <div
          className={`my-auto p-2.5 rounded-xl border flex items-center justify-between ${
            darkMode
              ? 'bg-[#121829] border-[#1c2436]'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Month Inflow
            </span>
            <div className="text-sm font-black font-mono text-blue-400 flex items-center gap-1 mt-0.5">
              <span>{summary.monthPieces ? summary.monthPieces.toLocaleString('en-IN') : '1,021'}</span>
              <span className="text-[11px] font-sans font-normal text-slate-400">Pcs</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Stock Value
            </span>
            <div className={`text-sm font-mono font-black mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatCurrency(summary.monthValue || 561808)}
            </div>
          </div>
        </div>

        {/* Mini Consignments Feed */}
        <div className="space-y-1.5 mb-1">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Recent Restock Dispatches:
          </span>
          <div className="space-y-1">
            {recentList.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedParcel(item)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  darkMode
                    ? 'bg-[#121829] hover:bg-[#182035] border-[#1c2436] text-slate-300'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold font-mono truncate block">{item.parcel_memo_no}</span>
                    <span className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.parcel_memo_dt ? new Date(item.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'} • {item.origin_name || 'HO'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold font-mono block text-emerald-400">{item.total_quantity} pcs</span>
                  <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatCurrency(item.invoice_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className={`pt-2 border-t border-inherit flex items-center justify-between text-xs shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <span className="font-mono text-[11px]">{summary.monthParcelsCount || 7} consignments</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3 h-3" /> Auto-Synced with HO
          </span>
        </div>
      </div>

      {/* MODAL 1: SINGLE PARCEL / CHALLAN BREAKDOWN */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 sm:p-6 relative transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedParcel(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-xl border transition-colors cursor-pointer ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">Consignment & Challan Details</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Memo #{selectedParcel.parcel_memo_no} • {selectedParcel.origin_name || 'Head Office'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 mb-4 text-xs ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Transfer Challan No:</span>
                <span className="font-mono font-bold">{selectedParcel.challan_no || selectedParcel.invoice_no || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Dispatch Date:</span>
                <span className="font-bold">
                  {selectedParcel.parcel_memo_dt ? new Date(selectedParcel.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Today'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Vehicle Number:</span>
                <span className="font-mono font-black text-amber-400">{selectedParcel.vehicle_no || 'Direct Dispatch'}</span>
              </div>
              {selectedParcel.bilty_no && (
                <div className="flex justify-between items-center">
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Bilty / Docket No:</span>
                  <span className="font-mono font-bold text-blue-400">{selectedParcel.bilty_no}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Total Pieces / Box Count:</span>
                <span className="font-bold text-emerald-400">{selectedParcel.total_quantity} Pieces ({selectedParcel.total_boxes || 1} Box • {selectedParcel.total_weight || 0} kg)</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-inherit">
                <span className="font-bold">Total Invoice Value:</span>
                <span className="font-mono font-black text-base text-emerald-400">
                  {formatCurrency(selectedParcel.invoice_amount)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE INWARD DELIVERY LOG */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-5 sm:p-6 relative max-h-[85vh] flex flex-col transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowAllModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-xl border transition-colors cursor-pointer ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">All Inward Consignments & Dispatches</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Complete record of stock consignments from Head Office and sister stores
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar my-2">
              {(data.allParcels || FALLBACK_PARCELS).map((p, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    darkMode ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{p.parcel_memo_no}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                        darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {p.origin_name || 'HO Warehouse'}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {p.parcel_memo_dt ? new Date(p.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} • Challan: {p.challan_no || 'WH'} {p.vehicle_no ? `• Truck: ${p.vehicle_no}` : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-400 block">{p.total_quantity} Pcs</span>
                    <span className={`font-mono text-[10px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatCurrency(p.invoice_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-inherit flex justify-between items-center text-xs shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                Total Records: {(data.allParcels || FALLBACK_PARCELS).length} Consignments
              </span>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className={`px-4 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
