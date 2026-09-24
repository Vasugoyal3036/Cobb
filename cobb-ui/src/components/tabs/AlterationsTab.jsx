import React, { useState, useEffect } from 'react';
import { Scissors, Search, Plus, Calendar, User, Phone, CheckCircle, Clock } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import AlterationSlipModal from '../AlterationSlipModal';

export default function AlterationsTab({ darkMode, activeStore = 'DEMO_STORE_001', formatCurrency }) {
  const [alterations, setAlterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const targetStore = activeStore === 'ALL' ? 'DEMO_STORE_001' : activeStore;
    const alterationsRef = collection(db, `stores/${targetStore}/alterations`);
    const q = query(alterationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slips = [];
      snapshot.forEach((d) => {
        slips.push({ id: d.id, ...d.data() });
      });
      setAlterations(slips);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching alterations:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeStore]);

  const markCompleted = async (slipId) => {
    try {
      const targetStore = activeStore === 'ALL' ? 'DEMO_STORE_001' : activeStore;
      const docRef = doc(db, `stores/${targetStore}/alterations`, slipId);
      await updateDoc(docRef, { status: 'Completed' });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filtered = alterations.filter(s => 
    (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery)
  );

  return (
    <div className={`p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <Scissors className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              Alterations Desk
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">
            Manage customer alteration requests and tailor slips
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center ${darkMode ? 'bg-[#0e1320] border-[#1c2436]' : 'bg-white border-slate-200'} border rounded-xl shadow-sm`}>
            <Search className="w-4 h-4 ml-3 text-slate-400 absolute" />
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2.5 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-transparent ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Slip</span>
          </button>
        </div>
      </div>

      {/* LIST SECTION */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#0e1320] border-[#1c2436]' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase font-black tracking-wider ${darkMode ? 'bg-[#151a26] text-slate-400 border-[#1c2436]' : 'bg-slate-50 text-slate-500 border-slate-200'} border-b`}>
              <tr>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Article</th>
                <th className="px-6 py-4">Expected By</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1c2436]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      Loading alterations...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-400 mb-4">
                      <Scissors className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No alteration slips found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50 dark:hover:bg-[#151a26]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-lg">
                          {(slip.customerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{slip.customerName}</p>
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {slip.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-slate-200">{slip.category}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Qty: {slip.quantity} • {slip.tailorName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{slip.expectedDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {slip.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {slip.status !== 'Completed' && (
                        <button 
                          onClick={() => markCompleted(slip.id)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline"
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlterationSlipModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        darkMode={darkMode} 
        storeId={activeStore} 
      />
    </div>
  );
}
