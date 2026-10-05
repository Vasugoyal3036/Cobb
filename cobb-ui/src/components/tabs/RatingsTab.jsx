import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Star,
  RefreshCw,
  Search,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  User,
  Phone,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Send,
  Sparkles
} from 'lucide-react';

export default function RatingsTab({
  API_BASE = 'http://localhost:5000',
  darkMode = true,
  openCustomerCard
}) {
  const [ratingsData, setRatingsData] = useState({
    ratings: [],
    summary: { total: 0, average: 5.0, nps: 100, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
  });
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState('all'); // 'all', '5', '4', '3', '2', '1', 'grievances'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/ratings`, { timeout: 4000 });
      if (res.data && res.data.ratings) {
        setRatingsData(res.data);
      }
    } catch (e) {
      console.warn('Ratings fetch failed, using offline fallback', e);
      // Fallback: check localStorage or keep current
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchRatings();
    const interval = setInterval(fetchRatings, 15000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const summary = ratingsData?.summary || {
    total: 0,
    average: 5.0,
    nps: 100,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };
  const list = ratingsData?.ratings || [];

  const filteredRatings = useMemo(() => {
    return list.filter(item => {
      // Star filter
      if (filterStar === '5' && item.rating !== 5) return false;
      if (filterStar === '4' && item.rating !== 4) return false;
      if (filterStar === '3' && item.rating !== 3) return false;
      if (filterStar === '2' && item.rating !== 2) return false;
      if (filterStar === '1' && item.rating !== 1) return false;
      if (filterStar === 'grievances' && item.rating > 3) return false;

      // Text search (phone, message, customerName)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const phoneMatch = String(item.phone || '').toLowerCase().includes(q);
        const msgMatch = String(item.message || '').toLowerCase().includes(q);
        const nameMatch = String(item.customerName || '').toLowerCase().includes(q);
        if (!phoneMatch && !msgMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [list, filterStar, searchQuery]);

  const npsColor =
    summary.nps >= 50
      ? 'text-emerald-400'
      : summary.nps >= 0
      ? 'text-amber-400'
      : 'text-rose-400';

  const npsBadgeBg =
    summary.nps >= 50
      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
      : summary.nps >= 0
      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      : 'bg-rose-500/15 border-rose-500/30 text-rose-300';

  const npsLabel =
    summary.nps >= 50 ? 'World-Class' : summary.nps >= 20 ? 'Good' : summary.nps >= 0 ? 'Needs Attention' : 'Critical Detractors';

  const promotersCount = list.filter(r => r.rating >= 4).length;
  const passivesCount = list.filter(r => r.rating === 3).length;
  const detractorsCount = list.filter(r => r.rating <= 2).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur-xl ${
        darkMode ? 'bg-gradient-to-r from-slate-900/90 via-amber-950/20 to-slate-900/90 border-amber-500/30 text-white' : 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-200 text-slate-900 shadow-amber-500/5'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 font-black">
            <Star className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Customer WhatsApp Ratings & NPS</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Live Feedback
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated post-checkout WhatsApp rating ledger, Net Promoter Score (NPS), and 1-3★ owner escalation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRatings}
            disabled={loading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              darkMode
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NPS Score */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1422] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Promoter Score (NPS)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${npsBadgeBg}`}>
              {npsLabel}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${npsColor}`}>
              {summary.nps > 0 ? `+${summary.nps}` : summary.nps}
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ +100</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Scale: -100 to +100</span>
            <span className="font-bold text-emerald-400">{promotersCount} Promoters</span>
          </div>
        </div>

        {/* Avg Rating */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1422] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Rating</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(Number(summary.average || 5))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{summary.average || '5.0'}</span>
            <span className="text-xs text-slate-400 font-semibold">out of 5.0</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Across <strong className="text-slate-200">{summary.total} total verified</strong> WhatsApp replies
          </p>
        </div>

        {/* Sentiment Distribution */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1422] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Customer Sentiment
          </span>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> Promoters (4-5★)
              </span>
              <span className="font-bold text-slate-200">{promotersCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Passives (3★)
              </span>
              <span className="font-bold text-slate-200">{passivesCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" /> Detractors (1-2★)
              </span>
              <span className="font-bold text-rose-400">{detractorsCount}</span>
            </div>
          </div>
        </div>

        {/* Low-Star Escalation Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          detractorsCount > 0 || passivesCount > 0
            ? darkMode
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-rose-50 border-rose-200'
            : darkMode
            ? 'bg-[#0f1422] border-slate-800/80'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Owner Escalation</span>
            <ShieldAlert className={`w-4 h-4 ${detractorsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${detractorsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {detractorsCount + passivesCount}
            </span>
            <span className="text-xs text-slate-400 font-semibold">reviews ≤ 3★</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {detractorsCount > 0
              ? 'Auto-forwarded to Owner phones via WhatsApp for quick recovery.'
              : 'Zero active critical grievances. Store service rating is spotless!'}
          </p>
        </div>
      </div>

      {/* Star Breakdown Chart & Fast Filters */}
      <div className={`p-5 rounded-2xl border ${
        darkMode ? 'bg-[#0f1422] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5">
          Star Distribution & Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[5, 4, 3, 2, 1].map(star => {
            const count = summary.breakdown[star] || 0;
            const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
            const barColor = star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-orange-400' : 'bg-rose-500';
            const isSelected = filterStar === String(star);

            return (
              <button
                key={star}
                type="button"
                onClick={() => setFilterStar(isSelected ? 'all' : String(star))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? darkMode
                      ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/50'
                      : 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                    : darkMode
                    ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                    {star} <Star className="w-3 h-3 fill-amber-400 inline" />
                  </span>
                  <span className="text-[11px] font-bold text-slate-300">
                    {count} <span className="text-[10px] text-slate-500">({pct}%)</span>
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reviews Ledger & Search */}
      <div className={`rounded-2xl border overflow-hidden ${
        darkMode ? 'bg-[#0f1422] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Filter bar */}
        <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'
        }`}>
          {/* Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStar('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStar === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800/60 text-slate-400 hover:text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All Reviews ({list.length})
            </button>
            <button
              onClick={() => setFilterStar('5')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStar === '5'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800/60 text-slate-400 hover:text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              5★ ({summary.breakdown[5] || 0})
            </button>
            <button
              onClick={() => setFilterStar('4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStar === '4'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800/60 text-slate-400 hover:text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              4★ ({summary.breakdown[4] || 0})
            </button>
            <button
              onClick={() => setFilterStar('3')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStar === '3'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800/60 text-slate-400 hover:text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              3★ ({summary.breakdown[3] || 0})
            </button>
            <button
              onClick={() => setFilterStar('grievances')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStar === 'grievances'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-rose-950/40 text-rose-300 hover:text-white border border-rose-500/30'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Grievances ≤ 3★ ({detractorsCount + passivesCount})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search phone or review text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none transition-all ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
              }`}
            />
          </div>
        </div>

        {/* Reviews list */}
        <div className="p-4 space-y-3">
          {filteredRatings.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-slate-400">No ratings found matching this filter</p>
              <p className="text-xs text-slate-500 mt-1">
                When customers reply with 1–5 on WhatsApp, reviews appear here instantly.
              </p>
            </div>
          ) : (
            filteredRatings.map((review, idx) => {
              const isGrievance = review.rating <= 3 || review.category === 'grievance';
              const cleanPhone = String(review.phone || '').replace(/\D/g, '');

              return (
                <div
                  key={review.id || `${review.phone}-${review.timestamp}-${idx}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isGrievance
                      ? darkMode
                        ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50'
                        : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                      : darkMode
                      ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Star rating + Customer info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= review.rating
                                  ? isGrievance
                                    ? 'fill-rose-400 text-rose-400'
                                    : 'fill-amber-400 text-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Rating number */}
                        <span className={`text-xs font-black ${isGrievance ? 'text-rose-400' : 'text-amber-400'}`}>
                          {review.rating}.0★
                        </span>

                        {/* Category tag */}
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border ${
                          isGrievance
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {isGrievance ? 'Detractor / Issue' : 'Promoter'}
                        </span>

                        {/* Timestamp */}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {review.timestamp ? new Date(review.timestamp).toLocaleString() : 'Just now'}
                        </span>
                      </div>

                      {/* Phone & Name */}
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{review.phone}</span>
                        {review.customerName && (
                          <span className="text-slate-400 font-normal">({review.customerName})</span>
                        )}
                        {review.billNo && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            Bill #{review.billNo}
                          </span>
                        )}
                      </div>

                      {/* Feedback message */}
                      <p className="text-xs text-slate-200 mt-1 font-medium italic">
                        "{review.message || (review.rating >= 4 ? 'Positive shopping experience' : 'Needs attention')}"
                      </p>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* View Profile */}
                      {typeof openCustomerCard === 'function' && review.phone && (
                        <button
                          type="button"
                          onClick={() => openCustomerCard({ Phone: review.phone, FirstName: review.customerName || 'Customer' })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            darkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                          }`}
                          title="Open Customer Profile & Purchase History"
                        >
                          <User className="w-3 h-3" />
                          <span>Profile</span>
                        </button>
                      )}

                      {/* WhatsApp Reply */}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                            isGrievance
                              ? `Dear Customer, we received your feedback regarding your recent visit to Cobb. We sincerely apologize for the inconvenience and would love to resolve this for you right away.`
                              : `Dear Customer, thank you so much for your 5-star rating at Cobb! We look forward to serving you again soon.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Reply directly to customer via WhatsApp"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
