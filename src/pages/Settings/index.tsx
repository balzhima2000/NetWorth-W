import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSyncManager } from '../../hooks/useSyncManager';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../../hooks/useToast';
import { useCardsStore } from '../../stores/cardsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useAllocationStore } from '../../stores/allocationStore';
import { GlassCard, Button, Input, Select, Modal, ConfirmDialog } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CURRENCIES, CARD_COLORS, MANUAL_ASSET_CATEGORIES, MANUAL_LIABILITY_CATEGORIES } from '../../utils/constants';
import { testApiKey, fetchExchangeRate } from '../../services/alphaVantage';
import { testMassiveKey, fetchExchangeRateMassive } from '../../services/massiveApi';
import { fetchFrankfurterRates } from '../../services/frankfurterApi';
import { testTaseKey } from '../../services/taseDataHub';
import { exportFullBackup, exportTransactionsCSV, parseBackup } from '../../services/exportImport';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { ALL_STORE_KEYS } from '../../utils/syncHelpers';
import type { SpendingCategory, Card, ManualEntry } from '../../types/index';

const EMOJI_OPTIONS = [
  '🍕','🍔','🌮','🍣','🥗','☕','🍺','🥤','🍰','🥡',
  '🛒','👕','👟','👜','💄','🎁','🏷️','🧴',
  '🏠','🛋️','⚡','💧','📦','🔧','🌿','🏡',
  '🚗','🚌','🚂','✈️','🚲','⛽','🛵','🚕',
  '💊','🏥','🏋️','🧘','🦷','🩺','💉','🌡️',
  '🎮','🎬','🎵','🎭','📚','🎲','🏖️','🎨',
  '💰','💳','📈','🏦','💸','🪙','💼','📊',
  '👶','🐶','🎓','🎉','❤️','🙏','🤝','⭐',
];

export default function Settings() {
  const toast = useToast();
  const { user, sendMagicLink, verifyOtp, signOut } = useAuth();
  const { syncStatus, lastSyncedAt, forcePull, forcePush } = useSyncManager();
  const [syncEmail, setSyncEmail] = useState('');
  const [syncEmailSent, setSyncEmailSent] = useState(false);
  const [syncEmailError, setSyncEmailError] = useState<string | null>(null);
  const [syncEmailLoading, setSyncEmailLoading] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [syncCodeVerifying, setSyncCodeVerifying] = useState(false);

  const handleSendCode = async () => {
    if (!syncEmail.trim()) return;
    setSyncEmailLoading(true);
    setSyncEmailError(null);
    const { error } = await sendMagicLink(syncEmail.trim());
    setSyncEmailLoading(false);
    if (error) {
      setSyncEmailError(error);
    } else {
      setSyncEmailSent(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!syncCode.trim()) return;
    setSyncCodeVerifying(true);
    setSyncEmailError(null);
    const { error } = await verifyOtp(syncEmail.trim(), syncCode.trim());
    setSyncCodeVerifying(false);
    if (error) setSyncEmailError(error);
    // on success, onAuthStateChange in useAuth updates user state automatically
  };

  // Page title
  useEffect(() => { document.title = 'Settings — NetWorth Tracker'; }, []);

  // ── Settings Store ──
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  // Stocks API (Alpha Vantage)
  const stocksApiKey = useSettingsStore((s) => s.stocksApiKey);
  const setStocksApiKey = useSettingsStore((s) => s.setStocksApiKey);
  const stocksRequestsToday = useSettingsStore((s) => s.stocksRequestsToday);
  // FX API (Alpha Vantage, separate key)
  const fxApiKey = useSettingsStore((s) => s.fxApiKey);
  const setFxApiKey = useSettingsStore((s) => s.setFxApiKey);
  const fxProvider = useSettingsStore((s) => s.fxProvider);
  const setFxProvider = useSettingsStore((s) => s.setFxProvider);
  const fxRequestsToday = useSettingsStore((s) => s.fxRequestsToday);
  const decrementFxRequests = useSettingsStore((s) => s.decrementFxRequests);
  // Israeli Market API (TASE DataHub)
  const israeliApiKey = useSettingsStore((s) => s.israeliApiKey);
  const setIsraeliApiKey = useSettingsStore((s) => s.setIsraeliApiKey);
  const israeliRequestsToday = useSettingsStore((s) => s.israeliRequestsToday);
  // Crypto API (Coinlayer)
  const cryptoApiKey = useSettingsStore((s) => s.cryptoApiKey);
  const setCryptoApiKey = useSettingsStore((s) => s.setCryptoApiKey);
  const lastBackupDate = useSettingsStore((s) => s.lastBackupDate);
  const setLastBackupDate = useSettingsStore((s) => s.setLastBackupDate);
  const defaultExpensePayment = useSettingsStore((s) => s.defaultExpensePayment);
  const setDefaultExpensePayment = useSettingsStore((s) => s.setDefaultExpensePayment);
  const defaultIncomeDestination = useSettingsStore((s) => s.defaultIncomeDestination);
  const setDefaultIncomeDestination = useSettingsStore((s) => s.setDefaultIncomeDestination);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const addExchangeRate = useSettingsStore((s) => s.addExchangeRate);
  const removeExchangeRate = useSettingsStore((s) => s.removeExchangeRate);
  const setHasCompletedSetup = useSettingsStore((s) => s.setHasCompletedSetup);
  // Transaction store — for detecting currencies in use
  const transactions = useTransactionStore((s) => s.transactions);

  // ── Data Stores ──
  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const updateCard = useCardsStore((s) => s.updateCard);
  const deleteCard = useCardsStore((s) => s.deleteCard);
  const incomeDestinations = useCardsStore((s) => s.incomeDestinations);
  const addIncomeDestination = useCardsStore((s) => s.addIncomeDestination);
  const deleteIncomeDestination = useCardsStore((s) => s.deleteIncomeDestination);

  const categories = useCategoriesStore((s) => s.categories);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory);
  const incomeCategories = useCategoriesStore((s) => s.incomeCategories);
  const addIncomeCategory = useCategoriesStore((s) => s.addIncomeCategory);
  const updateIncomeCategory = useCategoriesStore((s) => s.updateIncomeCategory);
  const deleteIncomeCategory = useCategoriesStore((s) => s.deleteIncomeCategory);

  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const addManualEntry = useNetWorthStore((s) => s.addManualEntry);
  const updateManualEntry = useNetWorthStore((s) => s.updateManualEntry);
  const deleteManualEntry = useNetWorthStore((s) => s.deleteManualEntry);
  const snapshots = useNetWorthStore((s) => s.snapshots);

  const trades = usePortfolioStore((s) => s.trades);
  const budgets = useBudgetStore((s) => s.budgets);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);

  // ── API Key State (3 independent slots) ──
  type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';
  const [newStocksKey, setNewStocksKey] = useState(stocksApiKey);
  const [stocksKeyStatus, setStocksKeyStatus] = useState<KeyStatus>('idle');
  const [newFxKey, setNewFxKey] = useState(fxApiKey);
  const [fxKeyStatus, setFxKeyStatus] = useState<KeyStatus>('idle');
  const [newIsraeliKey, setNewIsraeliKey] = useState(israeliApiKey);
  const [israeliKeyStatus, setIsraeliKeyStatus] = useState<KeyStatus>('idle');
  const [newCryptoKey, setNewCryptoKey] = useState(cryptoApiKey);

  const handleTestStocksKey = async () => {
    if (!newStocksKey) return;
    setStocksKeyStatus('testing');
    const valid = await testApiKey(newStocksKey);
    setStocksKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setStocksApiKey(newStocksKey); toast.success('Stocks API key saved!'); }
    else toast.error('Invalid API key.');
  };

  const handleTestFxKey = async () => {
    if (!newFxKey) return;
    setFxKeyStatus('testing');
    const valid = fxProvider === 'massive'
      ? await testMassiveKey(newFxKey)
      : await testApiKey(newFxKey);
    setFxKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setFxApiKey(newFxKey); toast.success('Exchange Rate API key saved!'); }
    else toast.error('Invalid API key.');
  };

  const handleTestIsraeliKey = async () => {
    if (!newIsraeliKey) return;
    setIsraeliKeyStatus('testing');
    const valid = await testTaseKey(newIsraeliKey);
    setIsraeliKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setIsraeliApiKey(newIsraeliKey); toast.success('TASE DataHub key saved!'); }
    else toast.error('Invalid or unreachable TASE key.');
  };

  // ── Exchange Rate State ──
  const [refreshingRates, setRefreshingRates] = useState(false);

  const handleRefreshAllRates = async () => {
    if (fxProvider !== 'boi' && !fxApiKey) return;
    // Build list: existing rates + foreign currencies used in transactions, recurring payments, or open portfolio holdings
    const txForeignCurrencies = [...new Set(
      transactions
        .filter((t) => t.currency !== defaultCurrency)
        .map((t) => t.currency)
    )];
    const recurringForeignCurrencies = [...new Set(
      recurringPayments
        .filter((rp) => rp.currency && rp.currency !== defaultCurrency)
        .map((rp) => rp.currency as string)
    )];
    const portfolioForeignCurrencies = [...new Set(
      trades
        .filter((t) => t.sellPrice === null)
        .map((t) => (t.currency || (t.market === 'tase' ? 'ILS' : 'USD')).toUpperCase())
        .filter((c) => c !== defaultCurrency)
    )];
    const currenciesToRefresh = [...new Set([
      ...exchangeRates.map((r) => r.currency),
      ...txForeignCurrencies,
      ...recurringForeignCurrencies,
      ...portfolioForeignCurrencies,
    ])];
    if (currenciesToRefresh.length === 0) {
      toast.error('No foreign currencies found in transactions, recurring payments, holdings, or exchange rate list.');
      return;
    }
    setRefreshingRates(true);
    let updated = 0;
    const errors: string[] = [];

    if (fxProvider === 'boi') {
      // Free Rates (Frankfurter/ECB): fetch all rates in one call, no API key needed
      try {
        const allRates = await fetchFrankfurterRates(defaultCurrency);
        for (const currency of currenciesToRefresh) {
          const rate = allRates.get(currency.toUpperCase());
          if (rate != null) {
            addExchangeRate({ currency, rateToDefault: rate });
            updated++;
          } else {
            errors.push(`${currency}: not available via free rates provider`);
          }
        }
      } catch (e: any) {
        errors.push(`Free Rates: ${e.message}`);
      }
    } else {
      for (const currency of currenciesToRefresh) {
        // Daily limit only applies to Alpha Vantage (25 req/day); Massive has no daily cap
        if (fxProvider === 'alpha-vantage' && fxRequestsToday + updated >= 25) {
          toast.error('Alpha Vantage daily limit reached — some rates not updated');
          break;
        }
        try {
          const newRate = fxProvider === 'massive'
            ? await fetchExchangeRateMassive(currency, defaultCurrency, fxApiKey)
            : await fetchExchangeRate(currency, defaultCurrency, fxApiKey);
          addExchangeRate({ currency, rateToDefault: newRate });
          // Only track the daily counter for Alpha Vantage
          if (fxProvider === 'alpha-vantage') decrementFxRequests();
          updated++;
        } catch (e: any) {
          errors.push(`${currency}: ${e.message}`);
        }
      }
    }

    if (updated > 0) toast.success(`Updated ${updated} exchange rate${updated > 1 ? 's' : ''}`);
    if (errors.length > 0) toast.error(`Failed to refresh — ${errors.join(', ')}`);
    setRefreshingRates(false);
  };

  // ── Categories State ──
  const [editingCat, setEditingCat] = useState<SpendingCategory | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('');
  const [catColor, setCatColor] = useState('#6b7280');
  const [catContext, setCatContext] = useState<'expense' | 'income'>('expense');
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCatContext, setDeleteCatContext] = useState<'expense' | 'income'>('expense');

  const openAddCat = (context: 'expense' | 'income') => {
    setEditingCat(null); setCatName(''); setCatEmoji(''); setCatColor('#6b7280');
    setCatContext(context); setShowCatModal(true);
  };
  const openEditCat = (cat: SpendingCategory, context: 'expense' | 'income') => {
    setEditingCat(cat); setCatName(cat.name); setCatEmoji(cat.emoji); setCatColor(cat.color);
    setCatContext(context); setShowCatModal(true);
  };
  const handleSaveCat = () => {
    if (!catName) return;
    if (editingCat) {
      if (catContext === 'expense') {
        updateCategory(editingCat.id, { name: catName, emoji: catEmoji, color: catColor });
      } else {
        updateIncomeCategory(editingCat.id, { name: catName, emoji: catEmoji, color: catColor });
      }
    } else {
      if (catContext === 'expense') {
        addCategory({ id: crypto.randomUUID(), name: catName, emoji: catEmoji || '💰', color: catColor, isDefault: false });
      } else {
        addIncomeCategory({ id: `income_${crypto.randomUUID()}`, name: catName, emoji: catEmoji || '💰', color: catColor, isDefault: false });
      }
    }
    setShowCatModal(false);
  };
  const confirmDeleteCat = (catId: string, context: 'expense' | 'income') => {
    setDeleteCatId(catId);
    setDeleteCatContext(context);
  };
  const handleDeleteCat = () => {
    if (!deleteCatId) return;
    if (deleteCatContext === 'expense') {
      deleteCategory(deleteCatId);
    } else {
      deleteIncomeCategory(deleteCatId);
    }
    setDeleteCatId(null);
  };
  const catHasTransactions = (catId: string) => transactions.some(t => t.category === catId);

  // ── Cards State ──
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  // ── Income Destinations State ──
  const [newDestName, setNewDestName] = useState('');
  const [showNewDestInput, setShowNewDestInput] = useState(false);
  const [deleteDestId, setDeleteDestId] = useState<string | null>(null);

  const openAddCard = () => {
    setEditingCard(null); setCardName(''); setCardColor(CARD_COLORS[0]); setShowCardModal(true);
  };
  const openEditCard = (card: Card) => {
    setEditingCard(card); setCardName(card.name); setCardColor(card.color); setShowCardModal(true);
  };
  const handleSaveCard = () => {
    if (!cardName) return;
    if (editingCard) {
      updateCard(editingCard.id, { name: cardName, color: cardColor });
    } else {
      addCard({ id: crypto.randomUUID(), name: cardName, color: cardColor, isActive: true });
    }
    setShowCardModal(false);
  };

  // ── Manual Entries (Assets & Liabilities) ──
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const [entryIsLiability, setEntryIsLiability] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const openAddEntry = (isLiability: boolean) => {
    setEditingEntry(null); setEntryIsLiability(isLiability); setEntryName(''); setEntryValue('');
    setEntryCategory(isLiability ? MANUAL_LIABILITY_CATEGORIES[0].id : MANUAL_ASSET_CATEGORIES[0].id);
    setShowEntryModal(true);
  };
  const openEditEntry = (entry: ManualEntry) => {
    setEditingEntry(entry); setEntryIsLiability(entry.isLiability); setEntryName(entry.name);
    setEntryValue(String(entry.value)); setEntryCategory(entry.assetCategory); setShowEntryModal(true);
  };
  const handleSaveEntry = () => {
    if (!entryName || !entryValue) return;
    const today = new Date().toISOString();
    if (editingEntry) {
      updateManualEntry(editingEntry.id, { name: entryName, value: parseFloat(entryValue), assetCategory: entryCategory });
    } else {
      addManualEntry({ id: crypto.randomUUID(), name: entryName, value: parseFloat(entryValue), isLiability: entryIsLiability, assetCategory: entryCategory, lastUpdated: today });
    }
    setShowEntryModal(false);
  };

  const assets = manualEntries.filter((e) => !e.isLiability);
  const liabilities = manualEntries.filter((e) => e.isLiability);

  // ── Export / Import ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importData, setImportData] = useState<any>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const handleExportJSON = () => {
    exportFullBackup({
      trades, transactions, budgets,
      manualEntries, snapshots, cards, recurringPayments, installmentPlans,
      categories, incomeCategories, settings: {},
    });
    setLastBackupDate(new Date().toISOString());
    toast.success('Full backup downloaded.');
  };

  const handleExportCSV = () => {
    exportTransactionsCSV(transactions, cards);
    toast.success('Transactions CSV downloaded.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { backup, error, summary } = parseBackup(text);
      if (error) { toast.error(`Import error: ${error}`); return; }
      setImportData(backup);
      setImportSummary(summary);
      setShowImportConfirm(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importData) return;
    if (importData.trades) usePortfolioStore.setState({ trades: importData.trades });
    if (importData.transactions) useTransactionStore.setState({ transactions: importData.transactions });
    if (importData.budgets) useBudgetStore.setState({ budgets: importData.budgets });
    if (importData.manualEntries && importData.snapshots) {
      useNetWorthStore.setState({ manualEntries: importData.manualEntries, snapshots: importData.snapshots });
    }
    if (importData.cards) useCardsStore.setState({ cards: importData.cards });
    if (importData.recurringPayments && importData.installmentPlans) {
      useRecurringStore.setState({ recurringPayments: importData.recurringPayments, installmentPlans: importData.installmentPlans });
    }
    if (importData.categories) {
      useCategoriesStore.setState({
        categories: importData.categories,
        ...(importData.incomeCategories ? { incomeCategories: importData.incomeCategories } : {}),
      });
    }
    setShowImportConfirm(false);
    setImportData(null);
    setImportSummary(null);
    toast.success('Data imported successfully.');
  };

  // ── Reset / Clear Data ──
  const [showSoftResetConfirm, setShowSoftResetConfirm] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);
  const [clearText, setClearText] = useState('');

  const clearAllStores = () => {
    usePortfolioStore.setState({ trades: [], currentPrices: {}, lastPriceUpdates: {}, priceSources: {} });
    useTransactionStore.setState({ transactions: [], lastUsedPaymentMethod: 'cash' });
    useBudgetStore.setState({ budgets: [], summaries: [] });
    useNetWorthStore.setState({ manualEntries: [], snapshots: [], lastSnapshotDate: null });
    useCardsStore.setState({ cards: [], incomeDestinations: [{ id: 'cash', name: 'Cash', icon: '💵' }] });
    useRecurringStore.setState({ recurringPayments: [], installmentPlans: [] });
    useAllocationStore.setState({ mode: 'none', targets: {} });
    // Remove from localStorage so the debounced sync push reads null and skips Supabase upsert
    ALL_STORE_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const handleSoftReset = () => {
    clearAllStores();
    setHasCompletedSetup(false);
    setShowSoftResetConfirm(false);
  };

  const handleHardReset = async () => {
    if (clearText !== 'DELETE') return;
    clearAllStores();
    if (supabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('sync_stores').delete().eq('user_id', user.id);
      }
    }
    setHasCompletedSetup(false);
    setShowHardResetConfirm(false);
    setClearText('');
  };

  const assetCatOptions = MANUAL_ASSET_CATEGORIES.map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` }));
  const liabilityCatOptions = MANUAL_LIABILITY_CATEGORIES.map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` }));

  const getAssetCatLabel = (id: string) => {
    const all = [...MANUAL_ASSET_CATEGORIES, ...MANUAL_LIABILITY_CATEGORIES];
    return all.find(c => c.id === id)?.label ?? id;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-white/50">Manage your app configuration and data</p>
      </div>

      {/* ── SYNC & ACCOUNT ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">🔄 Sync &amp; Account</h2>

        {user ? (
          /* Signed in */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/8">
              <div className="w-8 h-8 rounded-full bg-[#5865f2]/20 flex items-center justify-center text-sm">
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.email}</p>
                <p className="text-white/40 text-xs">
                  {syncStatus === 'syncing' && 'Syncing…'}
                  {syncStatus === 'idle' && lastSyncedAt && `Last synced ${lastSyncedAt.toLocaleTimeString()}`}
                  {syncStatus === 'idle' && !lastSyncedAt && 'Not synced yet'}
                  {syncStatus === 'error' && 'Sync error — will retry'}
                  {syncStatus === 'offline' && 'Offline — will sync when reconnected'}
                </p>
              </div>
              {syncStatus === 'syncing' && (
                <div className="w-4 h-4 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => void forcePull()}>
                Pull from cloud
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void forcePush()}>
                Push to cloud
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : syncEmailSent ? (
          /* OTP / magic link sent */
          <div className="space-y-3">
            <p className="text-white/60 text-sm">
              A sign-in email was sent to <span className="text-white font-medium">{syncEmail}</span>. Click the link — or enter the code below.
            </p>
            <div className="flex gap-2 flex-wrap items-start">
              <div className="flex-1 min-w-[140px]">
                <Input
                  type="text"
                  placeholder="Enter code from email"
                  value={syncCode}
                  onChange={(e) => setSyncCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyCode(); }}
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void handleVerifyCode()}
                disabled={!syncCode.trim() || syncCodeVerifying}
              >
                {syncCodeVerifying ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
            {syncEmailError && <p className="text-[#EF4444] text-xs">{syncEmailError}</p>}
            <p className="text-white/30 text-xs">
              Didn't get it? Check spam or{' '}
              <button
                className="text-white/50 underline hover:text-white transition-colors"
                onClick={() => { setSyncEmailSent(false); setSyncCode(''); setSyncEmailError(null); }}
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          /* Signed out */
          <div className="space-y-4">
            <p className="text-white/50 text-sm">
              Sign in with your email to sync your data across devices. No password needed.
            </p>
            <div className="flex gap-2 flex-wrap items-start">
              <div className="flex-1 min-w-[200px]">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={syncEmail}
                  onChange={(e) => setSyncEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSendCode(); }}
                />
                {syncEmailError && <p className="text-[#EF4444] text-xs mt-1">{syncEmailError}</p>}
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void handleSendCode()}
                disabled={!syncEmail.trim() || syncEmailLoading}
              >
                {syncEmailLoading ? 'Sending…' : 'Send Link'}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── API CONFIGURATION ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">🔑 API Configuration</h2>
        <p className="text-white/40 text-sm mb-4">Each API is optional — features fall back to manual entry when no key is set.</p>
        <div className="space-y-5">

          {/* Stocks — Alpha Vantage */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">📈 Global Stocks</p>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Alpha Vantage</span>
            </div>
            {stocksApiKey ? (
              <>
                <Input type="password" value={stocksApiKey} disabled />
                <Button variant="ghost" size="sm" onClick={() => { setStocksApiKey(''); setNewStocksKey(''); setStocksKeyStatus('idle'); toast.success('Stocks key removed.'); }}>Remove</Button>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={newStocksKey}
                  onChange={(e) => { setNewStocksKey(e.target.value); setStocksKeyStatus('idle'); }}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={handleTestStocksKey} disabled={!newStocksKey || stocksKeyStatus === 'testing'}>
                    {stocksKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setStocksApiKey(newStocksKey); setStocksKeyStatus('idle'); toast.success('Stocks key saved.'); }} disabled={!newStocksKey}>
                    Save Without Testing
                  </Button>
                </div>
                {stocksKeyStatus === 'valid' && <p className="text-[#22C55E] text-xs">✅ Valid — saved!</p>}
                {stocksKeyStatus === 'invalid' && <p className="text-[#EF4444] text-xs">❌ Invalid key</p>}
              </>
            )}
            <div className="text-xs text-white/30 space-y-0.5">
              {stocksApiKey
                ? <p>Requests used today: <span className="text-white/60">{stocksRequestsToday}/25</span></p>
                : <p className="text-amber-400/60">Not configured — stock prices entered manually</p>}
              <p>Get a free key: <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">alphavantage.co</a>{' · '}<a href="https://www.massive.com" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">massive.com</a></p>
            </div>
          </div>

          {/* Exchange Rates — Alpha Vantage or Massive (Polygon) */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">💱 Exchange Rates</p>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {fxProvider === 'massive' ? 'Massive (Polygon)' : fxProvider === 'boi' ? 'Free Rates' : 'Alpha Vantage'}
              </span>
            </div>
            {/* Provider selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/50">Provider:</span>
              <button
                onClick={() => { setFxProvider('alpha-vantage'); setFxKeyStatus('idle'); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'alpha-vantage' ? 'bg-[#10B981]/20 border-[#10B981]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
              >Alpha Vantage</button>
              <button
                onClick={() => { setFxProvider('massive'); setFxKeyStatus('idle'); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'massive' ? 'bg-[#10B981]/20 border-[#10B981]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
              >Massive (Polygon)</button>
              <button
                onClick={() => { setFxProvider('boi'); setFxKeyStatus('idle'); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'boi' ? 'bg-[#10B981]/20 border-[#10B981]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
              >Free Rates 🆓</button>
            </div>
            {fxProvider === 'boi' ? (
              /* BOI needs no API key — just show Refresh button */
              <div className="flex gap-2 flex-wrap items-center">
                <Button variant="secondary" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                  {refreshingRates ? 'Refreshing...' : '🔄 Refresh Rates'}
                </Button>
                <p className="text-xs text-[#22C55E]/80">✓ Free — no API key required</p>
              </div>
            ) : fxApiKey ? (
              <>
                <Input type="password" value={fxApiKey} disabled />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                    {refreshingRates ? 'Refreshing...' : '🔄 Refresh Rates'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setFxApiKey(''); setNewFxKey(''); setFxKeyStatus('idle'); toast.success('FX key removed. Stored rates kept.'); }}>Remove</Button>
                </div>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={newFxKey}
                  onChange={(e) => { setNewFxKey(e.target.value); setFxKeyStatus('idle'); }}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={handleTestFxKey} disabled={!newFxKey || fxKeyStatus === 'testing'}>
                    {fxKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setFxApiKey(newFxKey); setFxKeyStatus('idle'); toast.success('Exchange Rate key saved.'); }} disabled={!newFxKey}>
                    Save Without Testing
                  </Button>
                </div>
                {fxKeyStatus === 'valid' && <p className="text-[#22C55E] text-xs">✅ Valid — saved!</p>}
                {fxKeyStatus === 'invalid' && <p className="text-[#EF4444] text-xs">❌ Invalid key</p>}
              </>
            )}
            <div className="text-xs text-white/30 space-y-0.5">
              {fxProvider === 'boi'
                ? <p className="text-white/40">ECB rates via Frankfurter · updated daily · free</p>
                : fxApiKey
                  ? <p>Requests used today: <span className="text-white/60">{fxRequestsToday}{fxProvider === 'alpha-vantage' ? '/25' : ''}</span></p>
                  : <p className="text-amber-400/60">Not configured — exchange rates not available</p>}
              {fxProvider !== 'boi' && <p>Get a free key: <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">alphavantage.co</a>{' · '}<a href="https://massive.com" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">massive.com</a></p>}
            </div>
          </div>

          {/* Israeli Market — TASE DataHub */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">🇮🇱 Israeli Market (TASE)</p>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">TASE DataHub</span>
            </div>
            {israeliApiKey ? (
              <>
                <Input type="password" value={israeliApiKey} disabled />
                <Button variant="ghost" size="sm" onClick={() => { setIsraeliApiKey(''); setNewIsraeliKey(''); setIsraeliKeyStatus('idle'); toast.success('TASE key removed.'); }}>Remove</Button>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={newIsraeliKey}
                  onChange={(e) => { setNewIsraeliKey(e.target.value); setIsraeliKeyStatus('idle'); }}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={handleTestIsraeliKey} disabled={!newIsraeliKey || israeliKeyStatus === 'testing'}>
                    {israeliKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setIsraeliApiKey(newIsraeliKey); setIsraeliKeyStatus('idle'); toast.success('TASE key saved.'); }} disabled={!newIsraeliKey}>
                    Save Without Testing
                  </Button>
                </div>
                {israeliKeyStatus === 'valid' && <p className="text-[#22C55E] text-xs">✅ Valid — saved!</p>}
                {israeliKeyStatus === 'invalid' && <p className="text-[#EF4444] text-xs">❌ Invalid key</p>}
              </>
            )}
            <div className="text-xs text-white/30 space-y-0.5">
              {israeliApiKey
                ? <p>Requests today: <span className="text-white/60">{israeliRequestsToday}</span> <span className="text-white/20">(limit: 10/2 sec)</span></p>
                : <p className="text-amber-400/60">Not configured — TASE prices entered manually</p>}
              <p>Get access at: <a href="https://datahub.tase.co.il/login" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">datahub.tase.co.il</a> — subscribe to <span className="text-white/50">Securities data End of Day</span> (stocks) and <span className="text-white/50">Mutual Funds</span> (ETFs &amp; funds)</p>
            </div>
          </div>

          {/* Crypto — Coinlayer */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">🪙 Crypto</p>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Coinlayer</span>
            </div>
            {cryptoApiKey ? (
              <>
                <Input type="password" value={cryptoApiKey} disabled />
                <Button variant="ghost" size="sm" onClick={() => { setCryptoApiKey(''); setNewCryptoKey(''); toast.success('Crypto key removed.'); }}>Remove</Button>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={newCryptoKey}
                  onChange={(e) => setNewCryptoKey(e.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={() => { setCryptoApiKey(newCryptoKey); toast.success('Coinlayer key saved.'); }} disabled={!newCryptoKey}>
                  Save Key
                </Button>
              </>
            )}
            <div className="text-xs text-white/30 space-y-0.5">
              {cryptoApiKey
                ? <p>✅ Configured — live &amp; historical crypto prices enabled</p>
                : <p className="text-amber-400/60">Not configured — crypto prices entered manually</p>}
              <p>Free plan: 100 requests/month. Get your key at: <a href="https://coinlayer.com" target="_blank" rel="noopener noreferrer" className="!text-blue-400 hover:!text-blue-300 underline underline-offset-2">coinlayer.com</a></p>
            </div>
          </div>

        </div>
      </GlassCard>

      {/* ── CURRENCY ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">💱 Currency</h2>
        <div className="space-y-4">
          <Select
            label="Default Currency"
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` }))}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white/70">Exchange Rates</p>
              {(fxProvider === 'boi' || fxApiKey) && (exchangeRates.length > 0 || transactions.some((t) => t.currency !== defaultCurrency)) && (
                <Button variant="ghost" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                  {refreshingRates ? 'Refreshing...' : '🔄 Refresh All'}
                </Button>
              )}
            </div>
            <p className="text-xs text-white/30 mb-3">1 foreign currency = X {defaultCurrency}. Rates are updated via Refresh All.</p>

            {exchangeRates.length > 0 ? (
              <div className="space-y-2">
                {exchangeRates.map((rate) => (
                  <div key={rate.currency} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                    <span className="text-white font-mono text-sm">1 {rate.currency} = {rate.rateToDefault} {defaultCurrency}</span>
                    <button onClick={() => removeExchangeRate(rate.currency)} className="text-white/30 hover:text-[#EF4444] transition-colors text-xs px-2 py-1 rounded-lg hover:bg-[#EF4444]/10">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No exchange rates yet — use Refresh All to populate rates.</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── EXPENSE CATEGORIES ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">🏷️ Expense Categories</h2>
          <Button variant="secondary" size="sm" onClick={() => openAddCat('expense')}>+ Add Expense Category</Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-white text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditCat(cat, 'expense')} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => !catHasTransactions(cat.id) && confirmDeleteCat(cat.id, 'expense')}
                  disabled={catHasTransactions(cat.id)}
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10'}`}
                  title={catHasTransactions(cat.id) ? 'Category is used in transactions' : 'Delete'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── INCOME CATEGORIES ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">💰 Income Categories</h2>
          <Button variant="secondary" size="sm" onClick={() => openAddCat('income')}>+ Add Income Category</Button>
        </div>
        <div className="space-y-2">
          {incomeCategories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-white text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditCat(cat, 'income')} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => !catHasTransactions(cat.id) && confirmDeleteCat(cat.id, 'income')}
                  disabled={catHasTransactions(cat.id)}
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10'}`}
                  title={catHasTransactions(cat.id) ? 'Category is used in transactions' : 'Delete'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── PAYMENT CARDS ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">💳 Payment Cards</h2>
          <Button variant="secondary" size="sm" onClick={openAddCard}>+ Add Card</Button>
        </div>
        <div className="space-y-2">
          {/* Cash (built-in) */}
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#22C55E]" />
              <span className="text-white text-sm font-medium">💵 Cash</span>
              <span className="text-xs text-white/30">built-in</span>
            </div>
          </div>
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full" style={{ background: card.color }} />
                <span className="text-white text-sm font-medium">{card.name}</span>
                {!card.isActive && <span className="text-xs text-white/30 bg-white/10 px-1.5 rounded">inactive</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateCard(card.id, { isActive: !card.isActive })} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors text-xs px-2" title={card.isActive ? 'Deactivate' : 'Activate'}>
                  {card.isActive ? '⏸' : '▶'}
                </button>
                <button onClick={() => openEditCard(card)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => setDeleteCardId(card.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && <p className="text-white/30 text-sm">No cards added yet</p>}
        </div>
        {/* Default payment method for expenses */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Default for expenses</p>
            <p className="text-white/35 text-xs mt-0.5">Pre-selected when adding an expense</p>
          </div>
          <Select
            value={defaultExpensePayment}
            onChange={e => setDefaultExpensePayment(e.target.value)}
            containerClassName="min-w-[140px]"
            options={[
              { value: 'cash', label: '💵 Cash' },
              ...cards.filter(c => c.isActive).map(c => ({ value: c.id, label: `💳 ${c.name || 'Unnamed Card'}` })),
            ]}
          />
        </div>
      </GlassCard>

      {/* ── INCOME DESTINATIONS ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">🏦 Income Destinations</h2>
            <p className="text-white/40 text-xs mt-0.5">Where income lands — shown when adding income transactions</p>
          </div>
          {!showNewDestInput && (
            <Button variant="secondary" size="sm" onClick={() => setShowNewDestInput(true)}>+ Add Account</Button>
          )}
        </div>
        <div className="space-y-2">
          {/* Cash — built-in, non-deletable */}
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8 opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-base leading-none">💵</span>
              <span className="text-white text-sm font-medium">Cash</span>
              <span className="text-xs text-white/30">built-in</span>
            </div>
          </div>
          {incomeDestinations.filter(d => d.id !== 'cash').map((dest) => (
            <div key={dest.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-3">
                <span className="text-base leading-none">{dest.icon}</span>
                <span className="text-white text-sm font-medium">{dest.name}</span>
              </div>
              <button
                onClick={() => setDeleteDestId(dest.id)}
                className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          {/* Inline add input */}
          {showNewDestInput && (
            <div className="flex gap-2 items-center pt-1">
              <input
                autoFocus
                type="text"
                placeholder="e.g. Chase Checking, Savings Account"
                value={newDestName}
                onChange={e => setNewDestName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newDestName.trim()) {
                    addIncomeDestination({ id: crypto.randomUUID(), name: newDestName.trim(), icon: '🏦' });
                    setNewDestName(''); setShowNewDestInput(false);
                  } else if (e.key === 'Escape') {
                    setShowNewDestInput(false); setNewDestName('');
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#10B981]/50"
              />
              <button
                disabled={!newDestName.trim()}
                onClick={() => {
                  if (!newDestName.trim()) return;
                  addIncomeDestination({ id: crypto.randomUUID(), name: newDestName.trim(), icon: '🏦' });
                  setNewDestName(''); setShowNewDestInput(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-40 transition-all"
              >Add</button>
              <button onClick={() => { setShowNewDestInput(false); setNewDestName(''); }} className="px-2 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-all">✕</button>
            </div>
          )}
          {incomeDestinations.filter(d => d.id !== 'cash').length === 0 && !showNewDestInput && (
            <p className="text-white/30 text-sm">No accounts added yet</p>
          )}
        </div>
        {/* Default income destination */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Default for income</p>
            <p className="text-white/35 text-xs mt-0.5">Pre-selected when adding income</p>
          </div>
          <Select
            value={defaultIncomeDestination}
            onChange={e => setDefaultIncomeDestination(e.target.value)}
            containerClassName="min-w-[140px]"
            options={incomeDestinations.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))}
          />
        </div>
      </GlassCard>

      {/* ── ASSETS & LIABILITIES ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-1">🏦 Assets & Liabilities</h2>
        <p className="text-white/40 text-sm mb-4">Manual entries that count toward your net worth. Update periodically.</p>

        {/* Assets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#22C55E]">Assets</h3>
            <Button variant="ghost" size="sm" onClick={() => openAddEntry(false)}>+ Add Asset</Button>
          </div>
          {assets.length > 0 ? (
            <div className="space-y-2">
              {assets.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                  <div>
                    <p className="text-white text-sm font-medium">{entry.name}</p>
                    <p className="text-white/40 text-xs">{getAssetCatLabel(entry.assetCategory)} · Updated {formatDate(entry.lastUpdated, 'short')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#22C55E] font-mono text-sm font-semibold">{formatCurrency(entry.value, defaultCurrency)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No assets added</p>
          )}
        </div>

        {/* Liabilities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#EF4444]">Liabilities</h3>
            <Button variant="ghost" size="sm" onClick={() => openAddEntry(true)}>+ Add Liability</Button>
          </div>
          {liabilities.length > 0 ? (
            <div className="space-y-2">
              {liabilities.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                  <div>
                    <p className="text-white text-sm font-medium">{entry.name}</p>
                    <p className="text-white/40 text-xs">{getAssetCatLabel(entry.assetCategory)} · Updated {formatDate(entry.lastUpdated, 'short')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#EF4444] font-mono text-sm font-semibold">-{formatCurrency(entry.value, defaultCurrency)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No liabilities added</p>
          )}
        </div>
      </GlassCard>

      {/* ── DATA MANAGEMENT ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">💾 Data Management</h2>
        <div className="space-y-3">
          <Button variant="secondary" onClick={handleExportJSON} fullWidth>⬇️ Export Full Backup (JSON)</Button>
          <Button variant="secondary" onClick={handleExportCSV} fullWidth>📊 Export Transactions (CSV)</Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()} fullWidth>⬆️ Import Backup (JSON)</Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          {lastBackupDate && (
            <p className="text-xs text-white/30 text-center">Last backup: {formatDate(lastBackupDate)}</p>
          )}
        </div>
      </GlassCard>

      {/* ── DANGER ZONE ── */}
      <GlassCard padding="lg" className="border border-[#EF4444]/20">
        <h2 className="text-xl font-semibold text-[#EF4444] mb-4">⚠️ Danger Zone</h2>
        <div className="space-y-3">
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/8">
            <p className="text-white font-medium text-sm mb-0.5">Reset This Device</p>
            <p className="text-white/40 text-xs mb-3">Clears all local data. Your cloud backup is preserved — sign back in to restore.</p>
            <Button variant="danger" size="sm" onClick={() => setShowSoftResetConfirm(true)}>Reset This Device</Button>
          </div>
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/8">
            <p className="text-white font-medium text-sm mb-0.5">Delete Everything</p>
            <p className="text-white/40 text-xs mb-3">Permanently deletes all data from this device and the cloud. Cannot be undone.</p>
            <Button variant="danger" size="sm" onClick={() => { setClearText(''); setShowHardResetConfirm(true); }}>Delete Everything</Button>
          </div>
        </div>
      </GlassCard>

      {/* CATEGORY MODAL */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? `Edit ${catContext === 'expense' ? 'Expense' : 'Income'} Category` : `Add ${catContext === 'expense' ? 'Expense' : 'Income'} Category`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowCatModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveCat} disabled={!catName}>{editingCat ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Name" placeholder="Category name" value={catName} onChange={e => setCatName(e.target.value)} required />
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Emoji</p>
            <div className="grid grid-cols-8 gap-1 p-2 bg-white/5 rounded-xl max-h-36 overflow-y-auto mb-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCatEmoji(emoji)}
                  className={`text-xl p-1.5 rounded-lg transition-all hover:bg-white/10 ${catEmoji === emoji ? 'bg-[#10B981]/30 ring-1 ring-[#10B981]' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input placeholder="Or type a custom emoji..." value={catEmoji} onChange={e => setCatEmoji(e.target.value)} hint="Type any emoji not shown above" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {['#10B981','#22C55E','#EF4444','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#10b981','#f97316','#6b7280','#ef4444','#3b82f6'].map(c => (
                <button key={c} onClick={() => setCatColor(c)} className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${catColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111111] scale-110' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* CARD MODAL */}
      <Modal isOpen={showCardModal} onClose={() => setShowCardModal(false)} title={editingCard ? 'Edit Card' : 'Add Card'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowCardModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveCard} disabled={!cardName}>{editingCard ? 'Save' : 'Add Card'}</Button></>}>
        <div className="space-y-4">
          <Input label="Card Name" placeholder="Visa *1234, Mastercard..." value={cardName} onChange={e => setCardName(e.target.value)} required />
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Card Color</p>
            <div className="flex flex-wrap gap-2">
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => setCardColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${cardColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111111] scale-110' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {cardName && (
            <div className="p-3 rounded-xl text-sm font-medium text-white flex items-center gap-2" style={{ background: `${cardColor}22`, border: `1px solid ${cardColor}44` }}>
              <div className="w-3 h-3 rounded-full" style={{ background: cardColor }} />
              {cardName}
            </div>
          )}
        </div>
      </Modal>

      {/* ENTRY MODAL */}
      <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} title={editingEntry ? `Edit ${entryIsLiability ? 'Liability' : 'Asset'}` : `Add ${entryIsLiability ? 'Liability' : 'Asset'}`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowEntryModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveEntry} disabled={!entryName || !entryValue}>{editingEntry ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Name" placeholder={entryIsLiability ? 'Student loan, Mortgage...' : 'House, Car, Savings...'} value={entryName} onChange={e => setEntryName(e.target.value)} required />
          <Input label={`Value (${defaultCurrency})`} type="number" inputMode="decimal" placeholder="50000" value={entryValue} onChange={e => setEntryValue(e.target.value)} required />
          <Select label="Category" value={entryCategory} onChange={e => setEntryCategory(e.target.value)} options={entryIsLiability ? liabilityCatOptions : assetCatOptions} />
        </div>
      </Modal>

      {/* IMPORT CONFIRM */}
      <Modal isOpen={showImportConfirm} onClose={() => setShowImportConfirm(false)} title="Import Backup" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowImportConfirm(false)}>Cancel</Button><Button variant="primary" onClick={handleImportConfirm}>Import & Replace</Button></>}>
        <div className="space-y-3">
          <p className="text-white/70">{importSummary}</p>
          <p className="text-amber-400 text-sm">⚠️ This will replace your existing data. Are you sure?</p>
        </div>
      </Modal>

      {/* SOFT RESET CONFIRM */}
      <Modal isOpen={showSoftResetConfirm} onClose={() => setShowSoftResetConfirm(false)} title="Reset This Device" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowSoftResetConfirm(false)}>Cancel</Button><Button variant="danger" onClick={handleSoftReset}>Reset This Device</Button></>}>
        <p className="text-white/70">This will clear all data on this device. Your cloud backup is safe — sign back in to restore everything.</p>
      </Modal>

      {/* HARD RESET CONFIRM */}
      <Modal isOpen={showHardResetConfirm} onClose={() => setShowHardResetConfirm(false)} title="Delete Everything" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowHardResetConfirm(false)}>Cancel</Button><Button variant="danger" onClick={handleHardReset} disabled={clearText !== 'DELETE'}>Delete Everything</Button></>}>
        <div className="space-y-4">
          <p className="text-white/70">Permanently deletes all data from this device and your cloud backup. This cannot be undone.</p>
          <p className="text-white/50 text-sm">Type <strong className="text-white">DELETE</strong> to confirm:</p>
          <Input value={clearText} onChange={(e) => setClearText(e.target.value.toUpperCase())} placeholder="DELETE" />
        </div>
      </Modal>

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog isOpen={!!deleteCatId} onClose={() => setDeleteCatId(null)} onConfirm={() => { handleDeleteCat(); }} title="Delete Category" message="Delete this category?" confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteCardId} onClose={() => setDeleteCardId(null)} onConfirm={() => { if (deleteCardId) { deleteCard(deleteCardId); setDeleteCardId(null); } }} title="Delete Card" message="Delete this payment card? Transactions linked to it will remain." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteDestId} onClose={() => setDeleteDestId(null)} onConfirm={() => { if (deleteDestId) { deleteIncomeDestination(deleteDestId); setDeleteDestId(null); } }} title="Remove Account" message="Remove this income destination? Past transactions will not be affected." confirmLabel="Remove" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteEntryId} onClose={() => setDeleteEntryId(null)} onConfirm={() => { if (deleteEntryId) { deleteManualEntry(deleteEntryId); setDeleteEntryId(null); } }} title="Delete Entry" message="Delete this asset/liability entry?" confirmLabel="Delete" confirmVariant="danger" />
    </div>
  );
}
