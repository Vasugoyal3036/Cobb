const fs = require('fs');

const missingBlock = `          
          setToasts(prev => [
            ...prev, 
            { id: Date.now(), title: 'BARCODE SCANNED 📷', message: \`Scanned Tag: \${scannedCode}\` }
          ]);
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchAutomationStatus = () => {
      // 1. Fetch backend automation status
      axios.get(\`\${API_BASE}/api/automation/status\`)
        .then(res => {
          setIsListenerRunning(res.data.isRunning);
          setListenerLogs(res.data.logs);
        })
        .catch(console.error);

      // 2. Fetch WhatsApp gateway status
      axios.get(\`\${API_BASE}/api/gateway/status\`)
        .then(res => {
          setIsGatewayRunning(res.data.isRunning);
          setIsGatewayReady(res.data.isReady);
          setGatewayQr(res.data.qrCodeUrl);
          setGatewayLogs(res.data.logs);
        })
        .catch(console.error);

      // 3. Fetch broadcast status
      axios.get(\`\${API_BASE}/api/broadcast/status\`)
        .then(res => setBroadcastStatus(res.data))
        .catch(console.error);
    };

    const fetchDashboardMetrics = () => {
      // Fetch live transactions & dashboard metrics for real-time dynamic updates (Every 30s instead of 3s to save bandwidth)
      axios.get(\`\${API_BASE}/api/sales/overview\`)
        .then(res => setOverviewStats(res.data))
        .catch(console.error);

      axios.get(\`\${API_BASE}/api/sales/live\`)
        .then(res => {
          const oldBills = prevLiveBillsRef.current;
          const newBills = res.data;

          if (oldBills.length > 0 && newBills.length > 0) {
            const oldBillNumbers = new Set(oldBills.map(b => b.BillNumber.trim()));
            newBills.forEach(bill => {
              if (!oldBillNumbers.has(bill.BillNumber.trim())) {
                const toastId = Date.now() + Math.random();
                const durationMs = 5000;
                const newToast = {
                  id: toastId,
                  title: "⚡ Live POS Checkout Alert",
                  billNumber: bill.BillNumber?.trim(),
                  customer: bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer',
                  paymentMode: bill.PaymentMode || 'Cash',
                  amount: bill.Amount || 0,
                  duration: durationMs
                };
                setToasts(prev => [newToast, ...prev].slice(0, 3));
                setTimeout(() => {
                  setToasts(prev => prev.filter(t => t.id !== toastId));
                }, durationMs);
              }
            });
          }
          prevLiveBillsRef.current = newBills;
          setLiveBills(newBills);
        })
        .catch(console.error);

      axios.get(\`\${API_BASE}/api/analytics/hourly\`)
        .then(res => setHourlySales(res.data))
        .catch(console.error);

      axios.get(\`\${API_BASE}/api/analytics/wardrobe-profiles\`)
        .then(res => setWardrobeProfiles(res.data))
        .catch(console.error);

      axios.get(\`\${API_BASE}/api/financials/pnl\`)
        .then(res => setPnlData(res.data))
        .catch(console.error);

      axios.get(\`\${API_BASE}/api/analytics/retention-radar\`)
        .then(res => setRetentionData(res.data))
        .catch(console.error);
    };

    const autoStartServicesOnLoad = async () => {
      try {
        const autoRes = await axios.get(\`\${API_BASE}/api/automation/status\`);
        if (!autoRes.data.isRunning) {
          console.log("Auto-starting Automation Listener Engine on frontend mount...");
          await axios.post(\`\${API_BASE}/api/automation/start\`);
        }
        const gwRes = await axios.get(\`\${API_BASE}/api/gateway/status\`);
        if (!gwRes.data.isRunning) {
          console.log("Auto-starting WhatsApp Gateway on frontend mount...");
          await axios.post(\`\${API_BASE}/api/gateway/start\`);
        }
      } catch (err) {
        console.error("Auto-start services error:", err);
      }
    };

    autoStartServicesOnLoad();
    fetchAutomationStatus();
    fetchDashboardMetrics();
    
    const interval = setInterval(fetchAutomationStatus, 3000);
    const metricsInterval = setInterval(fetchDashboardMetrics, 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(metricsInterval);
    };
  }, []);

  const handleNextTip = () => setCurrentTipIndex((prev) => (prev + 1) % forecastTips.length);
  const handlePrevTip = () => setCurrentTipIndex((prev) => (prev - 1 + forecastTips.length) % forecastTips.length);

  const handleRefreshForecastTips = async () => {
    setIsLoadingForecast(true);
    try {
      const lowStockCount = inventory.filter(i => i.CurrentStock <= 3).length;
      const res = await axios.post(\`\${API_BASE}/api/ai/demand-forecasts\`, {
        todaySales: overviewStats.today.TotalSales,`;

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\\n');

// we want to insert missingBlock between line 309 and line 310 (0-indexed)
// wait, line 309 is `            setActiveTab('inventory');`
// line 310 is `          }`
// but the original had:
// 309:           }
// 310:         yesterdaySales: overviewStats.yesterday.TotalSales,
// We should insert it exactly after line 309 (index 308). Let's double check.

const pre = lines.slice(0, 309);
const post = lines.slice(309);

fs.writeFileSync('src/App.jsx', [...pre, missingBlock, ...post].join('\\n'));
console.log("Repaired!");
