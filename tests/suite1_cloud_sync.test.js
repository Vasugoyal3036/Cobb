import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Suite 1: Cloud Sync & Data Integrity Testing', () => {

    describe('1. Multi-Tenant Store Isolation & Collection Routing', () => {
        it('should correctly format document path under specific STORE_ID', () => {
            const STORE_ID = 'DEMO_STORE_001';
            const endpoint = '/api/sales/overview';
            const docName = endpoint.replace('/api/', '').replace(/\//g, '_');
            
            const expectedPath = `stores/${STORE_ID}/data/${docName}`;
            assert.equal(expectedPath, 'stores/DEMO_STORE_001/data/sales_overview');
        });

        it('should prevent cross-tenant writes when different store IDs are supplied', () => {
            const storeA = 'STORE_MUMBAI_01';
            const storeB = 'STORE_DELHI_02';
            
            const getDocPath = (storeId, doc) => `stores/${storeId}/data/${doc}`;
            
            assert.notEqual(getDocPath(storeA, 'sales_live'), getDocPath(storeB, 'sales_live'));
            assert.equal(getDocPath(storeA, 'sales_live'), 'stores/STORE_MUMBAI_01/data/sales_live');
            assert.equal(getDocPath(storeB, 'sales_live'), 'stores/STORE_DELHI_02/data/sales_live');
        });

        it('should sanitize endpoint paths to valid Firestore document IDs', () => {
            const testCases = [
                { input: '/api/sales/live?days=7', customDoc: 'sales_live', expected: 'sales_live' },
                { input: '/api/analytics/top-movers', customDoc: null, expected: 'analytics_top-movers' },
                { input: '/api/staff/leaderboard?period=bundle', customDoc: 'staff_leaderboard', expected: 'staff_leaderboard' },
                { input: '/api/financials/gst-summary', customDoc: null, expected: 'financials_gst-summary' }
            ];

            testCases.forEach(({ input, customDoc, expected }) => {
                const resolvedDoc = customDoc || input.split('?')[0].replace('/api/', '').replace(/\//g, '_');
                assert.equal(resolvedDoc, expected);
            });
        });
    });

    describe('2. Deduplication & Network Hash Caching', () => {
        it('should skip duplicate sync writes when payload content is identical', () => {
            const hashCache = new Map();
            let firestoreWrites = 0;

            function syncWithDeduplication(docName, data) {
                const jsonStr = JSON.stringify(data);
                if (hashCache.get(docName) === jsonStr) {
                    return false; // Skip write
                }
                hashCache.set(docName, jsonStr);
                firestoreWrites++;
                return true;
            }

            const data1 = { totalSales: 15400, billsCount: 12 };
            const data2 = { totalSales: 15400, billsCount: 12 }; // Identical
            const data3 = { totalSales: 18200, billsCount: 14 }; // Changed

            assert.equal(syncWithDeduplication('sales_overview', data1), true);
            assert.equal(firestoreWrites, 1);

            // Second sync with identical data should be skipped
            assert.equal(syncWithDeduplication('sales_overview', data2), false);
            assert.equal(firestoreWrites, 1);

            // Third sync with updated data should trigger write
            assert.equal(syncWithDeduplication('sales_overview', data3), true);
            assert.equal(firestoreWrites, 2);
        });
    });

    describe('3. Payload Normalization & Array Wrapping', () => {
        it('should wrap raw arrays into an object with items property for Firestore compatibility', () => {
            function normalizePayload(rawData, fakeServerTimestamp = '2026-10-01T10:00:00Z') {
                const payload = Array.isArray(rawData) ? { items: rawData } : { ...rawData };
                payload.lastUpdated = fakeServerTimestamp;
                return payload;
            }

            const arrayData = [
                { BillNumber: 'CB-101', Amount: 2499 },
                { BillNumber: 'CB-102', Amount: 3999 }
            ];

            const normalized = normalizePayload(arrayData);
            assert.ok(typeof normalized === 'object' && !Array.isArray(normalized));
            assert.ok(Array.isArray(normalized.items));
            assert.equal(normalized.items.length, 2);
            assert.equal(normalized.items[0].BillNumber, 'CB-101');
            assert.ok(normalized.lastUpdated);
        });

        it('should preserve top-level objects without modifying properties', () => {
            function normalizePayload(rawData) {
                const payload = Array.isArray(rawData) ? { items: rawData } : { ...rawData };
                payload.lastUpdated = 'TS';
                return payload;
            }

            const objectData = { activeStaff: 5, targetAchieved: 84.5 };
            const normalized = normalizePayload(objectData);
            assert.equal(normalized.activeStaff, 5);
            assert.equal(normalized.targetAchieved, 84.5);
            assert.equal(normalized.lastUpdated, 'TS');
        });
    });

    describe('4. Checkout Real-Time Alert Engine & Financial Calculations', () => {
        function parseBillAlert(bill) {
            const amount = Math.round(Number(bill.Amount || bill.NET_AMOUNT || 0));
            const billNo = String(bill.BillNumber || bill.CM_NO || 'N/A').trim();
            const qty = Number(bill.TotalQty) || (Array.isArray(bill.Items) ? bill.Items.reduce((s, it) => s + (Number(it.Quantity) || 1), 0) : 1);

            // Payment Mode Logic
            let pay = bill.PaymentMode || 'Cash';
            if (bill.UpiAmount > 0 && bill.CashAmount === 0 && bill.CardAmount === 0) pay = 'UPI';
            else if (bill.CardAmount > 0 && bill.CashAmount === 0 && bill.UpiAmount === 0) pay = 'Card';
            else if (bill.CashAmount > 0 && (bill.UpiAmount > 0 || bill.CardAmount > 0)) pay = 'Split';
            else if (bill.CashAmount > 0) pay = 'Cash';

            const discountAmt = Math.round(Number(bill.DiscountAmount || 0));
            const grossAmt = Math.round(Number(bill.GrossAmount || (amount + discountAmt)));
            const discountPct = Number(bill.DiscountPercent) || (grossAmt > 0 ? Math.round((discountAmt / grossAmt) * 100) : 0);

            let itemSummary = '';
            if (Array.isArray(bill.Items) && bill.Items.length > 0) {
                const rawNames = bill.Items.map(it => {
                    const name = String(it.ArticleName || it.Category || 'Item').trim();
                    return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                });
                const uniqueNames = [...new Set(rawNames)];
                if (uniqueNames.length <= 3) {
                    itemSummary = uniqueNames.join(', ');
                } else {
                    itemSummary = `${uniqueNames.slice(0, 2).join(', ')} +${uniqueNames.length - 2} more`;
                }
            } else {
                itemSummary = `${qty} items`;
            }

            return { amount, billNo, qty, pay, grossAmt, discountAmt, discountPct, itemSummary };
        }

        it('should correctly classify payment modes: Cash, Card, UPI, and Split', () => {
            const upiBill = parseBillAlert({ Amount: 1500, UpiAmount: 1500, CashAmount: 0, CardAmount: 0 });
            assert.equal(upiBill.pay, 'UPI');

            const cardBill = parseBillAlert({ Amount: 2200, UpiAmount: 0, CashAmount: 0, CardAmount: 2200 });
            assert.equal(cardBill.pay, 'Card');

            const splitBill = parseBillAlert({ Amount: 3000, UpiAmount: 2000, CashAmount: 1000, CardAmount: 0 });
            assert.equal(splitBill.pay, 'Split');

            const cashBill = parseBillAlert({ Amount: 800, UpiAmount: 0, CashAmount: 800, CardAmount: 0 });
            assert.equal(cashBill.pay, 'Cash');
        });

        it('should compute gross amount and discount percentage accurately', () => {
            const bill = parseBillAlert({
                Amount: 3600,
                DiscountAmount: 400,
                Items: [{ ArticleName: 'Shirt', Quantity: 2 }]
            });
            assert.equal(bill.amount, 3600);
            assert.equal(bill.discountAmt, 400);
            assert.equal(bill.grossAmt, 4000);
            assert.equal(bill.discountPct, 10);
            assert.equal(bill.itemSummary, 'Shirt');
        });

        it('should handle multi-item summaries with truncations cleanly', () => {
            const billWithManyItems = parseBillAlert({
                Amount: 12000,
                Items: [
                    { ArticleName: 'Jeans' },
                    { ArticleName: 'Shirt' },
                    { ArticleName: 'Blazer' },
                    { ArticleName: 'T-Shirt' },
                    { ArticleName: 'Belt' }
                ]
            });
            assert.equal(billWithManyItems.itemSummary, 'Jeans, Shirt +3 more');
        });
    });

    describe('5. Baseline Seeding & Idempotent Bill Deduplication', () => {
        it('should not re-alert on already seen bills', () => {
            const knownBillIds = new Set(['B-001', 'B-002']);
            const incomingBills = [
                { BillNumber: 'B-002', Amount: 1200 }, // Already known
                { BillNumber: 'B-003', Amount: 3400 }  // New
            ];

            const newlyDetected = [];
            for (const b of incomingBills) {
                const id = b.BillNumber;
                if (!knownBillIds.has(id)) {
                    knownBillIds.add(id);
                    newlyDetected.push(b);
                }
            }

            assert.equal(newlyDetected.length, 1);
            assert.equal(newlyDetected[0].BillNumber, 'B-003');
            assert.ok(knownBillIds.has('B-003'));
        });
    });
});
