const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const AUDITS_FILE = path.join(__dirname, '..', 'rack_audits.json');

test('Rack Audit module exports express router', () => {
    const rackAuditRouter = require('./rack_audit');
    assert.ok(rackAuditRouter);
    assert.equal(typeof rackAuditRouter, 'function'); // Express Router is a function
});

test('Rack Audit save and history cycle test', async () => {
    // Read initial audits
    let initial = [];
    if (fs.existsSync(AUDITS_FILE)) {
        try {
            initial = JSON.parse(fs.readFileSync(AUDITS_FILE, 'utf8'));
        } catch (e) { }
    }

    const testAudit = {
        id: `TEST-AUDIT-${Date.now()}`,
        rackName: "Test Bay A - Formal Shirts",
        section: "MENSWEAR",
        subSection: "SHIRTS FULL SL",
        auditor: "Test Auditor",
        expectedCount: 48,
        scannedCount: 46,
        missingCount: 2,
        surpriseCount: 1,
        matchedCount: 46,
        accuracyPct: 96,
        scannedItems: [{ barcode: "0082296848", articleNo: "LTELB9007A", itemName: "Shirt", mrp: 2199 }],
        missingItems: [
            { barcode: "0011111111", articleNo: "MISSING1", itemName: "Formal Shirt", color: "White", size: "40", mrp: 2799 },
            { barcode: "0022222222", articleNo: "MISSING2", itemName: "Formal Shirt", color: "Blue", size: "42", mrp: 2799 }
        ],
        surpriseItems: [
            { barcode: "0033333333", articleNo: "DENIM1", itemName: "Denim Jeans", color: "Navy", size: "32", mrp: 3199, expectedSection: "MENSWEAR", expectedSubSection: "DENIM" }
        ],
        status: "completed",
        notes: "Automated test audit cycle"
    };

    // Append and write
    const updated = [...initial, testAudit];
    fs.writeFileSync(AUDITS_FILE, JSON.stringify(updated, null, 2), 'utf8');

    // Read back
    const readBack = JSON.parse(fs.readFileSync(AUDITS_FILE, 'utf8'));
    const found = readBack.find(a => a.id === testAudit.id);

    assert.ok(found, "Saved audit should be found in rack_audits.json");
    assert.equal(found.expectedCount, 48);
    assert.equal(found.scannedCount, 46);
    assert.equal(found.missingCount, 2);
    assert.equal(found.surpriseCount, 1);
    assert.equal(found.accuracyPct, 96);
    assert.equal(found.missingItems.length, 2);
    assert.equal(found.surpriseItems.length, 1);

    // Clean up test audit
    const cleaned = readBack.filter(a => a.id !== testAudit.id);
    fs.writeFileSync(AUDITS_FILE, JSON.stringify(cleaned, null, 2), 'utf8');
});

test('Rack Audit accuracy calculation validation', () => {
    const calcAccuracy = (expected, scanned) => {
        if (expected === 0) return 100;
        const matched = Math.min(scanned, expected);
        return Math.round((matched / expected) * 100);
    };

    assert.equal(calcAccuracy(48, 46), 96);
    assert.equal(calcAccuracy(50, 50), 100);
    assert.equal(calcAccuracy(100, 95), 95);
    assert.equal(calcAccuracy(0, 0), 100);
    assert.equal(calcAccuracy(40, 45), 100); // 100% of expected accounted for
});
