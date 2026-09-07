const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

function extractDashboard() {
  const startMarker = "{/* 1. COMMAND CENTER */}";
  const endMarker = "{/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}";
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error(`Markers not found for DashboardTab`);
    return;
  }

  let componentContent = content.substring(startIndex, endIndex);
  
  const lines = componentContent.split('\n');
  let cleanLines = lines.filter(line => !line.includes('{activeTab === \'dashboard\' && (') && line.trim() !== ')}' && !line.includes(startMarker));
  
  const finalContent = cleanLines.join('\n');
  
  const propsList = [
    "activeTab", "overviewStats", "hourlySales", "dailySales", "retentionData", "pnlData", 
    "gstSummary", "wardrobeProfiles", "formatCurrency", "handleRefresh"
  ];

  fs.writeFileSync(`d:\\cobbbb\\cobb-ui\\src\\components\\tabs\\DashboardTab.jsx`, `import React from 'react';
import { 
  TrendingUp, Users, ShoppingBag, CreditCard, Clock, CheckCircle2, 
  BarChart3, RefreshCw, Smartphone, MonitorSmartphone, DollarSign, Activity, FileText
} from 'lucide-react';

const DashboardTab = (props) => {
  const {
${propsList.map(p => `    ${p},`).join('\n')}
  } = props;

  return (
    <>
      ${finalContent}
    </>
  );
};

export default DashboardTab;
`);

  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);

  const replacement = `${startMarker}
            {activeTab === 'dashboard' && (
              <DashboardTab
${propsList.map(p => `                ${p}={${p}}`).join('\n')}
              />
            )}

            `;

  content = before + replacement + after;
  
  if (!content.includes(`import DashboardTab`)) {
    content = content.replace(
      "import InventoryTab from './components/tabs/InventoryTab';",
      `import InventoryTab from './components/tabs/InventoryTab';\nimport DashboardTab from './components/tabs/DashboardTab';`
    );
  }
}

function extractCustomerModal() {
  const startMarker = "{/* CUSTOMER PROFILE MODAL / DRAWER WITH AI */}";
  const startIndex = content.indexOf(startMarker);
  // End of file is where it ends, just before the layout closing tags
  const endIndex = content.indexOf("        {/* BOTTOM NAVIGATION BAR (MOBILE ONLY) */}");

  if (startIndex === -1 || endIndex === -1) {
    console.error(`Markers not found for CustomerProfileModal`);
    return;
  }

  let componentContent = content.substring(startIndex, endIndex);

  // In App.jsx, the modal is wrapped in {selectedCustomer && ( ... )}
  // We don't want to strip that, or maybe we do, and move the check inside the modal.
  // Actually, we'll strip `{selectedCustomer && (` and `)}` and let the modal handle rendering.
  // But wait, it's safer to just move it as-is, wrapped in a component.

  fs.writeFileSync(`d:\\cobbbb\\cobb-ui\\src\\components\\CustomerProfileModal.jsx`, `import React from 'react';
import { 
  X, ShoppingBag, MessageSquare, AlertCircle, Sparkles, Wand2, RefreshCw, DollarSign, Clock, Send
} from 'lucide-react';

const CustomerProfileModal = (props) => {
  const {
    selectedCustomer,
    setSelectedCustomer,
    customerHistory,
    persona,
    loadingPersona,
    smartCoordinate,
    handleGenerateSmartCoordinate,
    formatCurrency
  } = props;

  if (!selectedCustomer) return null;

  return (
    <>
      ${componentContent.replace("{selectedCustomer && (", "").replace(/}\)$/, "").replace(startMarker, "").trim()}
    </>
  );
};

export default CustomerProfileModal;
`);

  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);

  const replacement = `${startMarker}
        <CustomerProfileModal
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customerHistory={customerHistory}
          persona={persona}
          loadingPersona={loadingPersona}
          smartCoordinate={smartCoordinate}
          handleGenerateSmartCoordinate={handleGenerateSmartCoordinate}
          formatCurrency={formatCurrency}
        />

        `;

  content = before + replacement + after;

  if (!content.includes(`import CustomerProfileModal`)) {
    content = content.replace(
      "import InventoryTab from './components/tabs/InventoryTab';",
      `import InventoryTab from './components/tabs/InventoryTab';\nimport CustomerProfileModal from './CustomerProfileModal';`
    );
  }
}

extractDashboard();
extractCustomerModal();

fs.writeFileSync(file, content);
console.log("Extracted Dashboard and Customer Modal!");
