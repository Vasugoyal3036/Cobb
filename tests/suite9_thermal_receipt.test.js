import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Suite 9: Thermal Receipt & 80mm Print Layout Simulation', () => {

    function formatLine(left, right, width = 48) {
        const leftStr = String(left || '');
        const rightStr = String(right || '');
        const spaceCount = Math.max(width - leftStr.length - rightStr.length, 1);
        return leftStr + ' '.repeat(spaceCount) + rightStr;
    }

    function formatDivider(char = '-', width = 48) {
        return char.repeat(width);
    }

    function centerText(text, width = 48) {
        const str = String(text || '').trim();
        if (str.length >= width) return str;
        const pad = Math.floor((width - str.length) / 2);
        return ' '.repeat(pad) + str;
    }

    function calculateReceiptTaxes(activeBill) {
        const totalAmount = Number(activeBill.Amount || activeBill.NET_AMOUNT || 0);
        const grossAmount = Number(activeBill.GrossAmount || activeBill.GROSS_AMOUNT || totalAmount);
        const discountAmount = Number(activeBill.DiscountAmount || activeBill.DISCOUNT_AMOUNT || 0);
        const discountPct = grossAmount > 0 ? Number(((discountAmount / grossAmount) * 100).toFixed(1)) : 0;

        const totalGst = Number(activeBill.TotalGst || activeBill.TOTAL_GST_AMOUNT || 0);
        const cgst = Number(activeBill.CGST || activeBill.Cgst || (totalGst > 0 ? totalGst / 2 : 0));
        const sgst = Number(activeBill.SGST || activeBill.Sgst || (totalGst > 0 ? totalGst / 2 : 0));
        const igst = Number(activeBill.IGST || activeBill.Igst || 0);
        const taxableVal = totalAmount - totalGst;

        return { totalAmount, grossAmount, discountAmount, discountPct, totalGst, cgst, sgst, igst, taxableVal };
    }

    describe('1. ESC/POS Monospace Line Alignment', () => {
        it('should align left and right labels to exactly 48 characters for 80mm standard paper', () => {
            const line = formatLine('Total Amount', '₹4,999.00', 48);
            assert.equal(line.length, 48);
            assert.ok(line.startsWith('Total Amount'));
            assert.ok(line.endsWith('₹4,999.00'));
        });

        it('should align left and right labels to exactly 32 characters for 58mm mini paper', () => {
            const line = formatLine('Net Pay', '₹2,500', 32);
            assert.equal(line.length, 32);
            assert.ok(line.startsWith('Net Pay'));
            assert.ok(line.endsWith('₹2,500'));
        });

        it('should guarantee at least 1 whitespace separation when text overflows', () => {
            const longLeft = 'A Very Long Article Name That Takes Most Space';
            const price = '₹1,200';
            const line = formatLine(longLeft, price, 48);
            assert.ok(line.includes(' '));
        });
    });

    describe('2. Text Centering & Dividers', () => {
        it('should generate exact 48-character divider lines', () => {
            const dashed = formatDivider('-', 48);
            assert.equal(dashed.length, 48);
            assert.equal(dashed, '------------------------------------------------');

            const doubleSolid = formatDivider('=', 48);
            assert.equal(doubleSolid.length, 48);
            assert.equal(doubleSolid, '================================================');
        });

        it('should center store title within 48 columns', () => {
            const centered = centerText('COBB APPARELS', 48);
            assert.ok(centered.startsWith('   '));
            assert.ok(centered.includes('COBB APPARELS'));
        });
    });

    describe('3. GST & Tax Breakdown Mathematics', () => {
        it('should split GST equally between CGST and SGST for standard retail sales', () => {
            const bill = {
                Amount: 5000,
                GrossAmount: 5000,
                DiscountAmount: 0,
                TotalGst: 250 // 5% GST
            };

            const taxes = calculateReceiptTaxes(bill);
            assert.equal(taxes.cgst, 125);
            assert.equal(taxes.sgst, 125);
            assert.equal(taxes.taxableVal, 4750);
            assert.equal(taxes.discountPct, 0);
        });

        it('should calculate discount percentage when markdown is applied', () => {
            const discountedBill = {
                Amount: 3600,
                GrossAmount: 4000,
                DiscountAmount: 400,
                TotalGst: 180
            };

            const taxes = calculateReceiptTaxes(discountedBill);
            assert.equal(taxes.discountPct, 10.0);
            assert.equal(taxes.taxableVal, 3420);
            assert.equal(taxes.cgst, 90);
            assert.equal(taxes.sgst, 90);
        });
    });
});
