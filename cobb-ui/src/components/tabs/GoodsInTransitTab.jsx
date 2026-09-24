import React, { useState } from 'react';
import { Truck, Package, RotateCw, ExternalLink, ChevronRight, CheckCircle2, Box, X } from 'lucide-react';

const baseMockData = [
  { code: '0082012204', article: 'FPSAF2426', desc: 'TROUSER- FORMAL', p1: 'DARK GRAY', p2: '32 (81 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0082014316', article: 'FPSAF2426', desc: 'TROUSER- FORMAL', p1: 'GREY', p2: '40 (1.02 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0082013300', article: 'FPSAF2426', desc: 'TROUSER- FORMAL', p1: 'GREY', p2: '32 (81 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0077386201', article: 'FPRF2601', desc: 'TROUSER- FORMAL', p1: 'MIX', p2: '42 (1.07 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2299 },
  { code: '0081989495', article: 'CFKSE39031', desc: 'CASUAL FULL SL', p1: 'LT OLIVE 51', p2: '38 (97 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0081849910', article: 'CFAJ34036', desc: 'CASUAL FULL SL', p1: 'RUST 32', p2: '42 (1.07 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0081825990', article: 'CFJH1351', desc: 'CASUAL FULL SL', p1: 'D.BLUE', p2: '40 (1.02 MTR.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
  { code: '0081845855', article: 'CFAJ34036', desc: 'CASUAL FULL SL', p1: 'LEMON 25', p2: '38 (97 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2699 },
  { code: '0080992017', article: 'CFVN10422', desc: 'CASUAL FULL SL', p1: 'SKY BLUE', p2: '38 (97 CM.)', p3: 'NA', qty: 1, uom: 'PCS', mrp: 2999 },
];

const mockChallanItems = Array.from({ length: 201 }).map((_, idx) => ({
  ...baseMockData[idx % baseMockData.length],
}));

const GoodsInTransitTab = ({ darkMode }) => {
  const [selectedChallan, setSelectedChallan] = useState(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. GOODS IN TRANSIT CARD */}
      <div className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  GOODS IN TRANSIT
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-[10px] font-black border border-orange-500/30">
                  HO DISPATCH
                </span>
              </div>
              <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Incoming from Head Office Central Warehouse
              </p>
            </div>
          </div>
          <button className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Challan Highlight Box */}
        <div className={`rounded-xl border p-5 ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className={`font-mono font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>#WH00024923</span>
              <span className={`px-2 py-1 rounded text-xs font-mono border ${darkMode ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                Challan: WH/T27-020174
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 text-xs font-black border border-orange-500/30">
              IN TRANSIT
            </span>
          </div>

          <div className={`border-t border-dashed my-4 ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}></div>

          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <div>
                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Volume</p>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold text-lg">201 Pcs</span>
                  <span className={darkMode ? 'text-slate-500 text-sm' : 'text-slate-400 text-sm'}>(1 Box)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Vehicle: DL01LAF4375</span>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Challan Value</p>
                <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹1,09,506</p>
              </div>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>23 Sept</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center px-2">
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 Inflow (201 pcs)</span>
          <button 
            onClick={() => setSelectedChallan('WH/T27-020174')}
            className="text-amber-500 font-bold text-sm flex items-center gap-1 hover:text-amber-400 transition-colors"
          >
            View Challan <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. HO INWARD VELOCITY CARD */}
      <div className={`rounded-2xl border p-6 shadow-xl ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                HO INWARD VELOCITY
              </h2>
              <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Sept 2026 Restock & Supply
              </p>
            </div>
          </div>
          <button className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-blue-400' : 'border-slate-200 hover:bg-slate-50 text-blue-600'}`}>
            Log <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className={`rounded-xl border p-5 mb-6 flex justify-between ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>MONTH INFLOW</p>
            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>1,454 <span className="text-lg text-slate-500 font-semibold">Pcs</span></p>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>STOCK VALUE</p>
            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹7,94,221</p>
          </div>
        </div>

        <div>
          <h3 className={`text-xs font-black uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>RECENT RESTOCK DISPATCHES:</h3>
          <div className="space-y-3">
            {[
              { id: 'WH00024923', date: '23 Sept', pcs: 201, val: '1,09,506', dot: 'text-blue-500' },
              { id: 'WH00024145', date: '19 Sept', pcs: 232, val: '1,22,907', dot: 'text-blue-500' },
            ].map(item => (
              <div key={item.id} className={`rounded-xl border p-4 flex justify-between items-center ${darkMode ? 'bg-slate-900/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full bg-blue-500`}></div>
                  <div>
                    <p className={`font-mono font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.id}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.date} • Head Office Central WH</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-500 font-bold text-sm">{item.pcs} pcs</p>
                  <p className={`text-xs mt-0.5 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>₹{item.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center px-2">
          <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>9 consignments</span>
          <span className="flex items-center gap-1 text-emerald-500 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Auto-Synced with HO
          </span>
        </div>
      </div>

      {/* MODAL: ITEM DETAILS IN GIT */}
      {selectedChallan && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-5xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            
            <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-500" />
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Item Details in GIT</h3>
              </div>
              <button 
                onClick={() => setSelectedChallan(null)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`px-6 py-4 text-center border-b ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Challan No : {selectedChallan}</h2>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-end mb-2 px-1">
                <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Purchase/Challan Details</span>
                <button className="text-blue-500 text-xs font-semibold hover:underline">Show/Hide Columns</button>
              </div>
              
              <div className={`rounded-lg border overflow-y-auto overflow-x-auto max-h-[50vh] custom-scrollbar ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className={`text-xs uppercase font-bold sticky top-0 z-10 border-b ${darkMode ? 'bg-slate-800 text-blue-300 border-slate-700' : 'bg-blue-50 text-blue-800 border-slate-300'}`}>
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-700/50">Item Code</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Article No.</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Description</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Para1</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Para2</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Para3</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">Qty</th>
                      <th className="px-4 py-3 border-r border-slate-700/50">UOM</th>
                      <th className="px-4 py-3 text-right">MRP</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {mockChallanItems.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <td className={`px-4 py-2.5 font-mono border-r ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-600'}`}>{item.code}</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.article}</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.desc}</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p1}</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p2}</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.p3}</td>
                        <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>{item.qty}.00</td>
                        <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{item.uom}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{item.mrp.toLocaleString('en-IN')}.00</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-between items-center ${darkMode ? 'bg-[#121829] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Purchase/Challans in GIT...</span>
              <button 
                onClick={() => setSelectedChallan(null)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GoodsInTransitTab;
