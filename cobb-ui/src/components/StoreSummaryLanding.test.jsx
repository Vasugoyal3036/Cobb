import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoreSummaryLanding from './StoreSummaryLanding';
import axios from 'axios';

vi.mock('axios');
vi.mock('../utils/firebase', () => ({
  db: null
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn())
}));

describe('StoreSummaryLanding [Clean 1-Page Summary Landing]', () => {
  const mockBills = [
    {
      id: 'b1',
      date: new Date().toISOString(),
      netAmount: 3999,
      totalQty: 2
    },
    {
      id: 'b2',
      date: new Date().toISOString(),
      netAmount: 1999,
      totalQty: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/pending-tags')) {
        return Promise.resolve({ data: { success: true, summary: { activeCount: 5 } } });
      }
      if (url.includes('/api/damages')) {
        return Promise.resolve({ data: { success: true, summary: { quarantinedCount: 2, quarantinedMrp: 4999 } } });
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  it('renders store summary header and core metric cards', async () => {
    render(
      <StoreSummaryLanding
        activeStore="DEMO_STORE_001"
        AVAILABLE_STORES={[{ id: 'DEMO_STORE_001', name: 'Goyal - House Of Fashion (Pundri)' }]}
        liveBills={mockBills}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText(/Goyal - House Of Fashion/i)).toBeDefined();
    expect(screen.getByText("Today's Sales")).toBeDefined();
    expect(screen.getByText("Today's Bills")).toBeDefined();
    expect(screen.getAllByText(/B1G2 Pending Tags/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Damaged Clothes/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/₹5,998/i)).toBeDefined();
    });
  });

  it('renders 4 main workspace launcher tiles and triggers navigation', () => {
    const onNavigate = vi.fn();
    render(
      <StoreSummaryLanding
        activeStore="DEMO_STORE_001"
        AVAILABLE_STORES={[{ id: 'DEMO_STORE_001', name: 'Goyal - House Of Fashion (Pundri)' }]}
        liveBills={mockBills}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText(/⚡ Billing & Counter/i)).toBeDefined();
    expect(screen.getByText(/🏷️ Stock & Tags/i)).toBeDefined();
    expect(screen.getByText(/👥 Customers & Khata/i)).toBeDefined();
    expect(screen.getByText(/📊 Store Reports/i)).toBeDefined();

    fireEvent.click(screen.getByText(/⚡ Billing & Counter/i));
    expect(onNavigate).toHaveBeenCalledWith('billing', 'speed_billing');

    fireEvent.click(screen.getByText(/🏷️ Stock & Tags/i));
    expect(onNavigate).toHaveBeenCalledWith('stock', 'pending_tags');
  });
});
