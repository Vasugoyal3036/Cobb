const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql } = require('../db');

const CONFIG_FILE = path.join(__dirname, '..', 'staff_config.json');

function loadStaffConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            const defaultConfig = {
                defaultCommissionPct: 1.5,
                monthlyStoreTarget: 500000,
                dailyStoreTarget: 25000,
                bonusThreshold: 100000,
                bonusCommissionPct: 0.5,
                storeUpi: {
                    vpa: "cobbclothing@upi",
                    payeeName: "Cobb Apparels",
                    merchantCode: "5691"
                },
                printerConfig: {
                    paperWidth: "80mm",
                    storeName: "COBB APPARELS",
                    address: "Fatehpur Road, Pundri",
                    phone: "+91 91381 22820",
                    gstin: "06AABCC1234F1Z5",
                    footerNote: "Thank you for shopping at Cobb! Exchanges accepted within 7 days with tag intact."
                },
                staffOverrides: {}
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
        console.error('[StaffRoute] Error loading config:', e.message);
        return { defaultCommissionPct: 1.5, storeUpi: { vpa: 'cobbclothing@upi' }, staffOverrides: {} };
    }
}

function saveStaffConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[StaffRoute] Error saving config:', e.message);
        return false;
    }
}

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

async function getAvailableMonths() {
    try {
        const result = await sql.query(`
            SELECT 
                CONVERT(varchar(7), CM_TIME, 120) as MonthKey,
                YEAR(CM_TIME) as Year,
                MONTH(CM_TIME) as Month,
                COUNT(DISTINCT CM_ID) as TotalBills,
                ISNULL(SUM(TOTAL_QUANTITY), 0) as TotalQuantity,
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales
            FROM CMM01106 WITH (NOLOCK)
            WHERE CANCELLED = 0
            GROUP BY CONVERT(varchar(7), CM_TIME, 120), YEAR(CM_TIME), MONTH(CM_TIME)
            ORDER BY MonthKey DESC
        `);

        return (result.recordset || []).map(r => ({
            key: r.MonthKey,
            year: Number(r.Year),
            month: Number(r.Month),
            label: `${monthNames[Number(r.Month) - 1]} ${r.Year}`,
            shortLabel: `${monthNames[Number(r.Month) - 1].slice(0, 3)} '${String(r.Year).slice(2)}`,
            totalBills: Number(r.TotalBills) || 0,
            totalQuantity: Number(r.TotalQuantity) || 0,
            grossSales: Math.round(Number(r.GrossSales) || 0)
        }));
    } catch (e) {
        console.error('[StaffRoute] Error fetching available months:', e.message);
        return [];
    }
}

function getDateClause(period) {
    if (!period) return '1=1';

    // Support month-by-month: YYYY-MM (e.g. '2026-09')
    if (/^\d{4}-\d{2}$/.test(period)) {
        const [year, month] = period.split('-').map(Number);
        return `m.CM_TIME >= DATEFROMPARTS(${year}, ${month}, 1) AND m.CM_TIME < DATEADD(month, 1, DATEFROMPARTS(${year}, ${month}, 1))`;
    }

    switch (period) {
        case 'today':
            return 'm.CM_TIME >= CAST(GETDATE() AS DATE)';
        case 'yesterday':
            return 'm.CM_TIME >= CAST(DATEADD(day, -1, GETDATE()) AS DATE) AND m.CM_TIME < CAST(GETDATE() AS DATE)';
        case 'this_week':
            return 'm.CM_TIME >= DATEADD(day, 1-DATEPART(dw, GETDATE()), CAST(GETDATE() AS DATE))';
        case 'this_month':
            return 'm.CM_TIME >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)';
        case 'last_month':
            return 'm.CM_TIME >= DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AND m.CM_TIME < DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)';
        case 'all_time':
        default:
            return '1=1';
    }
}

// GET /api/staff/config
router.get('/config', (req, res) => {
    const config = loadStaffConfig();
    res.json(config);
});

// POST /api/staff/config
router.post('/config', (req, res) => {
    const newConfig = { ...loadStaffConfig(), ...req.body };
    const ok = saveStaffConfig(newConfig);
    if (ok) {
        res.json({ success: true, config: newConfig });
    } else {
        res.status(500).json({ error: 'Failed to write config' });
    }
});

async function getLeaderboardForPeriod(period, config) {
    const dateClause = getDateClause(period);

    // 1. Fetch sales aggregated by employee
    const salesResult = await sql.query(`
        SELECT 
            ISNULL(NULLIF(RTRIM(d.emp_code), ''), '0000000') as EmpCode,
            ISNULL(NULLIF(RTRIM(e.emp_name), ''), '') as EmpName,
            COUNT(DISTINCT d.CM_ID) as BillCount,
            SUM(d.QUANTITY) as TotalItems,
            ISNULL(SUM(d.NET), 0) as TotalSales,
            ISNULL(SUM(d.basic_discount_amount + d.discount_amount), 0) as TotalDiscountGiven,
            MAX(m.CM_TIME) as LastSaleTime
        FROM CMD01106 d WITH (NOLOCK)
        JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
        LEFT JOIN EMPLOYEE e WITH (NOLOCK) ON d.emp_code = e.emp_code
        WHERE m.CANCELLED = 0 AND d.QUANTITY > 0 AND ${dateClause}
        GROUP BY d.emp_code, e.emp_name
        ORDER BY TotalSales DESC
    `);

    // 2. Fetch top categories per employee
    const catResult = await sql.query(`
        SELECT 
            ISNULL(NULLIF(RTRIM(d.emp_code), ''), '0000000') as EmpCode,
            ISNULL(s.SECTION_NAME, 'Apparel') as Category,
            SUM(d.QUANTITY) as QtySold,
            ISNULL(SUM(d.NET), 0) as CategorySales
        FROM CMD01106 d WITH (NOLOCK)
        JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
        JOIN SKU c WITH (NOLOCK) ON d.PRODUCT_CODE = c.PRODUCT_CODE
        JOIN ARTICLE a WITH (NOLOCK) ON c.ARTICLE_CODE = a.ARTICLE_CODE
        LEFT JOIN SECTIOND sd WITH (NOLOCK) ON a.SUB_SECTION_CODE = sd.SUB_SECTION_CODE
        LEFT JOIN SECTIONM s WITH (NOLOCK) ON sd.SECTION_CODE = s.SECTION_CODE
        WHERE m.CANCELLED = 0 AND d.QUANTITY > 0 AND ${dateClause}
        GROUP BY d.emp_code, s.SECTION_NAME
    `).catch(err => {
        console.error('[StaffRoute] Category breakdown query error:', err.message);
        return { recordset: [] };
    });

    // Map categories by employee
    const categoriesByEmp = {};
    for (const row of (catResult.recordset || [])) {
        if (!categoriesByEmp[row.EmpCode]) categoriesByEmp[row.EmpCode] = [];
        categoriesByEmp[row.EmpCode].push({
            category: row.Category,
            qty: Number(row.QtySold) || 0,
            sales: Math.round(Number(row.CategorySales) || 0)
        });
    }
    Object.keys(categoriesByEmp).forEach(code => {
        categoriesByEmp[code].sort((a, b) => b.sales - a.sales);
    });

    // 3. Process employees and calculate targets & commissions
    let totalStoreSales = 0;
    let totalItemsSold = 0;
    let totalBills = 0;

    const staffList = salesResult.recordset.map(row => {
        const empCode = row.EmpCode;
        const isUnassigned = empCode === '0000000';
        const override = (config.staffOverrides && config.staffOverrides[empCode]) || {};

        let displayName = row.EmpName || override.name || (isUnassigned ? 'Store Counter / Unassigned' : `Staff #${empCode}`);
        if (displayName.toUpperCase() === 'STORE COUNTER / UNASSIGNED') {
            displayName = 'Store Direct Billing';
        }

        const salesAmount = Math.round(Number(row.TotalSales) || 0);
        const items = Number(row.TotalItems) || 0;
        const bills = Number(row.BillCount) || 0;
        const aov = bills > 0 ? Math.round(salesAmount / bills) : 0;
        const upt = bills > 0 ? Number((items / bills).toFixed(1)) : 0;

        totalStoreSales += salesAmount;
        totalItemsSold += items;
        totalBills += bills;

        // Target calculation based on period
        let baseTarget = override.target || 100000;
        if (period === 'today' || period === 'yesterday') {
            baseTarget = Math.round(baseTarget / 30);
        } else if (period === 'this_week') {
            baseTarget = Math.round(baseTarget / 4);
        }

        const achievementPct = baseTarget > 0 ? Math.min(Math.round((salesAmount / baseTarget) * 100), 999) : 0;

        // Commission calculation
        const commRate = isUnassigned ? 0 : (override.commissionPct !== undefined ? override.commissionPct : config.defaultCommissionPct);
        let commission = isUnassigned ? 0 : Math.round((salesAmount * commRate) / 100);

        // Bonus if qualified
        let bonus = 0;
        if (!isUnassigned && config.bonusThreshold && salesAmount >= config.bonusThreshold && config.bonusCommissionPct) {
            bonus = Math.round((salesAmount * config.bonusCommissionPct) / 100);
        }

        return {
            empCode,
            name: displayName,
            isUnassigned,
            totalSales: salesAmount,
            totalItems: items,
            billCount: bills,
            aov,
            upt,
            targetAmount: baseTarget,
            achievementPct,
            commissionRate: commRate,
            commissionEarned: commission,
            bonusEarned: bonus,
            totalPayout: commission + bonus,
            lastSaleTime: row.LastSaleTime,
            topCategories: (categoriesByEmp[empCode] || []).slice(0, 4)
        };
    });

    // Sort named staff first by sales, then unassigned
    staffList.sort((a, b) => {
        if (a.isUnassigned && !b.isUnassigned) return 1;
        if (!a.isUnassigned && b.isUnassigned) return -1;
        return b.totalSales - a.totalSales;
    });

    // Assign rank badges to real staff members
    let rank = 1;
    staffList.forEach(s => {
        if (!s.isUnassigned) {
            s.rank = rank;
            if (rank === 1) s.badge = '🥇 Champion';
            else if (rank === 2) s.badge = '🥈 Top Performer';
            else if (rank === 3) s.badge = '🥉 Star Associate';
            else s.badge = `Rank #${rank}`;
            rank++;
        } else {
            s.rank = null;
            s.badge = 'Counter POS';
        }
    });

    const activeStaffCount = staffList.filter(s => !s.isUnassigned).length;
    const totalCommissionAccrued = staffList.reduce((acc, s) => acc + (s.isUnassigned ? 0 : s.totalPayout), 0);

    return {
        period,
        summary: {
            totalStoreSales,
            totalItemsSold,
            totalBills,
            activeStaffCount,
            totalCommissionAccrued,
            avgStoreBasketValue: totalBills > 0 ? Math.round(totalStoreSales / totalBills) : 0
        },
        staff: staffList,
        config: {
            defaultCommissionPct: config.defaultCommissionPct,
            printerConfig: config.printerConfig
        }
    };
}

// GET /api/staff/leaderboard
router.get('/leaderboard', async (req, res) => {
    const period = req.query.period || 'all_time';
    const config = loadStaffConfig();

    try {
        if (period === 'bundle') {
            const [today, yesterday, thisWeek, thisMonth, allTime, availableMonths] = await Promise.all([
                getLeaderboardForPeriod('today', config),
                getLeaderboardForPeriod('yesterday', config),
                getLeaderboardForPeriod('this_week', config),
                getLeaderboardForPeriod('this_month', config),
                getLeaderboardForPeriod('all_time', config),
                getAvailableMonths()
            ]);

            // Fetch each historical month in parallel
            const monthPeriods = {};
            const monthlyHistory = [];

            await Promise.all(availableMonths.map(async (m) => {
                const mData = await getLeaderboardForPeriod(m.key, config);
                monthPeriods[m.key] = mData;

                const rankedStaff = (mData.staff || []).filter(s => !s.isUnassigned);
                const champion = rankedStaff[0] || null;
                const totalCommission = rankedStaff.reduce((sum, s) => sum + (s.totalPayout || 0), 0);
                const staffSales = rankedStaff.reduce((sum, s) => sum + (s.totalSales || 0), 0);

                monthlyHistory.push({
                    monthKey: m.key,
                    label: m.label,
                    shortLabel: m.shortLabel,
                    grossSales: m.grossSales,
                    staffSales,
                    totalBills: m.totalBills,
                    totalQuantity: m.totalQuantity,
                    activeStaffCount: rankedStaff.length,
                    totalCommission,
                    champion: champion ? {
                        name: champion.name,
                        empCode: champion.empCode,
                        totalSales: champion.totalSales,
                        commission: champion.totalPayout,
                        bills: champion.billCount
                    } : null
                });
            }));

            // Sort monthly history descending by monthKey
            monthlyHistory.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

            return res.json({
                period: 'bundle',
                periods: {
                    today,
                    yesterday,
                    this_week: thisWeek,
                    this_month: thisMonth,
                    all_time: allTime,
                    ...monthPeriods
                },
                availableMonths,
                monthlyHistory,
                summary: allTime.summary,
                staff: allTime.staff,
                config: allTime.config
            });
        }

        const data = await getLeaderboardForPeriod(period, config);
        res.json(data);
    } catch (err) {
        console.error('[StaffRoute] Leaderboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/staff/months
router.get('/months', async (req, res) => {
    try {
        const availableMonths = await getAvailableMonths();
        res.json({ success: true, availableMonths });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
