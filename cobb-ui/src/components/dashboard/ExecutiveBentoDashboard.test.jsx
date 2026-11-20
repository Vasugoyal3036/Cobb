import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExecutiveBentoDashboard, { getSalesTier } from './ExecutiveBentoDashboard';

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

describe('ExecutiveBentoDashboard Sales Calendar Color Coding', () => {
  describe('getSalesTier logic', () => {
    it('categorizes sales < 15,000 as low tier (orange)', () => {
      const tier0 = getSalesTier(0);
      expect(tier0.tier).toBe('low');
      expect(tier0.badgeIcon).toBe('⏳');

      const tier12k = getSalesTier(12500);
      expect(tier12k.tier).toBe('low');
      expect(tier12k.label).toBe('Low Sales');
      expect(tier12k.shortLabel).toBe('<₹15k');
    });

    it('categorizes sales 15,000 to 34,999 as normal tier (blue)', () => {
      const tier15k = getSalesTier(15000);
      expect(tier15k.tier).toBe('normal');
      expect(tier15k.label).toBe('Normal Sales');

      const tier30k = getSalesTier(30000);
      expect(tier30k.tier).toBe('normal');
      expect(tier30k.shortLabel).toBe('₹15k-35k');
    });

    it('categorizes sales 35,000 to 49,999 as good/high tier (teal)', () => {
      const tier35k = getSalesTier(35000);
      expect(tier35k.tier).toBe('high');
      expect(tier35k.badgeIcon).toBe('🔥');

      const tier48k = getSalesTier(48500);
      expect(tier48k.tier).toBe('high');
      expect(tier48k.label).toBe('Good / High Sales');
      expect(tier48k.shortLabel).toBe('₹35k-50k');
    });

    it('categorizes sales 50,000 to 74,999 as target hit tier (emerald green)', () => {
      const tier50k = getSalesTier(50000);
      expect(tier50k.tier).toBe('target');
      expect(tier50k.badgeIcon).toBe('🎯');
      expect(tier50k.label).toBe('Target Hit');

      const tier65k = getSalesTier(65000);
      expect(tier65k.tier).toBe('target');
      expect(tier65k.shortLabel).toBe('₹50k-75k');
    });

    it('categorizes sales >= 75,000 as mega bumper day tier (gold/star)', () => {
      const tier75k = getSalesTier(75000);
      expect(tier75k.tier).toBe('bumper');
      expect(tier75k.badgeIcon).toBe('⭐');
      expect(tier75k.label).toBe('Mega Bumper Day');
      expect(tier75k.shortLabel).toBe('≥₹75k');

      const tier100k = getSalesTier(120000);
      expect(tier100k.tier).toBe('bumper');
    });
  });

  describe('Calendar Grid Component UI', () => {
    const fixedDate = new Date(2026, 10, 15); // Nov 15, 2026
    const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

    const mockDailySales = [
      { SaleDate: '2026-11-01', TotalSales: 8000, CashAmount: 5000, UPIAmount: 3000, CardAmount: 0, TotalBills: 4 }, // Low Tier
      { SaleDate: '2026-11-05', TotalSales: 22000, CashAmount: 10000, UPIAmount: 10000, CardAmount: 2000, TotalBills: 9 }, // Normal Tier
      { SaleDate: '2026-11-10', TotalSales: 42000, CashAmount: 20000, UPIAmount: 15000, CardAmount: 7000, TotalBills: 15 }, // High Tier
      { SaleDate: '2026-11-12', TotalSales: 58000, CashAmount: 25000, UPIAmount: 25000, CardAmount: 8000, TotalBills: 21 }, // Target Hit Tier
      { SaleDate: '2026-11-14', TotalSales: 92000, CashAmount: 40000, UPIAmount: 42000, CardAmount: 10000, TotalBills: 34 } // Bumper Mega Tier
    ];

    it('renders the Sales Performance Calendar header and 5-tier color legend', () => {
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
      expect(screen.getByText(/<15k/i)).toBeDefined();
      expect(screen.getByText(/15k-35k/i)).toBeDefined();
      expect(screen.getByText(/35k-50k/i)).toBeDefined();
      expect(screen.getByText(/50k-75k/i)).toBeDefined();
      expect(screen.getByText(/⭐75k\+/i)).toBeDefined();
    });

    it('renders color-coded day tiles according to revenue brackets', () => {
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

      // Day 1 has ₹8,000 (Low tier: orange)
      const day1Btn = screen.getByTitle(/2026-11-01: ₹8,000 \(Low Sales\)/i);
      expect(day1Btn).toBeDefined();
      expect(day1Btn.className).toContain('text-orange-200');

      // Day 5 has ₹22,000 (Normal tier: blue)
      const day5Btn = screen.getByTitle(/2026-11-05: ₹22,000 \(Normal Sales\)/i);
      expect(day5Btn).toBeDefined();
      expect(day5Btn.className).toContain('text-blue-200');

      // Day 10 has ₹42,000 (High tier: teal)
      const day10Btn = screen.getByTitle(/2026-11-10: ₹42,000 \(Good \/ High Sales\)/i);
      expect(day10Btn).toBeDefined();
      expect(day10Btn.className).toContain('text-teal-200');

      // Day 12 has ₹58,000 (Target hit: emerald)
      const day12Btn = screen.getByTitle(/2026-11-12: ₹58,000 \(Target Hit\)/i);
      expect(day12Btn).toBeDefined();
      expect(day12Btn.className).toContain('text-emerald-200');

      // Day 14 has ₹92,000 (Bumper mega: gold/amber)
      const day14Btn = screen.getByTitle(/2026-11-14: ₹92,000 \(Mega Bumper Day\)/i);
      expect(day14Btn).toBeDefined();
      expect(day14Btn.className).toContain('text-amber-200');
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
      expect(screen.getByText('Mega Bumper Day')).toBeDefined();
      expect(screen.getByText('₹92,000')).toBeDefined();
      expect(screen.getByText('34 bills')).toBeDefined();
      expect(screen.getByText('₹40,000')).toBeDefined(); // Cash
      expect(screen.getByText('₹42,000')).toBeDefined(); // UPI
      expect(screen.getByText('₹10,000')).toBeDefined(); // Card
    });
  });
});
