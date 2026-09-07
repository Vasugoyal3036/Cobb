const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

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
  'persona', 'handleGenerateSmartCoordinate', 'trendForecast', 'isForecasting', 'compImage', 'compImageUrl', 'compIntelResult', 'isAnalyzingComp', 'compError'
];

const safeProps = allVars.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n    ');

c = c.replace(/const appState = \{[\s\S]*?\};/, `const appState = {\n    ${safeProps}\n  };`);

fs.writeFileSync('src/App.jsx', c);
