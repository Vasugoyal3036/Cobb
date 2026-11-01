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
    function routeInboundMessage({ body, fromPhone, enableInboundBot = true, cooldownMap = new Map(), sessionsMap = new Map() }) {
        const rawBody = (body || '').trim();
        if (!rawBody) return { handled: false, reason: 'EMPTY_BODY' };

        const lower = rawBody.toLowerCase();
        const cleanPhone = String(fromPhone).replace(/[^0-9]/g, '').slice(-10);

        // 1. Owner suppression
        if (isOwnerPhone(cleanPhone)) {
            return { handled: false, reason: 'SUPPRESSED_FOR_OWNER' };
        }

        // 2. Inbound anti-spam cooldown (4 seconds)
        const now = Date.now();
        if (cooldownMap.has(cleanPhone) && (now - cooldownMap.get(cleanPhone) < 4000)) {
            return { handled: false, reason: 'COOLDOWN_ACTIVE' };
        }
        cooldownMap.set(cleanPhone, now);

        // 3. Stateful Two-Step WhatsApp Review Funnel Check (Runs first, independent of enableInboundBot)
        const activeSession = sessionsMap.get(cleanPhone);

        // STEP 2: Grievance Detail Collection
        if (activeSession && activeSession.step === 'waiting_grievance_detail') {
            let category = 'Customer Grievance';
            if (lower === '1' || lower.includes('fitting') || lower.includes('alteration') || lower.includes('size')) {
                category = 'Fitting / Alteration Issue';
            } else if (lower === '2' || lower.includes('staff') || lower.includes('delay') || lower.includes('service')) {
                category = 'Staff Behavior / Service Delay';
            } else if (lower === '3' || lower.includes('price') || lower.includes('pricing') || lower.includes('offer')) {
                category = 'Pricing / Offer Discrepancy';
            } else if (lower === '4' || lower.includes('fabric') || lower.includes('quality') || lower.includes('cloth')) {
                category = 'Fabric / Garment Quality';
            }

            sessionsMap.set(cleanPhone, { ...activeSession, step: 'completed', grievanceCategory: category, grievanceDetail: rawBody });

            return {
                handled: true,
                intent: 'GRIEVANCE_DETAIL_SUBMITTED',
                category,
                detail: rawBody,
                rating: activeSession.rating || 2,
                escalateToManager: true,
                replySnippet: 'Thank you for your valuable feedback'
            };
        }

        // STEP 1: Rating Evaluation (Active Survey Session OR explicit rating keywords)
        const isWaitingRating = activeSession && activeSession.step === 'waiting_rating';

        const isPositiveRating = (isWaitingRating && (lower === '5' || lower === 'five' || lower === '4' || lower === 'four')) ||
            ['5 star', '5 stars', '5/5', '5⭐', '4 star', '4 stars', '4/5', '4⭐', 'excellent', 'great', 'superb'].some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(k)) ||
            lower.includes('⭐⭐⭐⭐⭐') || lower.includes('⭐⭐⭐⭐');

        const isNegativeRating = (isWaitingRating && (lower === '1' || lower === 'one' || lower === '2' || lower === 'two' || lower === '3' || lower === 'three')) ||
            ['1 star', '1 stars', '1/5', '1⭐', '2 star', '2 stars', '2/5', '2⭐', '3 star', '3 stars', '3/5', '3⭐', 'bad', 'poor', 'worst', 'issue', 'complaint'].some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(k)) ||
            lower.includes('⭐⭐⭐') || lower.includes('⭐⭐') || lower.includes('⭐');

        if (isPositiveRating) {
            const score = (lower.includes('4') && !lower.includes('5')) ? 4 : 5;
            if (activeSession) sessionsMap.set(cleanPhone, { ...activeSession, step: 'completed', rating: score });
            return {
                handled: true,
                intent: 'POSITIVE_NPS_REVIEW',
                rating: score,
                reviewUrl: GOOGLE_REVIEW_URL,
                replySnippet: 'Thank you so much for the 5-Star rating'
            };
        }

        if (isNegativeRating) {
            let score = 1;
            if (lower.includes('3')) score = 3;
            else if (lower.includes('2')) score = 2;

            // Transition to Step 2: request grievance reason privately
            sessionsMap.set(cleanPhone, {
                phone: cleanPhone,
                customerName: activeSession?.customerName || 'Customer',
                step: 'waiting_grievance_detail',
                rating: score
            });

            return {
                handled: true,
                intent: 'GRIEVANCE_ESCALATION',
                rating: score,
                reviewUrl: undefined, // Public link NEVER exposed
                nextStep: 'waiting_grievance_detail',
                escalateToManager: true,
                replySnippet: 'We sincerely apologize for falling short'
            };
        }

        // 4. Bot toggle for general concierge menu
        if (!enableInboundBot) {
            return { handled: false, reason: 'BOT_DISABLED' };
        }

        // 5. Loyalty points (Option 1)
        if (lower === '1' || lower.includes('point') || lower.includes('loyalty') || lower.includes('balance')) {
            return { handled: true, intent: 'LOYALTY_CHECK', replySnippet: 'Cobb VIP Loyalty' };
        }

        // 6. Alterations Desk (Option 2)
        if (lower === '2' || lower.includes('alteration') || lower.includes('tailor') || lower.includes('fitting')) {
            return { handled: true, intent: 'ALTERATIONS_CHECK', replySnippet: 'Cobb Alterations Desk' };
        }

        // 7. Dynamic Catalog (Option 3)
        if (lower === '3' || lower.includes('catalog') || lower.includes('new arrival') || lower.includes('collection')) {
            return { handled: true, intent: 'CATALOG_VIEW', replySnippet: 'Cobb Trending Arrivals' };
        }

        // 8. Click & Collect Reservation (RESERVE <Code>)
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

        // 9. In-store Offers (Option 4)
        if (lower === '4' || lower.includes('offer') || lower.includes('deal') || lower.includes('discount')) {
            return { handled: true, intent: 'OFFERS_VIEW', replySnippet: "Today's In-Store Cobb Specials" };
        }

        // 10. Store Hours & Map (Option 5)
        if (lower === '5' || lower.includes('timing') || lower.includes('location') || lower.includes('address') || lower.includes('map')) {
            return { handled: true, intent: 'TIMINGS_MAP', replySnippet: 'Cobb Apparels Flagship Store' };
        }

        return { handled: false, reason: 'UNRECOGNIZED_INTENT' };
    }

    function routePollVote({ voter, selectedOptions, sessionsMap = new Map(), cooldownMap = new Map(), pollName = '' }) {
        if (!voter || !selectedOptions || selectedOptions.length === 0) {
            return { handled: false, reason: 'EMPTY_VOTE' };
        }
        const cleanPhone = String(voter).replace(/[^0-9]/g, '').slice(-10);
        if (isOwnerPhone(cleanPhone)) return { handled: false, reason: 'SUPPRESSED_FOR_OWNER' };

        const now = Date.now();
        if (cooldownMap.has(cleanPhone) && (now - cooldownMap.get(cleanPhone) < 2000)) {
            return { handled: false, reason: 'COOLDOWN_ACTIVE' };
        }
        cooldownMap.set(cleanPhone, now);

        const activeSession = sessionsMap.get(cleanPhone);
        const grievanceMap = {
            0: 'Fitting / Alteration Issue',
            1: 'Staff Behavior / Service Delay',
            2: 'Pricing / Offer Discrepancy',
            3: 'Fabric / Garment Quality',
            4: 'Other Feedback'
        };

        const isGrievanceStep = (activeSession && activeSession.step === 'waiting_grievance_detail') ||
            (pollName && pollName.toLowerCase().includes('went wrong'));

        if (isGrievanceStep) {
            const selectedCategories = selectedOptions.map(o => {
                if (o.name && !o.name.startsWith('Option')) return o.name;
                if (typeof o.localId === 'number' && grievanceMap[o.localId]) return grievanceMap[o.localId];
                return o.name || `Issue #${o.localId}`;
            });
            const detail = selectedCategories.join(', ') || 'Customer Grievance';
            let category = 'Customer Grievance';
            const lowerDetail = detail.toLowerCase();
            if (lowerDetail.includes('fitting') || lowerDetail.includes('alteration') || lowerDetail.includes('size')) {
                category = 'Fitting / Alteration Issue';
            } else if (lowerDetail.includes('staff') || lowerDetail.includes('delay') || lowerDetail.includes('service')) {
                category = 'Staff Behavior / Service Delay';
            } else if (lowerDetail.includes('price') || lowerDetail.includes('pricing') || lowerDetail.includes('offer')) {
                category = 'Pricing / Offer Discrepancy';
            } else if (lowerDetail.includes('fabric') || lowerDetail.includes('quality') || lowerDetail.includes('cloth')) {
                category = 'Fabric / Garment Quality';
            }

            sessionsMap.set(cleanPhone, { ...activeSession, step: 'completed', grievanceCategory: category, grievanceDetail: detail });
            return {
                handled: true,
                intent: 'POLL_GRIEVANCE_SUBMITTED',
                category,
                detail,
                selectedOptions: selectedCategories,
                rating: activeSession?.rating || 2,
                escalateToManager: true,
                replySnippet: 'Thank you for your valuable feedback'
            };
        }

        const selected = selectedOptions[0];
        const optName = String(selected.name || '').toLowerCase();
        const localId = typeof selected.localId === 'number' ? selected.localId : -1;

        const is5 = localId === 0 || optName.includes('5') || optName.includes('excellent');
        const is4 = localId === 1 || optName.includes('4') || optName.includes('good');
        const isPositive = is5 || is4;

        if (isPositive) {
            const ratingScore = is5 ? 5 : 4;
            sessionsMap.set(cleanPhone, { ...activeSession, step: 'completed', rating: ratingScore });
            return {
                handled: true,
                intent: 'POLL_POSITIVE_RATING',
                rating: ratingScore,
                reviewUrl: GOOGLE_REVIEW_URL,
                replySnippet: `Thank you so much for the ${ratingScore}-Star rating`
            };
        }

        let grievanceScore = 3;
        if (localId === 4 || optName.includes('1') || optName.includes('poor')) grievanceScore = 1;
        else if (localId === 3 || optName.includes('2')) grievanceScore = 2;

        sessionsMap.set(cleanPhone, {
            phone: cleanPhone,
            customerName: activeSession?.customerName || 'Customer',
            step: 'waiting_grievance_detail',
            rating: grievanceScore
        });

        return {
            handled: true,
            intent: 'POLL_GRIEVANCE_ESCALATION',
            rating: grievanceScore,
            reviewUrl: undefined,
            sendGrievancePoll: true,
            replySnippet: 'We sincerely apologize for falling short'
        };
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

    describe('6. Stateful Two-Step WhatsApp Review Funnel', () => {
        it('Step 1: Positive rating (5★ or 4★) directs to Google Maps review link and completes session', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Rohan Sharma', step: 'waiting_rating' });

            const res = routeInboundMessage({ body: '5', fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POSITIVE_NPS_REVIEW');
            assert.equal(res.rating, 5);
            assert.equal(res.reviewUrl, GOOGLE_REVIEW_URL);
            assert.ok(res.replySnippet.includes('5-Star rating'));

            // Session marked as completed
            const sessionAfter = sessionsMap.get(phone);
            assert.equal(sessionAfter.step, 'completed');
            assert.equal(sessionAfter.rating, 5);
        });

        it('Step 1: Low rating (1★, 2★, or 3★) intercepts negative feedback privately without public Google link', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Vikas Gupta', step: 'waiting_rating' });

            const res = routeInboundMessage({ body: '1', fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'GRIEVANCE_ESCALATION');
            assert.equal(res.rating, 1);
            assert.equal(res.reviewUrl, undefined); // NEVER expose Google Review URL
            assert.equal(res.nextStep, 'waiting_grievance_detail');
            assert.ok(res.replySnippet.includes('sincerely apologize'));

            // Session transitioned to Step 2
            const sessionAfter = sessionsMap.get(phone);
            assert.equal(sessionAfter.step, 'waiting_grievance_detail');
            assert.equal(sessionAfter.rating, 1);
        });

        it('Step 2: Dissatisfied customer selects Option 1 -> records Fitting / Alteration issue (not Loyalty)', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Amit Verma', step: 'waiting_grievance_detail', rating: 2 });

            const res = routeInboundMessage({ body: '1', fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'GRIEVANCE_DETAIL_SUBMITTED');
            assert.equal(res.category, 'Fitting / Alteration Issue');
            assert.equal(res.rating, 2);
            assert.equal(res.escalateToManager, true);
            assert.ok(res.replySnippet.includes('valuable feedback'));

            const sessionAfter = sessionsMap.get(phone);
            assert.equal(sessionAfter.step, 'completed');
            assert.equal(sessionAfter.grievanceCategory, 'Fitting / Alteration Issue');
        });

        it('Step 2: Dissatisfied customer selects Option 2 -> records Staff Behavior / Service Delay', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Pooja', step: 'waiting_grievance_detail', rating: 1 });

            const res = routeInboundMessage({ body: '2', fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'GRIEVANCE_DETAIL_SUBMITTED');
            assert.equal(res.category, 'Staff Behavior / Service Delay');
            assert.equal(res.escalateToManager, true);
        });

        it('Step 2: Customer types free-text grievance note -> records exact feedback and escalates to owner', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Sunil Kumar', step: 'waiting_grievance_detail', rating: 2 });

            const grievanceText = 'The shirt buttons came loose on first trial and cashier took 15 mins';
            const res = routeInboundMessage({ body: grievanceText, fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'GRIEVANCE_DETAIL_SUBMITTED');
            assert.equal(res.detail, grievanceText);
            assert.equal(res.escalateToManager, true);

            const sessionAfter = sessionsMap.get(phone);
            assert.equal(sessionAfter.grievanceDetail, grievanceText);
            assert.equal(sessionAfter.step, 'completed');
        });

        it('Without an active review session, Option 1 routes to Loyalty inquiry (no collision)', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';

            const res = routeInboundMessage({ body: '1', fromPhone: phone, sessionsMap });
            assert.equal(res.handled, true);
            assert.equal(res.intent, 'LOYALTY_CHECK');
            assert.ok(res.replySnippet.includes('Loyalty'));
        });
    });

    describe('7. Interactive WhatsApp Poll & Checkbox Voting Funnel', () => {
        it('Step 1: Tapping 5-Star checkbox option directs customer to Google Maps review', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Rajesh', step: 'waiting_rating' });

            const res = routePollVote({
                voter: `91${phone}@c.us`,
                selectedOptions: [{ name: '⭐⭐⭐⭐⭐ 5 - Excellent', localId: 0 }],
                sessionsMap
            });

            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POLL_POSITIVE_RATING');
            assert.equal(res.rating, 5);
            assert.equal(res.reviewUrl, GOOGLE_REVIEW_URL);
            assert.ok(res.replySnippet.includes('5-Star rating'));

            const session = sessionsMap.get(phone);
            assert.equal(session.step, 'completed');
            assert.equal(session.rating, 5);
        });

        it('Step 1: Tapping 4-Star checkbox option also routes to Google Maps review', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Ravi', step: 'waiting_rating' });

            const res = routePollVote({
                voter: `91${phone}@c.us`,
                selectedOptions: [{ name: '⭐⭐⭐⭐ 4 - Good', localId: 1 }],
                sessionsMap
            });

            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POLL_POSITIVE_RATING');
            assert.equal(res.rating, 4);
            assert.equal(res.reviewUrl, GOOGLE_REVIEW_URL);
            assert.equal(sessionsMap.get(phone).rating, 4);
        });

        it('Step 1: Tapping 2-Star option privately shields Google link and transitions to Grievance Poll', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Deepak', step: 'waiting_rating' });

            const res = routePollVote({
                voter: `91${phone}@c.us`,
                selectedOptions: [{ name: '⭐⭐ 2 - Needs Improvement', localId: 3 }],
                sessionsMap
            });

            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POLL_GRIEVANCE_ESCALATION');
            assert.equal(res.rating, 2);
            assert.equal(res.reviewUrl, undefined);
            assert.equal(res.sendGrievancePoll, true);

            const session = sessionsMap.get(phone);
            assert.equal(session.step, 'waiting_grievance_detail');
            assert.equal(session.rating, 2);
        });

        it('Step 2: Grievance checkbox selection records category and notifies manager', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Deepak', step: 'waiting_grievance_detail', rating: 2 });

            const res = routePollVote({
                voter: `91${phone}@c.us`,
                selectedOptions: [{ name: 'Fitting / Alteration issue', localId: 0 }],
                sessionsMap
            });

            assert.equal(res.handled, true);
            assert.equal(res.intent, 'POLL_GRIEVANCE_SUBMITTED');
            assert.equal(res.category, 'Fitting / Alteration Issue');
            assert.equal(res.escalateToManager, true);

            const session = sessionsMap.get(phone);
            assert.equal(session.step, 'completed');
            assert.equal(session.grievanceCategory, 'Fitting / Alteration Issue');
        });

        it('Step 2: Multi-select checkbox picks multiple issues simultaneously', () => {
            const sessionsMap = new Map();
            const phone = '9876543210';
            sessionsMap.set(phone, { phone, customerName: 'Kunal', step: 'waiting_grievance_detail', rating: 1 });

            const res = routePollVote({
                voter: `91${phone}@c.us`,
                selectedOptions: [
                    { name: 'Staff behavior / Service delay', localId: 1 },
                    { name: 'Pricing / Offer discrepancy', localId: 2 }
                ],
                sessionsMap
            });

            assert.equal(res.handled, true);
            assert.equal(res.selectedOptions.length, 2);
            assert.ok(res.detail.includes('Staff behavior'));
            assert.ok(res.detail.includes('Pricing'));
            assert.equal(sessionsMap.get(phone).step, 'completed');
        });
    });
});

