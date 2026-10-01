import { db, hasConfig } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Intelligent Cloud / Offline Copilot Fallback Resolver
 * Answers sales, expense, staff, inventory stock, and size queries
 * directly from synced Cloud Firestore data when away from the desktop POS server.
 */
export async function resolveCloudCopilotQuery(query) {
  if (!hasConfig || !db) return null;

  try {
    const storeId = (typeof localStorage !== 'undefined' && localStorage.getItem('cobb_active_store') === 'STORE_02') 
      ? 'STORE_002' 
      : 'DEMO_STORE_001';

    const q = (query || '').toLowerCase().trim();

    // 1. EXPENSE / KHATA QUESTIONS
    if (q.includes('expense') || q.includes('khata') || q.includes('kharcha') || q.includes('spent') || q.includes('spending')) {
      const expDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'expenses_today'));
      if (expDoc.exists()) {
        const expData = expDoc.data().summary || expDoc.data();
        const spent = Number(expData.totalSpent || 0);
        const count = Number(expData.totalCount || 0);
        const catSummary = (expData.categories || []).map(c => `**${c.name}**: ₹${c.amount}`).join(', ');

        return {
          text: `📊 **Today's Pocket Khata Expenses (${storeId}):**\n\n• **Total Spent:** ₹${spent.toLocaleString('en-IN')}\n• **Total Entries:** ${count}\n${catSummary ? `• **Category Breakdown:** ${catSummary}` : '• No specific category entries recorded yet.'}`,
          metrics: [
            { label: "Today's Expenses", value: `₹${spent.toLocaleString('en-IN')}`, change: `${count} entries`, positive: false }
          ],
          chips: [
            { label: "💰 View Today's Sales & UPI", query: "what is today's total sales and UPI split" },
            { label: "👔 Check Size 40 Shirts Stock", query: "size 40 shirts in stock" },
            { label: "🏆 Check Staff Leaderboard", query: "who is the top sales staff today" }
          ],
          actions: [
            { label: "Open Pocket Khata Desk", type: "NAVIGATE_TAB", target: "khata" }
          ]
        };
      }
    }

    // 2. INVENTORY & SIZE STOCK QUESTIONS (e.g. "size 40 shirts in stock", "how many full sleeves", "jeans in stock")
    const isInventoryQuery = q.includes('stock') || q.includes('shirt') || q.includes('jeans') || 
      q.includes('trouser') || q.includes('t-shirt') || q.includes('tshirt') || q.includes('blazer') || 
      q.includes('size') || q.includes('inventory') || q.includes('garment') || q.includes('sleeve');

    if (isInventoryQuery) {
      const invDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'inventory'));
      if (invDoc.exists()) {
        const rawItems = invDoc.data().items || [];
        
        // Extract size number if present (e.g. 38, 40, 42, 44, 30, 32, 34, 36)
        const sizeMatch = q.match(/\b(36|38|39|40|42|44|46|28|30|32|34|s|m|l|xl|xxl|3xl)\b/i);
        const targetSize = sizeMatch ? sizeMatch[0].toUpperCase() : null;

        // Extract product keywords
        const keywords = [];
        if (q.includes('shirt') || q.includes('shirts')) keywords.push('shirt', 'sl');
        if (q.includes('full sleeve') || q.includes('full sleeves')) keywords.push('full sl', 'full');
        if (q.includes('half sleeve') || q.includes('half sleeves')) keywords.push('half sl', 'half');
        if (q.includes('jeans') || q.includes('denim')) keywords.push('jean', 'denim');
        if (q.includes('trouser') || q.includes('trousers') || q.includes('pant')) keywords.push('trouser', 'pant');
        if (q.includes('t-shirt') || q.includes('tshirt') || q.includes('tee')) keywords.push('t shirt', 't-shirt');
        if (q.includes('blazer') || q.includes('coat') || q.includes('suit')) keywords.push('blazer', 'coat');

        // Filter matching items
        let matches = rawItems.filter(item => {
          const name = (item.ItemName || '').toLowerCase();
          const art = (item.ArticleNo || '').toLowerCase();
          const pType = (item.ProductType || '').toLowerCase();
          const itemSize = (item.Size || '').toUpperCase();

          // Match size if specified
          if (targetSize) {
            const sizeMatches = itemSize.startsWith(targetSize) || 
                                itemSize.includes(` ${targetSize} `) || 
                                itemSize === targetSize ||
                                (targetSize === 'M' && itemSize.includes('38') || itemSize.includes('40')) ||
                                (targetSize === 'L' && itemSize.includes('42')) ||
                                (targetSize === 'XL' && itemSize.includes('44'));
            if (!sizeMatches) return false;
          }

          // Match product keywords if specified
          if (keywords.length > 0) {
            const hasKeyword = keywords.some(k => name.includes(k) || art.includes(k) || pType.includes(k));
            if (!hasKeyword) return false;
          }

          return true;
        });

        // If specific keywords didn't match, fallback to broader search
        if (matches.length === 0 && targetSize) {
          matches = rawItems.filter(item => (item.Size || '').toUpperCase().startsWith(targetSize));
        }

        const totalStockUnits = matches.reduce((sum, item) => sum + (Number(item.CurrentStock) || 1), 0);
        const uniqueArticles = [...new Set(matches.map(i => i.ArticleNo).filter(Boolean))];
        const uniqueColors = [...new Set(matches.map(i => i.Color).filter(Boolean))].slice(0, 8);
        const uniqueSizes = [...new Set(matches.map(i => i.Size).filter(Boolean))].slice(0, 6);

        // Build top sample articles list
        const sampleArticles = matches.slice(0, 6).map(i => 
          `• **${i.ArticleNo}** (${i.ItemName}) - Color: **${i.Color || 'Assorted'}** | Size: **${i.Size}** (Stock: ${i.CurrentStock || 1})`
        ).join('\n');

        // Build structured table for table view
        const tableData = {
          columns: ['Article No', 'Product / Item', 'Color', 'Size', 'In Stock'],
          rows: matches.slice(0, 8).map(i => [
            i.ArticleNo || 'N/A',
            i.ItemName || 'Apparel',
            i.Color || 'Std',
            i.Size || 'Std',
            `${i.CurrentStock || 1} pcs`
          ])
        };

        const targetLabel = targetSize ? `Size ${targetSize} ` : '';
        const itemLabel = keywords.length > 0 ? 'Articles' : 'Inventory Items';

        return {
          text: `👔 **Cloud Inventory Search Result (${storeId}):**\n\nFound **${matches.length} matching SKUs** with a total of **${totalStockUnits} units in stock** for *"${query}"*.\n\n${sampleArticles}\n\n• **Available Colors:** ${uniqueColors.join(', ') || 'Various'}\n• **Available Sizes:** ${uniqueSizes.join(', ') || 'Standard'}`,
          metrics: [
            { label: `${targetLabel}Units In Stock`, value: `${totalStockUnits} pcs`, positive: totalStockUnits > 0 },
            { label: "Unique Articles", value: `${uniqueArticles.length} designs`, positive: true },
            { label: "Total Catalog", value: `${rawItems.length} items` }
          ],
          table: tableData,
          chips: [
            { label: "👔 Size 42 Shirts", query: "size 42 shirts in stock" },
            { label: "👔 Full Sleeve Shirts", query: "how many full sleeves shirt are present" },
            { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
          ],
          actions: [
            { label: "Open Inventory Matrix", type: "NAVIGATE_TAB", target: "inventory" }
          ]
        };
      }
    }

    // 3. SALES & PAYMENT SPLIT QUESTIONS
    if (q.includes('sales') || q.includes('upi') || q.includes('split') || q.includes('collection') || 
        q.includes('cash') || q.includes('card') || q.includes('revenue') || q.includes('today')) {
      const salesDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'sales_overview'));
      if (salesDoc.exists()) {
        const salesData = salesDoc.data().today || salesDoc.data();
        const totalSales = Number(salesData.TotalSales || 0);
        const bills = Number(salesData.BillCount || 0);
        const upi = Number(salesData.UPIAmount || 0);
        const cash = Number(salesData.CashAmount || 0);
        const card = Number(salesData.CardAmount || 0);

        return {
          text: `💰 **Today's Store Sales & Payment Summary (${storeId}):**\n\n• **Gross Sales:** ₹${totalSales.toLocaleString('en-IN')}\n• **Bills Generated:** ${bills} bills\n• **UPI Payment:** ₹${upi.toLocaleString('en-IN')}\n• **Cash Collection:** ₹${cash.toLocaleString('en-IN')}\n• **Card Swipes:** ₹${card.toLocaleString('en-IN')}`,
          metrics: [
            { label: "Gross Sales", value: `₹${totalSales.toLocaleString('en-IN')}`, positive: true },
            { label: "UPI Received", value: `₹${upi.toLocaleString('en-IN')}`, positive: true },
            { label: "Cash In Till", value: `₹${cash.toLocaleString('en-IN')}`, positive: true }
          ],
          chips: [
            { label: "📋 Today's Expenses", query: "how much expense was today" },
            { label: "👔 Size 40 Shirts in Stock", query: "size 40 shirts in stock" },
            { label: "🏆 Staff Leaderboard", query: "who is top salesperson" }
          ],
          actions: [
            { label: "Open Sales Dashboard", type: "NAVIGATE_TAB", target: "dashboard" }
          ]
        };
      }
    }

    // 4. STAFF & LEADERBOARD QUESTIONS
    if (q.includes('staff') || q.includes('leaderboard') || q.includes('champion') || 
        q.includes('incentive') || q.includes('commission') || q.includes('performer')) {
      const staffDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'staff_leaderboard'));
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        const periodData = staffData.periods?.this_month || staffData.periods?.all_time || staffData;
        const ranked = (periodData.staff || []).filter(s => !s.isUnassigned);
        const champ = ranked[0];

        if (champ) {
          return {
            text: `🏆 **Store Staff Leaderboard:**\n\n• **Top Champion:** **${champ.name}** (#${champ.empCode})\n• **Sales Attributed:** ₹${Number(champ.totalSales).toLocaleString('en-IN')} (${champ.billCount} bills)\n• **Commission Accrued:** ₹${champ.totalPayout.toLocaleString('en-IN')}\n• **Quota Progress:** ${champ.achievementPct}%`,
            metrics: [
              { label: "Store Champion", value: champ.name, positive: true },
              { label: "Sales Volume", value: `₹${Number(champ.totalSales).toLocaleString('en-IN')}`, positive: true },
              { label: "Incentive Earned", value: `₹${champ.totalPayout.toLocaleString('en-IN')}`, positive: true }
            ],
            chips: [
              { label: "📅 Sep '26 Leaderboard", query: "staff performance in september 2026" },
              { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
            ],
            actions: [
              { label: "Open Staff Leaderboard", type: "NAVIGATE_TAB", target: "leaderboard" }
            ]
          };
        }
      }
    }

    // 5. GOODS IN TRANSIT / PARCELS
    if (q.includes('transit') || q.includes('parcel') || q.includes('courier') || q.includes('delivery')) {
      const transitDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'parcels_transit'));
      if (transitDoc.exists()) {
        const parcels = Array.isArray(transitDoc.data().items) ? transitDoc.data().items : [];
        return {
          text: `🚚 **Goods In Transit (${storeId}):**\n\nCurrently tracking **${parcels.length} incoming shipments / parcels** from suppliers to store.`,
          metrics: [
            { label: "In Transit Parcels", value: `${parcels.length} pkgs`, positive: parcels.length > 0 }
          ],
          actions: [
            { label: "View Goods in Transit", type: "NAVIGATE_TAB", target: "transit" }
          ]
        };
      }
    }

    // 6. DEFAULT GENERAL EXECUTIVE SUMMARY
    const salesDoc = await getDoc(doc(db, 'stores', storeId, 'data', 'sales_overview'));
    if (salesDoc.exists()) {
      const s = salesDoc.data().today || {};
      return {
        text: `🏪 **Cobb Store Telemetry (${storeId}):**\n\n• **Today's Sales:** ₹${Number(s.TotalSales || 0).toLocaleString('en-IN')} (${s.BillCount || 0} bills)\n• **UPI Received:** ₹${Number(s.UPIAmount || 0).toLocaleString('en-IN')}\n• **Cash In Till:** ₹${Number(s.CashAmount || 0).toLocaleString('en-IN')}\n\nYou can ask about inventory stock, sizes, expenses, sales, staff commissions, or transit shipments.`,
        metrics: [
          { label: "Today's Sales", value: `₹${Number(s.TotalSales || 0).toLocaleString('en-IN')}`, positive: true },
          { label: "UPI Received", value: `₹${Number(s.UPIAmount || 0).toLocaleString('en-IN')}`, positive: true }
        ],
        chips: [
          { label: "👔 Size 40 Shirts in Stock", query: "size 40 shirts in stock" },
          { label: "💰 Today's sales & UPI split", query: "what is today's total sales and UPI split" },
          { label: "📝 Today's expenses", query: "how much expense was today" },
          { label: "🏆 Staff leaderboard", query: "who is top salesperson" }
        ]
      };
    }

    return null;
  } catch (err) {
    console.error('[CloudCopilotFallback] Resolution error:', err);
    return null;
  }
}
