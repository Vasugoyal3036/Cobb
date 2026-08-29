const express = require('express');
const cors = require('cors');
const { sql, connectDB } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception:', err);
    try {
        fs.appendFileSync(path.join(__dirname, 'backend_error.log'), `[${new Date().toISOString()}] Unhandled Exception: ${err.stack || err}\n`);
    } catch (e) { }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    try {
        fs.appendFileSync(path.join(__dirname, 'backend_error.log'), `[${new Date().toISOString()}] Unhandled Rejection: ${reason.stack || reason}\n`);
    } catch (e) { }
});

connectDB();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const multer = require('multer');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
const upload = multer({ dest: uploadsDir });

let pythonProcess = null;
let pythonLogs = [];

let gatewayProcess = null;
let gatewayLogs = [];

const mapLoyalty = (customers) => {
    return customers.map(c => {
        let tier = 'Bronze';
        let nextTier = 'Silver';
        let threshold = 10000;
        const spend = c.LifetimeSpend || 0;
        
        if (spend >= 50000) {
            tier = 'Platinum';
            nextTier = null;
            threshold = null;
        } else if (spend >= 25000) {
            tier = 'Gold';
            nextTier = 'Platinum';
            threshold = 50000;
        } else if (spend >= 10000) {
            tier = 'Silver';
            nextTier = 'Gold';
            threshold = 25000;
        }

        return {
            ...c,
            loyaltyTier: tier,
            nextTier: nextTier,
            spendToNextTier: threshold ? threshold - spend : 0
        };
    });
};

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

        // Week-over-Week comparison (Mon-Sun)
        const thisWeekResult = await sql.query(`
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0 AND CM_TIME >= DATEADD(day, 1 - DATEPART(dw, GETDATE()), CAST(GETDATE() AS DATE))
        `);

        const lastWeekResult = await sql.query(`
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0
              AND CM_TIME >= DATEADD(day, 1 - DATEPART(dw, GETDATE()) - 7, CAST(GETDATE() AS DATE))
              AND CM_TIME < DATEADD(day, 1 - DATEPART(dw, GETDATE()), CAST(GETDATE() AS DATE))
        `);

        // Month-over-Month comparison
        const thisMonthResult = await sql.query(`
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0 AND FORMAT(CM_TIME, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        `);

        const lastMonthResult = await sql.query(`
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0 AND FORMAT(CM_TIME, 'yyyy-MM') = FORMAT(DATEADD(month, -1, GETDATE()), 'yyyy-MM')
        `);

        res.json({
            today: todayResult.recordset[0] || { TotalSales: 0, BillCount: 0, CashAmount: 0, CardAmount: 0, UPIAmount: 0 },
            yesterday: yesterdayResult.recordset[0] || { TotalSales: 0, BillCount: 0 },
            thisWeek: thisWeekResult.recordset[0] || { TotalSales: 0, BillCount: 0 },
            lastWeek: lastWeekResult.recordset[0] || { TotalSales: 0, BillCount: 0 },
            thisMonth: thisMonthResult.recordset[0] || { TotalSales: 0, BillCount: 0 },
            lastMonth: lastMonthResult.recordset[0] || { TotalSales: 0, BillCount: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales/daily-month', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT 
                CAST(m.CM_TIME AS DATE) AS SaleDate,
                ISNULL(SUM(m.NET_AMOUNT), 0) AS TotalSales,
                ISNULL(SUM(m.CASH_AMOUNT), 0) AS CashAmount,
                ISNULL(SUM(m.CC_AMOUNT), 0) - ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as CardAmount,
                ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as UPIAmount
            FROM VW_CASHMEMO_PRINT_MST m
            LEFT JOIN VW_WL_CASHMEMOLIST w ON m.CM_ID = w.MEMO_ID
            WHERE MONTH(m.CM_TIME) = MONTH(GETDATE()) 
              AND YEAR(m.CM_TIME) = YEAR(GETDATE()) 
              AND m.CANCELLED = 0
            GROUP BY CAST(m.CM_TIME AS DATE)
            ORDER BY SaleDate ASC
        `);
        res.json(result.recordset);
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
                  WHERE m.CM_TIME >= DATEADD(day, -60, GETDATE()) AND m.CANCELLED = 0
              )
            ORDER BY p.quantity_in_stock DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

let cachedTips = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

app.post('/api/ai/demand-forecasts', async (req, res) => {
    // Check if the request is auto-fetch on mount or a forced refresh
    const isForceRefresh = req.body && (req.body.refresh === true || Object.keys(req.body).length > 0);
    const now = Date.now();

    let deadStockSample = null;
    let lowStockSample = null;
    try {
        deadStockSample = await sql.query(`
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
                  WHERE m.CM_TIME >= DATEADD(day, -60, GETDATE()) AND m.CANCELLED = 0
              )
            ORDER BY p.quantity_in_stock DESC
        `);

        lowStockSample = await sql.query(`
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
    } catch (dbErr) {
        console.error("Database query failed during AI prep:", dbErr);
    }

    const deadItemsText = (deadStockSample && deadStockSample.recordset.length > 0)
        ? deadStockSample.recordset.map(i => `${i.ArticleNo} (${i.ItemName}, ${i.CurrentStock} units left)`).join("; ")
        : "No stagnant items found";

    const lowItemsText = (lowStockSample && lowStockSample.recordset.length > 0)
        ? lowStockSample.recordset.map(i => `${i.ArticleNo} (${i.ItemName}, Size: ${i.Size}, ${i.CurrentStock} units)`).join("; ")
        : "All core sizes adequately stocked";

    // Setup fallback tips in case Gemini API is blocked/429'd
    const getFallbackTips = () => [
        {
            tag: "Cobb Supplier Order",
            tip: (lowStockSample && lowStockSample.recordset.length > 0)
                ? `Restock low item ${lowStockSample.recordset[0].ArticleNo} (${lowStockSample.recordset[0].ItemName}, ${lowStockSample.recordset[0].CurrentStock} left). Request fresh Cobb polo tees.`
                : "Low stock alert: Restock core size items and order trending Cobb smart-fit shirts from the main warehouse."
        },
        {
            tag: "Dead Stock Pivot",
            tip: (deadStockSample && deadStockSample.recordset.length > 0)
                ? `Style stagnant article ${deadStockSample.recordset[0].ArticleNo} by pairing it with trending Cobb Straight-Fit Jeans on the front display.`
                : "Style slow-moving items by displaying them paired with new season Cobb lightweight jackets."
        },
        {
            tag: "Display Strategy",
            tip: "Mannequin Alert: Arrange mannequins near the storefront highlighting Cobb Ultra-Fit Trousers and Cargo summer shorts."
        },
        {
            tag: "Cross-Sell Playbook",
            tip: "Upsell guideline: Direct floor staff to pair Slim-Fit Formal Shirts with Ultra-Fit Trousers for a complete outfit purchase."
        }
    ];

    if (!isForceRefresh && cachedTips && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('[AI CACHE] Returning cached demand-forecasts tips');
        return res.json({ tips: cachedTips });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

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

        // Cache the tips
        cachedTips = tips;
        cacheTimestamp = now;

        res.json({ tips });
    } catch (err) {
        console.warn("AI Database Forecast Error, falling back to local tips:", err.message);
        const tips = cachedTips || getFallbackTips();
        res.json({ tips, isFallback: true });
    }
});

app.post('/api/ai/persona', async (req, res) => {
    const { purchases } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
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
        console.warn("AI Persona Classify Error, falling back to local classifier:", err.message);
        const p = (purchases || '').toLowerCase();
        let fallbackPersona = "Essentials Buyer";
        if (p.includes('suit') || p.includes('formal') || p.includes('blazer') || p.includes('trouser') || p.includes('shirt')) {
            fallbackPersona = "Corporate Professional";
        } else if (p.includes('jean') || p.includes('denim')) {
            fallbackPersona = "Denim Enthusiast";
        } else if (p.includes('cargo') || p.includes('tshirt') || p.includes('t-shirt') || p.includes('shorts') || p.includes('lower')) {
            fallbackPersona = "Weekend Casual";
        } else if (p.includes('shacket') || p.includes('jacket') || p.includes('oversized') || p.includes('hoodie')) {
            fallbackPersona = "Trendsetter";
        } else if (p.includes('kurta') || p.includes('sherwani') || p.includes('traditional') || p.includes('nehru')) {
            fallbackPersona = "Festive / Traditional";
        }
        res.json({ persona: fallbackPersona, isFallback: true });
    }
});

app.post('/api/ai/outfit-matcher', async (req, res) => {
    const { deadStockItem } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
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
        console.warn("AI Outfit Matcher Error, falling back to local copy:", err.message);
        const item = deadStockItem || "Cobb Premium Menswear";
        const fallbackMsg = `Style of the Week: Elevate your casual wardrobe with the ${item}. Pair it conceptually with classic blue jeans, navy chinos, or a clean white tee for an effortless fit. Visit us at Cobb Pundri to try it on! - Parbhat Goyal, Cobb Pundri`;
        res.json({ message: fallbackMsg, isFallback: true });
    }
});

app.post('/api/ai/smart-coordinate', async (req, res) => {
    const { items, customerName } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
        const prompt = `
        You are an expert fashion stylist for Cobb Pundri menswear.
        Customer ${customerName || 'Valued Customer'} just bought these items: ${items.join(', ')}.
        
        Suggest 1 or 2 matching items from a menswear collection (like a belt, specific shoes, or a jacket) that perfectly complete this outfit.
        Write a short, friendly WhatsApp message (under 50 words) suggesting they add these to their wardrobe on their next visit. 
        Do not mention discounts. Sign off as "Parbhat Goyal, Cobb Pundri".
        `;
        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text() });
    } catch (err) {
        console.warn("AI Smart Coordinate Error:", err.message);
        const fallbackMsg = `Hey ${customerName || 'Valued Customer'}, we hope you love your new items! To complete the look, we highly recommend pairing them with our premium leather belts or a smart casual jacket. Drop by soon! - Parbhat Goyal, Cobb Pundri`;
        res.json({ message: fallbackMsg, isFallback: true });
    }
});

app.post('/api/ai/campaign-builder', async (req, res) => {
    const { event, audience } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
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
        console.warn("AI Campaign Builder Error, falling back to local copy:", err.message);
        const fallbackMsg = `Exclusive Store Alert: Join us at Cobb Pundri for our latest ${event || 'New Season Showcase'}. Specially designed for our valued ${audience || 'premium customers'}, check out our latest fits and fresh catalog additions. See you at the store! - Parbhat Goyal, Cobb Pundri`;
        res.json({ message: fallbackMsg, isFallback: true });
    }
});

app.post('/api/campaigns/generate', async (req, res) => {
    const { customerName, pastPurchases, type, sizes } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

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
        console.warn("AI Campaign Generator Error, falling back to local copy:", err.message);
        const name = customerName || "there";
        let fallbackMsg = `Hi ${name}, as one of our VIP customers, we invite you to explore the latest arrivals at Cobb Pundri. Elevate your wardrobe with the new season fits! - Parbhat Goyal, Cobb Pundri`;

        if (type === 'cross-sell') {
            fallbackMsg = `Hi ${name}! We hope you liked your recent purchases at Cobb. Based on your style, we suggest pairing them with our new collection of shirts and jeans. Stop by Cobb Pundri to try the look! - Parbhat Goyal, Cobb Pundri`;
        } else if (type === 'size-alert') {
            fallbackMsg = `Hi ${name}! Quick alert: We just received a fresh stock of new season Cobb fits in your sizes (${sizes || 'L/XL/32/34'}). Drop by Cobb Pundri to grab them before they're sold out! - Parbhat Goyal, Cobb Pundri`;
        } else if (type === 'dormant') {
            fallbackMsg = `Hi ${name}, we haven't seen you at Cobb Pundri in a while! Our fresh autumn collection is now live. We'd love to help you find your next look - hope to see you soon! - Parbhat Goyal, Cobb Pundri`;
        }
        res.json({ message: fallbackMsg, isFallback: true });
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
        res.json(mapLoyalty(result.recordset));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        const result = await sql.query`
            SELECT TOP 50 
                CUSTOMER_CODE as Phone, 
                CUSTOMER_FNAME as FirstName, 
                CUSTOMER_LNAME as LastName, 
                SUM(NET_AMOUNT) as LifetimeSpend, 
                COUNT(CM_ID) as TotalBills,
                CONVERT(varchar, MAX(CM_TIME), 126) as LastVisit
            FROM VW_CASHMEMO_PRINT_MST 
            WHERE CANCELLED = 0 
              AND CUSTOMER_CODE IS NOT NULL 
              AND LEN(CUSTOMER_CODE) >= 10
              AND (
                  CUSTOMER_FNAME LIKE '%' + ${q} + '%' OR 
                  CUSTOMER_LNAME LIKE '%' + ${q} + '%' OR 
                  CUSTOMER_CODE LIKE '%' + ${q} + '%' OR
                  LTRIM(RTRIM(ISNULL(CUSTOMER_FNAME, '') + ' ' + ISNULL(CUSTOMER_LNAME, ''))) LIKE '%' + ${q} + '%'
              )
            GROUP BY CUSTOMER_CODE, CUSTOMER_FNAME, CUSTOMER_LNAME
            ORDER BY LifetimeSpend DESC
        `;
        res.json(mapLoyalty(result.recordset));
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
        res.json(mapLoyalty(result.recordset));
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
                m.CM_ID as BillId,
                m.CM_NO as BillNumber,
                m.CUSTOMER_CODE as Phone,
                ISNULL(m.CUSTOMER_FNAME, '') + ' ' + ISNULL(m.CUSTOMER_LNAME, '') as CustomerName,
                m.CUSTOMER_FNAME as FirstName,
                m.NET_AMOUNT as Amount,
                CONVERT(varchar, m.CM_TIME, 126) as BillTime,
                ISNULL(m.CASH_AMOUNT, 0) as CashAmount,
                ISNULL(m.CC_AMOUNT, 0) - ISNULL(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0), 0) as CardAmount,
                ISNULL(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0), 0) as UpiAmount
            FROM VW_CASHMEMO_PRINT_MST m
            LEFT JOIN VW_WL_CASHMEMOLIST w ON m.CM_ID = w.MEMO_ID
            WHERE CAST(m.CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND m.CANCELLED = 0
            ORDER BY m.CM_TIME DESC
        `);

        const enriched = result.recordset.map(b => {
            const cash = b.CashAmount || 0;
            const card = b.CardAmount > 0 ? b.CardAmount : 0;
            const upi = b.UpiAmount || 0;

            let paymentMode = 'Cash';
            if (upi > 0 && cash === 0 && card === 0) {
                paymentMode = 'UPI / Online';
            } else if (card > 0 && cash === 0 && upi === 0) {
                paymentMode = 'Debit / Credit Card';
            } else if (cash > 0 && (upi > 0 || card > 0)) {
                paymentMode = 'Split (Cash + Digital)';
            } else if (cash > 0) {
                paymentMode = 'Cash';
            } else if (upi > 0) {
                paymentMode = 'UPI / Online';
            } else if (card > 0) {
                paymentMode = 'Debit / Credit Card';
            }

            return {
                ...b,
                PaymentMode: paymentMode
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales/bill/:id/items', async (req, res) => {
    const { id } = req.params;
    try {
        const request = new sql.Request();
        request.input('id', sql.VarChar, id);
        const result = await request.query(`
            SELECT 
                d.ARTICLE_NO as ArticleNo,
                d.ARTICLE_NAME as ArticleName,
                d.QUANTITY as Quantity,
                d.NET as NetPrice,
                ISNULL(s.para1_name, 'Standard') as Color,
                ISNULL(s.para2_name, 'Standard') as Size,
                ISNULL(d.SECTION_NAME, 'Apparel') as Category
            FROM VW_CASHMEMO_PRINT_DET d
            LEFT JOIN SKU_NAMES s ON d.PRODUCT_CODE = s.product_Code
            WHERE d.CM_ID = @id
            ORDER BY d.NET DESC
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

// Helper functions for auto-starting background services
async function startGatewayHelper() {
    try {
        const ping = await fetch('http://localhost:3000/status');
        if (ping.ok) return true;
    } catch (e) { }

    // Terminate any zombie processes holding port 3000
    try {
        const stdout = execSync('netstat -ano | findstr :3000').toString();
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    try { execSync(`taskkill /F /PID ${pid} /T 2>NUL`); } catch (err) { }
                }
            }
        }
    } catch (e) { }

    // Terminate any zombie Puppeteer Chromium processes holding session folder locks
    try {
        execSync('powershell -Command "Get-CimInstance Win32_Process | Where-Object ExecutablePath -match \'puppeteer\' | Invoke-CimMethod -MethodName Terminate"');
    } catch (e) { }

    if (gatewayProcess) return true;
    const gatewayDir = 'C:\\CobbWhatsAppGateway';
    const targetPath = path.join(gatewayDir, 'server.js');
    if (!fs.existsSync(targetPath)) return false;


    // Clean up stale lock files from crashes recursively (e.g. inside Default/)
    try {
        const lockDir = path.join(gatewayDir, '.wwebjs_auth', 'session-cobb-pos-session');
        const cleanLockFiles = (dir) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    cleanLockFiles(fullPath);
                } else {
                    if (entry.name.includes('Singleton') || entry.name === 'DevToolsActivePort' || entry.name === '.parentlock') {
                        try { fs.unlinkSync(fullPath); } catch (e) { }
                    }
                }
            }
        };
        cleanLockFiles(lockDir);
    } catch (e) { }

    gatewayLogs.push(`[${new Date().toLocaleTimeString()}] Auto-spawning WhatsApp Gateway process...`);
    gatewayProcess = spawn('node', ['server.js'], {
        cwd: gatewayDir,
        shell: true, windowsHide: true,
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
    return true;
}

function startAutomationHelper() {
    if (pythonProcess) return true;

    try {
        execSync('powershell -Command "Get-CimInstance Win32_Process | Where-Object CommandLine -match \'cobb_pos_listener\' | Invoke-CimMethod -MethodName Terminate"');
    } catch (e) { }

    const { scriptPath, cwd } = getListenerScriptPath();
    pythonLogs.push(`[${new Date().toLocaleTimeString()}] Auto-spawning Automation Engine Listener...`);
    pythonProcess = spawn('python', ['-u', scriptPath], { shell: true, windowsHide: true, cwd: cwd });
    pythonProcess.stdout.on('data', (data) => pythonLogs.push(`[${new Date().toLocaleTimeString()}] ${data.toString().trim()}`));
    pythonProcess.stderr.on('data', (data) => pythonLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] ${data.toString().trim()}`));
    pythonProcess.on('error', (err) => {
        console.error('Python spawn error:', err);
        pythonLogs.push(`[ERROR ${new Date().toLocaleTimeString()}] Python process failed to start: ${err.message}`);
        pythonProcess = null;
    });
    pythonProcess.on('close', () => pythonProcess = null);
    return true;
}

// Robust Gateway Controllers for Windows
app.post('/api/gateway/start', async (req, res) => {
    const started = await startGatewayHelper();
    res.json({ status: started ? 'started' : 'error' });
});

app.post('/api/gateway/stop', (req, res) => {
    if (gatewayProcess) {
        try {
            spawn('taskkill', ['/PID', gatewayProcess.pid.toString(), '/F', '/T'], { windowsHide: true });
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
    let isRunning = !!gatewayProcess;

    try {
        const response = await fetch('http://localhost:3000/status');
        if (response.ok) {
            const data = await response.json();
            qrCodeUrl = data.qrCodeUrl;
            isReady = data.isReady;
            isRunning = true;
        }
    } catch (e) {
        // Gateway initializing
    }

    res.json({
        isRunning: isRunning,
        isReady: isReady,
        qrCodeUrl: qrCodeUrl,
        logs: gatewayLogs
    });
});

app.post('/api/automation/start', (req, res) => {
    const started = startAutomationHelper();
    res.json({ status: started ? 'started' : 'error' });
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
        const timestamp = new Date().toLocaleTimeString();
        if (response.ok) {
            const successLog = `[${timestamp}] [SUCCESS] Direct WhatsApp sent to ${finalPhone}`;
            gatewayLogs.push(successLog);
            pythonLogs.push(successLog);
            return res.json({ success: true });
        }
        const failLog = `[ERROR ${timestamp}] Failed to send to ${finalPhone}: ${data.error || 'Unknown'}`;
        gatewayLogs.push(failLog);
        pythonLogs.push(failLog);
        return res.status(500).json({ error: data.error || 'Failed to send' });
    } catch (err) {
        const errLog = `[ERROR ${new Date().toLocaleTimeString()}] WhatsApp Gateway offline (port 3000)`;
        gatewayLogs.push(errLog);
        pythonLogs.push(errLog);
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

// --- BILLED CUSTOMER GROUP & MASS BROADCAST SYSTEM ---
const GROUP_FILE_PATH = path.join(__dirname, 'billed_customer_group.json');

let activeBroadcast = {
    isRunning: false,
    total: 0,
    sentCount: 0,
    failedCount: 0,
    currentIndex: 0,
    currentContact: '',
    status: 'idle',
    logs: []
};
let broadcastShouldStop = false;

function loadCustomerGroupFile() {
    if (fs.existsSync(GROUP_FILE_PATH)) {
        try {
            const data = fs.readFileSync(GROUP_FILE_PATH, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error reading billed_customer_group.json:", e);
        }
    }
    return {};
}

function saveCustomerGroupFile(groupData) {
    try {
        fs.writeFileSync(GROUP_FILE_PATH, JSON.stringify(groupData, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving billed_customer_group.json:", e);
    }
}

async function syncBilledCustomerGroup() {
    let group = loadCustomerGroupFile();
    try {
        const result = await sql.query(`
            SELECT 
                RTRIM(m.CUSTOMER_CODE) as Phone,
                MAX(m.CUSTOMER_FNAME) as CustomerName,
                COUNT(m.CM_ID) as TotalBills,
                SUM(m.NET_AMOUNT) as TotalSpent,
                MAX(m.CM_TIME) as LastBillTime
            FROM VW_CASHMEMO_PRINT_MST m
            WHERE m.CUSTOMER_CODE IS NOT NULL AND LEN(RTRIM(m.CUSTOMER_CODE)) >= 10 AND m.CANCELLED = 0
            GROUP BY RTRIM(m.CUSTOMER_CODE)
            ORDER BY MAX(m.CM_TIME) DESC
        `);

        result.recordset.forEach(row => {
            const rawPhone = String(row.Phone || '').replace(/[^0-9]/g, '');
            if (rawPhone.length >= 10) {
                const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                const name = (row.CustomerName || '').trim() || 'Valued Customer';

                group[formattedPhone] = {
                    phone: rawPhone,
                    formattedPhone: formattedPhone,
                    customerName: name,
                    totalBills: row.TotalBills || 1,
                    totalSpent: row.TotalSpent || 0,
                    lastBilledAt: row.LastBillTime,
                    addedAt: group[formattedPhone]?.addedAt || new Date().toISOString()
                };
            }
        });

        saveCustomerGroupFile(group);
    } catch (e) {
        console.error("Error syncing customer group from MSSQL:", e.message);
    }
    return group;
}

// Billed Customer Group Endpoints
app.get('/api/broadcast/group', async (req, res) => {
    let groupMap = await syncBilledCustomerGroup();
    const groupList = Object.values(groupMap).sort((a, b) => new Date(b.lastBilledAt || 0) - new Date(a.lastBilledAt || 0));
    res.json({
        totalCount: groupList.length,
        contacts: groupList
    });
});

app.post('/api/broadcast/sync', async (req, res) => {
    let groupMap = await syncBilledCustomerGroup();
    const groupList = Object.values(groupMap);
    res.json({
        success: true,
        message: `Synced ${groupList.length} unique billed customers into local database file.`,
        totalCount: groupList.length
    });
});

app.get('/api/broadcast/status', (req, res) => {
    res.json(activeBroadcast);
});

app.post('/api/broadcast/start', async (req, res) => {
    const { message, delayMs = 1500 } = req.body;
    if (!message) return res.status(400).json({ error: 'Broadcast message body is required.' });
    if (activeBroadcast.isRunning) return res.status(400).json({ error: 'A broadcast is already running.' });

    let groupMap = loadCustomerGroupFile();
    let contacts = Object.values(groupMap);
    if (contacts.length === 0) {
        groupMap = await syncBilledCustomerGroup();
        contacts = Object.values(groupMap);
    }
    if (contacts.length === 0) return res.status(400).json({ error: 'No billed customers found in group.' });

    broadcastShouldStop = false;
    activeBroadcast = {
        isRunning: true,
        total: contacts.length,
        sentCount: 0,
        failedCount: 0,
        currentIndex: 0,
        currentContact: '',
        status: 'running',
        logs: [`[${new Date().toLocaleTimeString()}] Started Mass WhatsApp Broadcast to ${contacts.length} billed customers...`]
    };

    res.json({ success: true, message: `Mass broadcast started to ${contacts.length} customers.` });

    // Background Broadcast Async Execution Loop
    (async () => {
        for (let i = 0; i < contacts.length; i++) {
            if (broadcastShouldStop) {
                activeBroadcast.status = 'stopped';
                activeBroadcast.isRunning = false;
                activeBroadcast.logs.push(`[${new Date().toLocaleTimeString()}] ⏹️ Mass broadcast stopped by user at ${i}/${contacts.length}.`);
                break;
            }

            const contact = contacts[i];
            activeBroadcast.currentIndex = i + 1;
            activeBroadcast.currentContact = `${contact.customerName} (${contact.phone})`;

            const personalizedMsg = message.replace(/{name}/g, contact.customerName || 'Valued Customer');
            const targetPhone = contact.formattedPhone;

            try {
                const response = await fetch('http://localhost:3000/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number: targetPhone, message: personalizedMsg })
                });
                const data = await response.json();
                if (response.ok) {
                    activeBroadcast.sentCount++;
                    const log = `[${new Date().toLocaleTimeString()}] [${i + 1}/${contacts.length}] Sent offer to ${contact.customerName} (${targetPhone})`;
                    activeBroadcast.logs.push(log);
                    gatewayLogs.push(log);
                    pythonLogs.push(log);
                } else {
                    activeBroadcast.failedCount++;
                    const log = `[ERROR ${new Date().toLocaleTimeString()}] [${i + 1}/${contacts.length}] Failed to send to ${contact.customerName} (${targetPhone}): ${data.error}`;
                    activeBroadcast.logs.push(log);
                    gatewayLogs.push(log);
                    pythonLogs.push(log);
                }
            } catch (err) {
                activeBroadcast.failedCount++;
                const log = `[ERROR ${new Date().toLocaleTimeString()}] [${i + 1}/${contacts.length}] Network error sending to ${contact.customerName} (${targetPhone})`;
                activeBroadcast.logs.push(log);
                gatewayLogs.push(log);
                pythonLogs.push(log);
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (!broadcastShouldStop) {
            activeBroadcast.isRunning = false;
            activeBroadcast.status = 'completed';
            activeBroadcast.logs.push(`[${new Date().toLocaleTimeString()}] 🎉 Mass WhatsApp Broadcast Completed! Total Sent: ${activeBroadcast.sentCount}/${contacts.length}`);
        }
    })();
});

app.post('/api/broadcast/stop', (req, res) => {
    broadcastShouldStop = true;
    activeBroadcast.isRunning = false;
    activeBroadcast.status = 'stopped';
    activeBroadcast.logs.push(`[${new Date().toLocaleTimeString()}] Broadcast cancellation requested.`);
    res.json({ success: true, message: 'Broadcast process stopped.' });
});

// Top-Moving Articles Leaderboard & Size Demand Matrix Endpoint
app.get('/api/analytics/top-movers', async (req, res) => {
    try {
        const topArticles = await sql.query(`
            SELECT TOP 15
                RTRIM(d.ARTICLE_NO) as ArticleNo,
                MAX(RTRIM(d.ARTICLE_NAME)) as ArticleName,
                MAX(RTRIM(d.SECTION_NAME)) as Category,
                SUM(d.QUANTITY) as TotalUnitsSold,
                SUM(d.NET) as TotalRevenue,
                COUNT(DISTINCT d.CM_ID) as TotalBills
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE m.CANCELLED = 0 
              AND d.ARTICLE_NO IS NOT NULL 
              AND LEN(RTRIM(d.ARTICLE_NO)) > 1
              AND m.CM_TIME >= DATEADD(month, -3, GETDATE())
            GROUP BY RTRIM(d.ARTICLE_NO)
            ORDER BY SUM(d.QUANTITY) DESC
        `);

        const sizeDemand = await sql.query(`
            SELECT TOP 12
                RTRIM(d.PARA2_NAME) as Size,
                SUM(d.QUANTITY) as TotalUnitsSold,
                SUM(d.NET) as TotalRevenue
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE m.CANCELLED = 0 
              AND d.PARA2_NAME IS NOT NULL 
              AND LEN(RTRIM(d.PARA2_NAME)) > 0 
              AND d.PARA2_NAME <> 'NA'
              AND m.CM_TIME >= DATEADD(month, -3, GETDATE())
            GROUP BY RTRIM(d.PARA2_NAME)
            ORDER BY SUM(d.QUANTITY) DESC
        `);

        res.json({
            topArticles: topArticles.recordset,
            sizeDemand: sizeDemand.recordset
        });
    } catch (err) {
        console.error("Top Movers Analytics Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 1. GST & Tax Summary Endpoint
app.get('/api/financials/gst-summary', async (req, res) => {
    try {
        const todayGst = await sql.query(`
            SELECT 
                COUNT(CM_ID) as BillCount,
                ISNULL(SUM(TOTAL_TAX), 0) as TaxCollected,
                ISNULL(SUM(NET_AMOUNT - TOTAL_TAX), 0) as TaxableSales,
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CAST(CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND CANCELLED = 0
        `);

        const monthlyGst = await sql.query(`
            SELECT 
                COUNT(CM_ID) as BillCount,
                ISNULL(SUM(TOTAL_TAX), 0) as TaxCollected,
                ISNULL(SUM(NET_AMOUNT - TOTAL_TAX), 0) as TaxableSales,
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CM_TIME IS NOT NULL AND CANCELLED = 0 AND FORMAT(CM_TIME, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        `);

        const historyGst = await sql.query(`
            SELECT TOP 12
                FORMAT(CM_TIME, 'yyyy-MM') as MonthStr,
                COUNT(CM_ID) as TotalInvoices,
                ISNULL(SUM(TOTAL_QTY), 0) as TotalUnits,
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales,
                ISNULL(SUM(NET_AMOUNT - TOTAL_TAX), 0) as TaxableSales,
                ISNULL(SUM(TOTAL_TAX), 0) as TaxCollected
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0 AND CM_TIME IS NOT NULL
            GROUP BY FORMAT(CM_TIME, 'yyyy-MM')
            ORDER BY MonthStr DESC
        `);

        res.json({
            today: todayGst.recordset[0] || { BillCount: 0, TaxCollected: 0, TaxableSales: 0, GrossSales: 0 },
            monthly: monthlyGst.recordset[0] || { BillCount: 0, TaxCollected: 0, TaxableSales: 0, GrossSales: 0 },
            history: historyGst.recordset || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Size Matrix & Inventory Heatmap Endpoint
app.get('/api/inventory/size-matrix', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 300
                ISNULL(d.SECTION_NAME, 'Apparel') as Category,
                ISNULL(d.ARTICLE_NAME, 'General Article') as ArticleName,
                ISNULL(s.para2_name, 'Standard') as Size,
                SUM(d.QUANTITY) as UnitsSold,
                SUM(d.NET) as TotalRevenue,
                COUNT(DISTINCT d.CM_ID) as Invoices
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            LEFT JOIN SKU_NAMES s ON d.PRODUCT_CODE = s.product_Code
            WHERE m.CANCELLED = 0 AND m.CM_TIME >= DATEADD(day, -90, GETDATE())
            GROUP BY d.SECTION_NAME, d.ARTICLE_NAME, s.para2_name
            HAVING SUM(d.QUANTITY) > 0
            ORDER BY TotalRevenue DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Customer Wardrobe Profiler Endpoint
app.get('/api/analytics/wardrobe-profiles', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 100
                m.CUSTOMER_CODE as Phone,
                MAX(ISNULL(m.CUSTOMER_FNAME, '') + ' ' + ISNULL(m.CUSTOMER_LNAME, '')) as CustomerName,
                SUM(m.NET_AMOUNT) as TotalSpent,
                COUNT(DISTINCT m.CM_ID) as TotalVisits,
                CONVERT(varchar, MAX(m.CM_TIME), 126) as LastVisitDate,
                DATEDIFF(day, MAX(m.CM_TIME), GETDATE()) as DaysInactive,
                SUM(CASE WHEN d.SECTION_NAME LIKE '%FORMAL%' OR d.ARTICLE_NAME LIKE '%SHIRT%' THEN 1 ELSE 0 END) as FormalItems,
                SUM(CASE WHEN d.SECTION_NAME LIKE '%JEANS%' OR d.SECTION_NAME LIKE '%SM%' OR d.ARTICLE_NAME LIKE '%T SHIRT%' THEN 1 ELSE 0 END) as CasualItems
            FROM VW_CASHMEMO_PRINT_MST m
            LEFT JOIN VW_CASHMEMO_PRINT_DET d ON m.CM_ID = d.CM_ID
            WHERE m.CANCELLED = 0 AND m.CUSTOMER_CODE IS NOT NULL AND m.CUSTOMER_CODE <> '' AND m.CUSTOMER_CODE <> '2222222222'
            GROUP BY m.CUSTOMER_CODE
            HAVING SUM(m.NET_AMOUNT) > 0
            ORDER BY TotalSpent DESC
        `);

        const enriched = result.recordset.map(c => {
            const formal = c.FormalItems || 0;
            const casual = c.CasualItems || 0;
            let primaryStyle = formal > casual ? 'Formal Suits & Shirts' : 'Casual Polos & Denims';
            let persona = 'Standard Shopper';
            if (c.TotalSpent >= 50000) persona = '💎 High Roller VIP';
            else if (c.TotalVisits >= 3) persona = '⚡ Frequent Loyal VIP';
            else if (formal > casual) persona = '💼 Formal Wearer';
            else persona = '👕 Casual Trendsetter';

            return {
                ...c,
                PrimaryStyle: primaryStyle,
                Persona: persona
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Monthly Store Profit & Loss (P&L) Endpoint
app.get('/api/financials/pnl', async (req, res) => {
    try {
        const monthlyRev = await sql.query(`
            SELECT 
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales,
                ISNULL(SUM(TOTAL_TAX), 0) as TotalTax,
                COUNT(CM_ID) as TotalBills
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CM_TIME IS NOT NULL AND CANCELLED = 0 AND FORMAT(CM_TIME, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        `);

        const sales = monthlyRev.recordset[0]?.GrossSales || 0;
        const tax = monthlyRev.recordset[0]?.TotalTax || 0;
        const taxable = sales - tax;

        // Franchise Retail P&L Model
        const rent = 40000;
        const electricity = 15000;
        const staffSalaries = 45000;
        const miscExpenses = 10000;
        const totalExpenses = 110000; // As requested

        // Total gross profit margin is 27% (so COGS is 73% of taxable revenue)
        const grossProfit = Math.round(taxable * 0.27);
        const cogs = taxable - grossProfit;

        // Deduct 110,000 store expense from the gross profit
        const netProfit = grossProfit - totalExpenses;
        const profitMarginPct = sales > 0 ? Math.round((netProfit / sales) * 100) : 0;

        res.json({
            grossSales: sales,
            taxCollected: tax,
            taxableRevenue: taxable,
            costOfGoodsSold: cogs,
            operatingExpenses: {
                rent,
                electricity,
                staffSalaries,
                miscExpenses,
                totalExpenses
            },
            netStoreProfit: netProfit,
            profitMarginPct: profitMarginPct
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Repeat Customer Retention Radar Endpoint
app.get('/api/analytics/retention-radar', async (req, res) => {
    try {
        const summary = await sql.query(`
            SELECT 
                COUNT(DISTINCT CustomerPhone) as TotalCustomers,
                SUM(CASE WHEN VisitCount > 1 THEN 1 ELSE 0 END) as RepeatCustomers,
                AVG(TotalSpent) as AvgLtv
            FROM (
                SELECT 
                    CUSTOMER_CODE as CustomerPhone,
                    COUNT(CM_ID) as VisitCount,
                    SUM(NET_AMOUNT) as TotalSpent
                FROM VW_CASHMEMO_PRINT_MST
                WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE <> '' AND CUSTOMER_CODE <> '2222222222'
                GROUP BY CUSTOMER_CODE
            ) c
        `);

        const overdueVips = await sql.query(`
            SELECT TOP 20
                CUSTOMER_CODE as Phone,
                MAX(ISNULL(CUSTOMER_FNAME, '') + ' ' + ISNULL(CUSTOMER_LNAME, '')) as CustomerName,
                SUM(NET_AMOUNT) as TotalSpent,
                COUNT(CM_ID) as TotalVisits,
                CONVERT(varchar, MAX(CM_TIME), 126) as LastVisitDate,
                DATEDIFF(day, MAX(CM_TIME), GETDATE()) as DaysInactive
            FROM VW_CASHMEMO_PRINT_MST
            WHERE CANCELLED = 0 AND CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE <> '' AND CUSTOMER_CODE <> '2222222222'
            GROUP BY CUSTOMER_CODE
            HAVING DATEDIFF(day, MAX(CM_TIME), GETDATE()) >= 30
            ORDER BY TotalSpent DESC
        `);

        const totalCust = summary.recordset[0]?.TotalCustomers || 1;
        const repeatCust = summary.recordset[0]?.RepeatCustomers || 0;
        const repeatRatePct = Math.round((repeatCust / totalCust) * 100);

        res.json({
            totalCustomers: totalCust,
            repeatCustomers: repeatCust,
            repeatRatePct: repeatRatePct,
            avgLtv: summary.recordset[0]?.AvgLtv || 0,
            overdueVips: overdueVips.recordset || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. EOD Cash Reconciliation Endpoints
const RECON_FILE = path.join(__dirname, 'reconciliations.json');

app.get('/api/reconciliation/latest', (req, res) => {
    try {
        if (fs.existsSync(RECON_FILE)) {
            const data = JSON.parse(fs.readFileSync(RECON_FILE, 'utf8'));
            return res.json(data[data.length - 1] || null);
        }
        res.json(null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reconciliation/save', (req, res) => {
    try {
        const { systemCash, countedCash, variance, notes, managerName } = req.body;
        let records = [];
        if (fs.existsSync(RECON_FILE)) {
            records = JSON.parse(fs.readFileSync(RECON_FILE, 'utf8'));
        }
        const newRecord = {
            id: Date.now(),
            date: new Date().toISOString(),
            systemCash,
            countedCash,
            variance,
            notes,
            managerName: managerName || 'Manager'
        };
        records.push(newRecord);
        fs.writeFileSync(RECON_FILE, JSON.stringify(records, null, 2));
        res.json({ success: true, record: newRecord });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Returns & Exchange Tracker Endpoint
app.get('/api/sales/returns', async (req, res) => {
    try {
        // Today's returns (quantity < 0)
        const todayReturns = await sql.query(`
            SELECT 
                ISNULL(COUNT(DISTINCT d.CM_ID), 0) as ReturnCount,
                ISNULL(SUM(ABS(d.NET)), 0) as RefundAmount
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE d.QUANTITY < 0 AND CAST(m.CM_TIME AS DATE) = CAST(GETDATE() AS DATE)
        `);

        // Monthly returns
        const monthlyReturns = await sql.query(`
            SELECT 
                ISNULL(COUNT(DISTINCT d.CM_ID), 0) as ReturnCount,
                ISNULL(SUM(ABS(d.NET)), 0) as RefundAmount
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE d.QUANTITY < 0 AND FORMAT(m.CM_TIME, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        `);

        // Monthly total bills for return rate calculation
        const monthlyTotal = await sql.query(`
            SELECT COUNT(CM_ID) as TotalBills
            FROM VW_CASHMEMO_PRINT_MST
            WHERE FORMAT(CM_TIME, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM')
        `);

        // Recent returned bills with details (items returned)
        const recentReturns = await sql.query(`
            SELECT TOP 20
                m.CM_NO as BillNumber,
                ABS(d.NET) as RefundAmount,
                ISNULL(m.CUSTOMER_FNAME, '') + ' ' + ISNULL(m.CUSTOMER_LNAME, '') as CustomerName,
                m.CUSTOMER_CODE as Phone,
                CONVERT(varchar, m.CM_TIME, 126) as ReturnDate,
                ABS(d.QUANTITY) as ItemCount,
                CONCAT(d.ARTICLE_NO, ' - ', d.ARTICLE_NAME) as ArticleDetails
            FROM VW_CASHMEMO_PRINT_DET d
            INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
            WHERE d.QUANTITY < 0
            ORDER BY m.CM_TIME DESC
        `);

        // Top returned categories (which product types are returned most)
        const topReturnedCategories = await sql.query(`
            SELECT TOP 10
                ISNULL(d.SECTION_NAME, 'Uncategorized') as Category,
                COUNT(DISTINCT d.CM_ID) as ReturnBills,
                SUM(ABS(d.QUANTITY)) as ReturnedUnits,
                SUM(ABS(d.NET)) as RefundValue
            FROM VW_CASHMEMO_PRINT_DET d
            WHERE d.QUANTITY < 0
            GROUP BY d.SECTION_NAME
            ORDER BY SUM(ABS(d.QUANTITY)) DESC
        `);

        const totalBills = monthlyTotal.recordset[0]?.TotalBills || 1;
        const monthReturnCount = monthlyReturns.recordset[0]?.ReturnCount || 0;
        const returnRatePct = Math.round((monthReturnCount / totalBills) * 100 * 10) / 10;

        res.json({
            today: todayReturns.recordset[0] || { ReturnCount: 0, RefundAmount: 0 },
            monthly: monthlyReturns.recordset[0] || { ReturnCount: 0, RefundAmount: 0 },
            returnRatePct,
            totalMonthlyBills: totalBills,
            recentReturns: recentReturns.recordset || [],
            topReturnedCategories: topReturnedCategories.recordset || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Daily EOD Closing Summary Text for Owner
app.get('/api/reports/eod-summary', async (req, res) => {
    try {
        const overview = await sql.query(`
            SELECT 
                ISNULL(SUM(m.NET_AMOUNT), 0) as TotalSales, 
                COUNT(m.CM_ID) as BillCount,
                ISNULL(SUM(m.CASH_AMOUNT), 0) as CashAmount,
                ISNULL(SUM(m.CC_AMOUNT), 0) - ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as CardAmount,
                ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as UPIAmount,
                ISNULL(SUM(m.TOTAL_TAX), 0) as TotalTax
            FROM VW_CASHMEMO_PRINT_MST m
            LEFT JOIN VW_WL_CASHMEMOLIST w ON m.CM_ID = w.MEMO_ID
            WHERE CAST(m.CM_TIME AS DATE) = CAST(GETDATE() AS DATE) AND m.CANCELLED = 0
        `);

        const data = overview.recordset[0] || {};
        const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

        const summaryText = `📊 *COBB PUNDRI - DAILY EOD CLOSING REPORT*\n📅 *Date:* ${todayStr}\n-----------------------------------\n💰 *Total Revenue:* ₹${(data.TotalSales || 0).toLocaleString('en-IN')}\n📄 *Total Invoices:* ${data.BillCount || 0}\n\n💳 *Payment Split:*\n  💵 Cash: ₹${(data.CashAmount || 0).toLocaleString('en-IN')}\n  💳 Card: ₹${(data.CardAmount || 0).toLocaleString('en-IN')}\n  📱 UPI:  ₹${(data.UPIAmount || 0).toLocaleString('en-IN')}\n\n🧾 *GST Tax Collected:* ₹${(data.TotalTax || 0).toLocaleString('en-IN')}\n-----------------------------------\nGenerated automatically by Cobb Store Intelligence System.`;

        res.json({ text: summaryText, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/vm-audit', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No image files provided." });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const parts = [];
        
        // Add images to the parts array
        for (const file of req.files) {
            const imageBuffer = fs.readFileSync(file.path);
            const base64Image = imageBuffer.toString('base64');
            parts.push({
                inlineData: {
                    data: base64Image,
                    mimeType: file.mimetype
                }
            });
        }

        const prompt = `You are a Visual Merchandising Auditor for COBB retail clothing stores.
Analyze these store display photos (e.g. mannequin layout, hanger racks, folded display shelves, window displays).
You must return a raw JSON response (without markdown code blocks or wrapping) containing the compliance audit result.
The JSON must follow this exact structure:
{
  "score": 82,
  "metrics": {
    "colorHarmony": 85,
    "sizingOrder": 70,
    "accessibility": 90,
    "density": 75
  },
  "critiques": [
    "One critique point about what is wrong or needs improvement",
    "Another critique point..."
  ],
  "recommendations": [
    "Actionable step to fix the critiques",
    "Another suggestion..."
  ]
}
Be realistic, critical, and constructive based on standard visual merchandising principles. Return only the raw JSON.`;

        parts.push(prompt);

        const result = await model.generateContent(parts);

        const textResponse = result.response.text().trim();
        const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const auditResult = JSON.parse(cleanJson);

        try {
            for (const file of req.files) {
                fs.unlinkSync(file.path);
            }
        } catch (e) {}

        res.json(auditResult);
    } catch (err) {
        console.error("VM Audit failed:", err);
        res.status(500).json({ error: err.message || "Visual Merchandising Audit failed" });
    }
});

app.get('/api/smart-bundles', async (req, res) => {
    try {
        let slowItems = [];
        try {
            const queryRes = await sql.query(`
                SELECT TOP 10
                    RTRIM(d.ARTICLE_NO) as ArticleNo,
                    MAX(RTRIM(d.ARTICLE_NAME)) as ArticleName,
                    MAX(RTRIM(d.SECTION_NAME)) as Category,
                    SUM(d.QUANTITY) as TotalUnitsSold,
                    SUM(d.NET) as TotalRevenue
                FROM VW_CASHMEMO_PRINT_DET d
                INNER JOIN VW_CASHMEMO_PRINT_MST m ON d.CM_ID = m.CM_ID
                WHERE m.CANCELLED = 0 
                  AND d.ARTICLE_NO IS NOT NULL 
                  AND LEN(RTRIM(d.ARTICLE_NO)) > 1
                  AND m.CM_TIME >= DATEADD(month, -3, GETDATE())
                GROUP BY RTRIM(d.ARTICLE_NO)
                ORDER BY SUM(d.QUANTITY) ASC
            `);
            slowItems = queryRes.recordset;
        } catch (e) {
            console.error("DB query for slow items failed, using fallbacks:", e);
        }

        const staticBundles = [
            {
                id: "b1",
                name: "Summer Formal Styling Set",
                items: [
                    { name: "Cobb Slim-Fit Cotton White Shirt", category: "Formal Shirts", originalPrice: 1499, isSlow: false },
                    { name: "Cobb Charcoal Grey Trouser", category: "Formal Trousers", originalPrice: 2299, isSlow: true, reason: "Slow moving size/color" }
                ],
                originalPrice: 3798,
                bundlePrice: 2999,
                discountPct: 21,
                marginImpact: "-5.2%",
                velocityBoost: "+45%"
            },
            {
                id: "b2",
                name: "Weekend Denim Combo",
                items: [
                    { name: "Cobb Casual Indigo Jeans", category: "Denim Jeans", originalPrice: 2499, isSlow: false },
                    { name: "Cobb Polo Graphic Tee", category: "T-Shirts", originalPrice: 999, isSlow: true, reason: "Overstocked color" }
                ],
                originalPrice: 3498,
                bundlePrice: 2699,
                discountPct: 23,
                marginImpact: "-4.8%",
                velocityBoost: "+60%"
            },
            {
                id: "b3",
                name: "Business Casual Ensemble",
                items: [
                    { name: "Cobb Premium Blazer Navy", category: "Suits & Blazers", originalPrice: 4999, isSlow: false },
                    { name: "Cobb Olive Smart Chino", category: "Chinos", originalPrice: 1999, isSlow: true, reason: "Slow moving size/color" }
                ],
                originalPrice: 6998,
                bundlePrice: 5299,
                discountPct: 24,
                marginImpact: "-6.0%",
                velocityBoost: "+35%"
            }
        ];

        if (slowItems && slowItems.length > 0) {
            slowItems.forEach((slowItem, index) => {
                if (index < staticBundles.length) {
                    const bundle = staticBundles[index];
                    const itemToReplace = bundle.items.find(i => i.isSlow);
                    if (itemToReplace) {
                        itemToReplace.name = `${slowItem.ArticleName} (${slowItem.ArticleNo})`;
                        itemToReplace.category = slowItem.Category;
                    }
                }
            });
        }

        res.json(staticBundles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ai/trend-forecast', async (req, res) => {
    try {
        // Query top current stock
        const stockRes = await sql.query(`
            SELECT TOP 50 
                ISNULL(s.article_name, s.section_name) as ItemName,
                s.section_name as Category,
                s.para1_name as Color,
                SUM(p.quantity_in_stock) as CurrentStock
            FROM PMT01106 p
            INNER JOIN SKU_NAMES s ON p.product_code = s.product_Code
            WHERE p.quantity_in_stock > 0
            GROUP BY ISNULL(s.article_name, s.section_name), s.section_name, s.para1_name
            ORDER BY CurrentStock DESC
        `);
        const stockItems = stockRes.recordset.map(i => `${i.ItemName} (${i.Color}) - ${i.CurrentStock} in stock`).join(', ');

        // Query top recent sales
        const salesRes = await sql.query(`
            SELECT TOP 30
                MAX(RTRIM(d.ARTICLE_NAME)) as ArticleName,
                MAX(RTRIM(d.SECTION_NAME)) as Category,
                SUM(d.QUANTITY) as TotalUnitsSold
            FROM VW_CASHMEMO_PRINT_DET d
            WHERE d.QUANTITY > 0
            GROUP BY d.ARTICLE_NO
            ORDER BY TotalUnitsSold DESC
        `);
        const salesItems = salesRes.recordset.map(i => `${i.ArticleName} (${i.Category}) - ${i.TotalUnitsSold} sold`).join(', ');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const prompt = `You are an expert Retail Fashion Analyst for Cobb Italy (men's apparel). 
Today's date is ${currentDate}. Based on current global fashion trends for the Indian market, the current date, and our actual store data, predict the top 3 trends for the UPCOMING season (e.g., if it is August, predict for Autumn/Winter). Do not suggest trends for past years or current ending seasons.

Here is our Top Selling Items recently:
${salesItems}

Here is our Top Inventory In-Stock right now:
${stockItems}

Return a raw JSON response (no markdown) with this exact structure:
{
  "season": "Upcoming Season (e.g. Autumn/Winter 2026)",
  "trends": [
    {
      "trendName": "E.g. Earthy Tones",
      "category": "E.g. Casual Shirts",
      "predictedDemandSurge": "+45%",
      "confidenceScore": 92,
      "suggestedItems": [
        {
          "name": "Item Name (Color)",
          "suggestedPrice": "₹1,499",
          "estimatedMargin": "55%"
        }
      ]
    }
  ]
}
Ensure exactly 3 trends are returned. For each trend, provide a 'confidenceScore' between 70 and 99. The 'suggestedItems' MUST be an array of 4 objects representing specific items ACTUALLY found in the inventory or sales list above, along with a realistic retail price point for the Indian market and an estimated margin percentage. Do not hallucinate item names. Return only the JSON.`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text().trim();
        const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const forecast = JSON.parse(cleanJson);
        
        res.json(forecast);
    } catch (err) {
        console.error("Trend forecast failed:", err);
        res.status(500).json({ error: "Failed to generate trend forecast." });
    }
});

app.post('/api/ai/whatsapp-draft', async (req, res) => {
    try {
        const { customerName, pastPurchases, stylePreferences } = req.body;
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `You are an expert retail marketer. Write a highly personalized, short WhatsApp message (max 3 sentences) for a customer named ${customerName}.
Their past purchases include: ${pastPurchases}.
Their style preference seems to be: ${stylePreferences}.
The message should inform them of a new collection arriving at Cobb Pundri that matches their style, and offer them a 10% VIP discount if they visit this week. Use emojis appropriately. DO NOT return JSON. Return only the raw message string.`;

        const result = await model.generateContent(prompt);
        res.json({ message: result.response.text().trim() });
    } catch (err) {
        console.error("WhatsApp draft failed:", err);
        res.status(500).json({ error: "Failed to generate WhatsApp draft." });
    }
});

app.post('/api/ai/competitor-intel', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided." });
        }

        const imagePath = req.file.path;
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are a Retail Pricing Strategist. Analyze this image of a competitor's promotional flyer or advertisement.
Extract their discount strategy, and propose a counter-strategy for Cobb (our store) that matches or beats their offer while protecting our margins (we have an average 45% margin).
Return a raw JSON response (no markdown) with this exact structure:
{
  "detectedCompetitorOffer": "E.g. Flat 50% off on all jeans",
  "cobbCounterStrategy": "E.g. Buy 1 Jeans, Get 2 T-Shirts Free (perceived higher value, moves dead stock)",
  "marginImpact": "E.g. Protects margin by 12% compared to flat 50% discount",
  "executionDifficulty": "Low/Medium/High"
}
Return only the raw JSON.`;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            prompt
        ]);

        const textResponse = result.response.text().trim();
        const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const intelResult = JSON.parse(cleanJson);

        try {
            fs.unlinkSync(imagePath);
        } catch (e) {}

        res.json(intelResult);
    } catch (err) {
        console.error("Competitor Intel failed:", err);
        res.status(500).json({ error: "Failed to process competitor intelligence." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`CRM Backend running on http://localhost:${PORT}`);
    console.log("Auto-starting Automation Engine and WhatsApp Gateway...");
    startAutomationHelper();
    startGatewayHelper();
});
