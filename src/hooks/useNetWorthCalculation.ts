import { useMemo } from 'react';
import { useNetWorthStore } from '../stores/networthStore';
import { useCurrentHoldings } from './useCurrentHoldings';
import type { NetWorthCalculation } from '../types/index';

export function useNetWorthCalculation(): NetWorthCalculation {
  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const { totalValue: portfolioValue } = useCurrentHoldings();

  return useMemo(() => {
    const manualAssetsTotal = manualEntries
      .filter((e) => !e.isLiability)
      .reduce((sum, e) => sum + e.value, 0);
    const manualLiabilitiesTotal = manualEntries
      .filter((e) => e.isLiability)
      .reduce((sum, e) => sum + e.value, 0);

    const totalAssets = portfolioValue + manualAssetsTotal;
    const totalLiabilities = manualLiabilitiesTotal;
    const netWorth = totalAssets - totalLiabilities;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      portfolioValue,
      manualAssetsTotal,
      manualLiabilitiesTotal,
    };
  }, [manualEntries, portfolioValue]);
}
