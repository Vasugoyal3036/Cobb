const express = require('express');
const router = express.Router();
const { sql } = require('../db');

// GET /api/parcels/transit
router.get('/transit', async (req, res) => {
    try {
        // Query mirrored incoming parcels from Head Office / Central Warehouse
        let mirrorParcels = [];
        try {
            const mirrorResult = await sql.query(`
                SELECT 
                    m.parcel_memo_no,
                    m.parcel_memo_id,
                    m.parcel_memo_dt,
                    m.dept_id,
                    m.vehicle_no,
                    m.bilty_no,
                    ISNULL(m.TOT_QUANTITY, 0) as total_quantity,
                    ISNULL(m.TOT_BOXES, 1) as total_boxes,
                    ISNULL(m.TOT_WEIGHT, 0) as total_weight,
                    m.XN_NO_LIST as challan_no,
                    m.DOCWSL_MEMO_ID as docwsl_memo_id,
                    ISNULL(d.PARTY_INV_AMT, 0) as invoice_amount,
                    d.PARTY_INV_NO as invoice_no,
                    d.closed,
                    ISNULL(d.total_grn_qty, 0) as total_grn_qty,
                    m.last_update,
                    'WH' as origin,
                    'Head Office Central WH' as origin_name,
                    CASE 
                        WHEN ISNULL(d.total_grn_qty, 0) >= ISNULL(m.TOT_QUANTITY, 0) AND ISNULL(m.TOT_QUANTITY, 0) > 0 THEN 'Received'
                        WHEN CAST(m.parcel_memo_dt AS DATE) = CAST(GETDATE() AS DATE) THEN 'Arrived Today'
                        WHEN DATEDIFF(day, m.parcel_memo_dt, GETDATE()) <= 2 THEN 'In Transit'
                        ELSE 'Delivered'
                    END as status
                FROM DOCWSL_parcel_mst_MIRROR m WITH (NOLOCK)
                LEFT JOIN DOCWSL_parcel_det_MIRROR d WITH (NOLOCK) ON m.parcel_memo_id = d.parcel_memo_id
                ORDER BY m.parcel_memo_dt DESC, m.last_update DESC
            `);
            mirrorParcels = mirrorResult.recordset || [];
        } catch (e) {
            console.warn('[ParcelsRoute] Mirror query warning:', e.message);
        }

        // Query historical / store parcel ledger
        let localParcels = [];
        try {
            const localResult = await sql.query(`
                SELECT TOP 30
                    m.parcel_memo_no,
                    m.parcel_memo_id,
                    m.parcel_memo_dt,
                    m.dept_id,
                    m.vehicle_no,
                    m.bilty_no,
                    ISNULL(m.TOT_QUANTITY, 0) as total_quantity,
                    ISNULL(m.TOT_BOXES, 1) as total_boxes,
                    ISNULL(m.TOT_WEIGHT, 0) as total_weight,
                    m.XN_NO_LIST as challan_no,
                    ISNULL(d.PARTY_INV_AMT, 0) as invoice_amount,
                    d.PARTY_INV_NO as invoice_no,
                    d.closed,
                    ISNULL(d.total_grn_qty, 0) as total_grn_qty,
                    m.last_update,
                    m.dept_id as origin,
                    CASE 
                        WHEN m.dept_id = 'WH' THEN 'Head Office Central WH'
                        WHEN m.dept_id = 'CG' THEN 'Cobb Chandigarh'
                        WHEN m.dept_id = '78' THEN 'Cobb Sector 78'
                        WHEN m.dept_id = 'I5' THEN 'Cobb Indirapuram'
                        WHEN m.dept_id = 'Z1' THEN 'Cobb Zirakpur'
                        ELSE CONCAT('Store ', ISNULL(m.dept_id, 'HO'))
                    END as origin_name,
                    'Received' as status
                FROM PARCEL_MST m WITH (NOLOCK)
                LEFT JOIN PARCEL_DET d WITH (NOLOCK) ON m.parcel_memo_id = d.parcel_memo_id
                ORDER BY m.parcel_memo_dt DESC, m.last_update DESC
            `);
            localParcels = localResult.recordset || [];
        } catch (e) {
            console.warn('[ParcelsRoute] Local parcel query warning:', e.message);
        }

        // Combine deduplicated parcels
        const seenMemos = new Set();
        const combined = [];

        for (const p of mirrorParcels) {
            if (p.parcel_memo_no && !seenMemos.has(p.parcel_memo_no)) {
                seenMemos.add(p.parcel_memo_no);
                combined.push(p);
            }
        }

        for (const p of localParcels) {
            if (p.parcel_memo_no && !seenMemos.has(p.parcel_memo_no)) {
                seenMemos.add(p.parcel_memo_no);
                combined.push(p);
            }
        }

        // Compute summary metrics
        const activeInTransit = combined.filter(p => p.status === 'In Transit' || p.status === 'Arrived Today');
        const latestParcel = combined[0] || null;

        // Current month's parcels
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthParcels = combined.filter(p => {
            if (!p.parcel_memo_dt) return false;
            const d = new Date(p.parcel_memo_dt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const monthPieces = thisMonthParcels.reduce((sum, p) => sum + (p.total_quantity || 0), 0);
        const monthValue = thisMonthParcels.reduce((sum, p) => sum + (p.invoice_amount || 0), 0);

        res.json({
            success: true,
            activeInTransit,
            allParcels: combined,
            summary: {
                incomingCount: activeInTransit.length,
                incomingPieces: activeInTransit.reduce((sum, p) => sum + (p.total_quantity || 0), 0),
                incomingValue: activeInTransit.reduce((sum, p) => sum + (p.invoice_amount || 0), 0),
                monthPieces,
                monthValue,
                monthParcelsCount: thisMonthParcels.length,
                latestParcel
            }
        });
    } catch (err) {
        console.error('[ParcelsRoute] Fatal error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/parcels/items?invId=...
router.get('/items', async (req, res) => {
    try {
        const { invId } = req.query;
        if (!invId) {
            return res.status(400).json({ success: false, error: 'invId query parameter is required' });
        }

        const itemsResult = await sql.query(`
            SELECT TOP 50
                PRODUCT_CODE,
                QUANTITY,
                mrp,
                RATE,
                net_rate,
                hsn_code,
                xn_value_with_gst,
                ROW_ID
            FROM docwsl_ind01106_mirror WITH (NOLOCK)
            WHERE INV_ID = '${invId}' OR INV_ID LIKE '%${invId}%'
        `);

        res.json({
            success: true,
            items: itemsResult.recordset || []
        });
    } catch (err) {
        console.error('[ParcelsRoute] Items fetch error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
