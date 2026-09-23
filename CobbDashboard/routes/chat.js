const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql } = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const HOLDS_FILE = path.join(__dirname, '..', 'holds.json');

// Atomic read/write helpers for customer hold desk
function readHolds() {
    try {
        if (!fs.existsSync(HOLDS_FILE)) {
            fs.writeFileSync(HOLDS_FILE, '[]', 'utf8');
            return [];
        }
        const raw = fs.readFileSync(HOLDS_FILE, 'utf8');
        return JSON.parse(raw) || [];
    } catch (e) {
        return [];
    }
}

function writeHolds(holds) {
    try {
        const tmp = HOLDS_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(holds, null, 2), 'utf8');
        fs.renameSync(tmp, HOLDS_FILE);
    } catch (e) {
        console.error('[ChatRoute] Failed to write holds:', e.message);
    }
}

function generateHoldId() {
    return 'hold_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// Helper to format numbers as Indian Currency
const formatINR = (val) => {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// Check if a Gemini API key is configured
function getGeminiClient() {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (key && key.startsWith('AIzaSy') && key.length >= 35) {
        try {
            return new GoogleGenerativeAI(key);
        } catch (e) {
            return null;
        }
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
    const articleMatch = q.match(/\b([A-Z0-9]{4,15})\b/i);
    const commonWords = ['SHIRTS', 'SHIRT', 'CASUAL', 'FORMAL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'STOCK', 'JEANS', 'PANTS', 'TROUSERS', 'CURRENTLY', 'PRESENTS', 'PRESENT', 'DISCOUNTS', 'CUSTOMER', 'CUSTOMERS', 'PURCHASES', 'ARRIVALS', 'PARCELS'];
    const isAlphanumericCode = articleMatch && /[A-Za-z]/.test(articleMatch[1]) && /\d/.test(articleMatch[1]);
    const explicitArticleKeyword = q.includes('article') || q.includes('sku') || q.includes('code');

    if (articleMatch && !commonWords.includes(articleMatch[1].toUpperCase()) && (isAlphanumericCode || explicitArticleKeyword)) {
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

    // 2. CUSTOMER HOLD & RESERVE DESK (Active holds & create new hold)
    const isHoldQuery = /\b(holds?|reserved?|reservation|reservations)\b/i.test(q) && !/household|withhold/i.test(q);

    if (isHoldQuery) {
        const holds = readHolds();
        const now = new Date();

        // Check if query is to CREATE a new hold
        const isCreatingHold = /\b(hold|reserve)\b/i.test(q) && (q.includes('for') || q.includes('size') || q.match(/[A-Z0-9]{4,15}/i));
        
        if (isCreatingHold && !q.includes('active') && !q.includes('check') && !q.includes('who') && !q.includes('what') && !q.includes('list') && !q.includes('status')) {
            // Extract details from query
            const phoneMatch = q.match(/\b([6-9]\d{9})\b/);
            const sizeMatch = q.match(/\b(?:size\s*)([0-9]{2}|[SMLX]+)\b/i);
            const articleMatch = q.match(/\b([A-Z0-9]{4,15})\b/i);
            
            // Name match (e.g. for Rahul or for customer Rahul)
            let customerName = 'Customer';
            const nameMatch = q.match(/(?:for\s+(?:customer\s+)?)([A-Za-z]+)/i);
            if (nameMatch && !['size', 'article', 'sku', 'item', 'customer', 'me', 'us'].includes(nameMatch[1].toLowerCase())) {
                customerName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
            }

            const customerPhone = phoneMatch ? phoneMatch[1] : '';
            const size = sizeMatch ? sizeMatch[1].toUpperCase() : 'Standard';
            const articleNo = articleMatch ? articleMatch[1].toUpperCase() : 'COBB-ITEM';
            const articleName = `Cobb Garment (${articleNo})`;
            const windowHours = 2; // standard 2 hour reservation

            const expiresAt = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
            const newHold = {
                id: generateHoldId(),
                customerName,
                customerPhone,
                articleNo,
                articleName,
                size,
                category: 'Apparel',
                windowHours,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                status: 'active',
                reminderSent: false
            };

            holds.unshift(newHold);
            writeHolds(holds);

            const expiryTimeStr = expiresAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            let answer = `✅ **Customer Hold Confirmed!**\n\n`;
            answer += `Reserved **${articleName}** (Size **${size}**) for **${customerName}**.\n\n`;
            answer += `- **Customer:** ${customerName} ${customerPhone ? `(📱 ${customerPhone})` : ''}\n`;
            answer += `- **Hold Duration:** 2 Hours (Valid until **${expiryTimeStr}** today)\n`;
            answer += `- **Hold ID:** \`${newHold.id}\`\n\n`;
            answer += `🔔 The item is marked on hold at the counter. A reminder notification will trigger if not billed within 2 hours.`;

            return {
                answer,
                intent: 'HOLD_CREATED',
                metrics: [
                    { label: 'Customer', value: customerName, color: 'blue' },
                    { label: 'Article / Size', value: `${articleNo} (${size})`, color: 'purple' },
                    { label: 'Held Until', value: expiryTimeStr, color: 'emerald' },
                    { label: 'Status', value: 'Active (2h)', color: 'amber' }
                ],
                actions: [
                    { type: 'NAVIGATE', tab: 'hold_desk', label: '📦 Open Hold & Reserve Desk' }
                ],
                chips: [
                    { label: "📦 View all active holds", query: "what items are currently on hold" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        }

        // Otherwise list active holds
        const activeHolds = holds.filter(h => h.status === 'active' && new Date(h.expiresAt) > now);

        if (activeHolds.length === 0) {
            return {
                answer: `📦 **Customer Hold Desk: No Active Holds**\n\nAll reserved items have been either billed or returned to store racks. No customer holds are pending right now.\n\nTo reserve an item for a walk-in, type:\n> *"Hold article FTSLBT2509 size 40 for Rahul 9812345678"*`,
                intent: 'HOLD_STATUS',
                metrics: [
                    { label: 'Active Holds', value: '0 items', color: 'emerald' },
                    { label: 'Hold Desk Status', value: 'Clear', color: 'blue' }
                ],
                actions: [
                    { type: 'NAVIGATE', tab: 'hold_desk', label: '📦 Open Hold Desk' }
                ],
                chips: [
                    { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        }

        let answer = `📦 **Customer Hold Desk: ${activeHolds.length} Active Reservation(s)**\n\n`;
        activeHolds.forEach((h, idx) => {
            const exp = new Date(h.expiresAt);
            const minLeft = Math.max(0, Math.floor((exp - now) / 60000));
            const timeStr = exp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            answer += `${idx + 1}. **${h.customerName}** ${h.customerPhone ? `(📱 ${h.customerPhone})` : ''}\n`;
            answer += `   - **Item:** ${h.articleName} (Size: **${h.size}**)\n`;
            answer += `   - **Time Left:** ⏳ **${minLeft} mins left** (Expires at ${timeStr})\n\n`;
        });

        return {
            answer,
            intent: 'HOLD_STATUS',
            metrics: [
                { label: 'Active Holds', value: `${activeHolds.length} items`, color: 'amber' },
                { label: 'Expiring Soon', value: `${activeHolds.filter(h => (new Date(h.expiresAt) - now) < 1800000).length} items`, color: 'rose' }
            ],
            table: {
                headers: ['Customer', 'Phone', 'Article', 'Size', 'Expires At', 'Status'],
                rows: activeHolds.map(h => {
                    const minLeft = Math.max(0, Math.floor((new Date(h.expiresAt) - now) / 60000));
                    return [
                        h.customerName,
                        h.customerPhone || 'Walk-in',
                        h.articleName || h.articleNo,
                        h.size,
                        `${minLeft}m (${new Date(h.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`,
                        'Active'
                    ];
                })
            },
            actions: [
                { type: 'NAVIGATE', tab: 'hold_desk', label: '📦 Open Hold Desk' }
            ],
            chips: [
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
            ]
        };
    }

    // 3. WHATSAPP CAMPAIGN & PITCH DRAFTER
    const isWhatsAppQuery = /\b(whatsapp|wa\.me|promo\s*message|campaign\s*message|pitch\s*(?:message|to|vip|customer)?|dormant\s*message)\b/i.test(q);

    if (isWhatsAppQuery) {
        const phoneMatch = q.match(/\b([6-9]\d{9})\b/);
        const phone = phoneMatch ? phoneMatch[1] : '';

        const isDormant = /dormant|inactive|miss\s*you|long\s*time|win\s*back/i.test(q);
        const isVip = /vip|exclusive|premium|loyal|top\s*customer/i.test(q);
        const isB1G3 = /b1g3|buy\s*1\s*get\s*3/i.test(q);

        let campaignType = 'Weekend Mega Offer';
        let audience = 'Store Walk-ins & VIPs';
        let draftMsg = '';

        if (isDormant) {
            campaignType = 'Dormant Customer Win-Back';
            audience = 'Customers Inactive for 60+ Days';
            draftMsg = `Hello! 👋 We miss seeing you at *Cobb Italy, Pundri*!\n\nAs a special welcome back, visit us this week and enjoy our exclusive *Buy 3 Get 70% Off* on our fresh Autumn/Winter collection 🍂👔.\n\nShow this WhatsApp message at the counter to claim an extra surprise gift on your bill! 🎁\n\n📍 *Cobb Italy, Main Market, Pundri*\n📞 Reply to this message to reserve your sizes!`;
        } else if (isVip) {
            campaignType = 'VIP Exclusive Preview';
            audience = 'High-Value VIP Spenders';
            draftMsg = `Greetings from *Cobb Italy, Pundri*! 👑👔\n\nWe have just unboxed an exclusive fresh batch of *Luxury Italian Cut Formal & Casual Shirts* (Imported Cotton & Linen finish).\n\nAs our esteemed VIP customer, we have reserved early access for you before stock hits the floor this weekend.\n\n✨ Enjoy complimentary custom alterations & priority billing on your visit.\n\n📍 *Cobb Italy, Pundri*\nWe look forward to hosting you today! 😊`;
        } else if (isB1G3) {
            campaignType = 'Buy 1 Get 3 Free Mega Blast';
            audience = 'All Store Customers';
            draftMsg = `🚨 *MEGA STEAL ALERT at Cobb Italy, Pundri!* 🚨\n\n🎁 *BUY 1 GET 3 FREE* is now LIVE on select premium collections!\n\nPick ANY 4 articles across Shirts, T-Shirts & Trousers — *Pay ONLY for 1 and get 3 completely FREE!* 👕👖\n\nLimited stock available on dominant sizes (38, 40, 42, 32, 34). Hurry before racks clear!\n\n📍 *Cobb Italy, Main Road, Pundri*`;
        } else {
            campaignType = 'Buy 3 Get 70% Off Mega Sale';
            audience = 'Broadcast Campaign';
            draftMsg = `🔥 *Cobb Italy Mega Savings Weekend!* 🔥\n\nRefresh your wardrobe with our famous *BUY 3 GET 70% OFF* offer! 👔✨\n\nGet 3 premium Italian shirts worth ₹7,497 for *JUST ₹2,249 total* (Only ₹750/shirt)!\n\n✅ Fresh formal & casual collection\n✅ All sizes (38 to 44) available\n\n📍 Visit *Cobb Italy, Pundri* today!`;
        }

        const waUrl = phone 
            ? `https://wa.me/91${phone}?text=${encodeURIComponent(draftMsg)}`
            : `https://wa.me/?text=${encodeURIComponent(draftMsg)}`;

        let answer = `📱 **Drafted WhatsApp Retail Pitch: ${campaignType}**\n\n`;
        answer += `Here is your high-converting customer broadcast copy ready to send:\n\n`;
        answer += `\`\`\`text\n${draftMsg}\n\`\`\`\n\n`;
        answer += `Tap the button below to launch WhatsApp directly with this pre-filled message!`;

        return {
            answer,
            intent: 'WHATSAPP_DRAFT',
            metrics: [
                { label: 'Campaign Type', value: campaignType, color: 'blue' },
                { label: 'Target Audience', value: audience, color: 'purple' },
                { label: 'Message Length', value: `${draftMsg.length} chars`, color: 'emerald' },
                { label: 'Recipient', value: phone ? `+91 ${phone}` : 'Any Customer', color: 'amber' }
            ],
            actions: [
                { type: 'LINK', url: waUrl, label: phone ? `📱 Send to +91 ${phone}` : '📱 Open in WhatsApp' },
                { type: 'NAVIGATE', tab: 'customerinsights', label: '👑 View VIP & Dormant Customers' },
                { type: 'NAVIGATE', tab: 'campaigns', label: '📢 Open AI Campaign Builder' }
            ],
            chips: [
                { label: "📱 Draft VIP exclusive pitch", query: "draft whatsapp pitch message for vip customer" },
                { label: "📱 Draft dormant win-back", query: "draft whatsapp message for dormant customer" },
                { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" }
            ]
        };
    }

    // 4. COUNTER OFFER & DISCOUNT CALCULATOR (Buy 3 Get 70%, Buy 1 Get 3, Flat %, Combo Offers)
    const isOfferQuery = /\b(b3\s*70|b3g70|buy\s*3\s*get\s*70|70\s*%\s*off|b1g3|buy\s*1\s*get\s*3|b1\s*g3|b2g2|buy\s*2\s*get\s*2|b1g1|buy\s*1\s*get\s*1|flat\s*\d{1,2}\s*%|\d{1,2}\s*%\s*flat|counter\s*offer|offer\s*calc|discount\s*calc|combo\s*offer|calculate\s*offer|calculate\s*discount)\b/i.test(q) || 
        ((q.includes('discount') || q.includes('offer') || q.includes('save') || q.includes('paying')) && /\b(3|70|b1g3|flat|mrp)\b/i.test(q));

    if (isOfferQuery) {
        // Extract all currency / price amounts from query (e.g., 2499, 2999, 3499, 1999)
        const rawNumbers = (q.match(/\b([1-9]\d{2,4})\b/g) || []).map(Number).filter(n => n >= 299 && n <= 25000);
        
        const isB1G3 = /\b(b1g3|buy\s*1\s*get\s*3|b1\s*g3)\b/i.test(q);
        const isB3_70 = /\b(b3\s*70|b3g70|buy\s*3\s*get\s*70|70\s*%)\b/i.test(q) || (!isB1G3 && !/flat/i.test(q));
        const flatMatch = q.match(/flat\s*(\d{1,2})\s*%/i) || q.match(/(\d{1,2})\s*%\s*flat/i);

        if (isB1G3) {
            // Buy 1 Get 3 Free (Total 4 pieces picked)
            let items = rawNumbers.length >= 4 ? rawNumbers.slice(0, 4) : (rawNumbers.length > 0 ? [rawNumbers[0], rawNumbers[0], rawNumbers[0], rawNumbers[0]] : [3499, 2999, 2499, 1999]);
            items.sort((a, b) => b - a); // Highest first
            const totalMRP = items.reduce((a, b) => a + b, 0);
            const billedItem = items[0]; // Customer pays highest MRP
            const freeItems = items.slice(1);
            const totalFreeValue = freeItems.reduce((a, b) => a + b, 0);
            const effectivePerPiece = Math.round(billedItem / 4);
            const savingsPercent = Math.round((totalFreeValue / totalMRP) * 100);

            let answer = `🏷️ **Offer Breakdown: Buy 1 Get 3 Free (Total 4 Pieces)**\n\n`;
            answer += `**Billing Rule:** Customer pays only the **highest MRP** piece; the remaining 3 pieces are **100% Free**!\n\n`;
            answer += `### 🧾 Price Calculation:\n`;
            answer += `- **Billed Item (Highest):** **${formatINR(billedItem)}**\n`;
            answer += `- **Free Items (3 pcs):** ${freeItems.map(p => formatINR(p)).join(' + ')} (Value: **${formatINR(totalFreeValue)}**)\n`;
            answer += `- **Total Combined MRP:** **${formatINR(totalMRP)}**\n`;
            answer += `- **Customer Net Payable:** **${formatINR(billedItem)}** (Saves ${formatINR(totalFreeValue)} • **${savingsPercent}% Off**)\n`;
            answer += `- **Effective Cost:** Only **${formatINR(effectivePerPiece)} / piece** across 4 garments!\n\n`;
            answer += `💬 *Counter Pitch:* "Sir, pick 4 articles of your choice! You only pay for the highest one at ${formatINR(billedItem)}, and get 3 articles worth ${formatINR(totalFreeValue)} completely free!"`;

            return {
                answer,
                intent: 'OFFER_CALCULATOR',
                metrics: [
                    { label: 'Total MRP', value: formatINR(totalMRP), color: 'purple' },
                    { label: 'Free Benefit', value: formatINR(totalFreeValue), color: 'emerald' },
                    { label: 'Net Payable', value: formatINR(billedItem), color: 'blue' },
                    { label: 'Effective / Pc', value: formatINR(effectivePerPiece), color: 'amber' }
                ],
                table: {
                    headers: ['Garment', 'Original MRP', 'Billing Rule', 'Payable'],
                    rows: [
                        ['Piece 1 (Highest)', formatINR(items[0]), 'Payable (Base MRP)', formatINR(items[0])],
                        ['Piece 2', formatINR(items[1]), '🎁 100% Free', '₹0'],
                        ['Piece 3', formatINR(items[2]), '🎁 100% Free', '₹0'],
                        ['Piece 4', formatINR(items[3]), '🎁 100% Free', '₹0']
                    ]
                },
                actions: [
                    { type: 'NAVIGATE', tab: 'campaigns', label: '🏷️ Open Smart Bundles' },
                    { type: 'NAVIGATE', tab: 'live', label: '⚡ Apply at Counter' }
                ],
                chips: [
                    { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                    { label: "📱 Draft WhatsApp offer pitch", query: "draft whatsapp promo message for buy 1 get 3 free" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        } else if (flatMatch) {
            const pct = parseInt(flatMatch[1], 10);
            const baseAmount = rawNumbers[0] || 2999;
            const discountAmt = Math.round(baseAmount * (pct / 100));
            const netPayable = baseAmount - discountAmt;

            let answer = `🏷️ **Flat ${pct}% Discount Calculation**\n\n`;
            answer += `For an article with **MRP ${formatINR(baseAmount)}**:\n\n`;
            answer += `- **Original MRP:** **${formatINR(baseAmount)}**\n`;
            answer += `- **Flat Discount (${pct}%):** -**${formatINR(discountAmt)}**\n`;
            answer += `- **Net Customer Payable:** **${formatINR(netPayable)}**\n\n`;
            answer += `### 💡 Common Price Points at Flat ${pct}% Off:\n`;
            [1999, 2499, 2999, 3499, 3999].forEach(p => {
                const disc = Math.round(p * (pct / 100));
                answer += `- MRP ${formatINR(p)} ➔ Pay **${formatINR(p - disc)}** (Save ${formatINR(disc)})\n`;
            });

            return {
                answer,
                intent: 'OFFER_CALCULATOR',
                metrics: [
                    { label: 'Original MRP', value: formatINR(baseAmount), color: 'purple' },
                    { label: `Flat ${pct}% Off`, value: `- ${formatINR(discountAmt)}`, color: 'emerald' },
                    { label: 'Customer Pays', value: formatINR(netPayable), color: 'blue' }
                ],
                table: {
                    headers: ['Original MRP', `Flat ${pct}% Discount`, 'Customer Payable', 'Customer Savings'],
                    rows: [1999, 2499, 2999, 3499, 3999].map(p => {
                        const d = Math.round(p * (pct / 100));
                        return [formatINR(p), formatINR(d), formatINR(p - d), `${pct}% Off`];
                    })
                },
                actions: [
                    { type: 'NAVIGATE', tab: 'campaigns', label: '🏷️ Open Smart Bundles' }
                ],
                chips: [
                    { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                    { label: "🏷️ Buy 1 Get 3 Free", query: "calculate b1g3 for 4 shirts" }
                ]
            };
        } else {
            // Buy 3 Get 70% Off (Default mega offer for Cobb)
            let items = rawNumbers.length >= 3 ? rawNumbers.slice(0, 3) : (rawNumbers.length > 0 ? [rawNumbers[0], rawNumbers[0], rawNumbers[0]] : [2499, 2499, 2499]);
            const totalMRP = items.reduce((a, b) => a + b, 0);
            const discountAmt = Math.round(totalMRP * 0.70);
            const netPayable = totalMRP - discountAmt;
            const pricePerPc = Math.round(netPayable / items.length);

            let answer = `🏷️ **Mega Offer Calculation: Buy 3 Get 70% Off**\n\n`;
            answer += `**Billing Rule:** Customer selects any **3 items**. A massive **70% discount** is applied across the total MRP (Customer pays only 30%)!\n\n`;
            answer += `### 🧾 Calculation for 3 Pieces:\n`;
            items.forEach((p, i) => {
                answer += `- **Piece ${i + 1}:** ${formatINR(p)}\n`;
            });
            answer += `- **Total Combined MRP:** **${formatINR(totalMRP)}**\n`;
            answer += `- **Mega Discount (70%):** -**${formatINR(discountAmt)}**\n`;
            answer += `- **Net Customer Payable:** **${formatINR(netPayable)}** (Inclusive of GST)\n`;
            answer += `- **Effective Cost:** Only **${formatINR(pricePerPc)} / piece** instead of ~${formatINR(Math.round(totalMRP / items.length))} MRP!\n\n`;
            answer += `💬 *Counter Pitch:* "Sir, by adding just 1 more shirt, your total cart drops to 70% off! You are paying only ${formatINR(netPayable)} for all 3 articles—that comes down to just ${formatINR(pricePerPc)} per shirt!"`;

            return {
                answer,
                intent: 'OFFER_CALCULATOR',
                metrics: [
                    { label: 'Total MRP (3 pcs)', value: formatINR(totalMRP), color: 'purple' },
                    { label: '70% Savings', value: formatINR(discountAmt), color: 'emerald' },
                    { label: 'Net Payable', value: formatINR(netPayable), color: 'blue' },
                    { label: 'Effective / Pc', value: formatINR(pricePerPc), color: 'amber' }
                ],
                table: {
                    headers: ['Articles', 'Combined MRP', '70% Discount', 'Customer Pays', 'Per Piece'],
                    rows: [
                        ['3x ₹1,999 Articles', '₹5,997', '₹4,198', '₹1,799', '₹600 / pc'],
                        ['3x ₹2,499 Articles', '₹7,497', '₹5,248', '₹2,249', '₹750 / pc'],
                        ['3x ₹2,999 Articles', '₹8,997', '₹6,298', '₹2,699', '₹900 / pc'],
                        ['3x ₹3,499 Articles', '₹10,497', '₹7,348', '₹3,149', '₹1,050 / pc']
                    ]
                },
                actions: [
                    { type: 'NAVIGATE', tab: 'campaigns', label: '🏷️ Open Smart Bundles' },
                    { type: 'NAVIGATE', tab: 'shelf_talkers', label: '🏷️ Print Shelf Signage' }
                ],
                chips: [
                    { label: "🏷️ Calculate B1G3 for 4 items", query: "calculate b1g3 for 4 shirts" },
                    { label: "📱 Draft WhatsApp promo for 70%", query: "draft whatsapp promo message for buy 3 get 70%" },
                    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                ]
            };
        }
    }

    // 5. SLEEVE INVENTORY (Full Sleeve, Half Sleeve)
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

    // 5.5 FASHION STYLING & OUTFIT RECOMMENDATIONS
    const isFashionAdvice = /\b(what goes with|how to style|pair with|match with|outfit|styling|combination|suit with|wear with)\b/i.test(q);
    if (isFashionAdvice) {
        return {
            answer: `👔 **Cobb Italy Fashion Styling Recommendation**:\n\n` +
                    `- **For Formal Cotton Trousers (Navy / Black / Charcoal):** Pair with crisp White or Sky Blue full-sleeve micro-check Cobb shirts and black leather brogues.\n` +
                    `- **For Khaki / Beige Chinos:** Pair with Navy Blue or Forest Green oxford shirts or polo t-shirts and tan loafers or white sneakers.\n` +
                    `- **For Dark Washed Blue Jeans:** Matches effortlessly with printed casual full-sleeve shirts (e.g., CAS2021 series) or a smart slim-fit blazer.\n` +
                    `- **3-Piece Coordination:** White Shirt + Charcoal Cobb Waistcoat + Matching Slim-fit Trousers.\n\n` +
                    `Would you like to check live store stock and size availability for any of these matching items?`,
            intent: 'FASHION_ADVICE',
            metrics: [
                { label: 'Styling Mood', value: 'Smart Casual / Executive', color: 'blue' },
                { label: 'Recommended Fit', value: 'Slim / Italian Tailored', color: 'emerald' }
            ],
            chips: [
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "👖 Check cotton trousers in stock", query: "how many trousers do we have in stock" },
                { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" }
            ]
        };
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

    // 12. TOP SELLING ARTICLES & BEST SELLERS
    const isTopSeller = /\b(top|best|highest|popular|most)\b/i.test(q) && /\b(sellers?|selling|articles?|products?|items?|sales?)\b/i.test(q);
    if (isTopSeller) {
        try {
            const limitMatch = q.match(/\b(3|5|10|20)\b/);
            const limit = limitMatch ? parseInt(limitMatch[1], 10) : 5;

            const topRes = await sql.query(`
                SELECT TOP ${limit}
                    s.article_no as ArticleNo,
                    ISNULL(s.article_name, s.section_name) as ItemName,
                    SUM(c.QUANTITY) as SoldUnits,
                    SUM(c.NET) as TotalRevenue
                FROM CMD01106 c WITH (NOLOCK)
                JOIN SKU_NAMES s WITH (NOLOCK) ON c.PRODUCT_CODE = s.product_Code
                GROUP BY s.article_no, s.article_name, s.section_name
                ORDER BY SoldUnits DESC
            `);
            const rows = topRes.recordset || [];
            if (rows.length > 0) {
                let answer = `Here are the **Top ${rows.length} Best-Selling Articles** based on total units sold:\n\n`;
                rows.forEach((r, idx) => {
                    answer += `${idx + 1}. **${r.ArticleNo}** (${r.ItemName}) — **${r.SoldUnits} pcs sold** (${formatINR(r.TotalRevenue)} revenue)\n`;
                });

                return {
                    answer,
                    intent: 'TOP_SELLERS',
                    metrics: [
                        { label: 'Top Seller', value: rows[0].ArticleNo, color: 'blue' },
                        { label: 'Highest Sold', value: `${rows[0].SoldUnits} pcs`, color: 'emerald' },
                        { label: 'Top Article Rev', value: formatINR(rows[0].TotalRevenue), color: 'purple' }
                    ],
                    table: {
                        headers: ['Rank', 'Article No', 'Product Name', 'Units Sold', 'Total Revenue'],
                        rows: rows.map((r, i) => [`#${i + 1}`, r.ArticleNo, r.ItemName, `${r.SoldUnits} pcs`, formatINR(r.TotalRevenue)])
                    },
                    chips: [
                        { label: "📦 Total inventory valuation", query: "what is our total store inventory and valuation" },
                        { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                        { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
                    ]
                };
            }
        } catch (topErr) {
            console.warn('[ChatRoute] Top sellers error:', topErr.message);
        }
    }

    // 13. TOTAL INVENTORY & MRP VALUATION
    const isValuationQuery = (/\b(total|store|complete|overall)\b/i.test(q) && /\b(inventory|stock|worth|valuation|value|mrp)\b/i.test(q)) ||
                             /\b(how much stock|how many items in store|total pcs)\b/i.test(q);
    if (isValuationQuery) {
        try {
            const valRes = await sql.query(`
                SELECT 
                    COUNT(DISTINCT s.article_no) as TotalArticles,
                    SUM(p.quantity_in_stock) as TotalUnits,
                    SUM(CAST(p.quantity_in_stock as BIGINT) * CAST(ISNULL(s.mrp, 0) as BIGINT)) as TotalMRPValuation
                FROM PMT01106 p WITH (NOLOCK)
                JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
                WHERE p.quantity_in_stock > 0
            `);
            const r = valRes.recordset[0] || {};
            const totalUnits = r.TotalUnits || 0;
            const totalArticles = r.TotalArticles || 0;
            const totalVal = r.TotalMRPValuation || 0;

            let answer = `🏬 **Cobb Store Inventory Overview**:\n\n` +
                         `- **Total Physical Stock:** **${totalUnits.toLocaleString('en-IN')} pcs** across racks & backroom\n` +
                         `- **Active Article Designs:** **${totalArticles} styles**\n` +
                         `- **Total MRP Valuation:** **${formatINR(totalVal)}**\n\n` +
                         `Would you like to drill down into stock by category (Shirts, Trousers, Jeans) or check size availability?`;

            return {
                answer,
                intent: 'INVENTORY_VALUATION',
                metrics: [
                    { label: 'Total In Stock', value: `${totalUnits.toLocaleString('en-IN')} pcs`, color: 'blue' },
                    { label: 'Total Styles', value: `${totalArticles} articles`, color: 'emerald' },
                    { label: 'MRP Valuation', value: formatINR(totalVal), color: 'purple' }
                ],
                table: null,
                chips: [
                    { label: "🏆 Top 5 selling articles", query: "what are our top 5 best selling articles" },
                    { label: "👖 Jeans in stock", query: "how many jeans do we have in stock" },
                    { label: "👔 Full sleeve shirts", query: "how many full sleeves shirt are present" }
                ]
            };
        } catch (valErr) {
            console.warn('[ChatRoute] Valuation error:', valErr.message);
        }
    }

    // 14. CATEGORY STOCK (JEANS, TROUSERS, T-SHIRTS, JACKETS, SUITS)
    const categoryMatch = q.match(/\b(jeans?|trousers?|pants?|t-?shirts?|jackets?|blazers?|suits?|sweaters?|accessories|socks?)\b/i);
    if (categoryMatch && (q.includes('how many') || q.includes('in stock') || q.includes('count') || q.includes('stock') || q.includes('available'))) {
        try {
            const rawCat = categoryMatch[1].toUpperCase();
            let catPattern = rawCat;
            if (catPattern.startsWith('JEAN')) catPattern = 'JEAN';
            else if (catPattern.startsWith('TROUSER') || catPattern.startsWith('PANT')) catPattern = 'TROUSER';
            else if (catPattern.startsWith('T-SHIRT') || catPattern.startsWith('TSHIRT')) catPattern = 'T SHIRT';
            else if (catPattern.startsWith('SUIT') || catPattern.startsWith('BLAZER')) catPattern = 'SUIT';

            const catRes = await sql.query(`
                SELECT 
                    ISNULL(s.sub_section_name, s.section_name) as SubType,
                    COUNT(DISTINCT s.article_no) as DistinctArticles,
                    SUM(p.quantity_in_stock) as Units
                FROM PMT01106 p WITH (NOLOCK)
                JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
                WHERE (s.section_name LIKE '%${catPattern}%' OR s.sub_section_name LIKE '%${catPattern}%' OR s.article_name LIKE '%${catPattern}%')
                  AND p.quantity_in_stock > 0
                GROUP BY s.sub_section_name, s.section_name
                ORDER BY Units DESC
            `);
            const rows = catRes.recordset || [];
            if (rows.length > 0) {
                const totalUnits = rows.reduce((acc, r) => acc + r.Units, 0);
                let answer = `Found **${totalUnits} pcs** in **${categoryMatch[1].toUpperCase()}** across **${rows.length} sub-types**:\n\n`;
                rows.forEach(r => {
                    answer += `- **${r.SubType || 'Standard'}**: **${r.Units} pcs** (${r.DistinctArticles} designs)\n`;
                });

                return {
                    answer,
                    intent: 'CATEGORY_STOCK',
                    metrics: [
                        { label: 'Category', value: categoryMatch[1].toUpperCase(), color: 'blue' },
                        { label: 'Available Stock', value: `${totalUnits} pcs`, color: 'emerald' },
                        { label: 'Sub-Categories', value: `${rows.length}`, color: 'purple' }
                    ],
                    table: {
                        headers: ['Sub-Category', 'Distinct Designs', 'In Stock Units'],
                        rows: rows.map(r => [r.SubType || '-', `${r.DistinctArticles} designs`, `${r.Units} pcs`])
                    },
                    chips: [
                        { label: "🏆 Top best sellers", query: "what are our top best selling articles" },
                        { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                        { label: "🚚 Goods in transit", query: "what parcels are in transit from head office" }
                    ]
                };
            }
        } catch (catErr) {
            console.warn('[ChatRoute] Category error:', catErr.message);
        }
    }

    // 16. GENERAL STORE ASSISTANT HELP & GEMINI SETUP GUIDANCE
    const geminiKeySet = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIzaSy'));
    
    let answer = `Hello! I am your **Cobb Store AI Copilot**.\n\n`;
    if (!geminiKeySet) {
        answer += `⚡ *Currently running in Fast Local Retail Engine.* To ask **ANY open question** in plain English (e.g. *"Which customer bought the most shirts in August?"* or *"Draft an Instagram launch post for CAS2021"*), **connect your Google Gemini API key** using the **⚙️ API Key** button at the top header (it's 100% free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).\n\n`;
    }
    answer += `You can ask me right now:\n` +
              `- 🏆 **"What are our top 5 best selling articles?"**\n` +
              `- 🏬 **"What is our total store inventory and valuation?"**\n` +
              `- 👖 **"How many jeans or trousers do we have in stock?"**\n` +
              `- 🏷️ **"Buy 3 Get 70% on MRP 2499"** or **"Calculate B1G3 for 4 shirts"**\n` +
              `- 📦 **"What items are currently on hold?"** or **"Hold size 40 shirt for Rahul"**\n` +
              `- 📱 **"Draft WhatsApp promo message for buy 3 get 70%"**\n` +
              `- 👔 **"How many full sleeves shirt are present?"**\n` +
              `- 📏 **"Check size 42 shirts in stock"**\n` +
              `- 🚚 **"What parcels are in transit from Head Office?"**\n` +
              `- 👤 **"Show purchases for customer 9812..."**\n` +
              `- 💰 **"What is today's total sales and UPI split?"**\n` +
              `- 🚨 **"Which items are low on stock?"**\n` +
              `- 👑 **"Who are our top VIP customers?"**\n` +
              `- 💤 **"Show dead stock items with zero sales in 60 days"**`;

    return {
        answer,
        intent: 'GENERAL_HELP',
        metrics: [],
        table: null,
        chips: [
            { label: "🏆 Top 5 best sellers", query: "what are our top 5 best selling articles" },
            { label: "🏬 Total inventory valuation", query: "what is our total store inventory and valuation" },
            { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
            { label: "📦 What's on hold?", query: "what items are currently on hold" },
            { label: "👔 Full sleeve shirts count", query: "how many full sleeves shirt are present" },
            { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
        ]
    };
}

/**
 * Copilot Status & Engine Check Endpoint: GET /api/ai/chat/status
 */
router.get('/status', (req, res) => {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    const hasKey = key.length > 15;
    const isGoogleAiKey = key.startsWith('AIzaSy');
    const activeModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    res.json({
        success: true,
        geminiConfigured: hasKey,
        geminiActive: isGoogleAiKey,
        model: activeModel,
        fallbackModel: 'gemini-3.5-flash',
        localSqlActive: true,
        engine: isGoogleAiKey ? `Google ${activeModel} + MSSQL Retail Engine` : 'Cobb Fast Retail MSSQL Engine',
        statusText: isGoogleAiKey ? `🧠 ${activeModel} AI Mode` : '⚡ Local Retail Engine'
    });
});

/**
 * Suggestions Auto-Complete Endpoint: GET /api/ai/chat/suggestions?q=...
 */
router.get('/suggestions', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({
                suggestions: [
                    { type: 'query', label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                    { type: 'query', label: "📦 What's on Hold?", query: "what items are currently on hold" },
                    { type: 'query', label: "📱 Draft WhatsApp Promo", query: "draft whatsapp promo message for buy 3 get 70%" },
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
        if (lowerQ.includes('offer') || lowerQ.includes('b3') || lowerQ.includes('70') || lowerQ.includes('b1g3') || lowerQ.includes('discount')) {
            results.push({ type: 'query', label: '🏷️ Calculate Buy 3 Get 70%', query: 'buy 3 get 70% on mrp 2499' });
            results.push({ type: 'query', label: '🏷️ Calculate Buy 1 Get 3 Free', query: 'calculate b1g3 for 4 shirts' });
            results.push({ type: 'query', label: '🏷️ Flat 50% discount calculator', query: 'flat 50% on mrp 2999' });
        }
        if (lowerQ.includes('hold') || lowerQ.includes('reserve')) {
            results.push({ type: 'query', label: "📦 What items are on hold?", query: "what items are currently on hold" });
            results.push({ type: 'query', label: "📦 Hold size 40 shirt for customer", query: "hold size 40 shirt for customer Rahul 9812345678" });
        }
        if (lowerQ.includes('whatsapp') || lowerQ.includes('draft') || lowerQ.includes('promo') || lowerQ.includes('pitch')) {
            results.push({ type: 'query', label: '📱 Draft WhatsApp promo for 70% offer', query: 'draft whatsapp promo message for buy 3 get 70%' });
            results.push({ type: 'query', label: '📱 Draft WhatsApp VIP exclusive pitch', query: 'draft whatsapp pitch message for vip customer' });
            results.push({ type: 'query', label: '📱 Draft WhatsApp dormant win-back', query: 'draft whatsapp message for dormant customer' });
        }
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

        return res.json({ suggestions: results.slice(0, 8) });
    } catch (err) {
        return res.json({ suggestions: [] });
    }
});

/**
 * Update / Configure Gemini API Key Endpoint: POST /api/ai/chat/key
 */
router.post('/key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15) {
            return res.status(400).json({ success: false, error: 'A valid Google Gemini API Key is required.' });
        }
        const cleanKey = apiKey.trim();

        // 1. Query Google Generative Language ModelService to discover supported models for this specific key
        let chosenModel = 'gemini-3.6-flash';
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
            const listData = await listRes.json();

            if (listData.error) {
                const errMsg = listData.error.message || 'Invalid Gemini API key';
                if (errMsg.toLowerCase().includes('api key not valid') || listData.error.status === 'INVALID_ARGUMENT') {
                    return res.status(400).json({ success: false, error: 'Invalid Google Gemini API Key. Please get a valid key from Google AI Studio (https://aistudio.google.com/app/apikey).' });
                }
                if (errMsg.toLowerCase().includes('generative language api has not been used') || errMsg.toLowerCase().includes('disabled')) {
                    return res.status(400).json({ success: false, error: 'Generative Language API is disabled on this Google Cloud project. Please create an API key in Google AI Studio (https://aistudio.google.com/app/apikey) where it is enabled automatically.' });
                }
                return res.status(400).json({ success: false, error: errMsg });
            }

            const availableModels = (listData.models || [])
                .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
                .map(m => m.name.replace(/^models\//, ''));

            const preferences = [
                'gemini-3.6-flash',
                'gemini-3.8-flash',
                'gemini-3.7-flash',
                'gemini-3.5-flash',
                'gemini-3.5-flash-lite',
                'gemini-2.5-flash'
            ];

            const match = preferences.find(p => availableModels.includes(p)) ||
                          availableModels.find(m => m.includes('flash')) ||
                          availableModels[0];

            if (match) {
                chosenModel = match;
            }
        } catch (fetchErr) {
            console.warn('[ChatRoute] ModelService check warning:', fetchErr.message);
        }

        // 2. Validate key with live generation call using candidate models
        const testClient = new GoogleGenerativeAI(cleanKey);
        let testSuccess = false;
        let lastErr = null;

        const testList = [chosenModel, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
        for (const candidate of [...new Set(testList)]) {
            try {
                const testModel = testClient.getGenerativeModel({ model: candidate });
                await Promise.race([
                    testModel.generateContent('ping'),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Validation timeout')), 10000))
                ]);
                chosenModel = candidate;
                testSuccess = true;
                break;
            } catch (err) {
                lastErr = err;
            }
        }

        if (!testSuccess) {
            return res.status(400).json({
                success: false,
                error: lastErr ? lastErr.message : 'Could not validate model generation with Google Gemini.'
            });
        }

        // 3. Save key and model into CobbDashboard/.env
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        if (envContent.includes('GEMINI_API_KEY=')) {
            envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${cleanKey}`);
        } else {
            envContent += `\nGEMINI_API_KEY=${cleanKey}\n`;
        }

        if (envContent.includes('GEMINI_MODEL=')) {
            envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${chosenModel}`);
        } else {
            envContent += `\nGEMINI_MODEL=${chosenModel}\n`;
        }

        fs.writeFileSync(envPath, envContent, 'utf8');
        process.env.GEMINI_API_KEY = cleanKey;
        process.env.GEMINI_MODEL = chosenModel;

        return res.json({
            success: true,
            message: `Google ${chosenModel} AI successfully connected and saved!`,
            model: chosenModel
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message.includes('API_KEY_INVALID') ? 'Invalid Gemini API Key. Please get a valid key from Google AI Studio (https://aistudio.google.com/app/apikey).' : err.message
        });
    }
});

/**
 * Remove / Clear Gemini API Key Endpoint: DELETE /api/ai/chat/key
 */
router.delete('/key', async (req, res) => {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/GEMINI_API_KEY=.*/, 'GEMINI_API_KEY=');
            fs.writeFileSync(envPath, envContent, 'utf8');
        }
        process.env.GEMINI_API_KEY = '';
        return res.json({ success: true, message: 'Gemini API Key removed. Copilot reverted to Local Retail Engine.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
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

        // If a valid Google AI Studio key is configured, Gemini answers open-ended queries
        if (genAI) {
            try {
                const targetModelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
                let model;
                try {
                    model = genAI.getGenerativeModel({ model: targetModelName });
                } catch (mErr) {
                    model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
                }

                const systemPrompt = `You are Cobb Retail AI Copilot, an elite fashion retail and store operations intelligence agent for "Cobb Italy" retail store (Pundri, Haryana).
You can answer ANY question: live stock inquiries, sales analysis, customer buying trends, fashion styling advice, bundle offers, marketing campaigns, or general business questions.

LIVE DATABASE SCHEMA (Microsoft SQL Server):
1. PMT01106: Physical Store Stock
   - product_code (VARCHAR): SKU ID
   - quantity_in_stock (INT): Available quantity on racks/inventory

2. SKU_NAMES: Product Catalog & Taxonomy
   - product_Code (VARCHAR): SKU ID (Joins with PMT01106.product_code and CMD01106.PRODUCT_CODE)
   - article_no (VARCHAR): Style/Article code (e.g., 'TSLBT2690', 'FTSLBT2509', 'CAS2021')
   - article_name (VARCHAR): Product name/sub-type
   - section_name (VARCHAR): Top category (e.g., 'SHIRTS', 'TROUSERS', 'JEANS', 'T SHIRT')
   - sub_section_name (VARCHAR): Sub-category (e.g., 'CASUAL FULL SL', 'SHIRTS HALF SL', 'COTTON TROUSER')
   - para1_name (VARCHAR): Color (e.g., 'WHITE', 'BLACK', 'NAVY', 'SKY BLUE')
   - para2_name (VARCHAR): Size (e.g., '38', '40', '42', '44', '30', '32', '34', 'M', 'L', 'XL')
   - mrp (DECIMAL): Maximum Retail Price in INR

3. CMM01106: Cash Memo / Bill Headers
   - CM_ID (BIGINT): Unique Bill ID
   - CM_NO (VARCHAR): Bill memo number
   - CM_DT (DATETIME): Date of bill
   - CM_TIME (DATETIME): Timestamp of bill
   - NET_AMOUNT (DECIMAL): Final billed amount
   - CUSTOMER_CODE (VARCHAR): Customer phone / code (Joins with CUSTDYM.CUSTOMER_CODE)
   - CANCELLED (INT): 0 = valid sale, 1 = cancelled

4. CMD01106: Cash Memo Itemized Lines
   - cm_id (VARCHAR): Bill ID (Joins with CMM01106.cm_id)
   - PRODUCT_CODE (VARCHAR): SKU ID (Joins with SKU_NAMES.product_Code)
   - QUANTITY (NUMERIC): Number of units purchased
   - MRP (NUMERIC): Maximum retail price per unit
   - NET (NUMERIC): Final net billed line amount after discounts (REVENUE)
   - discount_amount (NUMERIC): Discount amount on this item

5. CUSTDYM: Customer Directory
   - customer_code (CHAR): Customer phone / code (Joins with CMM01106.CUSTOMER_CODE)
   - customer_fname (VARCHAR): First name
   - customer_lname (VARCHAR): Last name
   - mobile (VARCHAR): Phone number
   - totalsale (NUMERIC): Lifetime purchase total

6. VW_BILL_PAYMODE: Cash & Card Payment Breakdown
   - CM_ID (BIGINT/VARCHAR): Bill ID
   - PAYMODE (VARCHAR): 'CASH', 'CARD', etc.
   - AMOUNT (DECIMAL): Paid amount

7. VW_WL_CASHMEMOLIST: UPI & Digital Payments
   - CM_ID (BIGINT/VARCHAR): Bill ID
   - NET_AMOUNT (DECIMAL): UPI amount

8. DOCWSL_parcel_mst_MIRROR & DOCWSL_parcel_det_MIRROR: Inbound Parcels from Head Office
   - parcel_memo_no, parcel_memo_dt, vehicle_no, bilty_no, TOT_QUANTITY, TOT_BOXES, XN_NO_LIST (challan), PARTY_INV_AMT

DECISION RULE:
- If the user's question requires data from the database (stock levels, specific article/size counts, sales figures, revenue, customer bills, low stock, parcel status, etc.), respond with:
  {"requiresSql": true, "sqlQuery": "SELECT TOP 50 ... WITH (NOLOCK)"}
  * Ensure SQL is valid T-SQL for Microsoft SQL Server. Always use TOP (max 50) and WITH (NOLOCK). Use LIKE '%...%' for strings. Never modify or delete data. Use NET (not NET_AMOUNT) for CMD01106 line totals.
- If the question is conversational, fashion advice, marketing advice, offer explanation, calculation, or general retail knowledge, respond with:
  {"requiresSql": false, "answer": "Your detailed, formatted markdown response with emojis, bold text, and bullet points."}

User Question: "${queryText}"`;

                const aiGen = await model.generateContent(systemPrompt);
                let rawText = aiGen.response.text().trim();
                let parsed = null;
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[0]);
                    } catch (pe) {
                        parsed = null;
                    }
                }
                if (!parsed) {
                    parsed = { requiresSql: false, answer: rawText.replace(/```json/gi, '').replace(/```/g, '').trim() };
                }

                if (parsed.requiresSql && parsed.sqlQuery && isSafeSelectQuery(parsed.sqlQuery)) {
                    let records = [];
                    let querySuccess = true;
                    let sqlErrMsg = null;

                    try {
                        const sqlRes = await sql.query(parsed.sqlQuery);
                        records = sqlRes.recordset || [];
                    } catch (sErr) {
                        querySuccess = false;
                        sqlErrMsg = sErr.message;
                        console.warn("[ChatRoute] MSSQL execution error for Gemini SQL:", sErr.message, "SQL:", parsed.sqlQuery);
                    }

                    if (querySuccess) {
                        const synthPrompt = `You are Cobb Retail AI Copilot for "Cobb Italy" store.
User asked: "${queryText}"
Executed SQL: ${parsed.sqlQuery}
Query Results (${records.length} rows): ${JSON.stringify(records.slice(0, 30))}

Synthesize this data for the store manager into an insightful, friendly, and complete answer.
Return valid raw JSON (no other text):
{
  "answer": "Detailed markdown explanation with bold numbers, emojis, and bullet points.",
  "metrics": [
    {"label": "Metric Name", "value": "Metric Value", "color": "blue"}
  ],
  "table": {
    "headers": ["Col 1", "Col 2", "Col 3"],
    "rows": [["val 1", "val 2", "val 3"]]
  },
  "chips": [
    {"label": "Suggested follow-up query", "query": "exact follow up query"}
  ]
}`;
                        const synthGen = await model.generateContent(synthPrompt);
                        let synthRaw = synthGen.response.text().trim();
                        let synthObj = {};
                        const sMatch = synthRaw.match(/\{[\s\S]*\}/);
                        if (sMatch) {
                            try {
                                synthObj = JSON.parse(sMatch[0]);
                            } catch (se) {
                                synthObj = { answer: synthRaw.replace(/```json/gi, '').replace(/```/g, '').trim() };
                            }
                        } else {
                            synthObj = { answer: synthRaw.replace(/```json/gi, '').replace(/```/g, '').trim() };
                        }

                        return res.json({
                            answer: synthObj.answer || synthRaw,
                            intent: 'GEMINI_SQL',
                            metrics: synthObj.metrics && synthObj.metrics.length > 0 ? synthObj.metrics : (records.length > 0 && records[0].TotalUnits ? [
                                { label: "Total Units", value: `${records[0].TotalUnits} pcs`, color: 'blue' }
                            ] : []),
                            table: synthObj.table && synthObj.table.headers ? synthObj.table : (records.length > 0 ? {
                                headers: Object.keys(records[0]),
                                rows: records.slice(0, 10).map(r => Object.values(r))
                            } : null),
                            chips: synthObj.chips && synthObj.chips.length > 0 ? synthObj.chips : [
                                { label: "🏆 Top 5 best sellers", query: "what are our top 5 best selling articles" },
                                { label: "🏬 Total inventory valuation", query: "what is our total store inventory and valuation" },
                                { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" }
                            ],
                            sqlUsed: parsed.sqlQuery
                        });
                    } else {
                        // SQL had an error, let Gemini explain or suggest refinement
                        const retryPrompt = `You are Cobb Retail AI Copilot for Cobb Italy store.
User asked: "${queryText}"
SQL query executed: ${parsed.sqlQuery}
Database error: "${sqlErrMsg}"
Please provide a polite, helpful explanation to the store owner with advice on how to ask or what was intended.`;
                        const retryGen = await model.generateContent(retryPrompt);
                        return res.json({
                            answer: retryGen.response.text().trim(),
                            intent: 'GEMINI_AI',
                            metrics: [],
                            table: null,
                            chips: [
                                { label: "🏆 Top 5 best sellers", query: "what are our top 5 best selling articles" },
                                { label: "🏬 Total inventory valuation", query: "what is our total store inventory and valuation" },
                                { label: "👔 Full sleeve shirts count", query: "how many full sleeves shirt are present" }
                            ]
                        });
                    }
                } else if (!parsed.requiresSql && parsed.answer) {
                    return res.json({
                        answer: parsed.answer,
                        intent: 'GEMINI_AI',
                        metrics: parsed.metrics || [],
                        table: parsed.table || null,
                        chips: parsed.chips || [
                            { label: "🏆 Top 5 best sellers", query: "what are our top 5 best selling articles" },
                            { label: "🏬 Total inventory valuation", query: "what is our total store inventory and valuation" },
                            { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                            { label: "📦 What's on hold?", query: "what items are currently on hold" }
                        ]
                    });
                }
            } catch (geminiErr) {
                console.warn("[ChatRoute] Gemini fallback to retail parser:", geminiErr.message);
            }
        }

        // Fast & robust local retail engine
        const response = await handleRetailIntent(queryText);
        return res.json(response);

    } catch (err) {
        console.error("[ChatRoute] Chat route error:", err);
        return res.status(500).json({ 
            error: err.message,
            answer: "Sorry, I encountered an error querying the store database. Please check that SQL Server is online.",
            chips: [
                { label: "🏷️ Calculate Buy 3 Get 70%", query: "buy 3 get 70% on mrp 2499" },
                { label: "📦 What's on hold?", query: "what items are currently on hold" },
                { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
                { label: "💰 Check today's sales", query: "what is today's total sales and UPI split" }
            ]
        });
    }
});

module.exports = router;

