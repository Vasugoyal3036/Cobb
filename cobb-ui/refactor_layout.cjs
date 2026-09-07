const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Layout import right after the React imports
content = content.replace(
  "import { useToast } from './context/ToastContext';",
  "import { useToast } from './context/ToastContext';\nimport Layout from './components/Layout';"
);

// 2. Remove the navigationItems array entirely
// It starts at `const navigationItems = [` and ends at the closing `];`
// To be safe, we will just use a regex
content = content.replace(/const navigationItems = \[\s*\{\s*category: "Overview & P&L"[\s\S]*?category: "System"[\s\S]*?\}\s*\];\s*/, '');

// 3. Find the Mobile Drawer Overlay and replace all the way down to the Main Content Area
// The block we want to replace starts with `{/* Mobile Drawer Overlay */}` and ends with `<div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">`

const startMarker = "{/* Mobile Drawer Overlay */}";
const endMarker = '<div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `
      <Layout
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleGlobalSearch={handleGlobalSearch}
        setShowReconModal={setShowReconModal}
        handleGenerateEodReport={handleGenerateEodReport}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isGatewayRunning={isGatewayRunning}
        isListenerRunning={isListenerRunning}
      >
        {/* Dynamic Views */}
`;
  
  content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
} else {
  console.log("Could not find layout blocks to replace");
}

// We also need to add the closing tags for Layout at the very end.
// At the end of the file, we have:
//         </div>
//       </div>
//     </div>
//   );
// }

// Let's replace the last few lines safely
const finalBlockRegex = /\{\/\* BOTTOM NAVIGATION BAR \(MOBILE ONLY\) \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*\)\s*}\s*$/;
const finalMatch = content.match(finalBlockRegex);

if (finalMatch) {
  content = content.replace(finalBlockRegex, 
    `{/* BOTTOM NAVIGATION BAR (MOBILE ONLY) */}$1</Layout>\n    </div>\n  );\n}`
  );
} else {
  console.log("Could not find bottom navigation block to close Layout.");
}

fs.writeFileSync(file, content);
console.log('Layout extracted successfully');
