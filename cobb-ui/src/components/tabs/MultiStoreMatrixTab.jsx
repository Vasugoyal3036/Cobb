import React, { useState, useEffect } from 'react';
import { Network, Store, TrendingUp, IndianRupee, MapPin, CheckCircle2, AlertCircle, Package } from 'lucide-react';

// Mock data to simulate franchise stores
const MOCK_STORES = [
  {
    id: 'DEMO_STORE_001',
    name: 'Store Branch 1',
    manager: 'Manager 1',
    status: 'online',
    todaySales: 0,
    target: 0,
    git: 0
  },
  {
    id: 'DEMO_STORE_002',
    name: 'Store Branch 2',
    manager: 'Manager 2',
    status: 'online',
    todaySales: 0,
    target: 0,
    git: 0
  },
  {
    id: 'DEMO_STORE_003',
    name: 'Store Branch 3',
    manager: 'Manager 3',
    status: 'warning',
    todaySales: 0,
    target: 0,
    git: 0
  }
];

export default function MultiStoreMatrixTab({ darkMode, formatCurrency }) {
  const [stores, setStores] = useState(MOCK_STORES);

  // In a real app, we would fetch live data here
  // useEffect(() => { fetchStores() }, []);

  const totalSales = stores.reduce((sum, s) => sum + s.todaySales, 0);
  const totalTarget = stores.reduce((sum, s) => sum + s.target, 0);
  const aggregateProgress = totalTarget > 0 ? Math.round((totalSales / totalTarget) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Network className="w-7 h-7 text-blue-500" />
            <span className={darkMode ? 'text-white' : 'text-slate-900'}>Multi-Store Network</span>
          </h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            Bird's-eye view of franchise pulse and stock transfers
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Global Revenue</div>
          <div className="text-xl font-black text-emerald-500">{formatCurrency(totalSales)}</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto min-h-0">
        {stores.map((store) => {
          const progress = store.target > 0 ? Math.round((store.todaySales / store.target) * 100) : 0;
          return (
            <div 
              key={store.id}
              className={`flex flex-col rounded-2xl border shadow-sm overflow-hidden ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 border-b border-inherit flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    store.status === 'online' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{store.name}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ID: {store.id}</p>
                  </div>
                </div>
                {store.status === 'online' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-500 uppercase">Today's Pulse</span>
                    <span className="font-bold text-emerald-500">{formatCurrency(store.todaySales)}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1 font-mono text-slate-400">
                    <span>{progress}% of target</span>
                    <span>{formatCurrency(store.target)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-inherit">
                  <div className={`p-2 rounded-lg border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Manager
                    </div>
                    <div className="text-sm font-semibold mt-1">{store.manager}</div>
                  </div>
                  <div className={`p-2 rounded-lg border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Package className="w-3 h-3" /> In Transit
                    </div>
                    <div className="text-sm font-semibold mt-1 text-blue-500">{store.git} Parcels</div>
                  </div>
                </div>
              </div>

              <div className={`mt-auto p-3 text-xs font-bold text-center cursor-pointer transition-colors ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
              }`}>
                View Branch Detail →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
