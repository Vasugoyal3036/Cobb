import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DenominationModal from './DenominationModal';
import axios from 'axios';

vi.mock('axios');

describe('Feature 2: Cash Drawer Denomination Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        billCount: 15,
        cashAmount: 14500,
        openingCash: 2000
      }
    });
  });

  it('renders denomination input fields and expected drawer calculations', async () => {
    await React.act(async () => {
      render(<DenominationModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText(/Cash Drawer & Denomination Counter/i)).toBeDefined();
    expect(screen.getByText(/Opening Float/i)).toBeDefined();
    expect(screen.getByText(/Today's Cash Sales/i)).toBeDefined();

    // Check denomination labels
    expect(screen.getByText(/₹2,000 Note/i)).toBeDefined();
    expect(screen.getByText(/₹500 Note/i)).toBeDefined();
    expect(screen.getByText(/₹100 Note/i)).toBeDefined();
    expect(screen.getByText(/Coins & Loose Cash/i)).toBeDefined();
  });

  it('dynamically computes subtotal and physical cash as notes are entered', async () => {
    await React.act(async () => {
      render(<DenominationModal isOpen={true} onClose={vi.fn()} />);
    });

    const inputs = screen.getAllByRole('spinbutton');
    // Input 0 is ₹2000 note count, Input 1 is ₹500 note count
    await React.act(async () => {
      fireEvent.change(inputs[0], { target: { value: '2' } }); // 2 x 2000 = 4000
      fireEvent.change(inputs[1], { target: { value: '4' } }); // 4 x 500 = 2000
    });

    // Physical total should update to ₹6,000
    await waitFor(() => {
      expect(screen.getByText('₹6,000')).toBeDefined();
    });
  });

  it('flags shortage when physical cash is less than expected', async () => {
    await React.act(async () => {
      render(<DenominationModal isOpen={true} onClose={vi.fn()} />);
    });

    // Default expected is opening (2000) + sales (14500) = 16500
    // If we count 10 x 500 = 5000
    const inputs = screen.getAllByRole('spinbutton');
    await React.act(async () => {
      fireEvent.change(inputs[1], { target: { value: '10' } }); // 5,000
    });

    await waitFor(() => {
      expect(screen.getByText(/Shortage/i)).toBeDefined();
    });
  });
});
