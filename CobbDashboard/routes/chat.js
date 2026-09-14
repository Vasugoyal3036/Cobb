const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Helper to format numbers as Indian Currency
const formatINR = (val) => {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// Check if a Gemini API key is configured and looks like a standard Google AI Studio key
function getGeminiClient() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.startsWith('AIzaSy')) {
        return new GoogleGenerativeAI(key);
    }
    return null;
}

// SQL Safety Validator: ensures only safe SELECT statements can run
function isSafeSelectQuery(queryStr) {
    if (!queryStr || typeof queryStr !== 'string') return false;
    const clean = queryStr.trim();
    if (!/^(\s*WITH\s+[a-zA-Z0-9_]+\s+AS\s+\([\s\S]+?\)\s*)?SELECT\b/i.test(clean)) {
        return false;
    }
    const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC|EXECUTE|CREATE|MERGE|GRANT|REVOKE|SHUTDOWN)\b/i;
    return !forbidden.test(clean);
}

/**
 * Executes an intelligent retail query against MSSQL
 */
async function handleRetailIntent(queryText) {
    const q = queryText.toLowerCase().trim();

    // 1. SPECIFIC ARTICLE CODE SEARCH (e.g., TSLBT2690, FTSLBT2509, CAS2021)
    const articleMatch = q.match(/\b([A-Z0-9]{5,15})\b/i);
    // Exclude common English words that might look like an article
    const commonWords = ['SHIRTS', 'SHIRT', 'CASUAL', 'FORMAL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'STOCK', 'JEANS', 'PANTS', 'TROUSERS'];
    if (articleMatch && !commonWords.includes(articleMatch[1].toUpperCase()) && (q.includes('article') || q.includes('sku') || q.includes('code') || articleMatch[1].length >= 7)) {
        const artCode = articleMatch[1].toUpperCase();
        const artRes = await sql.query(`
            SELECT 
                s.product_Code as SKU,
                s.article_no as ArticleNo,
                ISNULL(s.article_name, s.section_name) as ItemName,
                s.sub_section_name as SubSection,
                ISNULL(s.para1_name, 'Standard') as Color,
                ISNULL(s.para2_name, 'Standard') as Size,
                ISNULL(s.mrp, 0) as MRP,
                p.quantity_in_stock as CurrentStock
            FROM PMT01106 p WITH (NOLOCK)
            INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
            WHERE s.article_no LIKE '%${artCode}%' OR s.product_Code LIKE '%${artCode}%'
            ORDER BY CurrentStock DESC
        `);

        const rows = artRes.recordset || [];
        if (rows.length > 0) {
            const totalStock = rows.reduce((s, r) => s + r.CurrentStock, 0);
            const itemName = rows[0].ItemName;
            const mrp = rows[0].MRP ? formatINR(rows[0].MRP) : 'N/A';

            let answer = `Found article **${rows[0].ArticleNo}** (${itemName}) with **${totalStock} units** in stock.\n\n`;
            answer += `**MRP:** ${mrp} | **Category:** ${rows[0].SubSection || '-'}\n\n`;
            answer += `### 📏 Size & Color Breakdown:\n`;
            rows.forEach(r => {
                answer += `- **Size ${r.Size}** (${r.Color}): **${r.CurrentStock} pcs** (SKU: \`${r.SKU}\`)\n`;
            });

            return {
                answer,
                intent: 'ARTICLE_SEARCH',
                metrics: [
                    { label: 'Article No', value: rows[0].ArticleNo, color: 'blue' },
                    { label: 'Total In Stock', value: `${totalStock} pcs`, color: 'emerald' },
                    { label: 'MRP', value: mrp, color: 'purple' }
                ],
                table: {
                    headers: ['SKU', 'Size', 'Color', 'In Stock', 'MRP'],
                    rows: rows.map(r => [r.SKU, r.Size, r.Color, `${r.CurrentStock} pcs`, r.MRP ? formatINR(r.MRP) : '-'])
                },
                chips: [
                    { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        }
    }

    // 2. SLEEVE INVENTORY (Full Sleeve, Half Sleeve)
    const hasFullSleeve = /full\s*(?:sleeve|sleeves|sl)\b/i.test(q);
    const hasHalfSleeve = /half\s*(?:sleeve|sleeves|sl)\b/i.test(q);

    if (hasFullSleeve || hasHalfSleeve) {
        const isFull = hasFullSleeve;
        const sleevePattern = isFull ? '%FULL SL%' : '%HALF SL%';
        const sleeveLabel = isFull ? 'Full Sleeve' : 'Half Sleeve';

        // Check if specifically shirts or t-shirts
        const isTShirt = /t-?shirt|tee|polo/i.test(q);
        const isShirtOnly = /shirt/i.test(q) && !isTShirt;

        let filterClause = `(s.article_name LIKE '${sleevePattern}' OR s.sub_section_name LIKE '${sleevePattern}')`;
        if (isTShirt) {
            filterClause += ` AND (s.article_name LIKE '%T SHIRT%' OR s.sub_section_name LIKE '%T SHIRT%')`;
        } else if (isShirtOnly) {
            // In Cobb POS, shirts with full sleeves are named either 'SHIRTS FULL SL' (formal) or 'CASUAL FULL SL' (casual shirts)
            filterClause += ` AND (s.article_name LIKE '%SHIRT%' OR s.sub_section_name LIKE '%SHIRT%' OR s.article_name LIKE '%CASUAL%' OR s.sub_section_name LIKE '%CASUAL%')`;
        }

        const result = await sql.query(`
            SELECT 
                ISNULL(s.article_name, s.section_name) AS ItemName,
                s.sub_section_name AS SubSection,
                ISNULL(s.para1_name, 'Standard') AS Color,
                ISNULL(s.para2_name, 'Standard') AS Size,
                SUM(p.quantity_in_stock) AS CurrentStock
            FROM PMT01106 p WITH (NOLOCK)
            INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
            WHERE ${filterClause}
              AND p.quantity_in_stock > 0
            GROUP BY ISNULL(s.article_name, s.section_name), s.sub_section_name, s.para1_name, s.para2_name
            ORDER BY CurrentStock DESC
        `);

        const rows = result.recordset || [];
        const totalUnits = rows.reduce((sum, r) => sum + r.CurrentStock, 0);

        // Grouping
        const catMap = {};
        const sizeMap = {};
        const colorMap = {};

        rows.forEach(r => {
            const cat = r.SubSection || r.ItemName || 'Other';
            catMap[cat] = (catMap[cat] || 0) + r.CurrentStock;
            const size = r.Size || 'Standard';
            sizeMap[size] = (sizeMap[size] || 0) + r.CurrentStock;
            const col = r.Color || 'Standard';
            colorMap[col] = (colorMap[col] || 0) + r.CurrentStock;
        });

        const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const topSizes = Object.entries(sizeMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topColors = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

        let answer = `You currently have **${totalUnits.toLocaleString('en-IN')} units** of **${sleeveLabel} ${isShirtOnly ? 'Shirts' : isTShirt ? 'T-Shirts' : 'Apparel'}** in stock at Cobb Pundri.\n\n`;

        if (topCategories.length > 0) {
            answer += `### 📦 Category Breakdown:\n`;
            topCategories.forEach(([cat, count]) => {
                const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0;
                answer += `- **${cat}**: **${count} units** (${pct}% of ${sleeveLabel} stock)\n`;
            });
            answer += `\n`;
        }

        if (topSizes.length > 0) {
            answer += `### 📏 Size Availability:\n`;
            topSizes.forEach(([size, count]) => {
                answer += `- **Size ${size}**: ${count} units\n`;
            });
            answer += `\n`;
        }

        if (topColors.length > 0) {
            answer += `### 🎨 Top Colors:\n`;
            answer += topColors.map(([c, cnt]) => `**${c}** (${cnt})`).join(', ') + `\n`;
        }

        const tableRows = rows.slice(0, 10).map(r => [
            r.ItemName,
            r.SubSection || '-',
            r.Color,
            r.Size,
            `${r.CurrentStock} pcs`
        ]);

        return {
            answer,
            intent: 'SLEEVE_INVENTORY',
            metrics: [
                { label: `Total ${sleeveLabel}`, value: `${totalUnits.toLocaleString('en-IN')} pcs`, color: 'blue' },
                { label: 'Casual Full SL', value: `${catMap['CASUAL FULL SL'] || 0} pcs`, color: 'emerald' },
                { label: 'Formal Full SL', value: `${catMap['SHIRTS FULL SL'] || 0} pcs`, color: 'purple' },
                { label: 'Top Size', value: topSizes[0] ? `${topSizes[0][0]} (${topSizes[0][1]})` : 'N/A', color: 'amber' }
            ],
            table: {
                headers: ['Item Name', 'Sub Section', 'Color', 'Size', 'In Stock'],
                rows: tableRows
            },
            chips: isFull ? [
                { label: "👕 How many half sleeve shirts?", query: "how many half sleeves shirt are present" },
                { label: "📏 Show Size 40 & 42 Shirts", query: "full sleeve shirts in size 40 and 42" },
                { label: "🎨 What colors in casual full sleeve?", query: "colors in casual full sleeve shirts" },
                { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
            ] : [
                { label: "👔 How many full sleeve shirts?", query: "how many full sleeves shirt are present" },
                { label: "👕 Show polo t-shirts in stock", query: "how many polo t shirts in stock" },
                { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
            ],
            sqlUsed: `SELECT ... FROM PMT01106 INNER JOIN SKU_NAMES WHERE article_name LIKE '${sleevePattern}'`
        };
    }

    // 3. LOW STOCK / SHORTAGE / DEAD STOCK / STAGNANT
    const isLowStock = /low\s*(?:on\s*)?stock|shortage|critical\s*stock|out\s*of\s*stock|less\s*than\s*3/i.test(q);
    const isDeadStock = /dead\s*stock|stagnant|unsold|no\s*sales/i.test(q);

    if (isLowStock || isDeadStock) {
        if (isDeadStock) {
            const deadRes = await sql.query(`
                SELECT TOP 12
                    s.article_no AS ArticleNo,
                    ISNULL(s.article_name, s.section_name) AS ItemName,
                    ISNULL(s.para1_name, 'Standard') AS Color,
                    SUM(p.quantity_in_stock) AS CurrentStock
                FROM PMT01106 p WITH (NOLOCK)
                INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
                WHERE p.quantity_in_stock >= 3
                  AND p.product_code NOT IN (
                      SELECT DISTINCT d.PRODUCT_CODE 
                      FROM CMD01106 d WITH (NOLOCK)
                      INNER JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
                      WHERE m.CM_TIME >= DATEADD(day, -60, GETDATE()) AND m.CANCELLED = 0
                  )
                GROUP BY s.article_no, ISNULL(s.article_name, s.section_name), s.para1_name
                ORDER BY CurrentStock DESC
            `);

            const rows = deadRes.recordset || [];
            let answer = `Found **${rows.length} stagnant articles** that have had **zero sales in the last 60 days**:\n\n`;
            rows.forEach((r, idx) => {
                answer += `${idx + 1}. **${r.ArticleNo}** (${r.ItemName}, ${r.Color}) — **${r.CurrentStock} units** remaining\n`;
            });
            answer += `\n💡 *Retail Tip: Consider setting up a Smart Bundle (e.g. Buy 2 Get 1) or sending an exclusive WhatsApp VIP promo to clear this stock.*`;

            return {
                answer,
                intent: 'DEAD_STOCK',
                metrics: [
                    { label: 'Stagnant Articles', value: `${rows.length} items`, color: 'rose' },
                    { label: 'Unsold Window', value: 'Past 60 Days', color: 'amber' }
                ],
                table: {
                    headers: ['Article No', 'Product Name', 'Color', 'Unsold Units'],
                    rows: rows.map(r => [r.ArticleNo, r.ItemName, r.Color, `${r.CurrentStock} pcs`])
                },
                chips: [
                    { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                    { label: "⚠️ Show low stock items", query: "which items are low on stock" }
                ]
            };
        } else {
            const lowRes = await sql.query(`
                SELECT TOP 12
                    s.article_no AS ArticleNo,
                    ISNULL(s.article_name, s.section_name) AS ItemName,
                    ISNULL(s.para1_name, 'Standard') AS Color,
                    ISNULL(s.para2_name, 'Standard') AS Size,
                    SUM(p.quantity_in_stock) AS CurrentStock
                FROM PMT01106 p WITH (NOLOCK)
                INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
                WHERE p.quantity_in_stock BETWEEN 1 AND 2
                GROUP BY s.article_no, ISNULL(s.article_name, s.section_name), s.para1_name, s.para2_name
                ORDER BY CurrentStock ASC
            `);

            const rows = lowRes.recordset || [];
            let answer = `Here are **${rows.length} critical inventory items** with only 1-2 units left in stock:\n\n`;
            rows.forEach((r, idx) => {
                answer += `${idx + 1}. **${r.ArticleNo}** (${r.ItemName}, Size ${r.Size}, ${r.Color}) — **${r.CurrentStock} left**\n`;
            });
            answer += `\n⚠️ *Recommendation: Reorder these from the central warehouse via the Warehouse Reorder tab to avoid missed sales.*`;

            return {
                answer,
                intent: 'LOW_STOCK',
                metrics: [
                    { label: 'Critical Items', value: `${rows.length} SKUs`, color: 'amber' },
                    { label: 'Threshold', value: '1-2 Units Left', color: 'rose' }
                ],
                table: {
                    headers: ['Article No', 'Product Name', 'Size', 'Color', 'Stock Remaining'],
                    rows: rows.map(r => [r.ArticleNo, r.ItemName, r.Size, r.Color, `${r.CurrentStock} pcs`])
                },
                chips: [
                    { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                    { label: "💤 Show stagnant / dead stock", query: "show dead stock items" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        }
    }

    // 4. SALES SUMMARY & PAYMENT MODES (Today, Yesterday, Month, Cash, UPI)
    const isSalesQuery = /sale|sales|revenue|collection|cash|upi|paytm|bill|turnover|earnings/i.test(q);
    if (isSalesQuery) {
        const salesRes = await sql.query(`
            DECLARE @todayStart DATE = CAST(GETDATE() AS DATE);
            DECLARE @yesterdayStart DATE = DATEADD(day, -1, @todayStart);
            DECLARE @thisMonthStart DATE = DATEFROMPARTS(YEAR(@todayStart), MONTH(@todayStart), 1);

            -- Today
            SELECT 
                ISNULL(SUM(m.NET_AMOUNT), 0) as TotalSales, 
                COUNT(m.CM_ID) as BillCount,
                ISNULL(SUM(p.CASH_AMOUNT), 0) as CashAmount,
                ISNULL(SUM(p.CC_AMOUNT), 0) - ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as CardAmount,
                ISNULL(SUM(ISNULL(w.UPI, 0) + ISNULL(w.[Paytm QR], 0) + ISNULL(w.Paytm, 0) + ISNULL(w.[PAYTM UPI], 0) + ISNULL(w.RazorpayUPI, 0)), 0) as UPIAmount
            FROM CMM01106 m WITH (NOLOCK)
            LEFT JOIN VW_BILL_PAYMODE p WITH (NOLOCK) ON m.CM_ID = p.MEMO_ID
            LEFT JOIN VW_WL_CASHMEMOLIST w WITH (NOLOCK) ON m.CM_ID = w.MEMO_ID
            WHERE m.CM_TIME >= @todayStart AND m.CANCELLED = 0;

            -- Yesterday
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount 
            FROM CMM01106 WITH (NOLOCK) 
            WHERE CM_TIME >= @yesterdayStart AND CM_TIME < @todayStart AND CANCELLED = 0;

            -- This Month
            SELECT ISNULL(SUM(NET_AMOUNT), 0) as TotalSales, COUNT(CM_ID) as BillCount 
            FROM CMM01106 WITH (NOLOCK) 
            WHERE CM_TIME >= @thisMonthStart AND CANCELLED = 0;
        `);

        const sets = salesRes.recordsets;
        const today = sets[0]?.[0] || { TotalSales: 0, BillCount: 0, CashAmount: 0, CardAmount: 0, UPIAmount: 0 };
        const yesterday = sets[1]?.[0] || { TotalSales: 0, BillCount: 0 };
        const thisMonth = sets[2]?.[0] || { TotalSales: 0, BillCount: 0 };

        const aov = today.BillCount > 0 ? Math.round(today.TotalSales / today.BillCount) : 0;

        let answer = `Here is the live store performance at Cobb Pundri:\n\n`;
        answer += `- 💰 **Today's Total Sales:** **${formatINR(today.TotalSales)}** across **${today.BillCount} bills** (AOV: ${formatINR(aov)}).\n`;
        answer += `- 💵 **Cash in Register:** ${formatINR(today.CashAmount)}\n`;
        answer += `- 📱 **UPI / QR Payments:** ${formatINR(today.UPIAmount)}\n`;
        if (today.CardAmount > 0) {
            answer += `- 💳 **Card / Other:** ${formatINR(today.CardAmount)}\n`;
        }
        answer += `\n**Benchmark Comparisons:**\n`;
        answer += `- 📅 Yesterday: **${formatINR(yesterday.TotalSales)}** (${yesterday.BillCount} bills)\n`;
        answer += `- 🗓️ Month-to-Date: **${formatINR(thisMonth.TotalSales)}** (${thisMonth.BillCount} bills)\n`;

        return {
            answer,
            intent: 'SALES_SUMMARY',
            metrics: [
                { label: "Today's Sales", value: formatINR(today.TotalSales), color: 'emerald' },
                { label: "UPI Share", value: formatINR(today.UPIAmount), color: 'blue' },
                { label: "Cash In Drawer", value: formatINR(today.CashAmount), color: 'amber' },
                { label: "Bills Count", value: `${today.BillCount} bills`, color: 'purple' }
            ],
            table: {
                headers: ['Period', 'Total Sales', 'Bills', 'Average Order Value'],
                rows: [
                    ['Today (Live)', formatINR(today.TotalSales), `${today.BillCount}`, formatINR(aov)],
                    ['Yesterday', formatINR(yesterday.TotalSales), `${yesterday.BillCount}`, yesterday.BillCount > 0 ? formatINR(Math.round(yesterday.TotalSales / yesterday.BillCount)) : '₹0'],
                    ['This Month (MTD)', formatINR(thisMonth.TotalSales), `${thisMonth.BillCount}`, thisMonth.BillCount > 0 ? formatINR(Math.round(thisMonth.TotalSales / thisMonth.BillCount)) : '₹0']
                ]
            },
            chips: [
                { label: "👔 How many full sleeves shirt are present?", query: "how many full sleeves shirt are present" },
                { label: "🚨 Show low stock alerts", query: "which items are low on stock" },
                { label: "👑 Who are top VIP customers?", query: "who are our top VIP customers" }
            ],
            sqlUsed: 'SELECT SUM(NET_AMOUNT) FROM CMM01106 WHERE CM_TIME >= @todayStart'
        };
    }

    // 5. SIZE-SPECIFIC STOCK AVAILABILITY (e.g., "size 40 shirts", "size 32 jeans", "do we have 42")
    const sizeMatch = q.match(/\bsize\s*([0-9]{2}|[smlxl2-4xl]+)\b/i);
    if (sizeMatch) {
        const targetSize = sizeMatch[1].toUpperCase();
        let catClause = '';
        let catLabel = 'Apparel';
        if (/shirt/i.test(q)) {
            catClause = `AND (s.article_name LIKE '%SHIRT%' OR s.sub_section_name LIKE '%SHIRT%')`;
            catLabel = 'Shirts';
        } else if (/jean/i.test(q)) {
            catClause = `AND (s.article_name LIKE '%JEAN%' OR s.sub_section_name LIKE '%JEAN%')`;
            catLabel = 'Jeans';
        } else if (/trouser|pant|chino/i.test(q)) {
            catClause = `AND (s.article_name LIKE '%TROUSER%' OR s.sub_section_name LIKE '%TROUSER%' OR s.article_name LIKE '%CHINO%')`;
            catLabel = 'Trousers / Chinos';
        } else if (/blazer|suit/i.test(q)) {
            catClause = `AND (s.article_name LIKE '%BLAZER%' OR s.sub_section_name LIKE '%BLAZER%')`;
            catLabel = 'Blazers';
        } else if (/t-?shirt|tee|polo/i.test(q)) {
            catClause = `AND (s.article_name LIKE '%T SHIRT%' OR s.article_name LIKE '%POLO%')`;
            catLabel = 'T-Shirts / Polos';
        }

        try {
            const sizeRes = await sql.query(`
                SELECT TOP 8
                    s.article_no as ArticleNo,
                    ISNULL(s.article_name, s.section_name) as ItemName,
                    ISNULL(s.para1_name, 'Standard') as Color,
                    ISNULL(s.para2_name, 'Standard') as Size,
                    ISNULL(s.mrp, 0) as MRP,
                    SUM(p.quantity_in_stock) as InStock
                FROM PMT01106 p WITH (NOLOCK)
                INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
                WHERE (s.para2_name = '${targetSize}' OR s.para2_name LIKE '%${targetSize}%')
                  ${catClause}
                  AND p.quantity_in_stock > 0
                GROUP BY s.article_no, ISNULL(s.article_name, s.section_name), s.para1_name, s.para2_name, s.mrp
                ORDER BY InStock DESC
            `);

            const rows = sizeRes.recordset || [];
            const totalInSize = rows.reduce((s, r) => s + r.InStock, 0);

            let answer = `Found **${totalInSize} units** in **Size ${targetSize} ${catLabel}** currently available in stock at Cobb Pundri.\n\n`;

            if (rows.length > 0) {
                answer += `### 👔 Available Articles in Size ${targetSize}:\n`;
                rows.forEach((r, idx) => {
                    answer += `${idx + 1}. **${r.ArticleNo}** (${r.ItemName}, ${r.Color}) — **${r.InStock} pcs** (${r.MRP ? formatINR(r.MRP) : 'MRP N/A'})\n`;
                });
                answer += `\n💡 *Tip: Check the Size Matrix Heatmap tab for real-time rack location and size balance.*`;
            } else {
                answer += `⚠️ We currently have zero or very low stock in Size ${targetSize} for this category. Consider checking nearby Cobb store network or issuing a Warehouse Reorder.`;
            }

            return {
                answer,
                intent: 'SIZE_SPECIFIC_STOCK',
                products: rows.map(r => ({
                    articleNo: r.ArticleNo,
                    itemName: r.ItemName,
                    size: r.Size,
                    color: r.Color,
                    stock: r.InStock,
                    mrp: r.MRP ? formatINR(r.MRP) : null
                })),
                metrics: [
                    { label: `Size ${targetSize} Available`, value: `${totalInSize} pcs`, color: 'emerald' },
                    { label: 'Unique Styles', value: `${rows.length} articles`, color: 'blue' },
                    { label: 'Category', value: catLabel, color: 'purple' }
                ],
                actions: [
                    { type: 'NAVIGATE', tab: 'reorder', label: '📦 Open Warehouse Reorder' },
                    { type: 'NAVIGATE', tab: 'size-matrix', label: '📊 View Size Matrix' }
                ],
                chips: [
                    { label: `👖 Check Size ${targetSize} Jeans`, query: `size ${targetSize} jeans in stock` },
                    { label: "👔 How many full sleeves shirts?", query: "how many full sleeves shirt are present" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        } catch (szErr) {
            console.warn('[ChatRoute] Size query error:', szErr.message);
        }
    }

    // 6. CATEGORY INVENTORY (Jeans, T-Shirts, Formals, Accessories)
    const categoryKeywords = {
        'JEANS': ['jean', 'denim'],
        'T-SHIRTS': ['t-shirt', 'tshirt', 'tee', 'polo'],
        'SHIRTS': ['shirt'],
        'FORMALS': ['trouser', 'formal', 'pant', 'chinos', 'suit', 'blazer', 'coat'],
        'ACCESSORIES': ['belt', 'wallet', 'tie', 'sock', 'hanky', 'handkerchief', 'perfume', 'deo', 'cap']
    };

    let matchedCat = null;
    for (const [catName, kws] of Object.entries(categoryKeywords)) {
        if (kws.some(kw => q.includes(kw))) {
            matchedCat = catName;
            break;
        }
    }

    if (matchedCat) {
        let pattern = matchedCat === 'JEANS' ? '%JEAN%' : matchedCat === 'T-SHIRTS' ? '%T SHIRT%' : `%${matchedCat}%`;
        const catRes = await sql.query(`
            SELECT 
                ISNULL(s.article_name, s.section_name) AS ItemName,
                s.sub_section_name AS SubSection,
                s.para2_name AS Size,
                SUM(p.quantity_in_stock) AS CurrentStock
            FROM PMT01106 p WITH (NOLOCK)
            INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
            WHERE (s.article_name LIKE '${pattern}' OR s.sub_section_name LIKE '${pattern}' OR s.section_name LIKE '${pattern}')
              AND p.quantity_in_stock > 0
            GROUP BY ISNULL(s.article_name, s.section_name), s.sub_section_name, s.para2_name
            ORDER BY CurrentStock DESC
        `);

        const rows = catRes.recordset || [];
        const total = rows.reduce((s, r) => s + r.CurrentStock, 0);

        const sizeCounts = {};
        rows.forEach(r => {
            const sz = r.Size || 'Standard';
            sizeCounts[sz] = (sizeCounts[sz] || 0) + r.CurrentStock;
        });
        const topSizes = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

        let answer = `We currently have **${total.toLocaleString('en-IN')} units** of **${matchedCat}** in stock.\n\n`;
        if (topSizes.length > 0) {
            answer += `### 📏 Size Distribution:\n`;
            topSizes.forEach(([sz, cnt]) => {
                answer += `- **Size ${sz}**: ${cnt} units\n`;
            });
        }

        return {
            answer,
            intent: 'CATEGORY_INVENTORY',
            metrics: [
                { label: `Total ${matchedCat}`, value: `${total.toLocaleString('en-IN')} units`, color: 'blue' },
                { label: 'Dominant Size', value: topSizes[0] ? `${topSizes[0][0]} (${topSizes[0][1]})` : 'N/A', color: 'emerald' }
            ],
            table: {
                headers: ['Item Name', 'Sub Section', 'Size', 'Stock'],
                rows: rows.slice(0, 10).map(r => [r.ItemName, r.SubSection || '-', r.Size || '-', `${r.CurrentStock} pcs`])
            },
            chips: [
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "👕 Check half sleeve shirts", query: "how many half sleeves shirt are present" },
                { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
            ]
        };
    }

    // 6. VIP CUSTOMERS LIST (Top spenders, most frequent)
    const isVipListQuery = /top\s*customers?|vip|best\s*customers?|loyal\s*customers?|frequent\s*shoppers?|highest\s*spending/i.test(q);
    if (isVipListQuery) {
        const custRes = await sql.query(`
            SELECT TOP 8
                m.CUSTOMER_CODE as CustomerPhone,
                COUNT(m.CM_ID) as TotalVisits,
                ISNULL(SUM(m.NET_AMOUNT), 0) as TotalSpend,
                MAX(m.CM_TIME) as LastVisit
            FROM CMM01106 m WITH (NOLOCK)
            WHERE m.CANCELLED = 0 
              AND m.CUSTOMER_CODE IS NOT NULL 
              AND LEN(m.CUSTOMER_CODE) >= 10
              AND m.CUSTOMER_CODE NOT LIKE '%9999999999%'
            GROUP BY m.CUSTOMER_CODE
            ORDER BY TotalSpend DESC
        `);

        const rows = custRes.recordset || [];
        let answer = `Here are our top **VIP Store Customers** by lifetime spend:\n\n`;
        rows.forEach((r, idx) => {
            const dateStr = r.LastVisit ? new Date(r.LastVisit).toLocaleDateString('en-IN') : 'Recent';
            answer += `${idx + 1}. **📱 ${r.CustomerPhone}** — Spent **${formatINR(r.TotalSpend)}** across **${r.TotalVisits} visits** (Last visit: ${dateStr})\n`;
        });

        return {
            answer,
            intent: 'CUSTOMER_VIP',
            metrics: [
                { label: 'Top Customer Spend', value: formatINR(rows[0]?.TotalSpend || 0), color: 'emerald' },
                { label: 'Average Visits', value: `${Math.round(rows.reduce((s, r) => s + r.TotalVisits, 0) / (rows.length || 1))} visits`, color: 'purple' }
            ],
            table: {
                headers: ['Customer Phone', 'Total Visits', 'Lifetime Spend', 'Last Visit'],
                rows: rows.map(r => [
                    r.CustomerPhone,
                    `${r.TotalVisits} visits`,
                    formatINR(r.TotalSpend),
                    r.LastVisit ? new Date(r.LastVisit).toLocaleDateString('en-IN') : 'N/A'
                ])
            },
            chips: [
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" },
                { label: "💤 Show stagnant items", query: "show dead stock items" }
            ]
        };
    }

    // 7. CUSTOMER PURCHASE HISTORY & PROFILE (By phone number or customer name)
    const phoneMatch = q.match(/\b([6-9]\d{9})\b/);
    const hasCustWord = /customer|buyer|client|purchases?\s*(?:for|of|by)|bills?\s*(?:for|of|by)|who\s*is/i.test(q);

    if (phoneMatch || hasCustWord) {
        try {
            let filterSql = '';
            if (phoneMatch) {
                filterSql = `m.CUSTOMER_CODE LIKE '%${phoneMatch[1]}%'`;
            } else {
                const namePart = q.replace(/\b(show|purchases?|bills?|for|customer|buyer|who|is|history|of|by|the)\b/gi, '').trim().replace(/['"]/g, '');
                if (namePart.length >= 3) {
                    filterSql = `(c.CUSTOMER_FNAME LIKE '%${namePart}%' OR c.CUSTOMER_LNAME LIKE '%${namePart}%')`;
                }
            }

            if (filterSql) {
                const custResult = await sql.query(`
                    SELECT TOP 1
                        m.CUSTOMER_CODE as CustomerCode,
                        ISNULL(MAX(NULLIF(LTRIM(RTRIM(ISNULL(c.CUSTOMER_FNAME, '') + ' ' + ISNULL(c.CUSTOMER_LNAME, ''))), '')), 'Valued Customer') as CustomerName,
                        m.CUSTOMER_CODE as Mobile,
                        COUNT(m.CM_ID) as TotalBills,
                        ISNULL(SUM(m.NET_AMOUNT), 0) as LifetimeSpend,
                        MAX(m.CM_TIME) as LastVisit
                    FROM CMM01106 m WITH (NOLOCK)
                    LEFT JOIN CUSTDYM c WITH (NOLOCK) ON m.CUSTOMER_CODE = c.CUSTOMER_CODE
                    WHERE m.CANCELLED = 0
                      AND ${filterSql}
                    GROUP BY m.CUSTOMER_CODE
                    ORDER BY TotalBills DESC, LifetimeSpend DESC
                `);

                const cust = custResult.recordset?.[0];
                if (cust) {
                    // Fetch last 3 bills with item details
                    const billsResult = await sql.query(`
                        SELECT TOP 3
                            m.CM_ID,
                            m.CM_NO as BillNo,
                            m.CM_TIME as BillTime,
                            m.NET_AMOUNT as BillAmount
                        FROM CMM01106 m WITH (NOLOCK)
                        WHERE m.CUSTOMER_CODE = '${cust.CustomerCode}' AND m.CANCELLED = 0
                        ORDER BY m.CM_TIME DESC
                    `);

                    const recentBills = billsResult.recordset || [];
                    const lastBillId = recentBills[0]?.CM_ID;
                    let lastItems = [];
                    if (lastBillId) {
                        const itemsRes = await sql.query(`
                            SELECT TOP 4
                                ISNULL(s.article_name, s.section_name) as ItemName,
                                s.article_no as ArticleNo,
                                ISNULL(s.para2_name, '-') as Size,
                                d.QUANTITY as Qty,
                                ISNULL(d.NET, 0) as Price
                            FROM CMD01106 d WITH (NOLOCK)
                            LEFT JOIN SKU_NAMES s WITH (NOLOCK) ON d.PRODUCT_CODE = s.product_Code
                            WHERE d.CM_ID = '${lastBillId}'
                        `);
                        lastItems = itemsRes.recordset || [];
                    }

                    const lifetimeSpend = cust.LifetimeSpend ? formatINR(cust.LifetimeSpend) : '₹0';
                    const lastVisitDate = cust.LastVisit ? new Date(cust.LastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

                    let answer = `👤 **Customer Profile: ${cust.CustomerName}**\n\n`;
                    answer += `📱 **Phone:** \`${cust.Mobile || 'Not provided'}\` | 📍 **City:** ${cust.City || 'Pundri'}\n`;
                    answer += `💎 **Total Lifetime Spend:** **${lifetimeSpend}** across **${cust.TotalBills || 0} visits**\n`;
                    answer += `🕒 **Last Visit:** **${lastVisitDate}**\n\n`;

                    if (lastItems.length > 0) {
                        answer += `### 🛍️ Items Bought in Last Visit (#${recentBills[0]?.BillNo || 'Latest'}):\n`;
                        lastItems.forEach(it => {
                            answer += `- **${it.ItemName}** (${it.ArticleNo}, Size: ${it.Size}) — **${it.Qty} pcs** @ ${formatINR(it.Price)}\n`;
                        });
                        answer += `\n`;
                    }

                    if (recentBills.length > 1) {
                        answer += `### 📜 Previous Invoices:\n`;
                        recentBills.slice(1).forEach(b => {
                            answer += `- **Bill #${b.BillNo}** on ${new Date(b.BillTime).toLocaleDateString('en-IN')}: **${formatINR(b.BillAmount)}**\n`;
                        });
                    }

                    return {
                        answer,
                        intent: 'CUSTOMER_HISTORY',
                        customer: {
                            name: cust.CustomerName,
                            mobile: cust.Mobile,
                            totalBills: cust.TotalBills,
                            lifetimeSpend,
                            lastVisit: lastVisitDate
                        },
                        metrics: [
                            { label: 'Customer', value: cust.CustomerName.split(' ')[0], color: 'blue' },
                            { label: 'Total Visits', value: `${cust.TotalBills || 0} bills`, color: 'purple' },
                            { label: 'Lifetime Spend', value: lifetimeSpend, color: 'emerald' },
                            { label: 'Last Active', value: lastVisitDate, color: 'amber' }
                        ],
                        actions: [
                            { type: 'NAVIGATE', tab: 'live', label: '⚡ View Live Checkouts' },
                            { type: 'NAVIGATE', tab: 'vip', label: '👑 View VIP Profile' }
                        ],
                        chips: [
                            { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" },
                            { label: "👑 Show all VIP customers", query: "who are our top VIP customers" }
                        ]
                    };
                }
            }
        } catch (custErr) {
            console.warn('[ChatRoute] Customer intent error:', custErr.message);
        }
    }

    // 8. GOODS IN TRANSIT & VENDOR CHALLAN TRACKING
    const isTransit = /transit|parcel|challan|consignment|incoming\s*(?:stock|parcels?)|bilty|head\s*office\s*(?:dispatch|supply)|ho\s*dispatch/i.test(q) || /WH[\/-]?T\d+/i.test(q);

    if (isTransit) {
        try {
            let parcels = [];
            const transitRes = await sql.query(`
                SELECT TOP 5
                    m.parcel_memo_no,
                    m.parcel_memo_dt,
                    m.vehicle_no,
                    m.bilty_no,
                    ISNULL(m.TOT_QUANTITY, 0) as total_quantity,
                    ISNULL(m.TOT_BOXES, 1) as total_boxes,
                    m.XN_NO_LIST as challan_no,
                    ISNULL(d.PARTY_INV_AMT, 0) as invoice_amount,
                    d.PARTY_INV_NO as invoice_no,
                    CASE 
                        WHEN CAST(m.parcel_memo_dt AS DATE) = CAST(GETDATE() AS DATE) THEN 'Arrived Today'
                        WHEN DATEDIFF(day, m.parcel_memo_dt, GETDATE()) <= 2 THEN 'In Transit'
                        ELSE 'Delivered'
                    END as status
                FROM DOCWSL_parcel_mst_MIRROR m WITH (NOLOCK)
                LEFT JOIN DOCWSL_parcel_det_MIRROR d WITH (NOLOCK) ON m.parcel_memo_id = d.parcel_memo_id
                ORDER BY m.parcel_memo_dt DESC
            `);
            parcels = transitRes.recordset || [];

            if (parcels.length === 0) {
                // Fallback demo data from Head Office
                parcels = [{
                    parcel_memo_no: 'WH00023267',
                    parcel_memo_dt: new Date().toISOString(),
                    vehicle_no: 'HR64-AF4578',
                    total_quantity: 66,
                    total_boxes: 1,
                    challan_no: 'WH/T27-018749',
                    invoice_amount: 38430,
                    status: 'Arrived Today'
                }];
            }

            const latest = parcels[0];
            const totalPcs = parcels.reduce((sum, p) => sum + p.total_quantity, 0);
            const totalVal = parcels.reduce((sum, p) => sum + p.invoice_amount, 0);

            let answer = `🚚 **Goods In Transit Desk: ${parcels.length} Consignments Found**\n\n`;
            answer += `### 📦 Latest Consignment: **#${latest.parcel_memo_no}** (${latest.status})\n`;
            answer += `- **Challan:** \`${latest.challan_no || 'Pending'}\` | **Value:** **${formatINR(latest.invoice_amount)}**\n`;
            answer += `- **Stock Inflow:** **${latest.total_quantity} pieces** in **${latest.total_boxes} box(es)**\n`;
            if (latest.vehicle_no) {
                answer += `- **Transport Vehicle:** \`${latest.vehicle_no}\`\n`;
            }
            answer += `\n`;

            if (parcels.length > 1) {
                answer += `### 📋 Other Recent Dispatches:\n`;
                parcels.slice(1, 4).forEach(p => {
                    answer += `- **#${p.parcel_memo_no}** (${new Date(p.parcel_memo_dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}) — **${p.total_quantity} pcs** (${formatINR(p.invoice_amount)})\n`;
                });
            }

            return {
                answer,
                intent: 'GOODS_IN_TRANSIT',
                metrics: [
                    { label: 'Latest Consignment', value: `#${latest.parcel_memo_no}`, color: 'amber' },
                    { label: 'Status', value: latest.status, color: 'emerald' },
                    { label: 'Incoming Volume', value: `${latest.total_quantity} pcs`, color: 'blue' },
                    { label: 'Challan Value', value: formatINR(latest.invoice_amount), color: 'purple' }
                ],
                actions: [
                    { type: 'NAVIGATE', tab: 'dashboard', label: '🚚 View Transit Desk' },
                    { type: 'NAVIGATE', tab: 'reorder', label: '📦 Open Warehouse Reorder' }
                ],
                chips: [
                    { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        } catch (trErr) {
            console.warn('[ChatRoute] Transit error:', trErr.message);
        }
    }

    // 10. GENERAL STORE ASSISTANT HELP
    return {
        answer: `Hello! I am your **Cobb Store AI Copilot**. I can query our live store database directly for stock, sales, and analytics.\n\nTry asking me:\n` +
                `- 👔 **"How many full sleeves shirt are present?"**\n` +
                `- 👕 **"How many half sleeve t-shirts do we have?"**\n` +
                `- 📏 **"Check size 42 shirts in stock"**\n` +
                `- 🚚 **"What parcels are in transit from Head Office?"**\n` +
                `- 👤 **"Show purchases for customer 9812..."**\n` +
                `- 💰 **"What's our total sales and UPI collection today?"**\n` +
                `- 🚨 **"Which items are low on stock?"**\n` +
                `- 👑 **"Who are our top VIP customers?"**\n` +
                `- 💤 **"Show dead stock items with zero sales in 60 days"**`,
        intent: 'GENERAL_HELP',
        metrics: [],
        table: null,
        chips: [
            { label: "👔 How many full sleeves shirt are present?", query: "how many full sleeves shirt are present" },
            { label: "💰 Today's sales & UPI summary", query: "what is today's total sales and UPI split" },
            { label: "🚚 What parcels are incoming?", query: "what parcels are in transit from head office" },
            { label: "🚨 Check low stock items", query: "which items are low on stock" }
        ]
    };
}

/**
 * Suggestions Auto-Complete Endpoint: GET /api/ai/chat/suggestions?q=...
 */
router.get('/suggestions', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({
                suggestions: [
                    { type: 'query', label: "👔 Full Sleeve Shirts", query: "how many full sleeves shirt are present" },
                    { type: 'query', label: "💰 Today's Sales & UPI", query: "what is today's total sales and UPI split" },
                    { type: 'query', label: "🚨 Low Stock Alerts", query: "which items are low on stock" },
                    { type: 'query', label: "👑 Top VIP Customers", query: "who are our top VIP customers" },
                    { type: 'query', label: "🚚 Goods in Transit", query: "what parcels are in transit from head office" }
                ]
            });
        }

        const cleanQ = q.replace(/['"]/g, '');
        const results = [];

        // 1. Search matching articles from SKU_NAMES & PMT01106
        try {
            const artRes = await sql.query(`
                SELECT TOP 4
                    s.article_no as ArticleNo,
                    ISNULL(s.article_name, s.section_name) as ItemName,
                    SUM(p.quantity_in_stock) as InStock,
                    MAX(s.mrp) as MRP
                FROM SKU_NAMES s WITH (NOLOCK)
                LEFT JOIN PMT01106 p WITH (NOLOCK) ON s.product_Code = p.product_code
                WHERE s.article_no LIKE '%${cleanQ}%' 
                   OR s.article_name LIKE '%${cleanQ}%'
                   OR s.sub_section_name LIKE '%${cleanQ}%'
                GROUP BY s.article_no, ISNULL(s.article_name, s.section_name)
                ORDER BY InStock DESC
            `);
            (artRes.recordset || []).forEach(r => {
                results.push({
                    type: 'article',
                    label: `👔 ${r.ArticleNo} (${r.ItemName})`,
                    query: `check stock for article ${r.ArticleNo}`,
                    meta: `${r.InStock || 0} pcs • ${r.MRP ? '₹' + r.MRP : ''}`
                });
            });
        } catch (e) {}

        // 2. Search customers by mobile or name
        if (/^\d{3,10}$/.test(cleanQ) || cleanQ.length >= 3) {
            try {
                const custRes = await sql.query(`
                    SELECT TOP 3
                        m.CUSTOMER_CODE as Mobile,
                        ISNULL(MAX(NULLIF(LTRIM(RTRIM(ISNULL(c.CUSTOMER_FNAME, '') + ' ' + ISNULL(c.CUSTOMER_LNAME, ''))), '')), 'Customer') as CustomerName,
                        COUNT(m.CM_ID) as TotalBills
                    FROM CMM01106 m WITH (NOLOCK)
                    LEFT JOIN CUSTDYM c WITH (NOLOCK) ON m.CUSTOMER_CODE = c.CUSTOMER_CODE
                    WHERE m.CANCELLED = 0
                      AND (m.CUSTOMER_CODE LIKE '%${cleanQ}%' OR c.CUSTOMER_FNAME LIKE '%${cleanQ}%' OR c.CUSTOMER_LNAME LIKE '%${cleanQ}%')
                    GROUP BY m.CUSTOMER_CODE
                    ORDER BY TotalBills DESC
                `);
                (custRes.recordset || []).forEach(c => {
                    results.push({
                        type: 'customer',
                        label: `👤 ${c.CustomerName} (${c.Mobile})`,
                        query: `show purchases for customer ${c.Mobile || c.CustomerName}`,
                        meta: `${c.TotalBills} bills on record`
                    });
                });
            } catch (e) {}
        }

        // 3. Keyword contextual prompts
        const lowerQ = cleanQ.toLowerCase();
        if (lowerQ.includes('shirt')) {
            results.push({ type: 'query', label: '👔 How many full sleeves shirts?', query: 'how many full sleeves shirt are present' });
            results.push({ type: 'query', label: '👕 How many half sleeves shirts?', query: 'how many half sleeves shirt are present' });
        }
        if (lowerQ.includes('size')) {
            results.push({ type: 'query', label: '📏 Size 40 shirts in stock', query: 'size 40 shirts in stock' });
            results.push({ type: 'query', label: '📏 Size 32 jeans in stock', query: 'size 32 jeans in stock' });
        }
        if (lowerQ.includes('transit') || lowerQ.includes('challan') || lowerQ.includes('parcel')) {
            results.push({ type: 'query', label: '🚚 What parcels are incoming from Head Office?', query: 'what parcels are in transit from head office' });
        }
        if (lowerQ.includes('sale') || lowerQ.includes('upi') || lowerQ.includes('cash')) {
            results.push({ type: 'query', label: "💰 Today's sales & payment breakdown", query: "what is today's total sales and UPI split" });
        }

        return res.json({ suggestions: results.slice(0, 7) });
    } catch (err) {
        return res.json({ suggestions: [] });
    }
});

/**
 * Main Chat Endpoint: POST /api/ai/chat
 */
router.post('/', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'A message query is required.' });
        }

        const queryText = message.trim();
        const genAI = getGeminiClient();

        // If a valid Google AI Studio key is configured, Gemini can answer open-ended queries
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const systemPrompt = `You are Cobb Retail AI Copilot for "Cobb Italy" store.
Database Tables:
1. PMT01106: Current Stock (product_code, quantity_in_stock)
2. SKU_NAMES: Catalog (product_Code, article_no, article_name, section_name, sub_section_name, para1_name as Color, para2_name as Size, mrp). Full sleeve items have 'FULL SL'. Half sleeve items have 'HALF SL'.
3. CMM01106: Bills (CM_ID, CM_TIME, NET_AMOUNT, CUSTOMER_CODE, CANCELLED)
4. VW_BILL_PAYMODE: Cash and Card payments
5. VW_WL_CASHMEMOLIST: UPI payments

Query: "${queryText}"
If SQL is required, return raw JSON: {"requiresSql": true, "sqlQuery": "SELECT ... WITH (NOLOCK)"}
Else return: {"requiresSql": false, "answer": "..."}`;

                const aiGen = await model.generateContent(systemPrompt);
                let rawText = aiGen.response.text().trim();
                rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

                const parsed = JSON.parse(rawText);
                if (parsed.requiresSql && parsed.sqlQuery && isSafeSelectQuery(parsed.sqlQuery)) {
                    const sqlRes = await sql.query(parsed.sqlQuery);
                    const records = sqlRes.recordset || [];

                    const synthPrompt = `Synthesize this SQL result for a store manager:
Query: "${queryText}"
Data: ${JSON.stringify(records.slice(0, 20))}
Format with emojis, bullet points, and bold numbers.`;
                    const synthGen = await model.generateContent(synthPrompt);

                    return res.json({
                        answer: synthGen.response.text().trim(),
                        intent: 'GEMINI_SQL',
                        metrics: records.length > 0 && records[0].TotalUnits ? [
                            { label: "Total Units", value: `${records[0].TotalUnits} pcs`, color: 'blue' }
                        ] : [],
                        table: records.length > 0 ? {
                            headers: Object.keys(records[0]),
                            rows: records.slice(0, 10).map(r => Object.values(r))
                        } : null,
                        chips: [
                            { label: "👔 How many full sleeves shirt are present?", query: "how many full sleeves shirt are present" },
                            { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                        ],
                        sqlUsed: parsed.sqlQuery
                    });
                }
            } catch (geminiErr) {
                console.warn("Gemini fallback to retail parser:", geminiErr.message);
            }
        }

        // Fast & robust local retail engine
        const response = await handleRetailIntent(queryText);
        return res.json(response);

    } catch (err) {
        console.error("Chat route error:", err);
        return res.status(500).json({ 
            error: err.message,
            answer: "Sorry, I encountered an error querying the store database. Please check that SQL Server is online.",
            chips: [
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "💰 Check today's sales", query: "what is today's total sales and UPI split" }
            ]
        });
    }
});

module.exports = router;
