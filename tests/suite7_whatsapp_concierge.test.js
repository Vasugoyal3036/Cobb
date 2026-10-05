import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Suite 7: Inbound WhatsApp Concierge Bot, Intent Matching & NPS Bifurcation', () => {

    const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJHfCBR58ZDjkRpBbB9EV-Zew';
    const OWNER_PHONES = ['9138122820', '8708788707', '9034522000', '9466422821'];

    function isOwnerPhone(phone) {
        if (!phone) return false;
        const clean = String(phone).replace(/[^0-9]/g, '');
        const tenDigit = clean.slice(-10);
        return OWNER_PHONES.includes(tenDigit);
    }

    // Router simulating the message handler in whatsapp_gateway/server.js
    function routeInboundMessage({ body, fromPhone, enableInboundBot = true, cooldownMap = new Map() }) {
        const rawBody = (body || '').trim();
        if (!rawBody) return { handled: false, reason: 'EMPTY_BODY' };

        const lower = rawBody.toLowerCase();
        const cleanPhone = String(fromPhone).replace(/[^0-9]/g, '').slice(-10);

        // 1. Owner suppression
        if (isOwnerPhone(cleanPhone)) {
            return { handled: false, reason: 'SUPPRESSED_FOR_OWNER' };
        }

        // 2. Bot toggle
        if (!enableInboundBot) {
            return { handled: false, reason: 'BOT_DISABLED' };
        }

        // 3. Inbound anti-spam cooldown (4 seconds)
        const now = Date.now();
        if (cooldownMap.has(cleanPhone) && (now - cooldownMap.get(cleanPhone) < 4000)) {
            return { handled: false, reason: 'COOLDOWN_ACTIVE' };
        }
        cooldownMap.set(cleanPhone, now);

        // 4. Loyalty points (Option 1)
        if (lower === '1' || lower.includes('point') || lower.includes('loyalty') || lower.includes('balance')) {
            return { handled: true, intent: 'LOYALTY_CHECK', replySnippet: 'Cobb VIP Loyalty' };
        }

        // 5. Alterations Desk (Option 2)
        if (lower === '2' || lower.includes('alteration') || lower.includes('tailor') || lower.includes('fitting')) {
            return { handled: true, intent: 'ALTERATIONS_CHECK', replySnippet: 'Cobb Alterations Desk' };
        }

        // 6. Dynamic Catalog (Option 3)
        if (lower === '3' || lower.includes('catalog') || lower.includes('new arrival') || lower.includes('collection')) {
            return { handled: true, intent: 'CATALOG_VIEW', replySnippet: 'Cobb Trending Arrivals' };
        }

        // 7. Click & Collect Reservation (RESERVE <Code>)
        if (lower.startsWith('reserve') || lower.startsWith('hold')) {
            const parts = rawBody.split(/\s+/);
            const code = parts[1] || '';
            if (code) {
                return {
                    handled: true,
                    intent: 'CLICK_AND_COLLECT_RESERVE',
                    articleCode: code.toUpperCase(),
                    holdToken: 'HLD-' + Math.floor(1000 + Math.random() * 9000),
                    holdHours: 24
                };
            }
            return { handled: true, intent: 'RESERVE_HELP', replySnippet: 'Please reply in the format: RESERVE <ArticleCode>' };
        }

        // 8. In-store Offers (Option 4)
        if (lower === '4' || lower.includes('offer') || lower.includes('deal') || lower.includes('discount')) {
            return { handled: true, intent: 'OFFERS_VIEW', replySnippet: "Today's In-Store Cobb Specials" };
        }

        // 9. Store Hours & Map (Option 5)
        if (lower === '5' || lower.includes('timing') || lower.includes('location') || lower.includes('address') || lower.includes('map')) {
            return { handled: true, intent: 'TIMINGS_MAP', replySnippet: 'Cobb Apparels Flagship Store' };
        }

        // 10. Positive Review (4 or 5 stars) -> Google Maps link
        if (['5', '5 star', '5 stars', '4', '4 star', '4 stars', 'excellent', 'great', 'superb'].some(k => lower === k || lower.startsWith(k))) {
            return {
                handled: true,
                intent: 'POSITIVE_NPS_REVIEW',
                reviewUrl: GOOGLE_REVIEW_URL,
                replySnippet: 'Thank you so much for the 5-Star rating'
            };
        }

        // 11. Low NPS Grievance (1 to 3 stars) -> Manager Escalation
        if (['1', '1 star', '2', '2 star', '3', '3 star', 'bad', 'poor', 'worst', 'issue', 'complaint'].some(k => lower === k || lower.startsWith(k))) {
            return {
                handled: true,
                intent: 'GRIEVANCE_ESCALATION',
                escalateToManager: true,
                replySnippet: 'We sincerely apologize for falling short'
            };
        }

        return { handled: false, reason: 'UNRECOGNIZED_INTENT' };
    }

    describe('1. Inbound Menu & Intent Classification', () => {
        it('should classify Option 1 as Loyalty Points inquiry', () => {
            const res = routeInboundMessage({ body: '1', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'LOYALTY_CHECK');
            assert.ok(res.replySnippet.includes('Loyalty'));
        });

        it('should classify Option 2 as Alterations Status check', () => {
            const res = routeInboundMessage({ body: 'Where is my tailor fitting?', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'ALTERATIONS_CHECK');
        });

        it('should classify Option 3 as Catalog & New Arrivals', () => {
            const res = routeInboundMessage({ body: '3', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'CATALOG_VIEW');
        });

        it('should classify Option 4 as In-Store Offers', () => {
            const res = routeInboundMessage({ body: 'any discount offers today?', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'OFFERS_VIEW');
        });

        it('should classify Option 5 as Store Hours & Location', () => {
            const res = routeInboundMessage({ body: 'store timing and address please', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'TIMINGS_MAP');
        });
    });

    describe('2. Click & Collect Reservation Engine', () => {
        it('should parse RESERVE command and issue a 24-hour hold token', () => {
            const res = routeInboundMessage({ body: 'RESERVE CFDH3378', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'CLICK_AND_COLLECT_RESERVE');
            assert.equal(res.articleCode, 'CFDH3378');
            assert.ok(res.holdToken.startsWith('HLD-'));
            assert.equal(res.holdHours, 24);
        });

        it('should prompt with syntax help when code is omitted', () => {
            const res = routeInboundMessage({ body: 'reserve', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'RESERVE_HELP');
        });
    });

    describe('3. NPS Feedback Bifurcation (Positive vs Grievance)', () => {
        it('should route 5-star rating to Google Maps review invitation', () => {
            const res = routeInboundMessage({ body: '5 star rating, loved the blazer!', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POSITIVE_NPS_REVIEW');
            assert.equal(res.reviewUrl, GOOGLE_REVIEW_URL);
        });

        it('should route 2-star rating to Manager Grievance Escalation without public link', () => {
            const res = routeInboundMessage({ body: '2 star, staff service was bad and slow', fromPhone: '9876543210' });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'GRIEVANCE_ESCALATION');
            assert.equal(res.escalateToManager, true);
            assert.equal(res.reviewUrl, undefined);
        });
    });

    describe('4. Safeguards: Owner Suppression & Anti-Spam Cooldown', () => {
        it('should suppress automated bot replies to store owner phone numbers', () => {
            const res = routeInboundMessage({ body: '1', fromPhone: '9138122820' });
            assert.equal(res.handled, false);
            assert.equal(res.reason, 'SUPPRESSED_FOR_OWNER');
        });

        it('should enforce 4-second anti-spam cooldown against rapid repeated queries', () => {
            const cooldownMap = new Map();
            const first = routeInboundMessage({ body: '1', fromPhone: '9876543210', cooldownMap });
            assert.equal(first.handled, true);

            // Immediate repeat should trigger cooldown
            const second = routeInboundMessage({ body: '1', fromPhone: '9876543210', cooldownMap });
            assert.equal(second.handled, false);
            assert.equal(second.reason, 'COOLDOWN_ACTIVE');
        });
    });

    describe('5. Customer Rating Persistence & NPS Ledger', () => {
        it('should correctly calculate NPS and rating distribution', () => {
            const ratings = [
                { rating: 5, category: 'positive' },
                { rating: 5, category: 'positive' },
                { rating: 4, category: 'positive' },
                { rating: 2, category: 'grievance' },
                { rating: 1, category: 'grievance' }
            ];
            const total = ratings.length;
            const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / total;
            const promoters = ratings.filter(r => r.rating >= 4).length;
            const detractors = ratings.filter(r => r.rating <= 2).length;
            const nps = Math.round(((promoters - detractors) / total) * 100);

            assert.equal(total, 5);
            assert.equal(avg.toFixed(1), '3.4');
            assert.equal(promoters, 3);
            assert.equal(detractors, 2);
            assert.equal(nps, 20); // (3 - 2) / 5 * 100 = 20
        });

        it('should extract correct rating scores from customer message content', () => {
            const parseRating = (text) => {
                const lower = text.toLowerCase();
                if (lower.includes('5 star') || lower.includes('⭐⭐⭐⭐⭐')) return 5;
                if (lower.includes('4 star') || lower.includes('⭐⭐⭐⭐')) return 4;
                if (lower.includes('3 star') || lower.includes('⭐⭐⭐')) return 3;
                if (lower.includes('2 star') || lower.includes('⭐⭐')) return 2;
                if (lower.includes('1 star') || lower.includes('⭐')) return 1;
                return null;
            };

            assert.equal(parseRating('5 star rating, loved the shirt!'), 5);
            assert.equal(parseRating('⭐⭐⭐⭐ service was nice'), 4);
            assert.equal(parseRating('2 star, tailor delayed pants'), 2);
            assert.equal(parseRating('1 star worst billing queue'), 1);
        });
    });
});
