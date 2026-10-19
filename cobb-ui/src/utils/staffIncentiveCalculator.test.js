import { describe, it, expect } from 'vitest';
import {
  filterActiveSalesmen,
  calculateDividedTarget,
  getIncentiveTier,
  calculateSalesmanIncentive,
  calculateStaffExpensesSummary
} from './staffIncentiveCalculator';

describe('Staff Incentive & Dynamic Salary Calculation Engine', () => {
  const sampleSalesmen = [
    { id: '1', name: 'Vikas', salary: 16000, mtdSales: 340000 },
    { id: '2', name: 'Pawan', salary: 18000, mtdSales: 430000 },
    { id: '3', name: 'Simran', salary: '', mtdSales: 50000 },
    { id: '4', name: 'Akhil', salary: 0, mtdSales: 0 }
  ];

  it('filters only salesmen whose salary is filled (> 0)', () => {
    const active = filterActiveSalesmen(sampleSalesmen);
    expect(active.length).toBe(2);
    expect(active.map(s => s.name)).toEqual(['Vikas', 'Pawan']);
  });

  it('divides store target equally among active salesmen', () => {
    const targetPerStaff = calculateDividedTarget(900000, 2);
    expect(targetPerStaff).toBe(450000);
  });

  it('returns correct incentive tiers based on achievement percentage', () => {
    expect(getIncentiveTier(45).rate).toBe(0.0);
    expect(getIncentiveTier(50).rate).toBe(0.5);
    expect(getIncentiveTier(60).rate).toBe(0.5);
    expect(getIncentiveTier(75).rate).toBe(0.75);
    expect(getIncentiveTier(90).rate).toBe(0.75);
    expect(getIncentiveTier(95).rate).toBe(1.0);
    expect(getIncentiveTier(110).rate).toBe(1.0);
  });

  it('calculates individual incentives in target mode (100% target met = 1.0%)', () => {
    const result = calculateSalesmanIncentive({
      salary: 16000,
      mtdSales: 0,
      targetPerSalesman: 450000,
      mode: 'target'
    });
    expect(result.isActive).toBe(true);
    expect(result.rate).toBe(1.0);
    expect(result.amount).toBe(4500); // 1% of 450,000
  });

  it('calculates individual incentives in live MTD mode with 75% and 95% tiers', () => {
    // Vikas: 340,000 / 450,000 = 75.5% (Tier: 0.75%)
    const vikas = calculateSalesmanIncentive({
      salary: 16000,
      mtdSales: 340000,
      targetPerSalesman: 450000,
      mode: 'live'
    });
    expect(vikas.rate).toBe(0.75);
    expect(vikas.amount).toBe(Math.round(340000 * 0.0075)); // 2550

    // Pawan: 430,000 / 450,000 = 95.5% (Tier: 1.0%)
    const pawan = calculateSalesmanIncentive({
      salary: 18000,
      mtdSales: 430000,
      targetPerSalesman: 450000,
      mode: 'live'
    });
    expect(pawan.rate).toBe(1.0);
    expect(pawan.amount).toBe(Math.round(430000 * 0.01)); // 4300

    // Associate under 50%: e.g. 100,000 / 450,000 = 22.2% (Tier: 0%)
    const underHalf = calculateSalesmanIncentive({
      salary: 15000,
      mtdSales: 100000,
      targetPerSalesman: 450000,
      mode: 'live'
    });
    expect(underHalf.rate).toBe(0.0);
    expect(underHalf.amount).toBe(0);
  });

  it('calculates total staff summary: base salaries + target incentives', () => {
    const summary = calculateStaffExpensesSummary({
      salesmen: sampleSalesmen,
      monthlyTargetSales: 900000,
      mode: 'target'
    });

    expect(summary.activeSalesmenCount).toBe(2);
    expect(summary.targetPerSalesman).toBe(450000);
    expect(summary.totalBaseSalary).toBe(34000); // 16000 + 18000
    expect(summary.totalIncentive).toBe(9000);   // 4500 + 4500
    expect(summary.totalStaffCost).toBe(43000);  // 34000 + 9000
  });
});
