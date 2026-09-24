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

  const recentDispatches = [
    { id: 'WH00024923', challan: 'WH/T27-020174', date: '23 Sept', pcs: 201, val: '1,09,506', status: 'IN TRANSIT' },
    { id: 'WH00024145', challan: 'WH/T27-018223', date: '19 Sept', pcs: 232, val: '1,22,907', status: 'RECEIVED' },
  ];

  const activeDispatch = recentDispatches.find(d => d.challan === selectedChallan);

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
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>1,454 <span className="text-xs text-slate-500 font-semibold">Pcs</span></p>
            </div>
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Value</p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹7,94,221</p>
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
                      <th className="px-4 py-3 border-r border-slate-700/50">Qty</th>
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
                        <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>{item.qty}.00</td>
                        <td className="px-4 py-2.5 text-right font-mono">{item.mrp.toLocaleString('en-IN')}.00</td>
                      </tr>
                    ))}
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
