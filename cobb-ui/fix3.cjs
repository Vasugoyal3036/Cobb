const fs = require('fs');
let c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');

const missingBlock = `full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                      \\$\\{activeTab === item.id ? activeColor : normalColor\\}
                    \`\\}
                  >
                    <Icon size={20} className={activeTab === item.id ? "" : "text-slate-500 group-hover:text-slate-300 transition-colors"} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            {/* Quick Actions (Sidebar Bottom) */}
            <div className="p-6 border-t border-slate-800">
              <button 
                onClick={fetchDashboardMetrics}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-300 transition-all text-sm font-medium"
              >
                <RefreshCw size={16} />
                Force Sync Data
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 relative z-0">
          
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800">
                  {menuItems.find(m => m.id === activeTab)?.label.toUpperCase()}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:block">Real-time store metrics & insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE POS CONNECTED
              </div>
              <button 
                onClick={fetchDashboardMetrics}
                className="p-2 sm:px-4 sm:py-2 bg-slate-900 text-white rounded-lg sm:rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
            </div>
          </header>

          {/* SCROLLABLE DASHBOARD CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">

            {/* TAB: DASHBOARD (OVERVIEW) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">

                {/* BENTO GRID: Top Row (KPIs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Revenue Card */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Target size={48} className="text-blue-600" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Revenue</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800">{formatCurrency(overviewStats?.todayRevenue)}</h3>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-flex w-fit">
                      <TrendingDown size={14} className="rotate-180" />
                      <span>On track</span>
                    </div>
                  </div>

                  {/* Monthly Target Card */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Progress</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800">{formatCurrency(overviewStats?.monthlyRevenue)}</h3>
                    <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: \`\\$\\{Math.min((overviewStats?.monthlyRevenue / 500000) * 100, 100) || 0\\}%\` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-right">Target: 5.0L</p>
                  </div>

                  {/* Footfall / Bills */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Invoices (Today)</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800">{overviewStats?.todayBills || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Avg Value: <span className="text-slate-800 font-bold">{formatCurrency((overviewStats?.todayRevenue || 0) / (overviewStats?.todayBills || 1))}</span></p>
                  </div>

                  {/* Active Cashier */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-20">
                      <Zap size={80} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store Status</p>
                    <h3 className="text-xl font-bold mt-1 text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      OPEN & ACTIVE
                    </h3>
                    <p className="text-xs text-slate-400 mt-4">Pundri Outlet • POS Online</p>
                  </div>
                </div>
`;

// Replace `className={\`w-\n                {/* BENTO GRID: Middle Row */}` 
// with `className={\`w-${missingBlock}\n                {/* BENTO GRID: Middle Row */}`

c = c.replace('className={`w-\\n                {/* BENTO GRID: Middle Row */}', 'className={`w-' + missingBlock + '\\n                {/* BENTO GRID: Middle Row */}');

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', c);
