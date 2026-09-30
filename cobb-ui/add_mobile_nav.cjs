const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('d:/cobbbb/cobb-ui/index.html', 'utf8');
html = html.replace(/<meta name="viewport".*?>/i, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />');
fs.writeFileSync('d:/cobbbb/cobb-ui/index.html', html);
console.log('index.html updated');

// 2. Add Mobile Bottom Nav to Layout.jsx
let layout = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');

const bottomNavJSX = `
      {/* --- MOBILE NATIVE APP BOTTOM NAVIGATION BAR --- */}
      <div className={\`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 pb-safe pt-2 border-t \${darkMode ? 'bg-black/80 border-white/10 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'}\`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 8px)' }}>
        {[
          { id: 'live', icon: <Receipt className="w-6 h-6" />, label: 'Sales' },
          { id: 'deadstock', icon: <Package className="w-6 h-6" />, label: 'Stock' },
          { id: 'wardrobe', icon: <Shirt className="w-6 h-6" />, label: 'Clients' },
          { id: 'pocket_khata', icon: <Wallet className="w-6 h-6" />, label: 'Khata' },
          { id: 'menu', icon: <Menu className="w-6 h-6" />, label: 'Menu', onClick: () => setIsMobileMenuOpen(true) },
        ].map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.onClick ? item.onClick() : setActiveTab(item.id)}
              className={\`flex flex-col items-center justify-center space-y-1 w-16 transition-colors \${isActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-slate-500' : 'text-slate-400')}\`}
            >
              <div className={\`\${isActive ? 'animate-bounce' : ''}\`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
`;

// Insert the Bottom Nav before the main content area ends, or right before </DashboardBackground>
const returnEnd = layout.lastIndexOf('</DashboardBackground>');
if (returnEnd !== -1 && !layout.includes('MOBILE NATIVE APP BOTTOM NAVIGATION BAR')) {
    layout = layout.substring(0, returnEnd) + bottomNavJSX + layout.substring(returnEnd);
}

// 3. Remove pb-20 from main content area to avoid double padding if not needed, or actually keep pb-24 for the bottom nav.
layout = layout.replace('pb-20 lg:pb-0', 'pb-24 lg:pb-0'); // ensure space for bottom nav

// 4. Add Wallet import if missing
if (!layout.includes('Wallet,')) {
    layout = layout.replace('import {\n  Building2,', "import {\n  Wallet,\n  Building2,");
    layout = layout.replace('import {\n  MessageCircle,', "import {\n  Wallet,\n  MessageCircle,");
}

fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', layout);
console.log('Layout.jsx updated');
