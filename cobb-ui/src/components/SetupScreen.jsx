import React, { useState } from 'react';
import { CheckCircle2, Database, User, Building, ArrowRight } from 'lucide-react';

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else finishSetup();
  };

  const finishSetup = () => {
    setIsDeploying(true);
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
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Building className="text-emerald-400" /> Store Details</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Store Name" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
                <input type="text" placeholder="Store ID (e.g. DEMO_STORE_001)" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
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
