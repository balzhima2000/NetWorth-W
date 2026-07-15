import { useTransactionStore } from '../stores/transactionStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useNetWorthStore } from '../stores/networthStore';
import { useBudgetStore } from '../stores/budgetStore';

/**
 * Whether anything is already stored in terms of the current `defaultCurrency`.
 *
 * A lot of stored money is expressed in the default currency but does not record
 * *which* currency that was at the time it was written:
 *
 *   - `Transaction.convertedAmount`   — converted once at entry, then frozen
 *   - `ManualEntry.value`             — no currency field at all
 *   - `NetWorthSnapshot.*`            — totals, no currency field
 *   - `MonthlyBudget.amount`          — no currency field
 *   - `StockTrade.buyRateToDefault`   — a rate *into* the default currency
 *
 * The exchange-rate policy (see CLAUDE.md) makes those values immutable: they are
 * fixed at entry time and never rewritten, which is why `recalculateRatesForCurrency`
 * was removed in c0ae4bc. The policy is about rate *refreshes*, but it has a
 * consequence for base-currency changes too — moving `defaultCurrency` cannot
 * convert them, so it silently re-labels them instead (₪1,030,975 becomes
 * $1,030,975).
 *
 * Callers use this to tell the two cases apart: on an empty install the base
 * currency is free to move, and once there is data behind it, it isn't.
 */
export function hasCurrencyDenominatedData(): boolean {
  const netWorth = useNetWorthStore.getState();
  return (
    useTransactionStore.getState().transactions.length > 0 ||
    usePortfolioStore.getState().trades.length > 0 ||
    useBudgetStore.getState().budgets.length > 0 ||
    netWorth.manualEntries.length > 0 ||
    netWorth.snapshots.length > 0
  );
}
