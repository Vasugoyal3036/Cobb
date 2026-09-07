const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

function extractComponent(startMarker, endMarker, componentName, imports, propsList) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = endMarker ? content.indexOf(endMarker) : content.indexOf("          </div>\n        </div>\n\n        {/* CUSTOMER PROFILE MODAL / DRAWER WITH AI */}");
  
  if (startIndex === -1 || endIndex === -1) {
    console.error(`Markers not found for ${componentName}`);
    return;
  }

  let componentContent = content.substring(startIndex, endIndex);
  
  // Clean up the `{activeTab === 'xxx' && (` wrapper from the content
  // Since each tab has a slightly different activeTab wrapper, we'll try to strip the first few lines and the last closing brace.
  const lines = componentContent.split('\n');
  let cleanLines = lines.filter(line => !line.includes('{activeTab ===') && line.trim() !== ')}' && !line.includes(startMarker));
  
  const finalContent = cleanLines.join('\n');

  fs.writeFileSync(`d:\\cobbbb\\cobb-ui\\src\\components\\tabs\\${componentName}.jsx`, `import React from 'react';
${imports}

const ${componentName} = (props) => {
  const {
${propsList.map(p => `    ${p},`).join('\n')}
  } = props;

  return (
    <>
      ${finalContent}
    </>
  );
};

export default ${componentName};
`);

  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);

  const replacement = `${startMarker}
            {activeTab === '${componentName.toLowerCase().replace('tab', '')}' && (
              <${componentName}
${propsList.map(p => `                ${p}={${p}}`).join('\n')}
              />
            )}

            `;

  content = before + replacement + after;

  if (!content.includes(`import ${componentName}`)) {
    content = content.replace(
      "import InventoryTab from './components/tabs/InventoryTab';",
      `import InventoryTab from './components/tabs/InventoryTab';\nimport ${componentName} from './components/tabs/${componentName}';`
    );
  }
}

// 1. Extract Automation Engine
extractComponent(
  "{/* 7. AUTOMATION ENGINE */}", 
  "{/* 8. LIVE BILLS */}", 
  "AutomationEngineTab",
  "import { Bot, Zap, Clock, CheckCircle2, AlertTriangle, Play, Square, Activity, Database, Smartphone } from 'lucide-react';",
  ["activeTab", "isGatewayRunning", "isListenerRunning", "automationLogs", "handleStartGateway", "handleStopGateway", "handleStartListener", "handleStopListener"]
);

// 2. Extract Live Bills
extractComponent(
  "{/* 8. LIVE BILLS */}", 
  "{/* 9. VIP & DORMANT */}", 
  "LiveBillsTab",
  "import { Receipt, Search, FileText } from 'lucide-react';",
  ["activeTab", "liveBills", "handleViewBill"]
);

// 3. Extract VIP & Dormant (Customer Insights)
extractComponent(
  "{/* 9. VIP & DORMANT */}", 
  "{/* CUSTOMER PROFILE MODAL / DRAWER WITH AI */}", 
  "CustomerInsightsTab",
  "import { Users, Crown, Search, MessageSquare, Send, Sparkles, AlertCircle, HeartCrack } from 'lucide-react';",
  ["activeTab", "searchQuery", "setSearchQuery", "vips", "dormant", "handleOpenCustomerProfile"]
);

fs.writeFileSync(file, content);
console.log("Extracted AutomationEngine, LiveBills, and CustomerInsights!");
