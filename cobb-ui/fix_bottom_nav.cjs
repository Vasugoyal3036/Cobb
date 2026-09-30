const fs = require('fs');

// 1. Remove duplicate from Layout.jsx
let layout = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');
const dupStart = layout.indexOf('{/* --- MOBILE NATIVE APP BOTTOM NAVIGATION BAR --- */}');
if (dupStart !== -1) {
    const dupEnd = layout.indexOf('</div>', dupStart);
    if (dupEnd !== -1) {
        layout = layout.substring(0, dupStart) + layout.substring(dupEnd + 6);
        fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', layout);
        console.log('Removed duplicate from Layout.jsx');
    }
}

// 2. Replace bottom bar in App.jsx
let app = fs.readFileSync('d:/cobbbb/cobb-ui/src/App.jsx', 'utf8');
const start = app.indexOf('{/* BOTTOM NAVIGATION BAR (Android Material Design \u2014 MOBILE ONLY) */}');
const end = app.indexOf('{/* ESC/POS Thermal Receipt Modal */}');

if (start !== -1 && end !== -1) {
    const newBottomNav = `{/* BOTTOM NAVIGATION BAR (Android Material Design — MOBILE ONLY) */}
        <div className={\`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around px-2 pb-safe pt-1 \${
          darkMode
            ? 'bg-[#0d1017]/95 border-t border-white/[0.06] backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)]'
            : 'bg-white/95 border-t border-slate-200/80 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }\`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 8px)' }}>

          {/* SALES */}
          <button
            onClick={() => { setActiveTab('live'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={\`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 \${
              activeTab === 'live'
                ? darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                : 'bg-transparent'
            }\`}>
              <Receipt className={\`w-5 h-5 transition-colors \${
                activeTab === 'live'
                  ? darkMode ? 'text-blue-400' : 'text-blue-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }\`} />
            </div>
            <span className={\`text-[10px] font-bold transition-colors \${
              activeTab === 'live'
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }\`}>Sales</span>
          </button>

          {/* STOCK */}
          <button
            onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={\`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 \${
              activeTab === 'inventory'
                ? darkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                : 'bg-transparent'
            }\`}>
              <Package className={\`w-5 h-5 transition-colors \${
                activeTab === 'inventory'
                  ? darkMode ? 'text-amber-400' : 'text-amber-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }\`} />
            </div>
            <span className={\`text-[10px] font-bold transition-colors \${
              activeTab === 'inventory'
                ? darkMode ? 'text-amber-400' : 'text-amber-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }\`}>Stock</span>
          </button>

          {/* CLIENTS */}
          <button
            onClick={() => { setActiveTab('wardrobe'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={\`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 \${
              activeTab === 'wardrobe'
                ? darkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                : 'bg-transparent'
            }\`}>
              <Shirt className={\`w-5 h-5 transition-colors \${
                activeTab === 'wardrobe'
                  ? darkMode ? 'text-purple-400' : 'text-purple-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }\`} />
            </div>
            <span className={\`text-[10px] font-bold transition-colors \${
              activeTab === 'wardrobe'
                ? darkMode ? 'text-purple-400' : 'text-purple-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }\`}>Clients</span>
          </button>

          {/* KHATA */}
          <button
            onClick={() => { setActiveTab('pocket_khata'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={\`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 \${
              activeTab === 'pocket_khata'
                ? darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                : 'bg-transparent'
            }\`}>
              <Wallet className={\`w-5 h-5 transition-colors \${
                activeTab === 'pocket_khata'
                  ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }\`} />
            </div>
            <span className={\`text-[10px] font-bold transition-colors \${
              activeTab === 'pocket_khata'
                ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }\`}>Khata</span>
          </button>

          {/* MORE / MENU */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={\`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 relative \${
              isMobileMenuOpen
                ? darkMode ? 'bg-slate-500/20' : 'bg-slate-200'
                : 'bg-transparent'
            }\`}>
              {isMobileMenuOpen
                ? <X className={\`w-5 h-5 \${darkMode ? 'text-slate-300' : 'text-slate-700'}\`} />
                : <Menu className={\`w-5 h-5 \${darkMode ? 'text-slate-400' : 'text-slate-500'}\`} />
              }
            </div>
            <span className={\`text-[10px] font-bold transition-colors \${
              isMobileMenuOpen
                ? darkMode ? 'text-slate-300' : 'text-slate-700'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }\`}>Menu</span>
          </button>
        </div>

        `;

    app = app.substring(0, start) + newBottomNav + app.substring(end);
    fs.writeFileSync('d:/cobbbb/cobb-ui/src/App.jsx', app);
    console.log('App.jsx updated with new bottom bar!');
} else {
    console.log('Could not find boundaries');
}
