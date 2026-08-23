const express = require('express');
const cors = require('cors');
const { sql, connectDB } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let pythonProcess = null;
let pythonLogs = [];

let gatewayProcess = null;
let gatewayLogs = [];

function getListenerScriptPath() {
    const currentDirPath = path.join(__dirname, 'cobb_pos_listener.py');
    const parentDirPath = path.join(__dirname, '..', 'cobb_pos_listener.py');

    if (fs.existsSync(currentDirPath)) {
        return { scriptPath: currentDirPath, cwd: __dirname };
    } else if (fs.existsSync(parentDirPath)) {
        return { scriptPath: parentDirPath, cwd: path.join(__dirname, '..') };
    }
    return { scriptPath: currentDirPath, cwd: __dirname };
}

// Routes
app.get('/api/sales/overview', async (req, res) => {
    try {
        const todayResult = await sql.query(`
            SELECT 
                ISNULL(SUM(m.NET_AMOUNT), 0) as TotalSales, 
                COUNT(m.CM_ID) as BillCount,
                ISNULL(SUM(m.CASH_AMOUNT), 0) as CashAmount,
                ISNULL(SUM(m.CC_AMOUNT), 0) - ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as CardAmount,
                ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as UPIAmount
            FROM VW_CASHMEMO_PRINT_MST m
            LEFT JOIN VW_WL_CASHMEMOLIST w ON m.CM_ID = w.MEMO_ID
            WHERE CAST(m.CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND m.CANCELLED = 0
        `);
        
        const yesterdayResult = await sql.query(`
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount 
            FROM VW_CASHMEMO_PRINT_MST 
            WHERE CAST(CM_TIME AS DATE) = CAST(DATEADD(day, -1, GETDATE()) AS DATE) AND CANCELLED = 0
        `);

        res.json({
            today: todayResult.recordset[0] || { TotalSales: 0, BillCount: 0, CashAmount: 0, CardAmount: 0, UPIAmount: 0 },
            yesterday: yesterdayResult.recordset[0] || { TotalSales: 0, BillCount: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/analytics/hourly', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT 
                DATEPART(hour, CM_TIME) AS SaleHour,
                COUNT(CM_ID) AS TotalBills,
                SUM(NET_AMOUNT) AS TotalRevenue
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CAST(CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND CANCELLED = 0
            GROUP BY DATEPART(hour, CM_TIME)
            ORDER BY SaleHour ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/analytics/monthly-products', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT 
                FORMAT(m.CM_TIME, 'yyyy-MM') AS SaleMonth,
                ISNULL(d.SECTION_NAME, 'Uncategorized') AS ProductType,
                ISNULL(d.ARTICLE_NAME, 'General Article') AS ArticleName,
                SUM(d.QUANTITY) AS TotalUnitsSold,
                SUM(d.NET) AS TotalRevenue
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE m.CANCELLED = 0 AND m.CM_TIME IS NOT NULL
            GROUP BY FORMAT(m.CM_TIME, 'yyyy-MM'), d.SECTION_NAME, d.ARTICLE_NAME
            ORDER BY SaleMonth DESC, TotalRevenue DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inventory/dead-stock', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 100
                p.product_code AS SKU,
                CONCAT(s.article_no, ' - ', s.section_name, ' (', s.para1_name, ', ', s.para2_name, ')') AS ItemName,
                p.quantity_in_stock AS CurrentStock
            FROM PMT01106 p
            INNER JOIN SKU_NAMES s ON p.product_code = s.product_Code
            WHERE p.quantity_in_stock >= 3
              AND p.product_code NOT IN (
                  SELECT DISTINCT d.PRODUCT_CODE 
                  FROM VW_CASHMEMO_PRINT_DET d
                  INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
                  WHERE DATEDIFF(day, m.CM_TIME, GETDATE()) <= 60 AND m.CANCELLED = 0
              )
            ORDER BY p.quantity_in_stock DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/demand-forecasts', async (req, res) => {
    try {
        const deadStockSample = await sql.query(`
            SELECT TOP 2
                s.article_no AS ArticleNo,
                ISNULL(s.article_name, s.section_name) AS ItemName,
                p.quantity_in_stock AS CurrentStock
            FROM PMT01106 p
            INNER JOIN SKU_NAMES s ON p.product_code = s.product_Code
            WHERE p.quantity_in_stock >= 3
              AND p.product_code NOT IN (
                  SELECT DISTINCT d.PRODUCT_CODE 
                  FROM VW_CASHMEMO_PRINT_DET d
                  INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
                  WHERE DATEDIFF(day, m.CM_TIME, GETDATE()) <= 60 AND m.CANCELLED = 0
              )
            ORDER BY p.quantity_in_stock DESC
        `);

        const lowStockSample = await sql.query(`
            SELECT TOP 2
                s.article_no AS ArticleNo,
                ISNULL(s.article_name, s.section_name) AS ItemName,
                ISNULL(s.para2_name, 'Standard') AS Size,
                p.quantity_in_stock AS CurrentStock
            FROM PMT01106 p
            INNER JOIN SKU_NAMES s ON p.product_code = s.product_Code
            WHERE p.quantity_in_stock BETWEEN 1 AND 3
            ORDER BY p.quantity_in_stock ASC
        `);

        const deadItemsText = deadStockSample.recordset.length > 0 
            ? deadStockSample.recordset.map(i => `${i.ArticleNo} (${i.ItemName}, ${i.CurrentStock} units left)`).join("; ")
            : "No stagnant items found";

        const lowItemsText = lowStockSample.recordset.length > 0 
            ? lowStockSample.recordset.map(i => `${i.ArticleNo} (${i.ItemName}, Size: ${i.Size}, ${i.CurrentStock} units)`).join("; ")
            : "All core sizes adequately stocked";

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
        You are an expert menswear retail strategist exclusively for a "Cobb Italy" (Cobb Apparels) franchise store in Haryana.
        
        Current Live Inventory Context:
        - Stagnant Dead Stock (Unsold 60+ days): ${deadItemsText}
        - Critically Low Stock (1 to 3 units left): ${lowItemsText}
        
        BRAND-SPECIFIC CATALOG TRENDS (Only suggest these Cobb lines):
        1. "T-Shirt Shift": High demand for Cobb's Color-Block Polo Neck T-Shirts and Oversized Round Neck Tees.
        2. "Bottomwear": Shift towards Cobb Straight-Fit and Boot-Cut Premium Jeans, and Six-Pocket Cargo Summer Lowers.
        3. "Smart Layering": High demand for Cobb Smart-Fit Formal Shirts paired with Ultra-Fit Formal Trousers and Chinos in Khaki, Olive, and Peach.
        4. "Autumn Transition": Push Cobb Shackets, Co-ord Sets, and Lightweight Jackets.

        Generate exactly 4 actionable daily tips for the store manager as a JSON array of objects.
        
        REQUIRED TIP BREAKDOWN:
        - Tip 1: "Cobb Supplier Order" -> Look at the Low Stock items above. Tell the manager to restock these AND specifically request the trending Cobb lines (e.g. Boot-Cut Jeans, Color-Block Polos) from the Cobb warehouse.
        - Tip 2: "Dead Stock Pivot" -> Tell the staff how to style one of our specific Dead Stock items (${deadItemsText}) by pairing it with a trending Cobb item (like a Shacket or Smart-Fit shirt) to make it sell.
        - Tip 3: "Display Strategy" -> A quick tip on arranging mannequins to highlight Cobb's Ultra-Fit Trousers or Cargo Lowers.
        - Tip 4: "Cross-Sell Playbook" -> Natural item pairing advice using Cobb terminology (e.g. "Pair Slim-Fit Formal Shirts with Ultra-Fit Trousers").
        
        CRITICAL RULES:
        - DO NOT mention generic trends unless stated above. Stick to Cobb brand terminology.
        - DO NOT mention discounts, coupons, sales, or markdown percentages.
        - Format the response strictly as a raw JSON array with keys: "tag" and "tip".
        - Each tip must be under 30 words.
        - Output ONLY valid raw JSON. No markdown blocks.
        `;
        
        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();
        
        if (rawText.startsWith('```json')) {
            rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const tips = JSON.parse(rawText);
        res.json({ tips });
    } catch (err) {
        console.error("AI Database Forecast Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/persona', async (req, res) => {
    const { purchases } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
        Analyze the following recent clothing purchases from a male customer at a menswear store:
        "${purchases}"
        
        Classify this customer's style into exactly ONE of the following persona tags:
        - Corporate Professional
        - Weekend Casual
        - Denim Enthusiast
        - Festive / Traditional
        - Trendsetter
        - Essentials Buyer
        
        Output ONLY the tag name. Do not include quotes or any other text.
        `;
        const result = await model.generateContent(prompt);
        res.json({ persona: result.response.text().trim() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/outfit-matcher', async (req, res) => {
    const { deadStockItem } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
        You are an expert fashion stylist for Cobb Pundri menswear.
        We have this slow-moving item in our inventory: "${deadStockItem}".
        
        Write a short, engaging WhatsApp message promoting this item as the "Style of the Week". 
        Pair it conceptually with a popular basic (like classic blue jeans, navy chinos, or a clean white tee) to show the customer how to wear it perfectly.
        
        CRITICAL RULE: DO NOT MENTION ANY DISCOUNTS OR SALES. Focus purely on the styling and invite them to the store to try the look. Keep it under 50 words. Sign off as "Parbhat Goyal, Cobb Pundri".
        `;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/campaign-builder', async (req, res) => {
    const { event, audience } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
        You are the Marketing Director for Cobb Pundri, a premium menswear franchise in Haryana.
        
        Upcoming Campaign/Event: ${event}
        Target Audience Segment: ${audience}
        
        Write a highly engaging WhatsApp broadcast message to invite this specific audience to the store for this event/season.
        
        CRITICAL RULE: DO NOT OFFER ANY DISCOUNTS, PROMO CODES, OR PERCENTAGES OFF. You must strictly abide by franchise standard pricing. Do not mention specific prices.
        
        Make it sound exclusive and exciting. Keep it under 60 words. Use emojis appropriately. Sign off as "Parbhat Goyal, Cobb Pundri".
        `;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/campaigns/generate', async (req, res) => {
    const { customerName, pastPurchases, type, sizes } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        let objective = "";
        if (type === 'cross-sell') {
            objective = "Acting as a personal stylist, suggest a matching Cobb Apparels item from our new collection that pairs perfectly with their past purchases.";
        } else if (type === 'size-alert') {
            objective = `Enthusiastically let them know we just received a fresh stock of Cobb arrivals specifically in their preferred sizes (${sizes}).`;
        } else if (type === 'dormant') {
            objective = "Write a warm, polite 'we miss you' message. Mention the new season's collection and invite them to stop by to check out the new Cobb fits.";
        } else if (type === 'vip') {
            objective = "Write a highly personalized, premium white-glove thank you message. Express genuine gratitude for them being one of our top Cobb customers.";
        }

        const prompt = `
        You are an expert retail marketer for Cobb Pundri, a men's clothing franchise in Haryana.
        
        CRITICAL RULE: DO NOT OFFER ANY DISCOUNTS, SALES, OFFERS, OR PERCENTAGES OFF. You are a franchise and must strictly abide by standard pricing. Do not mention specific prices.
        
        Customer Name: ${customerName}
        Past Purchases: ${pastPurchases}
        
        Objective: ${objective}
        
        Write a short, engaging WhatsApp message (under 50 words). Keep it friendly, professional, and natural. Do not use hashtags.
        Sign off as "Parbhat Goyal, Cobb Pundri".
        `;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/vip', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 50 
                CUSTOMER_CODE as Phone, 
                CUSTOMER_FNAME as FirstName, 
                CUSTOMER_LNAME as LastName, 
                SUM(NET_AMOUNT) as LifetimeSpend, 
                COUNT(CM_ID) as TotalBills,
                CONVERT(varchar, MAX(CM_TIME), 126) as LastVisit
            FROM VW_CASHMEMO_PRINT_MST 
            WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND LEN(CUSTOMER_CODE) >= 10
            GROUP BY CUSTOMER_CODE, CUSTOMER_FNAME, CUSTOMER_LNAME
            ORDER BY LifetimeSpend DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/dormant', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 50 
                CUSTOMER_CODE as Phone, 
                CUSTOMER_FNAME as FirstName, 
                CUSTOMER_LNAME as LastName, 
                SUM(NET_AMOUNT) as LifetimeSpend, 
                DATEDIFF(day, MAX(CM_TIME), GETDATE()) as DaysSinceLastVisit
            FROM VW_CASHMEMO_PRINT_MST 
            WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND LEN(CUSTOMER_CODE) >= 10
            GROUP BY CUSTOMER_CODE, CUSTOMER_FNAME, CUSTOMER_LNAME
            HAVING DATEDIFF(day, MAX(CM_TIME), GETDATE()) > 60
            ORDER BY LifetimeSpend DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers/segment', async (req, res) => {
    const { segment } = req.body;
    try {
        let query = '';
        if (segment === 'All VIP Customers') {
            query = `SELECT DISTINCT TOP 50 CUSTOMER_CODE as Phone, CUSTOMER_FNAME as FirstName FROM VW_CASHMEMO_PRINT_MST WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND LEN(CUSTOMER_CODE) >= 10 ORDER BY CM_TIME DESC`;
        } else if (segment === 'Dormant Customers') {
            query = `SELECT DISTINCT TOP 50 CUSTOMER_CODE as Phone, CUSTOMER_FNAME as FirstName FROM VW_CASHMEMO_PRINT_MST WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND LEN(CUSTOMER_CODE) >= 10 GROUP BY CUSTOMER_CODE, CUSTOMER_FNAME HAVING DATEDIFF(day, MAX(CM_TIME), GETDATE()) > 60`;
        } else if (segment === 'Formal / Suit Buyers') {
            query = `SELECT DISTINCT TOP 50 m.CUSTOMER_CODE as Phone, m.CUSTOMER_FNAME as FirstName FROM VW_CASHMEMO_PRINT_MST m INNER JOIN VW_CASHMEMO_PRINT_DET d ON m.CM_ID = d.CM_ID WHERE m.CANCELLED = 0 AND m.CUSTOMER_CODE IS NOT NULL AND LEN(m.CUSTOMER_CODE) >= 10 AND (d.SECTION_NAME LIKE '%Formal%' OR d.SECTION_NAME LIKE '%Trouser%' OR d.ARTICLE_NAME LIKE '%Suit%')`;
        } else if (segment === 'Denim Enthusiasts') {
            query = `SELECT DISTINCT TOP 50 m.CUSTOMER_CODE as Phone, m.CUSTOMER_FNAME as FirstName FROM VW_CASHMEMO_PRINT_MST m INNER JOIN VW_CASHMEMO_PRINT_DET d ON m.CM_ID = d.CM_ID WHERE m.CANCELLED = 0 AND m.CUSTOMER_CODE IS NOT NULL AND LEN(m.CUSTOMER_CODE) >= 10 AND (d.SECTION_NAME LIKE '%Jeans%' OR d.SECTION_NAME LIKE '%Denim%')`;
        } else {
            query = `SELECT DISTINCT TOP 10 CUSTOMER_CODE as Phone, CUSTOMER_FNAME as FirstName FROM VW_CASHMEMO_PRINT_MST WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND LEN(CUSTOMER_CODE) >= 10`;
        }
        
        const result = await sql.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/:phone/history', async (req, res) => {
    const { phone } = req.params;
    try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const result = await sql.query(`
            SELECT TOP 50
                d.ARTICLE_NO as ArticleNo,
                d.ARTICLE_NAME as ArticleName,
                d.QUANTITY as Quantity,
                d.NET as NetPrice,
                CONVERT(varchar, m.CM_TIME, 126) as BillDate,
                ISNULL(s.para1_name, 'Standard') as Color,
                ISNULL(s.para2_name, 'Standard') as Size,
                ISNULL(d.SECTION_NAME, 'Apparel') as Category
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            LEFT JOIN SKU_NAMES s ON d.PRODUCT_CODE = s.product_Code
            WHERE m.CUSTOMER_CODE LIKE '%${cleanPhone}%' AND m.CANCELLED = 0
            ORDER BY m.CM_TIME DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales/live', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 50 
                CM_NO as BillNumber,
                CUSTOMER_CODE as Phone,
                CUSTOMER_FNAME as FirstName,
                NET_AMOUNT as Amount,
                CONVERT(varchar, CM_TIME, 126) as BillTime
            FROM VW_CASHMEMO_PRINT_MST 
            WHERE CAST(CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND CANCELLED = 0
            ORDER BY CM_TIME DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 2000 
                s.product_Code as SKU,
                s.article_no as ArticleNo,
                ISNULL(s.article_name, s.section_name) as ItemName,
                ISNULL(s.section_name, 'Uncategorized') as ProductType,
                ISNULL(s.para1_name, 'Standard') as Color,
                ISNULL(s.para2_name, 'Standard') as Size,
                p.quantity_in_stock as CurrentStock
            FROM PMT01106 p
            INNER JOIN SKU_NAMES s ON p.product_code = s.product_Code
            ORDER BY p.quantity_in_stock ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Robust Gateway Controllers for Windows
app.post('/api/gateway/start', (req, res) => {
    if (gatewayProcess) {
        return res.json({ status: 'running' });
    }

    const gatewayDir = 'C:\\CobbWhatsAppGateway';
    const targetPath = path.join(gatewayDir, 'server.js');

    if (!fs.existsSync(targetPath)) {
        const errorMsg = `Cannot find server.js at: ${targetPath}`;
        gatewayLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] ${errorMsg}`);
        return res.status(404).json({ error: errorMsg });
    }

    gatewayLogs.push(`[${new Date().toLocaleTimeString()}] Spawning WhatsApp Gateway process...`);

    gatewayProcess = spawn('node.exe', ['server.js'], {
        cwd: gatewayDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    gatewayProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => gatewayLogs.push(`[${new Date().toLocaleTimeString()}] ${line}`));
    });

    gatewayProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => gatewayLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] ${line}`));
    });

    gatewayProcess.on('error', (err) => {
        gatewayLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] Process failed to start: ${err.message}`);
        gatewayProcess = null;
    });

    gatewayProcess.on('close', (code) => {
        gatewayLogs.push(`[${new Date().toLocaleTimeString()}] Gateway process exited with code ${code}`);
        gatewayProcess = null;
    });

    res.json({ status: 'started' });
});

app.post('/api/gateway/stop', (req, res) => {
    if (gatewayProcess) {
        try {
            spawn('taskkill', ['/PID', gatewayProcess.pid.toString(), '/F', '/T']);
        } catch (e) {
            gatewayProcess.kill();
        }
        gatewayProcess = null;
        gatewayLogs.push(`[${new Date().toLocaleTimeString()}] Gateway manually stopped.`);
        return res.json({ status: 'stopped' });
    }
    res.json({ status: 'stopped' });
});

app.get('/api/gateway/status', async (req, res) => {
    let qrCodeUrl = null;
    let isReady = false;

    if (gatewayProcess) {
        try {
            const response = await fetch('http://localhost:3000/status');
            if (response.ok) {
                const data = await response.json();
                qrCodeUrl = data.qrCodeUrl;
                isReady = data.isReady;
            }
        } catch (e) {
            // Gateway initializing
        }
    }

    res.json({
        isRunning: !!gatewayProcess,
        isReady: isReady,
        qrCodeUrl: qrCodeUrl,
        logs: gatewayLogs
    });
});

app.post('/api/automation/start', (req, res) => {
    if (pythonProcess) return res.json({ status: 'running' });
    const { scriptPath, cwd } = getListenerScriptPath();
    pythonProcess = spawn('python', ['-u', scriptPath], { shell: true, cwd: cwd });
    pythonProcess.stdout.on('data', (data) => pythonLogs.push(`[${new Date().toLocaleTimeString()}] ${data.toString().trim()}`));
    pythonProcess.stderr.on('data', (data) => pythonLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] ${data.toString().trim()}`));
    pythonProcess.on('close', () => pythonProcess = null);
    res.json({ status: 'started' });
});

app.post('/api/automation/stop', (req, res) => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
        return res.json({ status: 'stopped' });
    }
    res.json({ status: 'stopped' });
});

app.get('/api/automation/status', (req, res) => res.json({ isRunning: !!pythonProcess, logs: pythonLogs }));

app.post('/api/whatsapp/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Phone and message required.' });
    
    const formattedPhone = String(phone).replace(/[^0-9]/g, '');
    const finalPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;

    try {
        const response = await fetch('http://localhost:3000/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalPhone, message: message })
        });
        const data = await response.json();
        if (response.ok) return res.json({ success: true });
        return res.status(500).json({ error: data.error || 'Failed to send' });
    } catch (err) {
        return res.status(500).json({ error: 'WhatsApp Gateway offline.' });
    }
});

app.post('/api/automation/send-test', async (req, res) => {
    const { phone, customerName } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });
    const formattedPhone = String(phone).replace(/[^0-9]/g, '').length === 10 ? `91${String(phone).replace(/[^0-9]/g, '')}` : String(phone).replace(/[^0-9]/g, '');
    const messageText = `Hello *${customerName || 'Test Customer'}*! 👋\n\nThank you for shopping at *Cobb Pundri* today. We hope you loved our latest collection and had a wonderful experience with us! ✨\n\n-----------------------------------\n📍 *Store Location:*\nhttps://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac\n\n⭐ *Leave us a review:*\nhttps://search.google.com/local/writereview?placeid=ChIJHfCBR58ZDjkRpBbB9EV-Zew\n-----------------------------------\n\nStay connected with our latest drops:\n📸 *Instagram:* https://www.instagram.com/cobbpundri\n👍 *Facebook:* https://www.facebook.com/share/14ra4KrNJa3/\n\nWarm Regards,\n*Parbhat Goyal*\nCobb Pundri`;
    
    try {
        const response = await fetch('http://localhost:3000/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: formattedPhone, message: messageText })
        });
        const data = await response.json();
        if (response.ok) return res.json({ success: true, message: `Test message dispatched to ${formattedPhone}` });
        return res.status(500).json({ error: data.error });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`CRM Backend running on http://localhost:${PORT}`));