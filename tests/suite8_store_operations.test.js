import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Suite 8: Store Operations (Alterations Desk, Holds 24h Expiry & GIT Parcels Tracking)', () => {

    describe('1. Alterations Desk Lifecycle & Overdue Calculations', () => {
        function evaluateAlterationStatus(item, todayStr = '2026-10-01') {
            const isCompleted = item.status === 'Completed' || item.status === 'Delivered';
            const isDueToday = item.expectedDate === todayStr && !isCompleted;
            const isOverdue = item.expectedDate && item.expectedDate < todayStr && !isCompleted;
            
            return {
                isCompleted,
                isDueToday,
                isOverdue,
                readyForPickup: item.status === 'Ready' || item.status === 'Completed'
            };
        }

        it('should correctly flag overdue alteration slips', () => {
            const slip = {
                id: 'ALT-101',
                customerName: 'Sanjay',
                category: 'Trousers',
                expectedDate: '2026-09-28', // Past date
                status: 'Tailoring'
            };

            const evalResult = evaluateAlterationStatus(slip, '2026-10-01');
            assert.equal(evalResult.isOverdue, true);
            assert.equal(evalResult.isDueToday, false);
            assert.equal(evalResult.isCompleted, false);
        });

        it('should correctly flag slips due today and ready for pickup', () => {
            const slip = {
                id: 'ALT-102',
                customerName: 'Amit',
                category: 'Blazer Sleeve',
                expectedDate: '2026-10-01',
                status: 'Ready'
            };

            const evalResult = evaluateAlterationStatus(slip, '2026-10-01');
            assert.equal(evalResult.isDueToday, true);
            assert.equal(evalResult.readyForPickup, true);
            assert.equal(evalResult.isOverdue, false);
        });

        it('should mark completed slips as non-overdue regardless of past expected date', () => {
            const slip = {
                id: 'ALT-103',
                expectedDate: '2026-09-20',
                status: 'Delivered'
            };

            const evalResult = evaluateAlterationStatus(slip, '2026-10-01');
            assert.equal(evalResult.isOverdue, false);
            assert.equal(evalResult.isCompleted, true);
        });
    });

    describe('2. Reservation Holds & 24-Hour Expiration Clock', () => {
        function checkHoldStatus(hold, currentTime) {
            const expiresAt = new Date(hold.expiresAt).getTime();
            const now = new Date(currentTime).getTime();
            const msLeft = expiresAt - now;

            if (msLeft <= 0) {
                return { status: 'expired', shouldNotifyReminder: false };
            }

            const minLeft = Math.floor(msLeft / 60000);
            const shouldNotifyReminder = !hold.reminderSent && minLeft <= 45 && minLeft > 5;

            return {
                status: 'active',
                minLeft,
                shouldNotifyReminder
            };
        }

        it('should mark active hold as expired when expiration timestamp has passed', () => {
            const hold = {
                id: 'hold_001',
                customerName: 'Rohan',
                articleName: 'Navy Suit',
                expiresAt: '2026-10-01T12:00:00Z',
                status: 'active'
            };

            const res = checkHoldStatus(hold, '2026-10-01T12:05:00Z'); // 5 mins late
            assert.equal(res.status, 'expired');
            assert.equal(res.shouldNotifyReminder, false);
        });

        it('should trigger courtesy reminder ping when 5 to 45 minutes remain', () => {
            const hold = {
                id: 'hold_002',
                customerName: 'Rohan',
                expiresAt: '2026-10-01T12:30:00Z',
                reminderSent: false,
                status: 'active'
            };

            // Checking at 12:00 (30 mins left)
            const res = checkHoldStatus(hold, '2026-10-01T12:00:00Z');
            assert.equal(res.status, 'active');
            assert.equal(res.minLeft, 30);
            assert.equal(res.shouldNotifyReminder, true);
        });

        it('should not duplicate reminder if already marked reminderSent', () => {
            const hold = {
                id: 'hold_003',
                customerName: 'Rohan',
                expiresAt: '2026-10-01T12:30:00Z',
                reminderSent: true, // Already sent
                status: 'active'
            };

            const res = checkHoldStatus(hold, '2026-10-01T12:00:00Z');
            assert.equal(res.shouldNotifyReminder, false);
        });
    });

    describe('3. Goods In Transit (GIT) Status & Discrepancy Detection', () => {
        function resolveParcelStatus(parcel, currentDateStr = '2026-10-01') {
            const totalQty = Number(parcel.total_quantity || 0);
            const grnQty = Number(parcel.total_grn_qty || 0);
            const memoDateStr = parcel.parcel_memo_dt ? parcel.parcel_memo_dt.split('T')[0] : '';

            let status = 'In Transit';
            if (grnQty >= totalQty && totalQty > 0) {
                status = 'Received';
            } else if (memoDateStr === currentDateStr) {
                status = 'Arrived Today';
            }

            const discrepancy = totalQty - grnQty;
            const hasShortage = totalQty > 0 && grnQty < totalQty && status === 'Received';

            return { status, totalQty, grnQty, discrepancy, hasShortage };
        }

        it('should resolve parcel as Received when GRN quantity matches or exceeds total', () => {
            const parcel = {
                parcel_memo_no: 'PM-909',
                total_quantity: 48,
                total_grn_qty: 48,
                parcel_memo_dt: '2026-09-29T10:00:00Z'
            };

            const res = resolveParcelStatus(parcel);
            assert.equal(res.status, 'Received');
            assert.equal(res.discrepancy, 0);
        });

        it('should detect quantity discrepancy when received count is short', () => {
            const parcel = {
                parcel_memo_no: 'PM-910',
                total_quantity: 50,
                total_grn_qty: 46, // 4 items missing!
                parcel_memo_dt: '2026-09-30T10:00:00Z'
            };

            const res = resolveParcelStatus(parcel);
            assert.equal(res.discrepancy, 4);
        });

        it('should mark shipment as Arrived Today if memo date matches current date', () => {
            const parcel = {
                parcel_memo_no: 'PM-911',
                total_quantity: 120,
                total_grn_qty: 0,
                parcel_memo_dt: '2026-10-01T08:30:00Z'
            };

            const res = resolveParcelStatus(parcel, '2026-10-01');
            assert.equal(res.status, 'Arrived Today');
        });
    });

    describe('4. Physical Rack Inventory Audit & Cycle Count Variance Engine', () => {
        function computeRackAuditMetrics({ expectedItems = [], scannedBarcodes = [], allInventoryMap = {} }) {
            const expectedMap = new Map();
            for (const item of expectedItems) {
                expectedMap.set(String(item.barcode).trim().toUpperCase(), item);
            }

            const verifiedMatches = [];
            const surpriseItems = [];
            const scannedCountMap = new Map();

            for (const code of scannedBarcodes) {
                const upper = String(code).trim().toUpperCase();
                scannedCountMap.set(upper, (scannedCountMap.get(upper) || 0) + 1);

                if (expectedMap.has(upper)) {
                    if (scannedCountMap.get(upper) === 1) {
                        verifiedMatches.push(expectedMap.get(upper));
                    }
                } else {
                    const lookup = allInventoryMap[upper] || { barcode: upper, sectionName: 'UNKNOWN', subSectionName: 'UNKNOWN' };
                    surpriseItems.push(lookup);
                }
            }

            const missingItems = expectedItems.filter(item => !scannedCountMap.has(String(item.barcode).trim().toUpperCase()));
            const totalExpected = expectedItems.reduce((s, r) => s + (r.expectedQty || 1), 0);
            const verifiedCount = verifiedMatches.length;
            const accuracyPct = totalExpected === 0 ? 100 : Math.round((Math.min(verifiedCount, totalExpected) / totalExpected) * 100);

            return {
                totalExpected,
                verifiedCount,
                missingCount: missingItems.length,
                surpriseCount: surpriseItems.length,
                accuracyPct,
                missingItems,
                surpriseItems,
                verifiedMatches
            };
        }

        it('should correctly calculate expected: 48, scanned: 46, missing: 2, surprise: 1 with 96% accuracy', () => {
            const expectedItems = [];
            for (let i = 1; i <= 48; i++) {
                expectedItems.push({
                    barcode: `008229${1000 + i}`,
                    articleNo: `FSRF${1000 + i}`,
                    itemName: "Men's Formal Shirt",
                    mrp: 2499,
                    expectedQty: 1
                });
            }

            // Staff scans 46 out of 48 expected items
            const scannedBarcodes = expectedItems.slice(0, 46).map(item => item.barcode);

            // PLUS 1 surprise garment found on this rack from Men's Denim
            scannedBarcodes.push('0099999999');
            const allInventoryMap = {
                '0099999999': {
                    barcode: '0099999999',
                    articleNo: 'DNM01',
                    itemName: "Men's Denim Slim Fit",
                    sectionName: 'MENSWEAR',
                    subSectionName: 'DENIM',
                    mrp: 3199
                }
            };

            const metrics = computeRackAuditMetrics({ expectedItems, scannedBarcodes, allInventoryMap });

            assert.equal(metrics.totalExpected, 48);
            assert.equal(metrics.verifiedCount, 46);
            assert.equal(metrics.missingCount, 2);
            assert.equal(metrics.surpriseCount, 1);
            assert.equal(metrics.accuracyPct, 96);
            assert.equal(metrics.missingItems[0].barcode, expectedItems[46].barcode);
            assert.equal(metrics.missingItems[1].barcode, expectedItems[47].barcode);
            assert.equal(metrics.surpriseItems[0].subSectionName, 'DENIM');
        });
    });
});
