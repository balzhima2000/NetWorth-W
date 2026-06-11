/** Account hub → sub-page map. Single source of truth for routes + labels. */
export interface AccountItem { slug: string; label: string; danger?: boolean }
export interface AccountGroup { group: string; items: AccountItem[] }

export const ACCOUNT_GROUPS: AccountGroup[] = [
  { group: 'Connections', items: [
    { slug: 'api', label: 'API configuration' },
    { slug: 'currency', label: 'Currency' },
  ] },
  { group: 'Money setup', items: [
    { slug: 'expense-categories', label: 'Expense categories' },
    { slug: 'income-categories', label: 'Income categories' },
    { slug: 'cards', label: 'Payment cards' },
    { slug: 'income-destinations', label: 'Income destinations' },
    { slug: 'assets', label: 'Assets & liabilities' },
  ] },
  { group: 'Account & data', items: [
    { slug: 'sync', label: 'Sync & account' },
    { slug: 'data', label: 'Data management' },
    { slug: 'danger', label: 'Danger zone', danger: true },
  ] },
];

export const ACCOUNT_ITEMS: Record<string, AccountItem> = Object.fromEntries(
  ACCOUNT_GROUPS.flatMap((g) => g.items).map((i) => [i.slug, i]),
);
