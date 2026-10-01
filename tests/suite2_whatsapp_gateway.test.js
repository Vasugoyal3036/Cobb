import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Suite 2: WhatsApp Gateway Reliability & Queue Testing', () => {

    const OWNER_PHONES = ['9138122820', '8708788707', '9034522000', '9466422821'];

    function isOwnerPhone(phone) {
        if (!phone) return false;
        const clean = String(phone).replace(/[^0-9]/g, '');
        const tenDigit = clean.slice(-10);
        return OWNER_PHONES.includes(tenDigit);
    }

    function formatWhatsAppRecipient(phone) {
        if (!phone) return null;
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.length < 10) return null;
        if (clean.length === 10) {
            clean = '91' + clean;
        }
        return `${clean}@c.us`;
    }

    describe('1. Phone Number Sanitation & Recipient Formatting', () => {
        it('should format 10-digit Indian phone numbers with country code and @c.us suffix', () => {
            const rawPhone = '9876543210';
            const formatted = formatWhatsAppRecipient(rawPhone);
            assert.equal(formatted, '919876543210@c.us');
        });

        it('should strip special characters, spaces, and dashes', () => {
            const messyPhones = [
                '+91 98765-43210',
                '91 98765 43210',
                '+91 (98765) 43210',
                '  9876543210  '
            ];

            messyPhones.forEach(phone => {
                const formatted = formatWhatsAppRecipient(phone);
                assert.equal(formatted, '919876543210@c.us');
            });
        });

        it('should reject invalid or short phone numbers', () => {
            assert.equal(formatWhatsAppRecipient(''), null);
            assert.equal(formatWhatsAppRecipient(null), null);
            assert.equal(formatWhatsAppRecipient('12345'), null);
            assert.equal(formatWhatsAppRecipient('abcdefghij'), null);
        });
    });

    describe('2. Store Owner Identification & Survey Suppression', () => {
        it('should detect store owner phone numbers across multiple formats', () => {
            assert.ok(isOwnerPhone('9138122820'));
            assert.ok(isOwnerPhone('+91 91381-22820'));
            assert.ok(isOwnerPhone('919138122820'));
            assert.ok(isOwnerPhone('09138122820'));

            assert.ok(isOwnerPhone('8708788707'));
            assert.ok(isOwnerPhone('9034522000'));
            assert.ok(isOwnerPhone('9466422821'));
        });

        it('should return false for regular customer numbers', () => {
            assert.equal(isOwnerPhone('9812345678'), false);
            assert.equal(isOwnerPhone('9999999999'), false);
        });
    });

    describe('3. NPS / Review Survey Queue Mechanics', () => {
        function createQueueManager() {
            let queue = [];

            function queueSurvey(phone, customerName = 'Valued Customer', billNo = '', delayMinutes = 30) {
                const cleanPhone = String(phone).replace(/[^0-9]/g, '');
                if (!cleanPhone || cleanPhone.length < 10) return { queued: false, reason: 'INVALID_PHONE' };
                if (isOwnerPhone(cleanPhone)) {
                    return { queued: false, reason: 'SUPPRESSED_FOR_OWNER' };
                }

                const existing = queue.find(q => q.phone === cleanPhone && q.status === 'pending');
                if (existing) {
                    return { queued: false, reason: 'DUPLICATE_PENDING' };
                }

                const scheduledAt = Date.now() + (delayMinutes * 60 * 1000);
                const item = {
                    id: 'nps_' + Math.random().toString(36).substring(2, 7),
                    phone: cleanPhone,
                    customerName,
                    billNo,
                    scheduledAt,
                    status: 'pending'
                };

                queue.push(item);
                if (queue.length > 500) queue.shift();
                return { queued: true, item };
            }

            return { queueSurvey, getQueue: () => queue };
        }

        it('should successfully queue survey for a valid customer with future scheduled time', () => {
            const { queueSurvey, getQueue } = createQueueManager();
            const res = queueSurvey('9876543210', 'Rahul Sharma', 'BILL-001', 30);
            
            assert.equal(res.queued, true);
            assert.equal(getQueue().length, 1);
            assert.ok(res.item.scheduledAt > Date.now());
            assert.equal(res.item.status, 'pending');
        });

        it('should suppress and refuse to queue automated surveys to store owners', () => {
            const { queueSurvey, getQueue } = createQueueManager();
            const res = queueSurvey('9138122820', 'Owner', 'BILL-002', 30);
            
            assert.equal(res.queued, false);
            assert.equal(res.reason, 'SUPPRESSED_FOR_OWNER');
            assert.equal(getQueue().length, 0);
        });

        it('should prevent duplicate pending surveys for the same customer phone', () => {
            const { queueSurvey, getQueue } = createQueueManager();
            const first = queueSurvey('9876543210', 'Rahul', 'BILL-001');
            const second = queueSurvey('9876543210', 'Rahul', 'BILL-002');
            
            assert.equal(first.queued, true);
            assert.equal(second.queued, false);
            assert.equal(second.reason, 'DUPLICATE_PENDING');
            assert.equal(getQueue().length, 1);
        });
    });

    describe('4. Anti-Ban Throttling & Batch Dispatch Safety', () => {
        it('should compute safe delays between batch messages to prevent bans', () => {
            function calculateBatchDelay(index, baseDelayMs = 2500, jitterMs = 1500) {
                // Minimum spacing + randomized jitter
                return (index * baseDelayMs) + Math.floor(Math.random() * jitterMs);
            }

            const batch = ['9812300001', '9812300002', '9812300003'];
            const delays = batch.map((_, i) => calculateBatchDelay(i, 2000, 500));

            assert.equal(delays.length, 3);
            assert.ok(delays[1] > delays[0]);
            assert.ok(delays[2] > delays[1]);
        });
    });

    describe('5. Payload Validation & Error Guarding', () => {
        function validateSendRequest(body) {
            const { number, message } = body || {};
            if (!number) return { valid: false, error: 'Recipient phone number is required' };
            const cleanNumber = String(number).replace(/[^0-9]/g, '');
            if (cleanNumber.length < 10) return { valid: false, error: 'Valid 10+ digit phone number is required' };
            if (!message || String(message).trim().length === 0) return { valid: false, error: 'Message text cannot be empty' };
            return { valid: true };
        }

        it('should reject missing or empty payloads with clean error descriptions', () => {
            assert.equal(validateSendRequest({}).valid, false);
            assert.equal(validateSendRequest({ number: '123' }).valid, false);
            assert.equal(validateSendRequest({ number: '9876543210', message: '   ' }).valid, false);
            assert.equal(validateSendRequest({ number: '9876543210', message: 'Your bill is ready!' }).valid, true);
        });
    });
});
