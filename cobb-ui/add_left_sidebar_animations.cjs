const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');

// 1. Add state variable
code = code.replace(
  'const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(() => {',
  `const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('cobb_left_sidebar_collapsed') === 'true'; } catch (e) { return false; }
  });
  
  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('cobb_left_sidebar_collapsed', String(next)); } catch (e) {}
      return next;
    });
  };

  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(() => {`
);

// 2. Change wrapper div width and transition
code = code.replace(
  'left-0 w-64 lg:my-4',
  'left-0 lg:my-4' // remove w-64
);
code = code.replace(
  'z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? \'translate-x-0\' : \'-translate-x-full lg:translate-x-0\'}',
  'z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isMobileMenuOpen ? \'translate-x-0\' : \'-translate-x-full lg:translate-x-0\'} ${isLeftSidebarCollapsed ? \'w-[80px]\' : \'w-64\'}'
);

// 3. Header ORS logo collapse
code = code.replace(
  /<div>\s*<div className="flex items-center gap-1.5">\s*<span className={`text-lg font-black tracking-wider leading-none \$\{darkMode \? 'text-white' : 'text-slate-900'\}`}>ORS<\/span>\s*<span className="text-\[9px\] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500\/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500\/20">CRM<\/span>\s*<\/div>\s*<p className={`text-\[10px\] font-bold tracking-tight uppercase truncate mt-0.5 \$\{darkMode \? 'text-slate-400' : 'text-slate-500'\}`}>\s*Complete CRM Solutions\s*<\/p>\s*<\/div>/,
  `<div className={\`flex-1 min-w-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] \${isLeftSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none blur-md -translate-y-4' : 'w-full opacity-100 blur-0 translate-y-0'}\`}>
              <div className="flex items-center gap-1.5">
                <span className={\`text-lg font-black tracking-wider leading-none \${darkMode ? 'text-white' : 'text-slate-900'}\`}>ORS</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">CRM</span>
              </div>
              <p className={\`text-[10px] font-bold tracking-tight uppercase truncate mt-0.5 \${darkMode ? 'text-slate-400' : 'text-slate-500'}\`}>
                Complete CRM Solutions
              </p>
            </div>`
);

// 4. Desktop toggle button in header
code = code.replace(
  /<button\s*onClick=\{\(\) => setIsMobileMenuOpen\(false\)\}\s*className=\{\`lg:hidden p-1 rounded-full \$\{darkMode \? 'text-slate-400 hover:text-white hover:bg-white\/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'\}\`\}\s*>\s*<X className="w-5 h-5" \/>\s*<\/button>/,
  `$&
          <button
            onClick={toggleLeftSidebar}
            className={\`hidden lg:flex p-1.5 rounded-xl border transition-all duration-300 cursor-pointer shrink-0 \${
              darkMode ? 'bg-[#0b0f19] border-[#1c2436] text-slate-400 hover:text-white hover:bg-[#141a2c]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }\`}
          >
            <ChevronRight className={\`w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] \${
              isLeftSidebarCollapsed ? 'rotate-0' : 'rotate-180'
            }\`} />
          </button>`
);

// 5. Category headers
code = code.replace(
  /<p className=\{\`px-4 text-\[10px\] font-bold uppercase tracking-wider mb-2 \$\{darkMode \? 'text-slate-400' : 'text-slate-500'\}\`\}>\{cat\.category\}<\/p>/g,
  `<p className={\`px-4 text-[10px] font-bold uppercase tracking-wider mb-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden whitespace-nowrap \${
    isLeftSidebarCollapsed ? 'h-0 opacity-0 my-0 py-0' : 'h-4 opacity-100'
  } \${darkMode ? 'text-slate-400' : 'text-slate-500'}\`}>{cat.category}</p>`
);

// 6. Navigation item text
code = code.replace(
  /<span className="truncate tracking-wide">\{item\.label\}<\/span>/g,
  `<span className={\`truncate whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] \${
    isLeftSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none blur-md -translate-y-4' : 'w-full opacity-100 blur-0 translate-y-0'
  }\`}>{item.label}</span>`
);

// Add staggered delays for navigation items
let delayCounter = 0;
code = code.replace(/<span className=\{\`truncate whitespace-nowrap transition-all duration-500 ease-\[cubic-bezier\(0\.34,1\.56,0\.64,1\)\] \$\{/g, () => {
    let delay = delayCounter * 25;
    delayCounter++;
    return `<span className={\`truncate whitespace-nowrap transition-all duration-500 delay-[${delay}ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] \${`;
});

// 7. Change nav item base class for centering when collapsed
code = code.replace(
  /className=\{\`w-full flex items-center px-4 py-2\.5 transition-all duration-200 cursor-pointer relative group text-\[13px\] \$\{isActive \? activeColor : normalColor\}\`\}/g,
  `className={\`w-full flex items-center \${isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 transition-all duration-200 cursor-pointer relative group text-[13px] \${isActive ? activeColor : normalColor}\`}`
);
code = code.replace(
  /<Icon className=\{\`w-\[18px\] h-\[18px\] mr-4 transition-colors shrink-0 \$\{isActive \? "" : \`opacity-70 group-hover:opacity-100 \$\{baseColorText\}\`\}\`\} \/>/g,
  `<Icon className={\`w-[18px] h-[18px] transition-colors shrink-0 \${isLeftSidebarCollapsed ? '' : 'mr-4'} \${isActive ? "" : \`opacity-70 group-hover:opacity-100 \${baseColorText}\`}\`} />`
);

fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
