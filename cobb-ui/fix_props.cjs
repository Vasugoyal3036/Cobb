const fs = require('fs');

const allVars = [
  'API_BASE', 'vips', 'setVips', 'dormant', 'setDormant', 'darkMode', 'setDarkMode',
  'overviewStats', 'setOverviewStats', 'returnsData', 'setReturnsData', 'smartCoordinate',
  'setSmartCoordinate', 'showCoordinateModal', 'setShowCoordinateModal', 'vmImages', 'setVmImages',
  'vmImageUrls', 'setVmImageUrls', 'vmAuditResult', 'setVmAuditResult', 'isAuditing', 'setIsAuditing',
  'vmError', 'setVmError', 'bundles', 'setBundles', 'isLoadingBundles', 'setIsLoadingBundles',
  'publishedBundles', 'setPublishedBundles', 'handleVmUpload', 'fetchTrendForecast', 'handleCompUpload',
  'fetchBundles', 'globalCustomers', 'setGlobalCustomers', 'isSearchingCustomers', 'setIsSearchingCustomers',
  'liveBills', 'setLiveBills', 'inventory', 'setInventory', 'deadStock', 'setDeadStock', 'hourlySales',
  'setHourlySales', 'dailySales', 'setDailySales', 'monthlyProducts', 'setMonthlyProducts', 'gstSummary',
  'setGstSummary', 'gstRateSlab', 'setGstRateSlab', 'gstCopied', 'setGstCopied', 'sizeMatrix', 'setSizeMatrix',
  'wardrobeProfiles', 'setWardrobeProfiles', 'pnlData', 'setPnlData', 'retentionData', 'setRetentionData',
  'reconData', 'setReconData', 'countedCashInput', 'setCountedCashInput', 'reconNotes', 'setReconNotes',
  'showReconModal', 'setShowReconModal', 'showEodModal', 'setShowEodModal', 'eodSummaryText', 'setEodSummaryText',
  'eodCopied', 'setEodCopied', 'isMobileMenuOpen', 'setIsMobileMenuOpen', 'matrixCategoryFilter',
  'setMatrixCategoryFilter', 'isListenerRunning', 'setIsListenerRunning', 'isTogglingListener',
  'setIsTogglingListener', 'listenerLogs', 'setListenerLogs', 'isGatewayRunning', 'setIsGatewayRunning',
  'isTogglingGateway', 'setIsTogglingGateway', 'isGatewayReady', 'setIsGatewayReady', 'gatewayQr', 'setGatewayQr',
  'gatewayLogs', 'setGatewayLogs', 'testPhone', 'setTestPhone', 'testMsg', 'setTestMsg', 'isSendingTestWa',
  'setIsSendingTestWa', 'broadcastGroup', 'setBroadcastGroup', 'broadcastGroupCount', 'setBroadcastGroupCount',
  'broadcastStatus', 'setBroadcastStatus', 'broadcastMsg', 'setBroadcastMsg', 'isStartingBroadcast',
  'setIsStartingBroadcast', 'isSyncingGroup', 'setIsSyncingGroup', 'groupSearchQuery', 'setGroupSearchQuery',
  'topMoversData', 'setTopMoversData', 'activeTab', 'setActiveTab', 'activeConsole', 'setActiveConsole',
  'searchQuery', 'setSearchQuery', 'selectedCustomer', 'setSelectedCustomer', 'customerHistory', 'setCustomerHistory',
  'loadingHistory', 'setLoadingHistory', 'customerPersona', 'setCustomerPersona', 'loadingPersona', 'setLoadingPersona',
  'aiMessageType', 'setAiMessageType', 'generatedMsg', 'setGeneratedMsg', 'isGenerating', 'setIsGenerating',
  'generateWhatsAppDraft', 'activeOutfitMatch', 'setActiveOutfitMatch', 'outfitPitch', 'setOutfitPitch',
  'isGeneratingOutfit', 'setIsGeneratingOutfit', 'campaignEvent', 'setCampaignEvent', 'campaignAudience',
  'setCampaignAudience', 'campaignDraft', 'setCampaignDraft', 'isGeneratingCampaign', 'setIsGeneratingCampaign',
  'openProductType', 'setOpenProductType', 'openMonth', 'setOpenMonth', 'selectedCalendarDay', 'setSelectedCalendarDay',
  'expandedBillId', 'setExpandedBillId', 'billItemsCache', 'setBillItemsCache', 'loadingBillItems', 'setLoadingBillItems',
  'handleKeyDown', 'toggleBillExpansion', 'fetchAutomationStatus', 'toggleListener', 'toggleGateway',
  'handleSendTestWhatsApp', 'handleSyncBroadcastGroup', 'handleStartBroadcast', 'handleStopBroadcast',
  'handleExportGroupCsv', 'openCustomerCard', 'handleGenerateAI', 'handleGenerateOutfitMatch',
  'handleGenerateCampaign', 'handleSaveReconciliation', 'handleGenerateEodReport', 'handleMasterRestock',
  'formatCurrency', 'MASTER_CATEGORIES', 'classifySubCategory', 'handleGlobalSearch', 'renderLogLine',
  'persona', 'loadingPersona', 'handleGenerateSmartCoordinate', 'trendForecast', 'isForecasting', 'compImage', 'compImageUrl', 'compIntelResult', 'isAnalyzingComp', 'compError'
];

const destructureStr = `const { ${allVars.join(', ')} } = props;`;

const tabs = [
  'DashboardTab.jsx', 'CustomerInsightsTab.jsx', 'LiveBillsTab.jsx',
  'AutomationEngineTab.jsx', 'CampaignBuilderTab.jsx', 'InventoryTab.jsx',
  '../CustomerProfileModal.jsx'
];

tabs.forEach(tab => {
  const file = 'src/components/tabs/' + tab;
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/const\s+\{[\s\S]*?\}\s*=\s*props;/g, '');
  
  content = content.replace(/(const \w+\s*=\s*\([^)]*\)\s*=>\s*\{)/, `$1\n  ${destructureStr}\n`);
  fs.writeFileSync(file, content);
});

let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

const appStateStr = `\n  const appState = { ${allVars.join(', ')} };\n`;
if (!appJsx.includes('const appState =')) {
  appJsx = appJsx.replace(/(\n\s*return\s*\(\s*<div)/, appStateStr + '$1');
}

appJsx = appJsx.replace(/<DashboardTab[^>]*>/, '<DashboardTab {...appState} />');
appJsx = appJsx.replace(/<CustomerInsightsTab[^>]*>/, '<CustomerInsightsTab {...appState} />');
appJsx = appJsx.replace(/<LiveBillsTab[^>]*>/, '<LiveBillsTab {...appState} />');
appJsx = appJsx.replace(/<AutomationEngineTab[^>]*>/, '<AutomationEngineTab {...appState} />');
appJsx = appJsx.replace(/<CampaignBuilderTab[^>]*>/, '<CampaignBuilderTab {...appState} />');
appJsx = appJsx.replace(/<InventoryTab[^>]*>/, '<InventoryTab {...appState} />');
appJsx = appJsx.replace(/<CustomerProfileModal[^>]*>/, '<CustomerProfileModal {...appState} />');

fs.writeFileSync('src/App.jsx', appJsx);
console.log('Successfully injected global state closure emulation!');
