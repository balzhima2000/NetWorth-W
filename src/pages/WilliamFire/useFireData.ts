/**
 * Data hook for the William FIRE page.
 * Derives the single FIRE model (one path to independence, not four calculators)
 * from the settings assumptions + the user's current net worth.
 */
import { useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { calculateCurrentHoldings, calcYearsToFire } from '../../utils/calculations';

export type FireRange = '5Y' | '10Y' | '20Y' | '30Y' | 'FI';

// Traditional retirement age used to derive the Coast FIRE number.
const RETIREMENT_AGE = 65;
const MAX_HORIZON = 50;

export interface Milestone {
  id: 'coast' | 'lean' | 'fire' | 'fat';
  label: string;
  amount: number;
  year: number | null; // projected calendar year reached, null once already reached
  reached: boolean;
}

export interface ProjectionPoint {
  year: number;      // calendar year
  projected: number; // net worth with continued savings
  coast: number;     // net worth if you stopped saving today (growth only)
}

export function useFireData(range: FireRange) {
  const trades           = usePortfolioStore((s) => s.trades);
  const currentPrices    = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const manualEntries    = useNetWorthStore((s) => s.manualEntries);

  const defaultCurrency  = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates    = useSettingsStore((s) => s.exchangeRates);
  const annualExpenses   = useSettingsStore((s) => s.fireAnnualExpenses);
  const withdrawalRate   = useSettingsStore((s) => s.fireWithdrawalRate);
  const expectedReturn   = useSettingsStore((s) => s.fireExpectedReturn);
  const monthlyContribution = useSettingsStore((s) => s.fireMonthlyContribution);
  const currentAge       = useSettingsStore((s) => s.fireCurrentAge);
  const userTargetAge    = useSettingsStore((s) => s.fireTargetAge);

  // ── Current net worth (portfolio + manual assets − liabilities) ──
  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates],
  );
  const portfolioValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const manualAssets      = manualEntries.filter((e) => !e.isLiability).reduce((s, e) => s + e.value, 0);
  const manualLiabilities = manualEntries.filter((e) =>  e.isLiability).reduce((s, e) => s + e.value, 0);
  const netWorth = portfolioValue + manualAssets - manualLiabilities;

  const hasProfile = annualExpenses != null && annualExpenses > 0;

  return useMemo(() => {
    const r = (expectedReturn || 0) / 100;
    const monthly = monthlyContribution ?? 0;
    const annualSavings = monthly * 12;
    const expensesMultiple = withdrawalRate > 0 ? 100 / withdrawalRate : 25;
    const fiNumber = hasProfile ? (annualExpenses as number) * expensesMultiple : 0;

    const thisYear = new Date().getFullYear();

    // Years / projected date to reach the full FIRE number.
    const toFire = fiNumber > 0
      ? calcYearsToFire(netWorth, monthly, expectedReturn, fiNumber)
      : { years: 0, targetYear: thisYear, projectionData: [] };
    const reachedFI = netWorth >= fiNumber && fiNumber > 0;
    const yearsToFire = reachedFI ? 0 : toFire.years;
    const withinReach = fiNumber > 0 && yearsToFire > 0 && yearsToFire < MAX_HORIZON;
    const fireYear = reachedFI ? thisYear : (withinReach ? toFire.targetYear : null);
    // Target FI age is a user goal (falls back to the projected age if unset);
    // its year derives from current age + the age gap.
    const targetAge = userTargetAge ?? (currentAge != null && fireYear != null ? currentAge + (fireYear - thisYear) : null);
    const targetYear = currentAge != null && targetAge != null ? thisYear + (targetAge - currentAge) : fireYear;

    const progressPct = fiNumber > 0 ? (netWorth / fiNumber) * 100 : 0;

    // ── Milestone ladder — one model, four thresholds ──
    const yearsToRetirement = currentAge != null ? Math.max(RETIREMENT_AGE - currentAge, 0) : 0;
    const coastAmount = yearsToRetirement > 0 ? fiNumber / Math.pow(1 + r, yearsToRetirement) : fiNumber;
    const rawMilestones: { id: Milestone['id']; label: string; amount: number }[] = [
      { id: 'coast', label: 'Coast FIRE', amount: coastAmount },
      { id: 'lean',  label: 'Lean FIRE',  amount: 0.6 * fiNumber },
      { id: 'fire',  label: 'FIRE',       amount: fiNumber },
      { id: 'fat',   label: 'Fat FIRE',   amount: 1.6 * fiNumber },
    ];
    const milestones: Milestone[] = rawMilestones
      .sort((a, b) => a.amount - b.amount)
      .map((m) => {
        const reached = netWorth >= m.amount;
        let year: number | null = null;
        if (!reached && m.amount > 0) {
          const res = calcYearsToFire(netWorth, monthly, expectedReturn, m.amount);
          year = res.years < MAX_HORIZON ? res.targetYear : null;
        }
        return { ...m, reached, year };
      });
    const nextMilestone = milestones.find((m) => !m.reached) ?? null;
    const maxMilestone = Math.max(...milestones.map((m) => m.amount), netWorth, 1);

    // ── Projection chart series for the selected horizon ──
    // FI horizon ends exactly at the FI year so the end-dot lands on the FI
    // line (matches Figma: "Now → <FI year>", dot on the $1.25M target line).
    const horizon = range === 'FI'
      ? Math.min(Math.max(Math.ceil(yearsToFire), 5), MAX_HORIZON)
      : parseInt(range);
    const mr = r / 12;
    const projection: ProjectionPoint[] = [{ year: thisYear, projected: netWorth, coast: netWorth }];
    let p = netWorth;
    for (let y = 1; y <= horizon; y++) {
      for (let m = 0; m < 12; m++) p = p * (1 + mr) + monthly;
      projection.push({
        year: thisYear + y,
        projected: Math.round(p),
        coast: Math.round(netWorth * Math.pow(1 + r, y)),
      });
    }
    const projectedEnd = projection[projection.length - 1].projected;
    const horizonYear = thisYear + horizon;
    const gainOverHorizon = projectedEnd - netWorth;

    return {
      hasProfile,
      defaultCurrency,
      netWorth,
      annualExpenses: annualExpenses ?? 0,
      annualSavings,
      withdrawalRate,
      expectedReturn,
      currentAge,
      expensesMultiple,
      fiNumber,
      progressPct,
      reachedFI,
      yearsToFire,
      fireYear,
      targetAge,
      targetYear,
      milestones,
      nextMilestone,
      maxMilestone,
      projection,
      projectedEnd,
      horizonYear,
      gainOverHorizon,
    };
  }, [hasProfile, defaultCurrency, netWorth, annualExpenses, withdrawalRate, expectedReturn, monthlyContribution, currentAge, userTargetAge, range]);
}
