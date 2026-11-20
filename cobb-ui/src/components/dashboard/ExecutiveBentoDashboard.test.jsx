import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExecutiveBentoDashboard, { getTargetProgress, getSalesTier } from './ExecutiveBentoDashboard';

// Mock dependencies
vi.mock('axios');
vi.mock('../GoodsInTransitDesk', () => ({
  default: () => <div data-testid="goods-in-transit-desk">Goods In Transit Desk</div>
}));
vi.mock('./QuickToolsWidget', () => ({
  default: () => <div data-testid="quick-tools-widget">Quick Tools</div>
}));
vi.mock('./ExecutiveKpiStrip', () => ({
  default: () => <div data-testid="executive-kpi-strip">KPI Strip</div>
}));
vi.mock('./MultiStoreFleetMatrix', () => ({
  default: () => <div data-testid="multi-store-fleet-matrix">Fleet Matrix</div>
}));

describe('ExecutiveBentoDashboard Target Progress Activity Rings', () => {
  describe('getTargetProgress logic', () => {
    it('calculates progress percentage for sales < 50k (in progress, sky blue ring)', () => {
      const p15k = getTargetProgress(15000, 50000);
      expect(p15k.status).toBe('progress');
      expect(p15k.pct).toBe(30);
      expect(p15k.rawPct).toBe(30);
      expect(p15k.ringColor).toBe('#38bdf8');
      expect(p15k.badgeIcon).toBe('⚡');

      const p40k = getTargetProgress(40000, 50000);
      expect(p40k.status).toBe('progress');
      expect(p40k.pct).toBe(80);
      expect(p40k.ringColor).toBe('#38bdf8');
    });

    it('identifies target hit for sales >= 50,000 (emerald green ring)', () => {
      const p50k = getTargetProgress(50000, 50000);
      expect(p50k.status).toBe('target');
      expect(p50k.pct).toBe(100);
      expect(p50k.ringColor).toBe('#10b981');
      expect(p50k.badgeIcon).toBe('🎯');
      expect(p50k.label).toBe('Target Hit');

      const p60k = getTargetProgress(60000, 50000);
      expect(p60k.status).toBe('target');
      expect(p60k.rawPct).toBe(120);
      expect(p60k.ringColor).toBe('#10b981');
    });

    it('identifies mega bumper day for sales >= 75,000 (radiant amber gold ring with star)', () => {
      const p75k = getTargetProgress(75000, 50000);
      expect(p75k.status).toBe('bumper');
      expect(p75k.badgeIcon).toBe('⭐');
      expect(p75k.ringColor).toBe('#f59e0b');
      expect(p75k.label).toBe('Mega Bumper Day');

      const p100k = getTargetProgress(100000, 50000);
      expect(p100k.status).toBe('bumper');
      expect(p100k.rawPct).toBe(200);
      expect(p100k.ringColor).toBe('#f59e0b');
    });

    it('maintains backward compatibility with getSalesTier', () => {
      const tier = getSalesTier(80000);
      expect(tier.tier).toBe('bumper');
      expect(tier.badgeIcon).toBe('⭐');
    });
  });

  describe('Calendar Grid Component with Activity Rings UI', () => {
    const fixedDate = new Date(2026, 10, 15); // Nov 15, 2026
    const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

    const mockDailySales = [
      { SaleDate: '2026-11-01', TotalSales: 15000, CashAmount: 5000, UPIAmount: 10000, CardAmount: 0, TotalBills: 6 }, // 30% progress
      { SaleDate: '2026-11-05', TotalSales: 35000, CashAmount: 15000, UPIAmount: 18000, CardAmount: 2000, TotalBills: 14 }, // 70% progress
      { SaleDate: '2026-11-10', TotalSales: 52000, CashAmount: 22000, UPIAmount: 25000, CardAmount: 5000, TotalBills: 23 }, // Target Hit (104%)
      { SaleDate: '2026-11-14', TotalSales: 88000, CashAmount: 38000, UPIAmount: 42000, CardAmount: 8000, TotalBills: 36 } // Mega Bumper (176%)
    ];

    it('renders the Sales Performance Calendar header and Activity Ring legend', () => {
      render(
        <ExecutiveBentoDashboard
          calendarDate={fixedDate}
          setCalendarDate={vi.fn()}
          selectedCalendarDay={null}
          setSelectedCalendarDay={vi.fn()}
          dailySales={mockDailySales}
          formatCurrency={formatCurrency}
          darkMode={true}
        />
      );

      expect(screen.getByText(/Sales Performance Calendar/i)).toBeDefined();
      expect(screen.getByText(/In Progress \(<100%\)/i)).toBeDefined();
      expect(screen.getByText(/100% Target Hit/i)).toBeDefined();
      expect(screen.getByText(/⭐ Mega Day/i)).toBeDefined();
    });

    it('renders circular progress rings for sales days', () => {
      render(
        <ExecutiveBentoDashboard
          calendarDate={fixedDate}
          setCalendarDate={vi.fn()}
          selectedCalendarDay={null}
          setSelectedCalendarDay={vi.fn()}
          dailySales={mockDailySales}
          formatCurrency={formatCurrency}
          darkMode={true}
        />
      );

      // Day 1 has ₹15,000 (30% of target)
      const day1Btn = screen.getByTitle(/2026-11-01: ₹15,000 \(30% of target\)/i);
      expect(day1Btn).toBeDefined();

      // Day 10 has ₹52,000 (104% of target - Target Hit)
      const day10Btn = screen.getByTitle(/2026-11-10: ₹52,000 \(104% of target\)/i);
      expect(day10Btn).toBeDefined();

      // Day 14 has ₹88,000 (176% of target - Mega Bumper Day)
      const day14Btn = screen.getByTitle(/2026-11-14: ₹88,000 \(176% of target\)/i);
      expect(day14Btn).toBeDefined();
    });

    it('opens enhanced tooltip popover when a sales day is selected', () => {
      render(
        <ExecutiveBentoDashboard
          calendarDate={fixedDate}
          setCalendarDate={vi.fn()}
          selectedCalendarDay={14} // Nov 14 (Mega Bumper Day)
          setSelectedCalendarDay={vi.fn()}
          dailySales={mockDailySales}
          formatCurrency={formatCurrency}
          darkMode={true}
        />
      );

      // Verify Popover displays Tier Badge
      expect(screen.getByText(/Mega Bumper Day/i)).toBeDefined();
      expect(screen.getByText('₹88,000')).toBeDefined();
      expect(screen.getByText('36 bills')).toBeDefined();
      expect(screen.getByText('₹38,000')).toBeDefined(); // Cash
      expect(screen.getByText('₹42,000')).toBeDefined(); // UPI
      expect(screen.getByText('₹8,000')).toBeDefined(); // Card
    });
  });
});
