const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');

const oldPostButton = `<button className={\`w-full py-3.5 rounded-full font-black text-sm tracking-wide shadow-lg transition-transform hover:scale-[1.02] active:scale-95 \${darkMode ? 'bg-white text-black shadow-white/10' : 'bg-[#0f1419] text-white shadow-black/10'}\`}>
            Post Update
          </button>`;

const newPostButton = `<button className={\`\${isLeftSidebarCollapsed ? 'w-12 h-12 flex items-center justify-center mx-auto' : 'w-full py-3.5'} rounded-full font-black text-sm tracking-wide shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 \${darkMode ? 'bg-white text-black shadow-white/10' : 'bg-[#0f1419] text-white shadow-black/10'}\`}>
            {isLeftSidebarCollapsed ? <span className="text-2xl leading-none -mt-0.5">+</span> : 'Post Update'}
          </button>`;

code = code.replace(oldPostButton, newPostButton);

const oldThemePicker = `<button
                onClick={() => setShowThemePicker(p => !p)}
                className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all \${showThemePicker ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'}\`}
              >
                <span className="text-base">🎨</span>
                <span>Dashboard Theme</span>
                <span className="ml-auto text-[10px] opacity-60">({THEMES.find(t => t.key === dashTheme)?.label || 'Custom'})</span>
              </button>`;

const newThemePicker = `<button
                onClick={() => setShowThemePicker(p => !p)}
                className={\`w-full flex items-center \${isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-2.5'} py-2 rounded-full text-xs font-semibold transition-all \${showThemePicker ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'}\`}
              >
                <span className="text-base shrink-0">🎨</span>
                <div className={\`flex flex-1 items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] \${isLeftSidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}\`}>
                  <span className="whitespace-nowrap">Dashboard Theme</span>
                  <span className="ml-auto text-[10px] opacity-60 truncate pl-2">({THEMES.find(t => t.key === dashTheme)?.label || 'Custom'})</span>
                </div>
              </button>`;

code = code.replace(oldThemePicker, newThemePicker);

const oldProfile = `<div className={\`flex items-center gap-3 p-2.5 rounded-full cursor-pointer transition-colors \${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}\`}>
            <div className={\`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border \${darkMode ? 'bg-gradient-to-tr from-slate-800 to-slate-700 border-white/20' : 'bg-gradient-to-tr from-slate-200 to-slate-300 border-slate-300'}\`}>
               <span className={\`text-xs font-black \${darkMode ? 'text-white' : 'text-slate-800'}\`}>
                 {currentRole === 'owner' ? 'OW' : 'MG'}
               </span>
            </div>
            <div className="flex-1 min-w-0">
               <p className={\`text-sm font-bold truncate leading-tight \${darkMode ? 'text-white' : 'text-slate-900'}\`}>
                 {currentRole === 'owner' ? 'Store Owner' : 'Store Manager'}
               </p>
               <p className={\`text-xs truncate \${darkMode ? 'text-slate-500' : 'text-slate-500'}\`}>
                 @cobb_{AVAILABLE_STORES.find(s => s.id === activeStore)?.shortName?.toLowerCase() || 'pundri'}
               </p>
            </div>
            <MoreHorizontal className={\`w-5 h-5 shrink-0 \${darkMode ? 'text-slate-500' : 'text-slate-400'}\`} />
          </div>`;

const newProfile = `<div className={\`flex items-center \${isLeftSidebarCollapsed ? 'justify-center p-1' : 'gap-3 p-2.5'} rounded-full cursor-pointer transition-colors \${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}\`}>
            <div className={\`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border \${darkMode ? 'bg-gradient-to-tr from-slate-800 to-slate-700 border-white/20' : 'bg-gradient-to-tr from-slate-200 to-slate-300 border-slate-300'}\`}>
               <span className={\`text-xs font-black \${darkMode ? 'text-white' : 'text-slate-800'}\`}>
                 {currentRole === 'owner' ? 'OW' : 'MG'}
               </span>
            </div>
            <div className={\`flex flex-1 items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] \${isLeftSidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}\`}>
              <div className="flex-1 min-w-0">
                 <p className={\`text-sm font-bold truncate leading-tight \${darkMode ? 'text-white' : 'text-slate-900'}\`}>
                   {currentRole === 'owner' ? 'Store Owner' : 'Store Manager'}
                 </p>
                 <p className={\`text-xs truncate \${darkMode ? 'text-slate-500' : 'text-slate-500'}\`}>
                   @cobb_{AVAILABLE_STORES.find(s => s.id === activeStore)?.shortName?.toLowerCase() || 'pundri'}
                 </p>
              </div>
              <MoreHorizontal className={\`w-5 h-5 shrink-0 \${darkMode ? 'text-slate-500' : 'text-slate-400'}\`} />
            </div>
          </div>`;

code = code.replace(oldProfile, newProfile);

fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
