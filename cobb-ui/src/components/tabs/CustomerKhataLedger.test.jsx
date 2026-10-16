import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomerKhataLedger from './CustomerKhataLedger';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../utils/firebase', () => ({
  db: null
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), addToast: vi.fn() })
}));
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqr')
  }
}));

describe('Customer Udhar / Khata Credit Ledger', () => {
  const mockCustomers = [
    {
      id: 'khata_9812345678',
      name: 'Sanjay Singhal',
      phone: '9812345678',
      city: 'Pundri',
      creditLimit: 30000,
      balance: 6500,
      totalGave: 24500,
      totalGot: 18000,
      trustRating: 'TRUSTED',
      status: 'ACTIVE',
      notes: 'Regular family customer',
      transactions: [
        {
          id: 'txn_101',
          customerId: 'khata_9812345678',
          type: 'GAVE',
          amount: 11500,
          balanceAfter: 11500,
          billNumber: 'CM-0891',
          itemsSummary: '1 Suit Set',
          date: '2026-10-10',
          time: '18:15:00',
          timestamp: '2026-10-10T18:15:00.000Z'
        },
        {
          id: 'txn_102',
          customerId: 'khata_9812345678',
          type: 'GOT',
          amount: 5000,
          balanceAfter: 6500,
          paymentMode: 'UPI',
          date: '2026-10-14',
          time: '14:20:00',
          timestamp: '2026-10-14T14:20:00.000Z'
        }
      ]
    },
    {
      id: 'khata_9416012345',
      name: 'Vikas Sharma',
      phone: '9416012345',
      city: 'Pundri',
      creditLimit: 25000,
      balance: 4200,
      totalGave: 15200,
      totalGot: 11000,
      trustRating: 'TRUSTED',
      status: 'ACTIVE',
      transactions: []
    }
  ];

  const mockSummary = {
    totalOutstanding: 10700,
    totalCreditGiven: 39700,
    totalCollected: 29000,
    collectedThisMonth: 12000,
    totalAccounts: 2,
    activeDuesCount: 2,
    settledCount: 0,
    overdueCount: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/khata/customer/')) {
        return Promise.resolve({
          data: {
            success: true,
            customer: mockCustomers[0]
          }
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          customers: mockCustomers,
          summary: mockSummary
        }
      });
    });
  });

  it('renders top metric bento cards with outstanding dues and collections', async () => {
    await React.act(async () => {
      render(<CustomerKhataLedger />);
    });

    expect(screen.getByText(/Total Store Udhar/i)).toBeDefined();
    expect(screen.getByText(/Collected This Month/i)).toBeDefined();
    expect(screen.getByText(/Overdue \/ 30D\+/i)).toBeDefined();
    expect(screen.getByText(/₹10,700/i)).toBeDefined();
  });

  it('renders customer directory and displays customer names', async () => {
    await React.act(async () => {
      render(<CustomerKhataLedger />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Sanjay Singhal').length).toBeGreaterThan(0);
      expect(screen.getByText('Vikas Sharma')).toBeDefined();
    });
  });

  it('renders customer passbook ledger with debit and credit amounts', async () => {
    await React.act(async () => {
      render(<CustomerKhataLedger />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Account Ledger History/i)).toBeDefined();
      expect(screen.getAllByText('₹11,500').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₹5,000').length).toBeGreaterThan(0);
    });
  });

  it('filters customers in directory when searching by name', async () => {
    await React.act(async () => {
      render(<CustomerKhataLedger />);
    });

    await waitFor(() => {
      expect(screen.getByText('Vikas Sharma')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name, phone or city/i);
    await React.act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Vikas' } });
    });

    // In directory (h4), Vikas Sharma should exist while Sanjay Singhal is filtered out
    expect(screen.getByRole('heading', { level: 4, name: 'Vikas Sharma' })).toBeDefined();
    expect(screen.queryByRole('heading', { level: 4, name: 'Sanjay Singhal' })).toBeNull();
  });
});
