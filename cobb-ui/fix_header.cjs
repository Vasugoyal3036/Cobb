const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');

const orig1 = `<div className={\`p-5 pb-4 flex justify-between items-center border-b \${darkMode ? 'border-white/[0.06]' : 'border-slate-100'}\`}>`;
const rep1 = `<div className={\`p-5 pb-4 flex items-center border-b transition-all duration-500 \${isLeftSidebarCollapsed ? 'justify-center px-2' : 'justify-between'} \${darkMode ? 'border-white/[0.06]' : 'border-slate-100'}\`}>`;

const orig2 = `<div className="flex items-center gap-3">
            <OrsLogo size={42} />`;
const rep2 = `<div className={\`flex items-center gap-3 transition-all duration-500 overflow-hidden \${isLeftSidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}\`}>
            <div className="shrink-0">
              <OrsLogo size={42} />
            </div>`;

code = code.replace(orig1, rep1);
code = code.replace(orig2, rep2);

fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
