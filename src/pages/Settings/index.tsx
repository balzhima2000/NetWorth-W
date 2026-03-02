import { useState, useRef, useEffect } from 'react';
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
import { testApiKey } from '../../services/alphaVantage';
import { exportFullBackup, exportTransactionsCSV, parseBackup } from '../../services/exportImport';
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

  // Page title
  useEffect(() => { document.title = 'Settings — NetWorth Tracker'; }, []);

  // ── Settings Store ──
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const apiKey = useSettingsStore((s) => s.alphaVantageApiKey);
  const setApiKey = useSettingsStore((s) => s.setAlphaVantageApiKey);
  const requestsUsed = useSettingsStore((s) => s.alphaVantageRequestsUsedToday);
  const requestsResetDate = useSettingsStore((s) => s.alphaVantageRequestsResetDate);
  const lastBackupDate = useSettingsStore((s) => s.lastBackupDate);
  const setLastBackupDate = useSettingsStore((s) => s.setLastBackupDate);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const addExchangeRate = useSettingsStore((s) => s.addExchangeRate);
  const removeExchangeRate = useSettingsStore((s) => s.removeExchangeRate);
  const setHasCompletedSetup = useSettingsStore((s) => s.setHasCompletedSetup);

  // ── Data Stores ──
  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const updateCard = useCardsStore((s) => s.updateCard);
  const deleteCard = useCardsStore((s) => s.deleteCard);

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
  const transactions = useTransactionStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);

  // ── API Key State ──
  const [newApiKey, setNewApiKey] = useState(apiKey);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const handleTestApiKey = async () => {
    if (!newApiKey) return;
    setApiKeyStatus('testing');
    const valid = await testApiKey(newApiKey);
    setApiKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) {
      setApiKey(newApiKey);
      toast.success('API key saved. Looks valid!');
    } else {
      toast.error('API key is invalid or request failed.');
    }
  };

  // ── Exchange Rate State ──
  const [newRateCurrency, setNewRateCurrency] = useState('');
  const [newRateValue, setNewRateValue] = useState('');
  const [showAddRate, setShowAddRate] = useState(false);

  const handleAddRate = () => {
    if (!newRateCurrency || !newRateValue) return;
    addExchangeRate({ currency: newRateCurrency, rateToDefault: parseFloat(newRateValue) });
    setNewRateCurrency(''); setNewRateValue(''); setShowAddRate(false);
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
    exportTransactionsCSV(transactions);
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

  // ── Clear All Data ──
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearText, setClearText] = useState('');

  const handleClearAll = () => {
    if (clearText !== 'DELETE') return;
    usePortfolioStore.setState({ trades: [], currentPrices: {}, lastPriceUpdates: {} });
    useTransactionStore.setState({ transactions: [], lastUsedPaymentMethod: 'cash' });
    useBudgetStore.setState({ budgets: [], summaries: [] });
    useNetWorthStore.setState({ manualEntries: [], snapshots: [], lastSnapshotDate: null });
    useCardsStore.setState({ cards: [] });
    useRecurringStore.setState({ recurringPayments: [], installmentPlans: [] });
    useAllocationStore.setState({ mode: 'none', targets: {} });
    setHasCompletedSetup(false);
    setShowClearConfirm(false);
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

      {/* ── API CONFIGURATION ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">🔑 API Configuration</h2>
        <div className="space-y-3">
          <Input
            label="Alpha Vantage API Key"
            type="password"
            placeholder="Enter your API key..."
            value={newApiKey}
            onChange={(e) => { setNewApiKey(e.target.value); setApiKeyStatus('idle'); }}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleTestApiKey} disabled={!newApiKey || apiKeyStatus === 'testing'}>
              {apiKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
            </Button>
            <Button variant="ghost" onClick={() => { setApiKey(newApiKey); setApiKeyStatus('idle'); }} disabled={!newApiKey}>
              Save Without Testing
            </Button>
          </div>
          {apiKeyStatus === 'valid' && <p className="text-[#00d632] text-sm">✅ Valid API key — saved!</p>}
          {apiKeyStatus === 'invalid' && <p className="text-[#ff4757] text-sm">❌ Invalid API key — check and try again</p>}
          <div className="p-3 bg-white/5 rounded-xl text-sm text-white/40 space-y-1">
            <p>Requests used today: <span className="text-white">{requestsUsed}/25</span> (resets: {requestsResetDate})</p>
            <p>Get a free key at <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">alphavantage.co</a></p>
            <p>Also see: <a href="https://www.massive.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">massive.com</a></p>
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
              <Button variant="ghost" size="sm" onClick={() => setShowAddRate(!showAddRate)}>+ Add Rate</Button>
            </div>
            <p className="text-xs text-white/30 mb-3">1 foreign currency = X {defaultCurrency}. Update periodically.</p>

            {showAddRate && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Currency"
                    value={newRateCurrency}
                    onChange={(e) => setNewRateCurrency(e.target.value)}
                    options={[{ value: '', label: 'Select...' }, ...CURRENCIES.filter(c => c.code !== defaultCurrency).map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))]}
                  />
                  <Input
                    label={`Rate to ${defaultCurrency}`}
                    type="number"
                    inputMode="decimal"
                    placeholder="1.08"
                    value={newRateValue}
                    onChange={(e) => setNewRateValue(e.target.value)}
                    hint={`1 ${newRateCurrency || 'EUR'} = ? ${defaultCurrency}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddRate} disabled={!newRateCurrency || !newRateValue}>Add Rate</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddRate(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {exchangeRates.length > 0 ? (
              <div className="space-y-2">
                {exchangeRates.map((rate) => (
                  <div key={rate.currency} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                    <span className="text-white font-mono text-sm">1 {rate.currency} = {rate.rateToDefault} {defaultCurrency}</span>
                    <button onClick={() => removeExchangeRate(rate.currency)} className="text-white/30 hover:text-[#ff4757] transition-colors text-xs px-2 py-1 rounded-lg hover:bg-[#ff4757]/10">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No exchange rates configured</p>
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
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#ff4757] hover:bg-[#ff4757]/10'}`}
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
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#ff4757] hover:bg-[#ff4757]/10'}`}
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
              <div className="w-5 h-5 rounded-full bg-[#00d632]" />
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
                <button onClick={() => setDeleteCardId(card.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#ff4757] hover:bg-[#ff4757]/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && <p className="text-white/30 text-sm">No cards added yet</p>}
        </div>
      </GlassCard>

      {/* ── ASSETS & LIABILITIES ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-1">🏦 Assets & Liabilities</h2>
        <p className="text-white/40 text-sm mb-4">Manual entries that count toward your net worth. Update periodically.</p>

        {/* Assets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#00d632]">Assets</h3>
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
                    <p className="text-[#00d632] font-mono text-sm font-semibold">{formatCurrency(entry.value, defaultCurrency, true)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#ff4757] hover:bg-[#ff4757]/10 transition-colors">
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
            <h3 className="text-base font-semibold text-[#ff4757]">Liabilities</h3>
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
                    <p className="text-[#ff4757] font-mono text-sm font-semibold">-{formatCurrency(entry.value, defaultCurrency, true)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#ff4757] hover:bg-[#ff4757]/10 transition-colors">
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
      <GlassCard padding="lg" className="border border-[#ff4757]/20">
        <h2 className="text-xl font-semibold text-[#ff4757] mb-2">⚠️ Danger Zone</h2>
        <p className="text-white/40 text-sm mb-4">This will delete ALL your data and return you to the setup screen. This cannot be undone.</p>
        <Button variant="danger" onClick={() => { setClearText(''); setShowClearConfirm(true); }} fullWidth>
          Clear All Data
        </Button>
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
                  className={`text-xl p-1.5 rounded-lg transition-all hover:bg-white/10 ${catEmoji === emoji ? 'bg-[#5865f2]/30 ring-1 ring-[#5865f2]' : ''}`}
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
              {['#5865f2','#00d632','#ff4757','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#10b981','#f97316','#6b7280','#ef4444','#3b82f6'].map(c => (
                <button key={c} onClick={() => setCatColor(c)} className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${catColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#13131f] scale-110' : ''}`} style={{ background: c }} />
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
                <button key={c} onClick={() => setCardColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${cardColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#13131f] scale-110' : ''}`} style={{ background: c }} />
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

      {/* CLEAR CONFIRM */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear All Data" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowClearConfirm(false)}>Cancel</Button><Button variant="danger" onClick={handleClearAll} disabled={clearText !== 'DELETE'}>Clear All Data</Button></>}>
        <div className="space-y-4">
          <p className="text-white/70">This will permanently delete all your data including transactions, trades, assets, and settings. You will be returned to the setup screen.</p>
          <p className="text-white/50 text-sm">Type <strong className="text-white">DELETE</strong> to confirm:</p>
          <Input value={clearText} onChange={(e) => setClearText(e.target.value.toUpperCase())} placeholder="DELETE" />
        </div>
      </Modal>

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog isOpen={!!deleteCatId} onClose={() => setDeleteCatId(null)} onConfirm={() => { handleDeleteCat(); }} title="Delete Category" message="Delete this category?" confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteCardId} onClose={() => setDeleteCardId(null)} onConfirm={() => { if (deleteCardId) { deleteCard(deleteCardId); setDeleteCardId(null); } }} title="Delete Card" message="Delete this payment card? Transactions linked to it will remain." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteEntryId} onClose={() => setDeleteEntryId(null)} onConfirm={() => { if (deleteEntryId) { deleteManualEntry(deleteEntryId); setDeleteEntryId(null); } }} title="Delete Entry" message="Delete this asset/liability entry?" confirmLabel="Delete" confirmVariant="danger" />
    </div>
  );
}
