import React from 'react';
import { X, CheckCircle2, AlertTriangle, Clock, ArrowRight, Package, Scissors, DollarSign, Star } from 'lucide-react';

export default function ActionCenterModal({ isOpen, onClose, darkMode }) {
  if (!isOpen) return null;

  const urgentAlerts = [
    { title: 'Alteration Due Today', sub: 'Bill #1042 - Sleeve shortening', icon: Scissors, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Inter-branch Transfer', sub: 'Parcel arriving from Karnal today', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Cash Tally Missing', sub: 'Yesterday EOD cash not approved', icon: DollarSign, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const recentActivity = [
    { title: 'Amit Sharma bought 3 items', time: '10 mins ago', icon: CheckCircle2 },
    { title: 'New Customer NPS Rating: 5/5', time: '1 hour ago', icon: Star },
    { title: 'Manager approved stock sync', time: '2 hours ago', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
      <div 
        className={`relative w-full max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ${
          darkMode ? 'bg-[#0f1115] text-white border-l border-white/10' : 'bg-white text-slate-900 border-l border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-6 py-5 border-b flex items-center justify-between ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
          <h2 className="text-lg font-black uppercase tracking-wider">Action Center</h2>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
            Urgent Tasks Today
          </h3>
          
          <div className="space-y-3 mb-8">
            {urgentAlerts.map((alert, idx) => {
              const Icon = alert.icon;
              return (
                <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border ${darkMode ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'} transition-all cursor-pointer`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${alert.bg}`}>
                    <Icon className={`w-4 h-4 ${alert.color}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{alert.title}</h4>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{alert.sub}</p>
                    <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${alert.color}`}>
                      Take Action <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            Recent Store Activity
          </h3>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {recentActivity.map((act, idx) => {
              const Icon = act.icon || CheckCircle2;
              return (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 z-10 shrink-0 ${
                    darkMode ? 'bg-[#0f1115] border-white/20' : 'bg-white border-slate-200'
                  }`}>
                    <Icon className={`w-3 h-3 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border shadow-sm transition-all text-left ml-4 md:ml-0 bg-white dark:bg-white/[0.02] dark:border-white/10 dark:text-slate-300">
                    <p className="text-xs font-semibold">{act.title}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{act.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
