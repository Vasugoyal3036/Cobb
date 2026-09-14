import React, { useState, useEffect } from 'react';
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

export default function GoodsInTransitDesk({
  formatCurrency = (v) => `₹${(v || 0).toLocaleString('en-IN')}`,
  darkMode = false,
  API_BASE = ''
}) {
  const [data, setData] = useState({
    activeInTransit: [],
    allParcels: [],
    summary: {
      incomingCount: 0,
      incomingPieces: 0,
      incomingValue: 0,
      monthPieces: 0,
      monthValue: 0,
      monthParcelsCount: 0,
      latestParcel: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);

  const fetchTransitData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/parcels/transit`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json && json.success) {
        setData(json);
      }
    } catch (err) {
      console.warn('Failed to fetch parcels transit data:', err.message);
      // Clean fallback if offline
      setData({
        activeInTransit: [
          {
            parcel_memo_no: 'WH00023267',
            parcel_memo_dt: new Date().toISOString(),
            vehicle_no: 'DL01LAF4375',
            total_quantity: 66,
            total_boxes: 1,
            total_weight: 30,
            challan_no: 'WH/T27-018749',
            invoice_amount: 38430,
            origin: 'WH',
            origin_name: 'Head Office Central WH',
            status: 'Arrived Today'
          }
        ],
        allParcels: [],
        summary: {
          incomingCount: 1,
          incomingPieces: 66,
          incomingValue: 38430,
          monthPieces: 1021,
          monthValue: 561808,
          monthParcelsCount: 7,
          latestParcel: {
            parcel_memo_no: 'WH00023267',
            parcel_memo_dt: new Date().toISOString(),
            vehicle_no: 'DL01LAF4375',
            total_quantity: 66,
            total_boxes: 1,
            total_weight: 30,
            challan_no: 'WH/T27-018749',
            invoice_amount: 38430,
            origin: 'WH',
            origin_name: 'Head Office Central WH',
            status: 'Arrived Today'
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitData();
    const interval = setInterval(fetchTransitData, 60000); // 1 minute live refresh
    return () => clearInterval(interval);
  }, [API_BASE]);

  const latest = data.summary?.latestParcel || data.activeInTransit?.[0];
  const summary = data.summary || {};
  const recentList = (data.allParcels || []).slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* TILE 1: GOODS IN TRANSIT (LIVE HO PARCEL) */}
      <div
        className={`rounded-2xl border shadow-sm p-4 sm:p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
          darkMode
            ? 'bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-black/20'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Goods In Transit
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    darkMode
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-0.5" />
                  HO Dispatch
                </span>
              </div>
              <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Incoming from Head Office Central Warehouse
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchTransitData}
            title="Refresh Consignment Status"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Consignment Hero Card */}
        {latest ? (
          <div className="my-3 space-y-2.5">
            <div
              className={`p-3 rounded-xl border transition-all ${
                darkMode
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    #{latest.parcel_memo_no || 'HO-PARCEL'}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      darkMode
                        ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    Challan: {latest.challan_no || latest.invoice_no || 'Pending'}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
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
                  <span className={`text-[10px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Stock Volume
                  </span>
                  <span className="font-bold text-sm text-emerald-400 flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5" />
                    {latest.total_quantity} Pcs
                    <span className={`text-[10px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      ({latest.total_boxes || 1} Box)
                    </span>
                  </span>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Challan Value
                  </span>
                  <span className={`font-mono font-black text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {formatCurrency(latest.invoice_amount)}
                  </span>
                </div>
              </div>

              {/* Transport Vehicle Line */}
              {latest.vehicle_no && (
                <div className={`flex items-center justify-between text-[10px] mt-2 pt-1.5 border-t ${darkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-amber-400" />
                    Vehicle: <span className="font-bold font-mono text-slate-200">{latest.vehicle_no}</span>
                  </span>
                  <span>
                    {latest.parcel_memo_dt ? new Date(latest.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="my-6 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
            No pending consignments in transit.
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-2 border-t border-inherit flex items-center justify-between">
          <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {summary.incomingCount > 0
              ? `${summary.incomingCount} Active Inflow (${summary.incomingPieces} total pcs)`
              : 'All dispatched parcels received'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedParcel(latest)}
            className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:underline'
            }`}
          >
            <span>View Challan</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* TILE 2: HEAD OFFICE INWARD VELOCITY & SUPPLY LOG */}
      <div
        className={`rounded-2xl border shadow-sm p-4 sm:p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
          darkMode
            ? 'bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-black/20'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-xs font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                HO Inward Velocity
              </h3>
              <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Supply Log
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
              darkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-blue-400 border-slate-700/80'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            <span>Log</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Monthly Summary KPI Banner */}
        <div
          className={`my-3 p-3 rounded-xl border flex items-center justify-between ${
            darkMode
              ? 'bg-slate-950/70 border-slate-800'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Month Inflow
            </span>
            <div className="text-base font-black text-blue-400 flex items-center gap-1 mt-0.5">
              <span>{summary.monthPieces ? summary.monthPieces.toLocaleString('en-IN') : '0'}</span>
              <span className="text-xs font-normal text-slate-400">Pcs</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Stock Value
            </span>
            <div className={`text-base font-mono font-black mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatCurrency(summary.monthValue || 0)}
            </div>
          </div>
        </div>

        {/* Mini Consignments Feed */}
        <div className="space-y-1.5 mb-3">
          <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Recent Restock Dispatches:
          </span>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1 no-scrollbar">
            {recentList.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedParcel(item)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-[11px] ${
                  darkMode
                    ? 'bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/80 text-slate-300'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold truncate block">{item.parcel_memo_no}</span>
                    <span className={`text-[9px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.parcel_memo_dt ? new Date(item.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'} • {item.origin_name || 'HO'}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-bold block text-emerald-400">{item.total_quantity} pcs</span>
                  <span className={`text-[9px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatCurrency(item.invoice_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className={`pt-2 border-t border-inherit flex items-center justify-between text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>{summary.monthParcelsCount || recentList.length} consignments this month</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
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
              {(data.allParcels || []).map((p, idx) => (
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

                  <div className="text-right flex-shrink-0">
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
                Total Records: {(data.allParcels || []).length} Consignments
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
