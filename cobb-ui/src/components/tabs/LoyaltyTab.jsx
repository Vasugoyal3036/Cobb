import React, { useState, useEffect } from 'react';
import { Crown, Search, Send, Users, ArrowUpRight, Trophy, Sparkles, RefreshCw, Smartphone } from 'lucide-react';
import axios from 'axios';

const API_BASE = window.location.origin.includes('localhost:5173') ? 'http://localhost:5000' : window.location.origin;

export default function LoyaltyTab() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sentStatus, setSentStatus] = useState({}); // to track which links have been sent

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/loyalty/leaderboard`);
      setLeaderboard(res.data || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchPhone.trim() || searchPhone.length < 10) return;
    
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await axios.get(`${API_BASE}/api/loyalty/customer/${searchPhone}`);
      setSearchResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Customer not found');
    } finally {
      setSearching(false);
    }
  };

  const sendLoyaltyCard = async (customer) => {
    try {
      const cardUrl = `${API_BASE}/api/loyalty/card/${customer.phone}`;
      const message = `🎉 Hello *${customer.customerName}*! 👋\n\nThank you for being a valued *${customer.tier}* member at Cobb.\n\nHere is your digital Loyalty VIP Card: ${cardUrl}\n\nShow this card on your next visit to redeem your ${customer.points} points!\n\nWarm Regards,\nCobb Store`;
      
      const res = await axios.post(`${API_BASE}/api/whatsapp/send`, {
        phone: customer.phone,
        message
      });
      
      setSentStatus(prev => ({ ...prev, [customer.phone]: true }));
    } catch (err) {
      console.error(err);
      alert('Failed to send WhatsApp message');
    }
  };

  const blastAll = async () => {
    if(!window.confirm(`Send loyalty cards via WhatsApp to all ${leaderboard.length} VIP members?`)) return;
    
    // In a real app, queue these to avoid rate limits
    for (const cust of leaderboard) {
      await sendLoyaltyCard(cust);
    }
    alert('All loyalty cards queued for sending!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-500" />
            No-App Customer Loyalty
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Automatic points tracking and digital VIP cards sent straight to WhatsApp.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLeaderboard} 
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
          
          <button 
            onClick={blastAll}
            disabled={loading || leaderboard.length === 0}
            className="px-6 py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Smartphone className="w-5 h-5" />
            Blast Cards to All VIPs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lookup and Preview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" /> Lookup Customer
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text"
                placeholder="Phone Number"
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <button 
                type="submit"
                disabled={searching}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {searching ? <RefreshCw className="w-5 h-5 animate-spin"/> : <ArrowUpRight className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {searchResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ background: searchResult.tierColor }}
              ></div>
              
              <div className="relative z-10 text-center">
                <Crown className="w-12 h-12 mx-auto mb-2" style={{ color: searchResult.tierColor }} />
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ color: searchResult.tierColor }}>
                  {searchResult.tier} TIER
                </div>
                
                <h3 className="text-2xl font-black text-slate-800">{searchResult.customerName}</h3>
                <p className="text-sm text-slate-500 mb-6">{searchResult.phone}</p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-around">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Points</div>
                    <div className="text-xl font-black text-amber-600">{searchResult.points.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Value</div>
                    <div className="text-xl font-black text-emerald-600">₹{searchResult.pointsValue.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <a 
                    href={`${API_BASE}/api/loyalty/card/${searchResult.phone}`}
                    target="_blank" rel="noreferrer"
                    className="block w-full py-3 bg-white border-2 border-slate-200 hover:border-amber-300 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    View Digital Card
                  </a>
                  <button 
                    onClick={() => sendLoyaltyCard(searchResult)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5"/> Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> VIP Leaderboard
              </h2>
              <div className="text-sm font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border shadow-sm">
                Top 50 Members
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                    <th className="p-4 text-center">Rank</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Lifetime Spend</th>
                    <th className="p-4">Points</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {loading ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading VIPs...</td></tr>
                  ) : leaderboard.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No VIPs found.</td></tr>
                  ) : leaderboard.map((cust, i) => (
                    <tr key={cust.phone} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
                          i === 0 ? 'bg-amber-100 text-amber-600' : 
                          i === 1 ? 'bg-slate-200 text-slate-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          #{i+1}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {cust.customerName}
                          {i < 3 && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="text-xs text-slate-500">{cust.phone}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm" style={{ backgroundColor: `${cust.tierColor}20`, color: cust.tierColor, border: `1px solid ${cust.tierColor}40` }}>
                          {cust.tier}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-600">₹{cust.lifetimeSpend.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-black text-amber-600">{cust.points.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => sendLoyaltyCard(cust)}
                          disabled={sentStatus[cust.phone]}
                          className={`p-2 rounded-lg transition-colors ${
                            sentStatus[cust.phone] 
                              ? 'bg-green-100 text-green-600 cursor-not-allowed' 
                              : 'bg-green-50 hover:bg-green-100 text-green-600'
                          }`}
                          title="Send Card to WhatsApp"
                        >
                          {sentStatus[cust.phone] ? <CheckCircle2 className="w-5 h-5"/> : <Send className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
