const fs = require('fs');

const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
const content = fs.readFileSync(file, 'utf8');

const startMarker = "{/* 6. AI CAMPAIGN BUILDER */}";
const endMarker = "{/* 7. AUTOMATION ENGINE */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const componentContent = content.substring(startIndex, endIndex);

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\components\\tabs\\CampaignBuilderTab.jsx', `import React from 'react';
import { Megaphone, Users, MessageSquare, Play, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

const CampaignBuilderTab = (props) => {
  const {
    activeTab,
    selectedGroup,
    setSelectedGroup,
    campaignObjective,
    setCampaignObjective,
    customPrompt,
    setCustomPrompt,
    isGeneratingCampaign,
    generatedCampaigns,
    handleGenerateCampaign,
    handleSendCampaign,
    campaignSent
  } = props;

  return (
    <>
      ${componentContent.replace("{activeTab === 'campaigns' && (", "").replace(/}\)$/, "").trim()}
    </>
  );
};

export default CampaignBuilderTab;
`);

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const replacement = `{/* 6. AI CAMPAIGN BUILDER */}
            {activeTab === 'campaigns' && (
              <CampaignBuilderTab
                activeTab={activeTab}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                campaignObjective={campaignObjective}
                setCampaignObjective={setCampaignObjective}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                isGeneratingCampaign={isGeneratingCampaign}
                generatedCampaigns={generatedCampaigns}
                handleGenerateCampaign={handleGenerateCampaign}
                handleSendCampaign={handleSendCampaign}
                campaignSent={campaignSent}
              />
            )}

            `;

let newContent = before + replacement + after;

if (!newContent.includes('import CampaignBuilderTab')) {
  newContent = newContent.replace(
    "import InventoryTab from './components/tabs/InventoryTab';",
    "import InventoryTab from './components/tabs/InventoryTab';\nimport CampaignBuilderTab from './components/tabs/CampaignBuilderTab';"
  );
}

fs.writeFileSync(file, newContent);
console.log("Successfully extracted CampaignBuilderTab!");
