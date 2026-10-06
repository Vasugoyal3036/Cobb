import React, { useState } from 'react';
import { CheckCircle2, Database, User, Building, ArrowRight } from 'lucide-react';

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);

  // Store profile and expenses state
  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [rent, setRent] = useState('40000');
  const [staffSalaries, setStaffSalaries] = useState('45000');
  const [electricity, setElectricity] = useState('15000');
  const [miscExpenses, setMiscExpenses] = useState('10000');
  const [targetMarginPct, setTargetMarginPct] = useState('27');
  const [dailyTargetSales, setDailyTargetSales] = useState('50000');

  const totalExpenses = (Number(rent) || 0) + (Number(staffSalaries) || 0) + (Number(electricity) || 0) + (Number(miscExpenses) || 0);
  const marginFrac = (Number(targetMarginPct) || 27) / 100;
  const dailyBreakEven = marginFrac > 0 ? Math.round((totalExpenses / 30) / marginFrac) : 0;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else finishSetup();
  };

  const finishSetup = () => {
    setIsDeploying(true);
    try {
      const configObj = {
        storeProfile: {
          storeName: storeName || 'Cobb Apparels',
          storeId: storeId || 'DEMO_STORE_001'
        },
        operatingExpenses: {
          rent: Number(rent) || 40000,
          staffSalaries: Number(staffSalaries) || 45000,
          electricity: Number(electricity) || 15000,
          miscExpenses: Number(miscExpenses) || 10000,
          totalExpenses,
          targetMarginPct: Number(targetMarginPct) || 27,
          dailyTargetSales: Number(dailyTargetSales) || 50000,
          dailyBreakEvenSales: dailyBreakEven
        }
      };
      localStorage.setItem('cobb_store_config', JSON.stringify(configObj));
    } catch (e) {}

    setTimeout(() => {
      setIsDeploying(false);
      if (onComplete) onComplete();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {isDeploying && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xl font-semibold">Configuring Workspace...</p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Welcome to Cobb CRM
          </h1>
          <p className="text-slate-400 mt-2">Let's get your store set up in a few simple steps.</p>
        </div>

        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
          
          {[
            { id: 1, icon: <Database size={20} /> },
            { id: 2, icon: <User size={20} /> },
            { id: 3, icon: <Building size={20} /> }
          ].map(s => (
            <div key={s.id} className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-colors ${step >= s.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {s.icon}
            </div>
          ))}
        </div>

        <div className="space-y-6 min-h-[200px]">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Database className="text-blue-400" /> Database Connection</h2>
              <p className="text-sm text-slate-400 mb-4">Your database configuration has been detected from your <code>.env</code> file. Do you want to test the connection?</p>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-emerald-400">
                DB_SERVER: localhost<br/>
                DB_NAME: RPD_AVATAR01_NEW_ST_POS
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><User className="text-purple-400" /> Create Owner Account</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors" />
                <input type="password" placeholder="Master Password" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-h-[55vh] overflow-y-auto pr-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2"><Building className="text-emerald-400" /> Store Details</h2>
                <p className="text-xs text-slate-400 mt-1">Set store identifiers and operating expense placeholders to power net profit &amp; break-even metrics.</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Store Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <input
                  type="text"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="Store ID (e.g. DEMO_STORE_001)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Operating Expense Placeholders */}
              <div className="pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Monthly Fixed Overheads (OPEX)</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Store Rent (₹/mo)</label>
                    <input
                      type="number"
                      value={rent}
                      onChange={(e) => setRent(e.target.value)}
                      placeholder="Store Rent (e.g. 40000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Staff Salaries (₹/mo)</label>
                    <input
                      type="number"
                      value={staffSalaries}
                      onChange={(e) => setStaffSalaries(e.target.value)}
                      placeholder="Staff Salaries (e.g. 45000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Electricity &amp; AC (₹/mo)</label>
                    <input
                      type="number"
                      value={electricity}
                      onChange={(e) => setElectricity(e.target.value)}
                      placeholder="Electricity & AC (e.g. 15000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Misc &amp; Maintenance (₹/mo)</label>
                    <input
                      type="number"
                      value={miscExpenses}
                      onChange={(e) => setMiscExpenses(e.target.value)}
                      placeholder="Misc & Maintenance (e.g. 10000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Benchmarks & Targets */}
              <div className="pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Targets &amp; Margin</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Target Gross Margin (%)</label>
                    <input
                      type="number"
                      value={targetMarginPct}
                      onChange={(e) => setTargetMarginPct(e.target.value)}
                      placeholder="Target Gross Margin % (e.g. 27)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Daily Sales Target (₹)</label>
                    <input
                      type="number"
                      value={dailyTargetSales}
                      onChange={(e) => setDailyTargetSales(e.target.value)}
                      placeholder="Daily Sales Target (e.g. 50000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Fixed Monthly Overhead:</span>
                  <span className="font-mono font-bold text-rose-400">₹{totalExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 mt-1">
                  <span>Daily Break-Even Sale Needed:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{dailyBreakEven.toLocaleString('en-IN')}/day</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {step === 3 ? 'Complete Setup' : 'Continue'} 
            {step === 3 ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
