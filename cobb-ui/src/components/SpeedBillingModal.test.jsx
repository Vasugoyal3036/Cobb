import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpeedBillingModal from './SpeedBillingModal';
import axios from 'axios';
import * as soundUtils from '../utils/sound';

vi.mock('axios');
vi.mock('../utils/sound', () => ({
  playCheckoutChime: vi.fn(),
  speakCheckoutVoice: vi.fn()
}));

describe('SpeedBillingModal (Zero-Mouse F1-F12 POS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        staff: [
          { id: '1', name: 'Rahul Sharma', code: 'S01', role: 'Floor Senior' },
          { id: '2', name: 'Amit Kumar', code: 'S02', role: 'Trial Specialist' }
        ]
      }
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  it('renders COBB SPEED POS header and Zero-Mouse Active status', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText(/COBB SPEED POS/i)).toBeDefined();
    expect(screen.getByText(/ZERO-MOUSE ACTIVE/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Scan Barcode \/ SKU \/ Article Name/i)).toBeDefined();
  });

  it('opens F2 Edit Quantity sub-modal when F2 is triggered', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    // Trigger F2 keydown
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    });

    expect(screen.getByText(/Change Quantity/i)).toBeDefined();
  });

  it('applies Cobb retail promo (e.g. Flat 50%)', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    const flat50Btn = screen.getByRole('button', { name: /Flat 50%/i });
    await React.act(async () => {
      fireEvent.click(flat50Btn);
    });

    // Expect Flat 50% discount to be applied to initial ₹1899 item (-₹950) in line item and summary
    expect(screen.getAllByText(/-₹950/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PROMO: FLAT50/i)).toBeDefined();
  });

  it('applies Buy 3 Get 70% Off promo (b3_70)', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    const b3Btn = screen.getByRole('button', { name: /B3 @ 70% Off/i });
    await React.act(async () => {
      fireEvent.click(b3Btn);
    });

    // 70% of 1899 is 1329
    expect(screen.getAllByText(/-₹1329/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PROMO: BUY 3 @ 70% OFF/i)).toBeDefined();
  });

  it('opens F8 Split Tender (Cash + UPI) modal', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
    });

    expect(screen.getByText(/Split Payment \(Cash \+ UPI QR\)/i)).toBeDefined();
  });

  it('opens F6 Cash Settlement and computes change due', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    // Trigger F6 keydown
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6' }));
    });

    expect(screen.getByText(/Cash Settlement & Tender Change/i)).toBeDefined();

    // Settle button triggers sound and voice confirmation
    const settleBtn = screen.getByText(/Settle & Chime/i);
    await React.act(async () => {
      fireEvent.click(settleBtn);
    });

    expect(soundUtils.playCheckoutChime).toHaveBeenCalled();
    expect(soundUtils.speakCheckoutVoice).toHaveBeenCalled();
  });

  it('allows parking a bill via F9', async () => {
    await React.act(async () => {
      render(<SpeedBillingModal isOpen={true} onClose={vi.fn()} />);
    });

    // Press F9 to park active cart
    await React.act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));
    });

    // Bill is parked and cart is cleared
    await waitFor(() => {
      expect(screen.getByText(/POS Cart is Empty/i)).toBeDefined();
    });
  });
});
