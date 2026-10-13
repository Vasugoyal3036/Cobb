import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Crown,
  Sparkles,
  TrendingUp,
  Percent,
  DollarSign,
  ShoppingBag,
  Receipt,
  Target,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Sliders,
  PartyPopper,
  Medal,
  Activity
} from 'lucide-react';
import { db, hasConfig } from '../../utils/firebase';

const StaffFloorRaceWidget = ({
  darkMode = false,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  API_BASE = 'http://localhost:5000',
  activeStore = 'DEMO_STORE_001',
  setActiveTab
}) => {
  const [period, setPeriod] = useState('this_month'); // 'today' | 'this_week' | 'this_month' | 'all_time'
  const [loading, setLoading] = useState(false);
  const [rawBundle, setRawBundle] = useState(() => {
    try {
      const c = localStorage.getItem('cobb_staff_leaderboard_cache');
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  });
  const [config, setConfig] = useState(() => {
    try {
      const c = localStorage.getItem('cobb_staff_config_cache');
      return c ? JSON.parse(c) : {
        monthlyStoreTarget: 400000,
        staffTarget: 400000,
        incentiveSlabs: {
          tier1: { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
          tier2: { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
          tier3: { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
        },
        staffOverrides: {}
      };
    } catch {
      return {};
    }
  });

  const [simulatedBillAmount, setSimulatedBillAmount] = useState(15000);
  const [simulatedStaffId, setSimulatedStaffId] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [activeBadgeFilter, setActiveBadgeFilter] = useState('ALL'); // 'ALL' | 'TOP_GUN' | 'SPEED_DEMON' | 'AOV_MASTER'

  // Fetch staff bundle
  useEffect(() => {
    let isMounted = true;
    const fetchStaffData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/staff/leaderboard?period=bundle`, { timeout: 3500 });
        if (res.data && isMounted) {
          setRawBundle(res.data);
          try {
            localStorage.setItem('cobb_staff_leaderboard_cache', JSON.stringify(res.data));
          } catch {}
        }
      } catch {
        // Fallback to Firestore
        if (hasConfig && db) {
          try {
            const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
            const { doc, getDoc } = await import('firebase/firestore');
            const snap = await getDoc(doc(db, 'stores', storeId, 'data', 'staff_leaderboard'));
            if (snap.exists() && isMounted) {
              setRawBundle(snap.data());
            }
          } catch {}
        }
      }
    };
    fetchStaffData();
    return () => { isMounted = false; };
  }, [API_BASE, activeStore]);

  // Extract active period data
  const currentPeriodData = useMemo(() => {
    if (!rawBundle) return null;
    if (rawBundle.periods && rawBundle.periods[period]) {
      return rawBundle.periods[period];
    }
    if (rawBundle.period === period) {
      return rawBundle;
    }
    return rawBundle;
  }, [rawBundle, period]);

  // Format and enhance staff with gamification attributes
  const gamifiedStaff = useMemo(() => {
    const rawList = currentPeriodData?.staff || [];
    const ranked = rawList.filter(s => !s.isUnassigned);

    if (ranked.length === 0) return [];

    // Max values for relative race pacing
    const maxSales = Math.max(...ranked.map(s => s.totalSales || 0), 1);
    const maxBills = Math.max(...ranked.map(s => s.billsCount || 0), 1);
    const maxAov = Math.max(...ranked.map(s => s.aov || (s.totalSales / (s.billsCount || 1)) || 0), 1);

    const enhanced = ranked.map((s, index) => {
      const override = config.staffOverrides?.[s.empCode];
      const displayName = override?.name?.trim() || s.name || `Staff #${s.empCode}`;
      const target = override?.target || s.targetAmount || config.staffTarget || 400000;
      const totalSales = s.totalSales || 0;
      const billsCount = s.billsCount || 0;
      const aov = s.aov || (billsCount > 0 ? Math.round(totalSales / billsCount) : 0);
      const itemsCount = s.totalItems || s.itemsCount || 0;
      const achievementPct = target > 0 ? Math.min(Math.round((totalSales / target) * 100), 200) : 0;
      const raceProgress = Math.min(Math.round((totalSales / maxSales) * 100), 100);

      // Distance to next commission slab
      let nextSlabLabel = 'Top Slab (1.0%) Reached';
      let neededForNextSlab = 0;
      let currentRate = s.commissionRate || 0.5;

      if (totalSales < 200000) {
        neededForNextSlab = 200000 - totalSales;
        nextSlabLabel = 'Tier 3 (0.5%)';
      } else if (totalSales < 300000) {
        neededForNextSlab = 300000 - totalSales;
        nextSlabLabel = 'Tier 2 (0.75%)';
      } else if (totalSales < 400000) {
        neededForNextSlab = 400000 - totalSales;
        nextSlabLabel = 'Tier 1 (1.0%)';
      }

      // Gamification Badges
      const badges = [];
      if (index === 0) badges.push({ id: 'TOP_GUN', label: '👑 Top Gun', color: 'from-amber-400 to-yellow-500', desc: 'Revenue Leader' });
      if (billsCount === maxBills && billsCount > 0) badges.push({ id: 'SPEED_DEMON', label: '⚡ Speed Demon', color: 'from-cyan-400 to-blue-500', desc: 'Highest Bill Count' });
      if (aov === maxAov && aov > 0) badges.push({ id: 'AOV_MASTER', label: '🎯 Basket King', color: 'from-purple-400 to-pink-500', desc: 'Highest Basket Value' });
      if (achievementPct >= 100) badges.push({ id: 'TARGET_CRUSHER', label: '🛡️ Target Crusher', color: 'from-emerald-400 to-teal-500', desc: '100%+ Quota Met' });

      // Racer Theme Avatar & Color
      const racerAvatars = ['🏎️', '🚀', '⚡', '🛸', '🏍️', '🔥'];
      const avatar = racerAvatars[index % racerAvatars.length];

      return {
        ...s,
        displayName,
        target,
        totalSales,
        billsCount,
        aov,
        itemsCount,
        achievementPct,
        raceProgress,
        currentRate,
        neededForNextSlab,
        nextSlabLabel,
        badges,
        avatar,
        rank: index + 1
      };
    });

    return enhanced;
  }, [currentPeriodData, config]);

  // Set default simulated staff
  useEffect(() => {
    if (gamifiedStaff.length > 0 && !simulatedStaffId) {
      setSimulatedStaffId(gamifiedStaff[0].empCode);
    }
  }, [gamifiedStaff, simulatedStaffId]);

  // Active simulated staff calculations
  const simStaff = useMemo(() => {
    return gamifiedStaff.find(s => s.empCode === simulatedStaffId) || gamifiedStaff[0];
  }, [gamifiedStaff, simulatedStaffId]);

  const simulatedResult = useMemo(() => {
    if (!simStaff) return null;
    const newSales = simStaff.totalSales + Number(simulatedBillAmount || 0);
    let newRate = 0.5;
    if (newSales >= 400000) newRate = 1.0;
    else if (newSales >= 300000) newRate = 0.75;

    const oldPayout = Math.round((simStaff.totalSales * (simStaff.currentRate || 0.5)) / 100);
    const newPayout = Math.round((newSales * newRate) / 100);
    const bump = newPayout - oldPayout;

    return {
      newSales,
      newRate,
      oldPayout,
      newPayout,
      bump,
      upgraded: newRate > simStaff.currentRate
    };
  }, [simStaff, simulatedBillAmount]);

  // Trigger celebratory confetti effect
  const handleTriggerCelebration = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cobb_celebrate', {
          detail: {
            title: '🏆 FLOOR CHAMPION RECOGNITION!',
            subtitle: `Floor leader ${gamifiedStaff[0]?.displayName || 'Top Performer'} is smashing targets!`
          }
        })
      );
    }
  };

  const filteredStaff = useMemo(() => {
    if (activeBadgeFilter === 'ALL') return gamifiedStaff;
    return gamifiedStaff.filter(s => s.badges.some(b => b.id === activeBadgeFilter));
  }, [gamifiedStaff, activeBadgeFilter]);

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all duration-300 ${
      darkMode
        ? 'glass-card-obsidian text-slate-100 shadow-blue-950/20'
        : 'bg-gradient-to-b from-white via-slate-50 to-amber-50/20 border-slate-200/90 text-slate-800 shadow-slate-200/50'
    }`}>
      {/* Ambient Cyber Grid & Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      {/* CONFETTI BURST OVERLAY */}
      {confettiActive && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[2px]"></div>
          <div className="text-center p-6 rounded-3xl bg-slate-900/90 border border-amber-400/40 shadow-2xl text-white animate-bounce">
            <span className="text-5xl">🎉 🏆 🚀</span>
            <h3 className="text-xl font-black text-amber-400 mt-2">FLOOR CHAMPION CELEBRATION!</h3>
            <p className="text-xs text-slate-300 mt-1">High Five to {gamifiedStaff[0]?.displayName || 'The Leader'}!</p>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
              <Trophy className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                  <span>Sales Floor Grand Prix</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    🏁 LIVE TRACK
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gamified real-time race track, floor badges, and commission tier accelerator.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS: TIMEFRAME & CELEBRATE */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'Week' },
              { id: 'this_month', label: 'Month' },
              { id: 'all_time', label: 'All Time' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  period === p.id
                    ? 'bg-amber-500 text-white shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTriggerCelebration}
              className="flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              title="Celebrate Top Performer"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Celebrate Leader</span>
            </button>

            {typeof setActiveTab === 'function' && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Open Full Staff Leaderboard"
              >
                <span>Full</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN GAMIFIED RACETRACK & STANDINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 sm:gap-6 sm:mt-6 items-start relative z-10">

        {/* LEFT 7 COLS: THE SPRINT RACETRACK */}
        <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Floor Pace Track ({filteredStaff.length} racers)</span>
            </span>

            {/* Badge Filters */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] font-bold py-0.5">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'TOP_GUN', label: '👑 Leaders' },
                { id: 'SPEED_DEMON', label: '⚡ Speed' },
                { id: 'AOV_MASTER', label: '🎯 Basket' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveBadgeFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer shrink-0 active:scale-95 ${
                    activeBadgeFilter === f.id
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 font-black'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* RACETRACK LANES */}
          <div className="space-y-3">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                No staff sales recorded for selected period.
              </div>
            ) : (
              filteredStaff.map((staff, idx) => {
                const isLeader = staff.rank === 1;
                const progressWidth = Math.max(staff.raceProgress, 6);

                return (
                  <div
                    key={staff.empCode}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                      isLeader
                        ? darkMode
                          ? 'bg-gradient-to-r from-amber-950/30 via-[#161f36] to-[#0e1424] border-amber-500/40 shadow-lg shadow-amber-950/30'
                          : 'bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border-amber-400/60 shadow-md shadow-amber-200/50'
                        : darkMode
                          ? 'bg-[#121829]/70 border-slate-800/90 hover:border-slate-700'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Position Medal & Info Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Position Badge */}
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shrink-0 ${
                          staff.rank === 1
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/40 ring-2 ring-amber-300'
                            : staff.rank === 2
                              ? 'bg-slate-300 text-slate-900 ring-1 ring-slate-200'
                              : staff.rank === 3
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {staff.rank === 1 ? '1' : staff.rank}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {staff.displayName}
                            </span>
                            {staff.badges.map(b => (
                              <span
                                key={b.id}
                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-md bg-gradient-to-r ${b.color} text-slate-950 shadow-xs`}
                                title={b.desc}
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {staff.billsCount} bills • AOV: {formatCurrency(staff.aov)}
                          </span>
                        </div>
                      </div>

                      {/* Revenue & Commission Tag */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {formatCurrency(staff.totalSales)}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(Math.round((staff.totalSales * staff.currentRate) / 100))} comm. ({staff.currentRate}%)
                        </span>
                      </div>
                    </div>

                    {/* SPRINT RACETRACK LANE */}
                    <div className="relative mt-2 pt-1 pb-1">
                      {/* Track Background */}
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-800 relative">
                        {/* Checkered Finish Line Marker */}
                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-repeating-linear-gradient-45 from-amber-400 from-2px to-slate-900 to-4px opacity-40"></div>

                        {/* Racing Nitro Fuel Bar */}
                        <div
                          style={{ width: `${progressWidth}%` }}
                          className={`h-full rounded-full transition-all duration-700 relative ${
                            isLeader
                              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 shadow-md shadow-amber-500/50'
                              : staff.rank === 2
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : staff.rank === 3
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : 'bg-gradient-to-r from-slate-400 to-slate-500'
                          }`}
                        >
                          {/* Speed shimmer effect */}
                          <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full"></div>
                        </div>
                      </div>

                      {/* Racer Avatar Hovering at Front of Bar */}
                      <div
                        style={{ left: `calc(${progressWidth}% - 14px)` }}
                        className="absolute top-0 -translate-y-1 transition-all duration-700 pointer-events-none drop-shadow-md text-base"
                      >
                        {staff.avatar}
                      </div>
                    </div>

                    {/* Micro Milestone Pacer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1">
                      <span>{staff.achievementPct}% of ₹{Number(staff.target).toLocaleString('en-IN')} target</span>
                      {staff.neededForNextSlab > 0 ? (
                        <span className="text-amber-500 font-bold">
                          {formatCurrency(staff.neededForNextSlab)} to {staff.nextSlabLabel} 🚀
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-bold">Max 1.0% Rate Active 💎</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 5 COLS: COMMISSION ACCELERATOR & SLAB GAUGE */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-500" />
              <span>Instant Commission Accelerator</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Interactive Slabs
            </span>
          </div>

          {/* TIER PROGRESSION LADDER */}
          <div className={`p-4 rounded-2xl border ${
            darkMode ? 'bg-[#121829] border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm space-y-3`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>STORE COMMISSION SLABS</span>
              <span className="text-amber-500">Monthly Payout Ladder</span>
            </div>

            <div className="space-y-2">
              {[
                { threshold: '≥ ₹4,00,000', rate: '1.0%', title: 'Gold Champion', color: 'border-amber-500/40 bg-amber-500/10 text-amber-500', icon: '👑' },
                { threshold: '≥ ₹3,00,000', rate: '0.75%', title: 'Silver Pro', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-500', icon: '⭐' },
                { threshold: '≤ ₹2,00,000', rate: '0.50%', title: 'Base Floor', color: 'border-slate-500/30 bg-slate-500/10 text-slate-400', icon: '🛡️' }
              ].map((slab, i) => (
                <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${slab.color}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{slab.icon}</span>
                    <div>
                      <div className="font-black">{slab.threshold}</div>
                      <div className="text-[10px] opacity-80">{slab.title}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-sm">{slab.rate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE SIMULATOR CARD */}
          <div className={`p-4 rounded-2xl border relative overflow-hidden ${
            darkMode ? 'bg-[#121829] border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Simulate Next Sale Impact</span>
              </div>
              <span className="text-[10px] text-slate-400">Live Forecast</span>
            </div>

            {/* Select Staff */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Select Salesman
              </label>
              <select
                value={simulatedStaffId || ''}
                onChange={(e) => setSimulatedStaffId(e.target.value)}
                className={`w-full p-2 rounded-xl text-xs font-bold border transition ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {gamifiedStaff.map(s => (
                  <option key={s.empCode} value={s.empCode}>
                    {s.displayName} (Curr: {formatCurrency(s.totalSales)} • {s.currentRate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Amount Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">Bill Upsell Amount:</span>
                <span className="text-blue-500 font-mono font-black">{formatCurrency(simulatedBillAmount)}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="100000"
                step="2000"
                value={simulatedBillAmount}
                onChange={(e) => setSimulatedBillAmount(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-3.5 bg-slate-200 dark:bg-slate-800 rounded-lg touch-manipulation my-1"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹2K</span>
                <span>₹50K</span>
                <span>₹1 Lakh</span>
              </div>

              {/* Mobile Quick Tap Chips */}
              <div className="flex items-center gap-1.5 pt-1.5 overflow-x-auto no-scrollbar">
                {[5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimulatedBillAmount(amt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                      simulatedBillAmount === amt
                        ? 'bg-blue-500 text-white border-blue-400 shadow-xs'
                        : darkMode
                          ? 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Output Projection */}
            {simulatedResult && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Projected Total Sales:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {formatCurrency(simulatedResult.newSales)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Projected Payout:</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-500 text-sm">
                      {formatCurrency(simulatedResult.newPayout)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">
                      (+{formatCurrency(simulatedResult.bump)} gain)
                    </span>
                  </div>
                </div>

                {simulatedResult.upgraded && (
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black text-center border border-emerald-500/40 animate-pulse">
                    🚀 SLAB UPGRADE UNLOCKED: Moves to {simulatedResult.newRate}% Slab!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffFloorRaceWidget;
