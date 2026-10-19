/**
 * Staff Incentive & Dynamic Salary Calculation Engine
 * 
 * Rules:
 * 1. Only salesmen with filled salary (> 0) count as active.
 *    (Salesmen without filled salary no longer work at the store).
 * 2. Store monthly target is divided equally among active working salesmen.
 * 3. Individual incentive rate based on target achievement:
 *    - >= 95% of target: 1.0%
 *    - >= 75% of target: 0.75%
 *    - >= 50% of target (half): 0.50%
 *    - < 50% of target: 0.0%
 */

export function filterActiveSalesmen(salesmen = []) {
  return (salesmen || []).filter(
    s => s && s.salary !== '' && s.salary !== null && s.salary !== undefined && Number(s.salary) > 0
  );
}

export function calculateDividedTarget(monthlyStoreTarget = 900000, activeCount = 1) {
  const target = Number(monthlyStoreTarget) > 0 ? Number(monthlyStoreTarget) : 900000;
  const count = Number(activeCount) > 0 ? Number(activeCount) : 1;
  return Math.round(target / count);
}

export function getIncentiveTier(achievementPct = 0) {
  const ach = Number(achievementPct) || 0;
  if (ach >= 95) {
    return {
      rate: 1.0,
      slabLabel: '≥ 95% Target (1.0%)',
      tierCode: 'tier1'
    };
  }
  if (ach >= 75) {
    return {
      rate: 0.75,
      slabLabel: '≥ 75% Target (0.75%)',
      tierCode: 'tier2'
    };
  }
  if (ach >= 50) {
    return {
      rate: 0.5,
      slabLabel: '≥ 50% Target (0.5%)',
      tierCode: 'tier3'
    };
  }
  return {
    rate: 0.0,
    slabLabel: '< 50% Target (0%)',
    tierCode: 'tier4'
  };
}

export function calculateSalesmanIncentive({
  salary = '',
  mtdSales = 0,
  targetPerSalesman = 450000,
  mode = 'target'
}) {
  const isFilled = salary !== '' && salary !== null && salary !== undefined && Number(salary) > 0;
  if (!isFilled) {
    return {
      isActive: false,
      rate: 0,
      amount: 0,
      slabLabel: 'Inactive / Left',
      achievementPct: 0,
      target: 0
    };
  }

  const target = Number(targetPerSalesman) > 0 ? Number(targetPerSalesman) : 450000;

  if (mode === 'target') {
    // 100% Target Met (>= 95% tier => 1.0%)
    const tier = getIncentiveTier(100);
    const amount = Math.round((target * tier.rate) / 100);
    return {
      isActive: true,
      rate: tier.rate,
      amount,
      slabLabel: tier.slabLabel,
      achievementPct: 100,
      target
    };
  }

  // Live MTD Sales Achievement Mode
  const sales = Math.max(0, Number(mtdSales) || 0);
  const achPct = target > 0 ? (sales / target) * 100 : 0;
  const tier = getIncentiveTier(achPct);
  const amount = Math.round((sales * tier.rate) / 100);

  return {
    isActive: true,
    rate: tier.rate,
    amount,
    slabLabel: tier.slabLabel,
    achievementPct: Math.round(achPct),
    target
  };
}

export function calculateStaffExpensesSummary({
  salesmen = [],
  monthlyTargetSales = 900000,
  mode = 'target'
}) {
  const activeSalesmen = filterActiveSalesmen(salesmen);
  const activeCount = activeSalesmen.length;
  const targetPerSalesman = calculateDividedTarget(monthlyTargetSales, activeCount || 1);

  let totalBaseSalary = 0;
  let totalIncentive = 0;

  activeSalesmen.forEach(s => {
    totalBaseSalary += Number(s.salary) || 0;
    const inc = calculateSalesmanIncentive({
      salary: s.salary,
      mtdSales: s.mtdSales,
      targetPerSalesman,
      mode
    });
    totalIncentive += inc.amount;
  });

  const totalStaffCost = totalBaseSalary + totalIncentive;

  return {
    activeSalesmenCount: activeCount,
    targetPerSalesman,
    totalBaseSalary,
    totalIncentive,
    totalStaffCost,
    mode
  };
}
