import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  triggerTestCheckoutNotification,
  triggerTestBigTicketAlert,
  triggerTestHeavyDiscountAlert,
  triggerTestCancelledBillAlert
} from './checkoutNotifications';

describe('Status Bar & Phone Link Checkout Notifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.Notification = class {
      constructor(title, options) {
        this.title = title;
        this.options = options;
      }
    };
    globalThis.Notification.permission = 'granted';
    globalThis.navigator.vibrate = vi.fn();
    globalThis.Audio = class {
      play() { return Promise.resolve(); }
    };
  });

  it('formats regular checkout alert with Bill Amount and Customer on priority', async () => {
    const payload = await triggerTestCheckoutNotification('DEMO_STORE_001');
    expect(payload).toBeDefined();
    expect(payload.title).toMatch(/^🧾 ₹[\d,]+ — Parbhat Goyal \(98123-45678\)/);
    expect(payload.body).toContain('👤 Customer: Parbhat Goyal (98123-45678)');
    expect(payload.customer).toBe('Parbhat Goyal (98123-45678)');
  });

  it('formats VIP Mega Sale alert with Bill Amount and Customer on priority', async () => {
    const payload = await triggerTestBigTicketAlert('DEMO_STORE_001');
    expect(payload).toBeDefined();
    expect(payload.title).toBe('💎 ₹18,500 VIP SALE — Asham Sohi (98765-43210)');
    expect(payload.body).toContain('👤 Customer: Asham Sohi (98765-43210)');
    expect(payload.customer).toBe('Asham Sohi (98765-43210)');
  });

  it('formats Heavy Discount Warning alert with Bill Amount and Customer on priority', async () => {
    const payload = await triggerTestHeavyDiscountAlert('DEMO_STORE_001');
    expect(payload).toBeDefined();
    expect(payload.title).toBe('⚠️ ₹4,400 (45% OFF) — Walk-in Customer');
    expect(payload.body).toContain('👤 Customer: Walk-in Customer');
    expect(payload.customer).toBe('Walk-in Customer');
  });

  it('formats Cancelled / Void Bill alert with Bill Amount and Customer on priority', async () => {
    const payload = await triggerTestCancelledBillAlert('DEMO_STORE_001');
    expect(payload).toBeDefined();
    expect(payload.title).toBe('🚫 ₹4,200 CANCELLED — Walk-in Customer');
    expect(payload.body).toContain('👤 Customer: Walk-in Customer');
    expect(payload.customer).toBe('Walk-in Customer');
  });
});
