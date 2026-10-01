const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql } = require('../db');

const CONFIG_FILE = path.join(__dirname, '..', 'staff_config.json');
const DAILY_DATA_FILE = path.join(__dirname, '..', 'staff_daily_history.json');

const DEFAULT_STAFF_TARGET = 400000;

function loadStaffConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            const defaultConfig = {
                monthlyStoreTarget: DEFAULT_STAFF_TARGET,
                staffTarget: DEFAULT_STAFF_TARGET,
                dailyStoreTarget: 13333,
                defaultCommissionPct: 1.0,
                incentiveSlabs: {
                    tier1: { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
                    tier2: { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
                    tier3: { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
                },
                bonusThreshold: 400000,
                bonusCommissionPct: 0,
                printerConfig: {
                    paperWidth: "80mm",
                    storeName: "COBB APPARELS",
                    address: "Fatehpur Road, Pundri",
                    phone: "+91 91381 22820",
                    gstin: "06AABCC1234F1Z5",
                    footerNote: "Thank you for shopping at Cobb! Exchanges accepted within 7 days with tag intact."
                },
                staffOverrides: {
                    "2800003": { name: "Vikas", target: DEFAULT_STAFF_TARGET },
                    "3200014": { name: "Pawan", target: DEFAULT_STAFF_TARGET },
                    "0001001": { name: "Simran", target: DEFAULT_STAFF_TARGET },
                    "0000180": { name: "Akhil", target: DEFAULT_STAFF_TARGET }
                }
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
        console.error('[StaffRoute] Error loading config:', e.message);
        return {
            monthlyStoreTarget: DEFAULT_STAFF_TARGET,
            staffTarget: DEFAULT_STAFF_TARGET,
            defaultCommissionPct: 1.0,
            staffOverrides: {}
        };
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

function loadStaffDailyHistory() {
    try {
        if (fs.existsSync(DAILY_DATA_FILE)) {
            const raw = fs.readFileSync(DAILY_DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('[StaffRoute] Error reading daily history file:', e.message);
    }
    return [];
}

function saveStaffDailyHistory(history) {
    try {
        fs.writeFileSync(DAILY_DATA_FILE, JSON.stringify(history, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[StaffRoute] Error saving daily history file:', e.message);
        return false;
    }
}

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const shortMonthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Calculates incentive rate and commission earned based on target and sales:
 * - Target = 400,000 (or period-scaled target)
 * - Sales >= 400,000 (or >= 100% of target) => 1.0%
 * - Sales >= 300,000 (or >= 75% of target)  => 0.75%
 * - Sales <= 200,000 (or < 75% of target)   => 0.5%
 */
function calculateIncentiveTier(salesAmount, baseTarget = DEFAULT_STAFF_TARGET) {
    const target = baseTarget || DEFAULT_STAFF_TARGET;
    const tier1Threshold = target;                     // 400,000 (100%)
    const tier2Threshold = Math.round(target * 0.75); // 300,000 (75%)
    const tier3Threshold = Math.round(target * 0.50); // 200,000 (50%)

    let rate = 0.5;
    let slabLabel = '≤ 2L (0.5%)';
    let tierCode = 'tier3';

    if (salesAmount >= tier1Threshold) {
        rate = 1.0;
        slabLabel = '≥ 4L (1.0%)';
        tierCode = 'tier1';
    } else if (salesAmount >= tier2Threshold) {
        rate = 0.75;
        slabLabel = '≥ 3L (0.75%)';
        tierCode = 'tier2';
    } else {
        rate = 0.5;
        slabLabel = '≤ 2L (0.5%)';
        tierCode = 'tier3';
    }

    const commission = Math.round((salesAmount * rate) / 100);

    return {
        rate,
        slabLabel,
        tierCode,
        commission,
        tier1Threshold,
        tier2Threshold,
        tier3Threshold
    };
}

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
            shortLabel: `${shortMonthNames[Number(r.Month) - 1]} '${String(r.Year).slice(2)}`,
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

    // Support exact date: YYYY-MM-DD (e.g. '2026-10-01')
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        return `m.CM_TIME >= CAST('${period}' AS DATE) AND m.CM_TIME < DATEADD(day, 1, CAST('${period}' AS DATE))`;
    }

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

// POST /api/staff/set-name - Assign or update salesman name for employee code
router.post('/set-name', async (req, res) => {
    try {
        const { empCode, name, target } = req.body || {};
        if (!empCode || !name || !name.trim()) {
            return res.status(400).json({ error: 'empCode and a non-empty name are required' });
        }
        const cleanCode = String(empCode).trim();
        const cleanName = String(name).trim();

        const config = loadStaffConfig();
        if (!config.staffOverrides) config.staffOverrides = {};

        config.staffOverrides[cleanCode] = {
            ...(config.staffOverrides[cleanCode] || {}),
            name: cleanName,
            target: (target !== undefined && target !== null && !isNaN(Number(target))) 
                ? Number(target) 
                : (config.staffOverrides[cleanCode]?.target || config.staffTarget || DEFAULT_STAFF_TARGET)
        };

        saveStaffConfig(config);

        // Also attempt SQL database update in EMPLOYEE table if reachable
        try {
            const escapedName = cleanName.replace(/'/g, "''");
            await sql.query(`
                IF EXISTS (SELECT 1 FROM EMPLOYEE WHERE RTRIM(emp_code) = '${cleanCode}')
                    UPDATE EMPLOYEE SET emp_name = '${escapedName}' WHERE RTRIM(emp_code) = '${cleanCode}';
                ELSE
                    INSERT INTO EMPLOYEE (emp_code, emp_name) VALUES ('${cleanCode}', '${escapedName}');
            `);
            console.log(`[StaffRoute] Updated SQL EMPLOYEE record for ${cleanCode} -> ${cleanName}`);
        } catch (sqlErr) {
            console.warn('[StaffRoute] SQL Employee update note:', sqlErr.message);
        }

        // Re-generate day-to-day data with updated salesman names
        try {
            await getDailyStaffHistory(config);
        } catch (e) {}

        res.json({
            success: true,
            empCode: cleanCode,
            name: cleanName,
            config
        });
    } catch (err) {
        console.error('[StaffRoute] /set-name error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/staff/override/:empCode - Remove a staff name override
router.delete('/override/:empCode', (req, res) => {
    try {
        const { empCode } = req.params;
        const cleanCode = String(empCode).trim();
        const config = loadStaffConfig();
        if (config.staffOverrides && config.staffOverrides[cleanCode]) {
            delete config.staffOverrides[cleanCode];
            saveStaffConfig(config);
        }
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function getLeaderboardForPeriod(period, config) {
    const dateClause = getDateClause(period);
    const isSpecificDate = /^\d{4}-\d{2}-\d{2}$/.test(period);

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

        const hasCustomOverride = Boolean(override.name && override.name.trim());
        const hasDbName = Boolean(row.EmpName && row.EmpName.trim() && !row.EmpName.trim().startsWith('Staff #'));
        const isMissingName = !hasCustomOverride && !hasDbName;

        let displayName = hasCustomOverride 
            ? override.name.trim() 
            : (hasDbName ? row.EmpName.trim() : (isUnassigned ? 'Store Direct Billing' : `Staff #${empCode}`));
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

        // Base target: default 400,000 monthly
        let baseTarget = override.target || config.staffTarget || config.monthlyStoreTarget || DEFAULT_STAFF_TARGET;
        if (period === 'today' || period === 'yesterday' || isSpecificDate) {
            baseTarget = Math.round(baseTarget / 30);
        } else if (period === 'this_week') {
            baseTarget = Math.round(baseTarget / 4);
        }

        const achievementPct = baseTarget > 0 ? Math.min(Math.round((salesAmount / baseTarget) * 100), 999) : 0;

        // Incentive calculation using tiered slab logic (1% for >= 400k, 0.75% for >= 300k, 0.5% for <= 200k)
        let commRate = 0;
        let slabLabel = 'POS Counter';
        let commission = 0;

        if (!isUnassigned) {
            const tierResult = calculateIncentiveTier(salesAmount, baseTarget);
            commRate = tierResult.rate;
            slabLabel = tierResult.slabLabel;
            commission = tierResult.commission;
        }

        return {
            empCode,
            name: displayName,
            isUnassigned,
            isMissingName,
            hasCustomOverride,
            totalSales: salesAmount,
            totalItems: items,
            billCount: bills,
            aov,
            upt,
            targetAmount: baseTarget,
            achievementPct,
            commissionRate: commRate,
            commissionEarned: commission,
            incentiveSlab: slabLabel,
            bonusEarned: 0,
            totalPayout: commission,
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
            defaultCommissionPct: config.defaultCommissionPct || 1.0,
            monthlyStoreTarget: config.monthlyStoreTarget || DEFAULT_STAFF_TARGET,
            staffTarget: config.staffTarget || DEFAULT_STAFF_TARGET,
            incentiveSlabs: config.incentiveSlabs || {
                tier1: { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
                tier2: { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
                tier3: { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
            },
            printerConfig: config.printerConfig
        }
    };
}

/**
 * Fetch and build comprehensive day-to-day staff sales history
 */
async function getDailyStaffHistory(config) {
    try {
        const dailyResult = await sql.query(`
            SELECT 
                CONVERT(varchar(10), m.CM_TIME, 120) as DateKey,
                YEAR(m.CM_TIME) as Year,
                MONTH(m.CM_TIME) as Month,
                DAY(m.CM_TIME) as Day,
                DATENAME(weekday, m.CM_TIME) as DayOfWeek,
                ISNULL(NULLIF(RTRIM(d.emp_code), ''), '0000000') as EmpCode,
                ISNULL(NULLIF(RTRIM(e.emp_name), ''), '') as EmpName,
                COUNT(DISTINCT d.CM_ID) as BillCount,
                SUM(d.QUANTITY) as TotalItems,
                ISNULL(SUM(d.NET), 0) as TotalSales
            FROM CMD01106 d WITH (NOLOCK)
            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
            LEFT JOIN EMPLOYEE e WITH (NOLOCK) ON d.emp_code = e.emp_code
            WHERE m.CANCELLED = 0 AND d.QUANTITY > 0
            GROUP BY 
                CONVERT(varchar(10), m.CM_TIME, 120),
                YEAR(m.CM_TIME),
                MONTH(m.CM_TIME),
                DAY(m.CM_TIME),
                DATENAME(weekday, m.CM_TIME),
                d.emp_code,
                e.emp_name
            ORDER BY DateKey DESC, TotalSales DESC
        `);

        // Group rows by DateKey
        const dailyMap = {};
        const dailyTarget = Math.round((config.staffTarget || DEFAULT_STAFF_TARGET) / 30);

        for (const row of (dailyResult.recordset || [])) {
            const dateKey = row.DateKey;
            if (!dailyMap[dateKey]) {
                const dayNum = Number(row.Day);
                const monthNum = Number(row.Month);
                const yearNum = Number(row.Year);
                const monthShort = shortMonthNames[monthNum - 1] || '';
                const formattedDate = `${String(dayNum).padStart(2, '0')} ${monthShort} ${yearNum}`;

                dailyMap[dateKey] = {
                    date: dateKey,
                    year: yearNum,
                    month: monthNum,
                    day: dayNum,
                    dayOfWeek: row.DayOfWeek,
                    formattedDate,
                    storeGrossSales: 0,
                    storeTotalBills: 0,
                    storeTotalItems: 0,
                    staffSales: 0,
                    totalCommission: 0,
                    activeStaffCount: 0,
                    staff: []
                };
            }

            const empCode = row.EmpCode;
            const isUnassigned = empCode === '0000000';
            const override = (config.staffOverrides && config.staffOverrides[empCode]) || {};
            const hasCustomOverride = Boolean(override.name && override.name.trim());
            const hasDbName = Boolean(row.EmpName && row.EmpName.trim() && !row.EmpName.trim().startsWith('Staff #'));
            const isMissingName = !hasCustomOverride && !hasDbName;

            let displayName = hasCustomOverride 
                ? override.name.trim() 
                : (hasDbName ? row.EmpName.trim() : (isUnassigned ? 'Store Direct Billing' : `Staff #${empCode}`));
            if (displayName.toUpperCase() === 'STORE COUNTER / UNASSIGNED') {
                displayName = 'Store Direct Billing';
            }

            const salesAmount = Math.round(Number(row.TotalSales) || 0);
            const items = Number(row.TotalItems) || 0;
            const bills = Number(row.BillCount) || 0;
            const aov = bills > 0 ? Math.round(salesAmount / bills) : 0;
            const upt = bills > 0 ? Number((items / bills).toFixed(1)) : 0;

            let commRate = 0;
            let commission = 0;
            let slabLabel = 'POS Counter';

            if (!isUnassigned) {
                const tierResult = calculateIncentiveTier(salesAmount, dailyTarget);
                commRate = tierResult.rate;
                commission = tierResult.commission;
                slabLabel = tierResult.slabLabel;
            }

            const dayObj = dailyMap[dateKey];
            dayObj.storeGrossSales += salesAmount;
            dayObj.storeTotalBills += bills;
            dayObj.storeTotalItems += items;

            if (!isUnassigned) {
                dayObj.staffSales += salesAmount;
                dayObj.totalCommission += commission;
            }

            dayObj.staff.push({
                empCode,
                name: displayName,
                isUnassigned,
                isMissingName,
                hasCustomOverride,
                sales: salesAmount,
                items,
                bills,
                aov,
                upt,
                commissionRate: commRate,
                commission,
                slabLabel
            });
        }

        // Process and finalize each day
        const dailyHistory = Object.values(dailyMap).map(day => {
            // Sort staff by sales descending (named first)
            day.staff.sort((a, b) => {
                if (a.isUnassigned && !b.isUnassigned) return 1;
                if (!a.isUnassigned && b.isUnassigned) return -1;
                return b.sales - a.sales;
            });

            const namedStaff = day.staff.filter(s => !s.isUnassigned);
            day.activeStaffCount = namedStaff.length;

            let rank = 1;
            namedStaff.forEach(s => {
                s.rank = rank;
                rank++;
            });

            const champion = namedStaff[0] || null;
            day.topStaff = champion ? {
                empCode: champion.empCode,
                name: champion.name,
                sales: champion.sales,
                bills: champion.bills,
                items: champion.items,
                commission: champion.commission,
                commissionRate: champion.commissionRate,
                slabLabel: champion.slabLabel
            } : null;

            return day;
        });

        // Sort descending by date
        dailyHistory.sort((a, b) => b.date.localeCompare(a.date));

        // Save day-to-day data to local persistent JSON file
        saveStaffDailyHistory(dailyHistory);

        return dailyHistory;
    } catch (e) {
        console.error('[StaffRoute] Error querying daily staff history:', e.message);
        // Fallback to cached daily history file if available
        return loadStaffDailyHistory();
    }
}

// GET /api/staff/daily - Day-to-day data endpoint
router.get('/daily', async (req, res) => {
    try {
        const config = loadStaffConfig();
        const dailyHistory = await getDailyStaffHistory(config);
        res.json({
            success: true,
            totalDays: dailyHistory.length,
            dailyTarget: Math.round((config.staffTarget || DEFAULT_STAFF_TARGET) / 30),
            incentiveRules: {
                monthlyTarget: config.staffTarget || DEFAULT_STAFF_TARGET,
                slabs: [
                    { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
                    { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
                    { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
                ]
            },
            dailyHistory
        });
    } catch (e) {
        console.error('[StaffRoute] /daily error:', e);
        const cached = loadStaffDailyHistory();
        res.json({ success: true, totalDays: cached.length, dailyHistory: cached, fromCache: true });
    }
});

// POST /api/staff/daily/save - Explicitly save day-to-day data
router.post('/daily/save', async (req, res) => {
    try {
        const config = loadStaffConfig();
        const incomingData = req.body?.dailyHistory;
        let dataToSave = incomingData;

        if (!dataToSave || !Array.isArray(dataToSave) || dataToSave.length === 0) {
            dataToSave = await getDailyStaffHistory(config);
        }

        const saved = saveStaffDailyHistory(dataToSave);
        if (saved) {
            res.json({ success: true, message: 'Day-to-day data saved successfully', count: dataToSave.length });
        } else {
            res.status(500).json({ error: 'Failed to write day-to-day history file' });
        }
    } catch (e) {
        console.error('[StaffRoute] /daily/save error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/staff/leaderboard
router.get('/leaderboard', async (req, res) => {
    const period = req.query.period || 'all_time';
    const config = loadStaffConfig();

    try {
        if (period === 'bundle') {
            const [today, yesterday, thisWeek, thisMonth, allTime, availableMonths, dailyHistory] = await Promise.all([
                getLeaderboardForPeriod('today', config),
                getLeaderboardForPeriod('yesterday', config),
                getLeaderboardForPeriod('this_week', config),
                getLeaderboardForPeriod('this_month', config),
                getLeaderboardForPeriod('all_time', config),
                getAvailableMonths(),
                getDailyStaffHistory(config)
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
                        commissionRate: champion.commissionRate,
                        incentiveSlab: champion.incentiveSlab,
                        bills: champion.billCount
                    } : null
                });
            }));

            // Sort monthly history descending by monthKey
            monthlyHistory.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

            // Available exact dates list for instant date-picker switching
            const availableDates = dailyHistory.map(d => ({
                key: d.date,
                label: d.formattedDate,
                dayOfWeek: d.dayOfWeek,
                grossSales: d.storeGrossSales,
                staffSales: d.staffSales,
                totalBills: d.storeTotalBills,
                totalCommission: d.totalCommission,
                champion: d.topStaff ? d.topStaff.name : null
            }));

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
                dailyHistory,
                availableDates,
                summary: allTime.summary,
                staff: allTime.staff,
                config: allTime.config,
                incentiveRules: {
                    target: config.staffTarget || DEFAULT_STAFF_TARGET,
                    slabs: [
                        { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
                        { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
                        { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
                    ]
                }
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
