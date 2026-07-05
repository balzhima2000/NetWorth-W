/**
 * Data hook for the William Trends page (spending over time).
 * Buckets expense transactions into monthly totals for the selected range and
 * derives the summary stats + per-category averages (vs the prior equal period).
 */
import { useMemo } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getCurrencySymbol } from '../../utils/formatters';

export type TrendRange = '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
export const TREND_RANGES: TrendRange[] = ['3M', '6M', '1Y', 'YTD', 'ALL'];

export interface TrendPoint { label: string; total: number; }
export interface CategoryTrend {
  id: string;
  name: string;
  color: string;
  perMonth: number;
  deltaPct: number | null; // vs prior period; null when no prior data
}

const keyOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const labelOf = (key: number) => new Date(Math.floor(key / 12), key % 12, 1).toLocaleDateString('en-US', { month: 'short' });

export function useTrendsData(range: TrendRange) {
  const transactions  = useTransactionStore((s) => s.transactions);
  const expenseCats   = useCategoriesStore((s) => s.categories);
  const incomeCats    = useCategoriesStore((s) => s.incomeCategories);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);

  return useMemo(() => {
    const catInfo = (id: string) => {
      const c = expenseCats.find((x) => x.id === id) ?? incomeCats.find((x) => x.id === id);
      return { name: c?.name ?? id, color: c?.color ?? '#737373' };
    };

    const expenses = transactions.filter((t) => t.type === 'expense');
    const now = new Date();
    const curKey = keyOf(now);

    // Window length (in months) for the selected range.
    let n: number;
    if (range === '3M') n = 3;
    else if (range === '6M') n = 6;
    else if (range === '1Y') n = 12;
    else if (range === 'YTD') n = now.getMonth() + 1;
    else {
      // ALL — from the earliest expense month through now.
      const earliest = expenses.reduce((min, t) => Math.min(min, keyOf(new Date(t.date))), curKey);
      n = Math.max(curKey - earliest + 1, 1);
    }

    const startKey = curKey - (n - 1);
    // Monthly totals for the current window + the prior equal-length window.
    const monthTotals = (from: number, to: number) => {
      const buckets: Record<number, number> = {};
      for (let k = from; k <= to; k++) buckets[k] = 0;
      expenses.forEach((t) => {
        const k = keyOf(new Date(t.date));
        if (k >= from && k <= to) buckets[k] += t.convertedAmount;
      });
      return buckets;
    };
    const cur = monthTotals(startKey, curKey);
    const prior = monthTotals(startKey - n, startKey - 1);

    const series: TrendPoint[] = [];
    for (let k = startKey; k <= curKey; k++) series.push({ label: labelOf(k), total: Math.round(cur[k]) });

    const curSum = Object.values(cur).reduce((s, v) => s + v, 0);
    const priorSum = Object.values(prior).reduce((s, v) => s + v, 0);
    const avg = n > 0 ? curSum / n : 0;

    // Highest / lowest month (ignore empty months if any real data exists).
    const nonEmpty = series.filter((p) => p.total > 0);
    const pool = nonEmpty.length > 0 ? nonEmpty : series;
    const highest = pool.reduce((a, b) => (b.total > a.total ? b : a), pool[0] ?? { label: '', total: 0 });
    const lowest = pool.reduce((a, b) => (b.total < a.total ? b : a), pool[0] ?? { label: '', total: 0 });

    const vsPriorPct = priorSum > 0 ? ((curSum - priorSum) / priorSum) * 100 : null;

    // ── Per-category averages, vs prior period ──
    const sumByCat = (from: number, to: number) => {
      const m: Record<string, number> = {};
      expenses.forEach((t) => {
        const k = keyOf(new Date(t.date));
        if (k >= from && k <= to) m[t.category] = (m[t.category] ?? 0) + t.convertedAmount;
      });
      return m;
    };
    const curCat = sumByCat(startKey, curKey);
    const priorCat = sumByCat(startKey - n, startKey - 1);
    const categories: CategoryTrend[] = Object.entries(curCat)
      .map(([id, sum]) => {
        const info = catInfo(id);
        const perMonth = sum / n;
        const priorPer = (priorCat[id] ?? 0) / n;
        const deltaPct = priorPer > 0 ? ((perMonth - priorPer) / priorPer) * 100 : null;
        return { id, name: info.name, color: info.color, perMonth, deltaPct };
      })
      .sort((a, b) => b.perMonth - a.perMonth)
      .slice(0, 6);

    // ── Insight — trend direction + rough monthly slope + biggest mover ──
    const slope = series.length >= 2 ? (series[series.length - 1].total - series[0].total) / (series.length - 1) : 0;
    const roundedSlope = Math.round(Math.abs(slope) / 10) * 10;
    const mover = categories
      .filter((c) => c.deltaPct !== null && c.deltaPct > 0)
      .sort((a, b) => (b.deltaPct! - a.deltaPct!))[0];
    let insight: string | null = null;
    if (series.length >= 2 && curSum > 0) {
      if (roundedSlope < 10) {
        insight = 'Spending held roughly steady over this period.';
      } else {
        const dir = slope > 0 ? 'crept up' : 'eased';
        const sym = getCurrencySymbol(defaultCurrency);
        insight = `Spending ${dir} ~${sym}${Math.round(roundedSlope).toLocaleString('en-US')}/month${mover ? ` — mostly ${mover.name}` : ''}.`;
      }
    }

    return {
      defaultCurrency,
      n,
      series,
      avg,
      highest,
      lowest,
      vsPriorPct,
      vsPriorLabel: `vs prior ${n} mo`,
      categories,
      insight,
      insightUp: slope > 0,
      hasData: curSum > 0,
    };
  }, [transactions, expenseCats, incomeCats, defaultCurrency, range]);
}
