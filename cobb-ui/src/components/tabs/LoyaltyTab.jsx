import React, { useState, useEffect, useMemo } from 'react';
import { Crown, Search, Send, Trophy, Sparkles, RefreshCw, Smartphone, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import ThreeLayerLayout from '../ThreeLayerLayout';

export default function LoyaltyTab(props) {
  const { API_BASE, darkMode } = props;
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sentStatus, setSentStatus] = useState({});

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/loyalty/leaderboard`);
      setLeaderboard(res.data || []);
      if (res.data?.length > 0 && !selectedCustomer) {
        setSelectedCustomer(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendLoyaltyCard = async (customer) => {
    try {
      const cardUrl = `${API_BASE}/api/loyalty/card/${customer.phone}`;
      const message = `🎉 Hello *${customer.customerName}*! 👋\n\nThank you for being a valued *${customer.tier}* member at Cobb.\n\nHere is your digital Loyalty VIP Card: ${cardUrl}\n\nShow this card on your next visit to redeem your ${customer.points} points!\n\nWarm Regards,\nCobb Store`;
      
      await axios.post(`${API_BASE}/api/whatsapp/send`, {
        phone: customer.phone,
        message
      });
      
      setSentStatus(prev => ({ ...prev, [customer.phone]: true }));
    } catch (err) {
      console.error(err);
      alert('Failed to send WhatsApp message');
    }
  };

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leaderboard;
    return leaderboard.filter(c => 
      c.customerName?.toLowerCase().includes(q) || 
      c.phone?.includes(q)
    );
  }, [leaderboard, searchQuery]);

  const renderMasterItem = (cust, active) => {
    const rank = leaderboard.findIndex(l => l.phone === cust.phone) + 1;
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shrink-0 ${
            rank === 1 ? 'bg-amber-100 text-amber-600' : 
            rank === 2 ? (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600') :
            rank === 3 ? 'bg-orange-100 text-orange-700' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
          }`}>
            #{rank}
          </span>
          <div className="min-w-0">
            <h4 className={`font-bold text-sm truncate flex items-center gap-1.5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {cust.customerName}
              {rank <= 3 && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </h4>
            <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{cust.phone}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="font-black text-amber-500 text-sm">{cust.points.toLocaleString('en-IN')} pts</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: `${cust.tierColor}20`, color: cust.tierColor, border: `1px solid ${cust.tierColor}40` }}>
            {cust.tier}
          </span>
        </div>
      </div>
    );
  };

  const renderDetail = (cust) => {
    const rank = leaderboard.findIndex(l => l.phone === cust.phone) + 1;
    return (
      <>
        <div className={`p-6 lg:p-8 border-b flex justify-between items-start ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div>
            <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest">VIP Member Profile</span>
            <h3 className={`text-2xl lg:text-3xl font-black mt-2 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {cust.customerName}
              {rank <= 3 && <Trophy className="w-6 h-6 text-amber-500" />}
            </h3>
            <p className={`mt-1 font-mono text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{cust.phone}</p>
          </div>
          <button 
            onClick={() => sendLoyaltyCard(cust)}
            disabled={sentStatus[cust.phone]}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center transition-all ${
              sentStatus[cust.phone] 
                ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30'
            }`}
          >
            {sentStatus[cust.phone] ? <CheckCircle2 className="w-5 h-5 mr-2"/> : <Send className="w-5 h-5 mr-2" />}
            {sentStatus[cust.phone] ? 'Card Sent' : 'WhatsApp Digital Card'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-2xl border relative overflow-hidden flex flex-col justify-center items-center text-center ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: cust.tierColor }}></div>
              <Crown className="w-12 h-12 mb-3" style={{ color: cust.tierColor }} />
              <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-widest mb-2" style={{ color: cust.tierColor }}>
                {cust.tier} TIER
              </div>
              <p className={`text-xs font-bold uppercase mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rank: #{rank}</p>
            </div>

            <div className={`p-6 rounded-2xl border flex flex-col justify-center gap-6 ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <div className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Current Points Balance</div>
                <div className="text-3xl font-black text-amber-500 mt-1">{cust.points.toLocaleString('en-IN')}</div>
              </div>
              <div className={`w-full h-px ${darkMode ? 'bg-[#232e47]' : 'bg-slate-200'}`}></div>
              <div>
                <div className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Redeemable Cash Value</div>
                <div className="text-3xl font-black text-emerald-500 mt-1">₹{cust.pointsValue.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Lifetime Engagement</h4>
            <div className="flex items-end gap-3">
              <span className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>₹{cust.lifetimeSpend.toLocaleString('en-IN')}</span>
              <span className={`text-sm font-medium pb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>total spent</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <ThreeLayerLayout
      darkMode={darkMode}
      title="Loyalty Leaderboard"
      icon={Crown}
      iconColorClass="bg-amber-500 shadow-amber-500/30"
      items={filteredLeaderboard}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search VIPs by name or phone..."
      renderMasterItem={renderMasterItem}
      onItemClick={setSelectedCustomer}
      selectedItem={selectedCustomer}
      renderDetail={renderDetail}
      emptyMasterText={loading ? "Loading VIPs..." : "No VIPs found."}
      emptyDetailTitle="Select a VIP Member"
      emptyDetailText="Choose a customer from the leaderboard to view their points and send their digital loyalty card."
      emptyDetailIcon={Crown}
    />
  );
}
