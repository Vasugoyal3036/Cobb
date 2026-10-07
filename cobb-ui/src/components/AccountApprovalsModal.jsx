import React, { useEffect, useState } from 'react';
import { X, Check, Trash2, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const AccountApprovalsModal = ({ onClose }) => {
  const { activeStore } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, [activeStore]);

  const fetchAccounts = async () => {
    try {
      const accountsRef = doc(db, 'stores', activeStore, 'data', 'accounts');
      const snap = await getDoc(accountsRef);
      if (snap.exists()) {
        setPendingUsers(snap.data().pendingUsers || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAction = async (userReq, actionType) => {
    setLoading(true);
    try {
      const accountsRef = doc(db, 'stores', activeStore, 'data', 'accounts');
      const snap = await getDoc(accountsRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const newPending = (data.pendingUsers || []).filter(u => u.id !== userReq.id);
      
      let updateData = { pendingUsers: newPending };

      if (actionType === 'approve') {
        const approvedUser = {
          username: userReq.username,
          password: userReq.password,
          name: userReq.name,
          role: userReq.role
        };
        updateData.customUsers = [...(data.customUsers || []), approvedUser];
      }

      await setDoc(accountsRef, updateData, { merge: true });
      setPendingUsers(newPending);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-[#07090e] border-l border-white/10 w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <UserPlus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-black">Account Approvals</h2>
              <p className="text-xs text-slate-400">Manage New ID Requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending account requests.</p>
            </div>
          ) : (
            pendingUsers.map(req => (
              <div key={req.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold">{req.name}</h3>
                    <p className="text-xs text-slate-400 flex gap-2">
                      <span>ID: {req.username}</span>
                      <span>•</span>
                      <span className="uppercase text-amber-400">{req.role}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(req.requestedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleAction(req, 'reject')}
                    className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(req, 'approve')}
                    className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountApprovalsModal;
