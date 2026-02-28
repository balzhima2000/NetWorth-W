import type {
  StockTrade,
  CurrentHolding,
  FireProjectionPoint,
  SWRTableRow,
  CompoundChartPoint,
} from '../types/index';

// ============================================================
// PORTFOLIO CALCULATIONS
// ============================================================
/**
 * Calculate current holdings from trades array
 * Groups by ticker, calculates blended cost basis, filters out fully sold positions
 */
export function calculateCurrentHoldings(
  trades: StockTrade[],
  currentPrices: Record<string, number>,
  lastPriceUpdates: Record<string, string>
): CurrentHolding[] {
  // Group trades by ticker
  const byTicker: Record<string, StockTrade[]> = {};
  trades.forEach((trade) => {
    if (!byTicker[trade.ticker]) byTicker[trade.ticker] = [];
    byTicker[trade.ticker].push(trade);
  });

  const holdings: CurrentHolding[] = [];

  for (const ticker of Object.keys(byTicker)) {
    const tickerTrades = byTicker[ticker];

    // Calculate net shares held
    let sharesHeld = 0;
    let totalCostBasis = 0;

    // Process buys
    const buys = tickerTrades.filter((t) => t.sellPrice === null);
    buys.forEach((trade) => {
      sharesHeld += trade.quantity;
      totalCostBasis += trade.quantity * trade.buyPrice;
    });

    // Subtract sells
    const sells = tickerTrades.filter((t) => t.sellPrice !== null);
    sells.forEach((trade) => {
      sharesHeld -= trade.quantity;
    });

    // Skip if no shares held
    if (sharesHeld <= 0) continue;

    const blendedCostBasis = sharesHeld > 0 ? totalCostBasis / buys.reduce((a, b) => a + b.quantity, 0) : 0;
    const currentPrice = currentPrices[ticker] ?? blendedCostBasis; // fallback to cost basis if no price
    const currentValue = sharesHeld * currentPrice;
    const costBasisTotal = sharesHeld * blendedCostBasis;
    const unrealizedGain = currentValue - costBasisTotal;
    const unrealizedGainPercent = costBasisTotal > 0 ? (unrealizedGain / costBasisTotal) * 100 : 0;

    // Get the most recent trade for name/category
    const latestTrade = tickerTrades.sort(
      (a, b) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
    )[0];

    holdings.push({
      ticker,
      name: latestTrade.name,
      assetCategory: latestTrade.assetCategory,
      sharesHeld,
      blendedCostBasis,
      currentPrice,
      currentValue,
      costBasisTotal,
      unrealizedGain,
      unrealizedGainPercent,
      portfolioPercent: 0, // calculated after all holdings are known
      lastPriceUpdate: lastPriceUpdates[ticker] ?? null,
    });
  }

  // Calculate portfolio percentages
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  holdings.forEach((h) => {
    h.portfolioPercent = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
  });

  return holdings;
}
/**
 * Calculate P&L for a sell trade
 */
export function calculateTradePnL(
  trade: StockTrade,
  allTrades: StockTrade[]
): { realizedGain: number; realizedGainPercent: number } {
  if (trade.sellPrice === null) return { realizedGain: 0, realizedGainPercent: 0 };

  // Find blended cost basis at time of sale
  const priorBuys = allTrades.filter(
    (t) => t.ticker === trade.ticker && t.sellPrice === null && t.buyDate <= trade.sellDate!
  );
  const totalShares = priorBuys.reduce((sum, t) => sum + t.quantity, 0);
  const totalCost = priorBuys.reduce((sum, t) => sum + t.quantity * t.buyPrice, 0);
  const blendedCost = totalShares > 0 ? totalCost / totalShares : trade.buyPrice;

  const realizedGain = (trade.sellPrice - blendedCost) * trade.quantity;
  const realizedGainPercent = blendedCost > 0 ? ((trade.sellPrice - blendedCost) / blendedCost) * 100 : 0;

  return { realizedGain, realizedGainPercent };
}

// ============================================================
// FIRE CALCULATIONS
// ============================================================

/**
 * FIRE Number: how much you need to retire
 * FIRE Number = Annual Expenses / Withdrawal Rate
 */
export function calcFireNumber(annualExpenses: number, withdrawalRatePercent: number): number {
  if (withdrawalRatePercent <= 0) return 0;
  return annualExpenses / (withdrawalRatePercent / 100);
}

/**
 * Time to FIRE: years until portfolio reaches FIRE target
 * Uses compound growth with monthly contributions
 */
export function calcYearsToFire(
  currentSavings: number,
  monthlyContributions: number,
  annualReturnPercent: number,
  fireTarget: number
): { years: number; targetYear: number; projectionData: FireProjectionPoint[] } {
  if (fireTarget <= 0 || annualReturnPercent < 0) {
    return { years: 0, targetYear: new Date().getFullYear(), projectionData: [] };
  }

  const monthlyRate = annualReturnPercent / 100 / 12;
  let portfolio = currentSavings;
  let months = 0;
  const maxMonths = 600; // 50 years cap
  const projectionData: FireProjectionPoint[] = [];

  // Record year 0
  projectionData.push({ year: 0, portfolioValue: portfolio });

  while (portfolio < fireTarget && months < maxMonths) {
    portfolio = portfolio * (1 + monthlyRate) + monthlyContributions;
    months++;
    // Record each year
    if (months % 12 === 0) {
      projectionData.push({ year: months / 12, portfolioValue: Math.round(portfolio) });
    }
  }

  // Add a few extra years past FIRE for chart context
  const extraYears = 5;
  for (let i = 1; i <= extraYears; i++) {
    for (let m = 0; m < 12; m++) {
      portfolio = portfolio * (1 + monthlyRate) + monthlyContributions;
    }
    projectionData.push({ year: Math.ceil(months / 12) + i, portfolioValue: Math.round(portfolio) });
  }

  const years = months / 12;
  const targetYear = new Date().getFullYear() + Math.ceil(years);
  return { years, targetYear, projectionData };
}
/**
 * Safe Withdrawal Rate table
 */
export function calcSWRTable(totalSavings: number): SWRTableRow[] {
  const rates = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
  return rates.map((rate) => {
    const annualSpending = totalSavings * (rate / 100);
    const monthlySpending = annualSpending / 12;

    let label: string;
    let color: SWRTableRow['color'];
    if (rate <= 3.5) {
      label = 'Very safe';
      color = 'green';
    } else if (rate <= 4.0) {
      label = 'Safe (standard)';
      color = 'yellow';
    } else if (rate <= 5.0) {
      label = 'Moderate risk';
      color = 'orange';
    } else {
      label = 'Higher risk';
      color = 'red';
    }

    return {
      rate,
      annualSpending,
      monthlySpending,
      label,
      color,
      isHighlighted: rate === 4.0,
    };
  });
}

/**
 * Compound interest calculation
 */
export function calcCompoundInterest(
  initial: number,
  monthlyContribution: number,
  annualReturnPercent: number,
  years: number
): {
  totalContributed: number;
  totalGrowth: number;
  finalValue: number;
  chartData: CompoundChartPoint[];
} {
  const monthlyRate = annualReturnPercent / 100 / 12;
  const totalMonths = years * 12;
  const chartData: CompoundChartPoint[] = [];

  let portfolio = initial;
  let totalContributed = initial;

  chartData.push({ year: 0, contributed: initial, growth: 0, total: initial });

  for (let month = 1; month <= totalMonths; month++) {
    portfolio = portfolio * (1 + monthlyRate) + monthlyContribution;
    totalContributed += monthlyContribution;

    if (month % 12 === 0) {
      const growth = portfolio - totalContributed;
      chartData.push({
        year: month / 12,
        contributed: Math.round(totalContributed),
        growth: Math.round(Math.max(0, growth)),
        total: Math.round(portfolio),
      });
    }
  }

  const finalValue = portfolio;
  const totalGrowth = finalValue - totalContributed;

  return {
    totalContributed: Math.round(totalContributed),
    totalGrowth: Math.round(Math.max(0, totalGrowth)),
    finalValue: Math.round(finalValue),
    chartData,
  };
}
