const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import InventoryTab')) {
  content = content.replace(
    "import { useToast } from './context/ToastContext';",
    "import { useToast } from './context/ToastContext';\nimport InventoryTab from './components/tabs/InventoryTab';"
  );
}

const tabStart = content.indexOf("{/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}");
if (tabStart === -1) {
  console.log("Could not find start");
  process.exit(1);
}

const nextTabStart = content.indexOf("{/* 6. AI CAMPAIGN BUILDER */}");
if (nextTabStart === -1) {
  console.log("Could not find end");
  process.exit(1);
}

const before = content.substring(0, tabStart);
const after = content.substring(nextTabStart);

const replacement = `{/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}
            {activeTab === 'deadstock' && (
              <InventoryTab
                deadStock={deadStock}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleGenerateOutfitMatch={handleGenerateOutfitMatch}
                isGeneratingOutfit={isGeneratingOutfit}
                activeOutfitMatch={activeOutfitMatch}
                outfitPitch={outfitPitch}
              />
            )}

            `;

fs.writeFileSync(file, before + replacement + after);
console.log("Successfully extracted Inventory Tab!");
