import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Trophy,
  Award,
  Crown,
  Users,
  TrendingUp,
  Percent,
  Target,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  Settings,
  Flame,
  ShoppingBag,
  Receipt,
  Layers,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function StaffLeaderboardTab({ API_BASE = 'http://localhost:5000' }) {
  const { addToast } = useToast();
  const [period, setPeriod] = useState('all_time');
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    defaultCommissionPct: 1.5,
    monthlyStoreTarget: 500000,
    dailyStoreTarget: 25000,
    bonusThreshold: 100000,
    bonusCommissionPct: 0.5,
    staffOverrides: {}
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/staff/leaderboard?period=${period}`);
      if (res.data) {
        setLeaderboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load staff leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/staff/config`);
      if (res.data) {
        setConfigForm(res.data);
      }
    } catch (err) {
      console.error('Failed to load staff config:', err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await axios.post(`${API_BASE}/api/staff/config`, configForm);
      if (addToast) addToast('Commission & Targets updated successfully!', 'success');
      setShowConfigModal(false);
      fetchLeaderboard();
    } catch (err) {
      if (addToast) addToast('Failed to save config: ' + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const staffList = leaderboardData?.staff || [];
  const summary = leaderboardData?.summary || {};

  // Separate ranked named staff from unassigned direct counter
  const rankedStaff = staffList.filter(s => !s.isUnassigned);
  const unassignedSales = staffList.find(s => s.isUnassigned);

  const top1 = rankedStaff[0];
  const top2 = rankedStaff[1];
  const top3 = rankedStaff[2];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner & Timeframe Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 rounded-3xl border border-amber-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Sales Staff Leaderboard & Commissions
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time salesperson attribution, quota achievements, and automated commission payouts
          </p>
        </div>

        {/* Action Buttons & Period Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all_time', label: 'All Time' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  period === p.id
                    ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Targets & Rates
          </button>

          <button
            onClick={fetchLeaderboard}
            className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Associates</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary.activeStaffCount || rankedStaff.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Attributed to {summary.totalBills || 0} customer bills
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Staff Sales Volume</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ₹{Number(rankedStaff.reduce((sum, s) => sum + s.totalSales, 0)).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {rankedStaff.reduce((sum, s) => sum + s.totalItems, 0)} garments sold
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Commission Accrued</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            ₹{Number(summary.totalCommissionAccrued || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Avg {configForm.defaultCommissionPct}% incentive rate
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Avg Basket Size (AOV)</span>
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ₹{Number(summary.avgStoreBasketValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Storewide per-transaction ticket
          </div>
        </div>
      </div>

      {/* Gamified Podium (Top 3 Performers) */}
      {rankedStaff.length > 0 && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy className="w-64 h-64 text-amber-400" />
          </div>

          <div className="relative z-10 mb-6">
            <span className="text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              🏆 Top Performers Podium
            </span>
            <h2 className="text-xl font-black mt-2">
              Hall of Fame & Top Commission Earners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div className="order-2 md:order-1 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 flex flex-col items-center text-center relative hover:border-slate-500 transition">
                <div className="w-14 h-14 rounded-2xl bg-slate-300 text-slate-900 font-black text-xl flex items-center justify-center shadow-lg border-2 border-white mb-3">
                  2
                </div>
                <span className="text-xs font-bold text-slate-300 bg-slate-700/80 px-2.5 py-0.5 rounded-full mb-1">
                  🥈 Silver Star
                </span>
                <h3 className="text-lg font-bold text-white">{top2.name}</h3>
                <p className="text-xs text-slate-400 mb-3 font-mono">Code: {top2.empCode}</p>

                <div className="w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Sales:</span>
                    <span className="font-bold text-white">₹{top2.totalSales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Incentive:</span>
                    <span className="font-bold text-emerald-400">₹{top2.totalPayout.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Target:</span>
                    <span className="font-bold text-amber-400">{top2.achievementPct}%</span>
                  </div>
                </div>
              </div>
            ) : <div className="order-2 md:order-1" />}

            {/* Rank 1 (Gold Champion) */}
            {top1 ? (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-800/90 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 flex flex-col items-center text-center relative shadow-2xl shadow-amber-500/20 hover:scale-[1.02] transition transform duration-200">
                <div className="absolute -top-4 bg-amber-500 text-slate-950 p-2 rounded-full shadow-lg">
                  <Crown className="w-6 h-6 fill-current" />
                </div>
                <div className="w-18 h-18 rounded-3xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl border-4 border-amber-300 mt-2 mb-3">
                  1
                </div>
                <span className="text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 mb-1">
                  👑 Store Champion
                </span>
                <h3 className="text-xl font-black text-white">{top1.name}</h3>
                <p className="text-xs text-amber-200/70 mb-4 font-mono">Code: {top1.empCode}</p>

                <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Sales:</span>
                    <span className="text-base font-black text-amber-400">₹{top1.totalSales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Commission Payout:</span>
                    <span className="font-black text-emerald-400">₹{top1.totalPayout.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Target Reached:</span>
                    <span className="font-bold text-white">{top1.achievementPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${Math.min(top1.achievementPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : <div className="order-1 md:order-2" />}

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div className="order-3 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 flex flex-col items-center text-center relative hover:border-slate-500 transition">
                <div className="w-14 h-14 rounded-2xl bg-amber-700/80 text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-amber-600 mb-3">
                  3
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full mb-1">
                  🥉 Star Associate
                </span>
                <h3 className="text-lg font-bold text-white">{top3.name}</h3>
                <p className="text-xs text-slate-400 mb-3 font-mono">Code: {top3.empCode}</p>

                <div className="w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Sales:</span>
                    <span className="font-bold text-white">₹{top3.totalSales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Incentive:</span>
                    <span className="font-bold text-emerald-400">₹{top3.totalPayout.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Target:</span>
                    <span className="font-bold text-amber-400">{top3.achievementPct}%</span>
                  </div>
                </div>
              </div>
            ) : <div className="order-3" />}
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Full Sales Staff Performance Matrix
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {rankedStaff.length} Associates
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Rank & Associate</th>
                <th className="px-6 py-3.5">Total Sales</th>
                <th className="px-6 py-3.5">Target Progress</th>
                <th className="px-6 py-3.5">Bills & Units</th>
                <th className="px-6 py-3.5">AOV / Basket</th>
                <th className="px-6 py-3.5">Commission Rate</th>
                <th className="px-6 py-3.5 text-right">Commission Payout</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rankedStaff.map((staff, idx) => (
                <tr
                  key={staff.empCode}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-400 text-slate-950 font-bold' :
                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {staff.name}
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            ({staff.empCode})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {staff.topCategories.slice(0, 2).map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              {c.category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-base">
                    ₹{staff.totalSales.toLocaleString('en-IN')}
                  </td>

                  <td className="px-6 py-4">
                    <div className="w-36">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {staff.achievementPct}%
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          of ₹{staff.targetAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            staff.achievementPct >= 100
                              ? 'bg-emerald-500'
                              : staff.achievementPct >= 60
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(staff.achievementPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {staff.billCount} bills
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {staff.totalItems} items ({staff.upt} UPT)
                    </div>
                  </td>

                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                    ₹{staff.aov.toLocaleString('en-IN')}
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                      {staff.commissionRate}%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                      ₹{staff.totalPayout.toLocaleString('en-IN')}
                    </div>
                    {staff.bonusEarned > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                        +₹{staff.bonusEarned} bonus
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedStaff(staff)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}

              {/* Unassigned Counter Sales Row */}
              {unassignedSales && (
                <tr className="bg-slate-50/70 dark:bg-slate-800/30 text-slate-500">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                        POS
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          {unassignedSales.name}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Direct counter sales without staff tag
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                    ₹{unassignedSales.totalSales.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">General Counter</td>
                  <td className="px-6 py-4 text-xs">
                    {unassignedSales.billCount} bills ({unassignedSales.totalItems} items)
                  </td>
                  <td className="px-6 py-4 text-xs font-bold">
                    ₹{unassignedSales.aov.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">N/A</td>
                  <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">₹0</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedStaff(unassignedSales)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Drill-Down Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedStaff.name}
                  {selectedStaff.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {selectedStaff.badge}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Employee ID: {selectedStaff.empCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Revenue</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    ₹{selectedStaff.totalSales.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Commission Payout</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{selectedStaff.totalPayout.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Top Product Categories Sold
                </h4>
                <div className="space-y-2">
                  {selectedStaff.topCategories && selectedStaff.topCategories.length > 0 ? (
                    selectedStaff.topCategories.map((cat, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{cat.qty} pcs</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{cat.sales.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No category data recorded</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target & Commission Configuration Drawer / Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Commission & Target Settings
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Staff Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={configForm.defaultCommissionPct}
                  onChange={(e) => setConfigForm({ ...configForm, defaultCommissionPct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-500">e.g. 1.5% commission on all net apparel sales</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Store Target (₹)
                </label>
                <input
                  type="number"
                  value={configForm.monthlyStoreTarget}
                  onChange={(e) => setConfigForm({ ...configForm, monthlyStoreTarget: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  {savingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
