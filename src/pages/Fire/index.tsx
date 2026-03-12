import { useState, useMemo, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { GlassCard, Button, Input, Tabs } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import {
  calcFireNumber,
  calcYearsToFire,
  calcSWRTable,
  calcCompoundInterest,
} from '../../utils/calculations';
import { FireProjectionChart } from '../../components/charts/FireProjectionChart';
import { CompoundInterestChart } from '../../components/charts/CompoundInterestChart';

const tabs = [
  { id: 'fire-number', label: '🔥 FIRE Number' },
  { id: 'time-to-fire', label: '⏱️ Time to FIRE' },
  { id: 'swr', label: '📊 SWR Table' },
  { id: 'compound', label: '📈 Compound' },
];

const SWR_COLOR_MAP: Record<string, string> = {
  green: 'text-[#22C55E]',
  yellow: 'text-amber-400',
  orange: 'text-orange-400',
  red: 'text-[#EF4444]',
};
const SWR_BG_MAP: Record<string, string> = {
  green: 'bg-[#22C55E]/10 border-[#22C55E]/30',
  yellow: 'bg-amber-400/10 border-amber-400/30',
  orange: 'bg-orange-400/10 border-orange-400/30',
  red: 'bg-[#EF4444]/10 border-[#EF4444]/30',
};

export default function Fire() {
  const fireTarget = useSettingsStore((s) => s.fireTarget);
  const setFireTarget = useSettingsStore((s) => s.setFireTarget);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);

  useEffect(() => { document.title = 'FIRE Calculators — NetWorth Tracker'; }, []);

  const [activeTab, setActiveTab] = useState('fire-number');

  // Tab 1: FIRE Number
  const [fn_expenses, setFnExpenses] = useState('');
  const [fn_withdrawal, setFnWithdrawal] = useState('4');

  // Tab 2: Time to FIRE
  const [ttf_savings, setTtfSavings] = useState('');
  const [ttf_monthly, setTtfMonthly] = useState('');
  const [ttf_return, setTtfReturn] = useState('7');
  const [ttf_target, setTtfTarget] = useState(fireTarget ? String(fireTarget) : '');

  // Tab 3: SWR
  const [swr_savings, setSwrSavings] = useState('');

  // Tab 4: Compound
  const [ci_initial, setCiInitial] = useState('');
  const [ci_monthly, setCiMonthly] = useState('');
  const [ci_return, setCiReturn] = useState('7');
  const [ci_years, setCiYears] = useState('20');

  // ── Tab 1 results ──
  const fireNumber = useMemo(() => {
    const exp = parseFloat(fn_expenses);
    const wr = parseFloat(fn_withdrawal);
    if (!exp || !wr || wr <= 0) return null;
    return calcFireNumber(exp, wr);
  }, [fn_expenses, fn_withdrawal]);

  // ── Tab 2 results ──
  const ttfResult = useMemo(() => {
    const savings = parseFloat(ttf_savings);
    const monthly = parseFloat(ttf_monthly);
    const ret = parseFloat(ttf_return);
    const target = parseFloat(ttf_target);
    if (isNaN(savings) || isNaN(monthly) || !ret || !target || target <= 0) return null;
    return calcYearsToFire(savings, monthly, ret, target);
  }, [ttf_savings, ttf_monthly, ttf_return, ttf_target]);

  // ── Tab 3 results ──
  const swrRows = useMemo(() => {
    const savings = parseFloat(swr_savings);
    if (!savings || savings <= 0) return null;
    return calcSWRTable(savings);
  }, [swr_savings]);

  // ── Tab 4 results ──
  const ciResult = useMemo(() => {
    const initial = parseFloat(ci_initial) || 0;
    const monthly = parseFloat(ci_monthly) || 0;
    const ret = parseFloat(ci_return);
    const years = parseInt(ci_years);
    if (!ret || !years || years <= 0) return null;
    return calcCompoundInterest(initial, monthly, ret, years);
  }, [ci_initial, ci_monthly, ci_return, ci_years]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">FIRE Calculators</h1>
        <p className="text-white/50">Plan your path to financial independence. All inputs are manual — nothing is saved.</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ── TAB 1: FIRE NUMBER ── */}
      {activeTab === 'fire-number' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Inputs</h3>
              <div className="space-y-4">
                <Input
                  label="Annual Expenses"
                  type="number"
                  placeholder="40000"
                  value={fn_expenses}
                  onChange={(e) => setFnExpenses(e.target.value)}
                  hint="How much do you spend per year?"
                />
                <Input
                  label="Withdrawal Rate %"
                  type="number"
                  placeholder="4"
                  value={fn_withdrawal}
                  onChange={(e) => setFnWithdrawal(e.target.value)}
                  hint="Standard safe withdrawal rate is 4%"
                />
              </div>
            </GlassCard>

            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Result</h3>
              {fireNumber !== null ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Your FIRE Number</p>
                    <p className="text-4xl font-bold text-white font-mono">
                      {formatCurrency(fireNumber, defaultCurrency, true)}
                    </p>
                    <p className="text-white/40 text-sm mt-2">
                      At {fn_withdrawal}% withdrawal rate on {formatCurrency(parseFloat(fn_expenses), defaultCurrency, true)}/year
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Annual withdrawal</span>
                      <span className="text-white font-semibold font-mono">
                        {formatCurrency(parseFloat(fn_expenses), defaultCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly withdrawal</span>
                      <span className="text-white font-semibold font-mono">
                        {formatCurrency(parseFloat(fn_expenses) / 12, defaultCurrency)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setFireTarget(fireNumber);
                      setTtfTarget(String(Math.round(fireNumber)));
                    }}
                    fullWidth
                  >
                    {fireTarget ? '✅ Update FIRE Target' : '🎯 Set as FIRE Target'}
                  </Button>
                  {fireTarget && (
                    <p className="text-xs text-white/40 text-center">
                      Current target: {formatCurrency(fireTarget, defaultCurrency, true)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-white/30 text-center text-sm">Enter annual expenses and withdrawal rate to calculate</p>
                </div>
              )}
            </GlassCard>
          </div>

          <GlassCard padding="md">
            <h4 className="text-white/70 font-medium mb-2">💡 About the FIRE Number</h4>
            <p className="text-white/40 text-sm leading-relaxed">
              Your FIRE Number = Annual Expenses ÷ Withdrawal Rate. The classic <strong className="text-white/60">4% rule</strong> comes
              from the Trinity Study, which found that withdrawing 4% annually has historically sustained a 30+ year retirement.
              More conservative investors use 3–3.5%.
            </p>
          </GlassCard>
        </div>
      )}

      {/* ── TAB 2: TIME TO FIRE ── */}
      {activeTab === 'time-to-fire' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Inputs</h3>
              <div className="space-y-4">
                <Input
                  label="Current Savings / Portfolio"
                  type="number"
                  placeholder="50000"
                  value={ttf_savings}
                  onChange={(e) => setTtfSavings(e.target.value)}
                />
                <Input
                  label="Monthly Contributions"
                  type="number"
                  placeholder="1500"
                  value={ttf_monthly}
                  onChange={(e) => setTtfMonthly(e.target.value)}
                />
                <Input
                  label="Expected Annual Return %"
                  type="number"
                  placeholder="7"
                  value={ttf_return}
                  onChange={(e) => setTtfReturn(e.target.value)}
                  hint="Historical average ~7% (inflation-adjusted)"
                />
                <Input
                  label="FIRE Target"
                  type="number"
                  placeholder="1000000"
                  value={ttf_target}
                  onChange={(e) => setTtfTarget(e.target.value)}
                  hint={fireTarget ? `From your saved FIRE target` : 'Calculate this in Tab 1'}
                />
              </div>
            </GlassCard>

            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Result</h3>
              {ttfResult !== null ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/30">
                      <p className="text-[#22C55E]/60 text-xs mb-1">Years to FIRE</p>
                      <p className="text-3xl font-bold text-[#22C55E] font-mono">
                        {ttfResult.years < 600 ? ttfResult.years.toFixed(1) : '50+'}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/40 text-xs mb-1">Target Year</p>
                      <p className="text-3xl font-bold text-white font-mono">
                        {ttfResult.years < 600 ? ttfResult.targetYear : '–'}
                      </p>
                    </div>
                  </div>
                  {ttfResult.years >= 600 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-amber-400 text-sm">⚠️ At this rate you may not reach FIRE within 50 years. Try increasing monthly contributions or expected return.</p>
                    </div>
                  )}
                  {ttfResult.years < 600 && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm text-white/50">
                      <p>You'll reach your FIRE target of{' '}
                        <span className="text-white">{formatCurrency(parseFloat(ttf_target), defaultCurrency, true)}</span>{' '}
                        in <span className="text-[#22C55E]">{Math.ceil(ttfResult.years)} years</span> ({ttfResult.targetYear}).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-white/30 text-center text-sm">Fill in all inputs to see how long until FIRE</p>
                </div>
              )}
            </GlassCard>
          </div>

          {ttfResult && ttfResult.projectionData.length > 1 && (
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white mb-4">Portfolio Growth Projection</h3>
              <FireProjectionChart
                data={ttfResult.projectionData}
                fireTarget={parseFloat(ttf_target) || 0}
                currency={defaultCurrency}
              />
              <p className="text-white/30 text-xs mt-3">
                The dashed line represents your FIRE target of {formatCurrency(parseFloat(ttf_target) || 0, defaultCurrency, true)}
              </p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── TAB 3: SWR TABLE ── */}
      {activeTab === 'swr' && (
        <div className="space-y-4">
          <GlassCard padding="lg">
            <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Inputs</h3>
            <div className="max-w-sm">
              <Input
                label="Total Savings at Retirement"
                type="number"
                placeholder="1000000"
                value={swr_savings}
                onChange={(e) => setSwrSavings(e.target.value)}
                hint="How much will you have when you retire?"
              />
            </div>
          </GlassCard>

          {swrRows ? (
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white mb-4">Safe Withdrawal Rate Scenarios</h3>
              <div className="space-y-2">
                {swrRows.map((row) => (
                  <div
                    key={row.rate}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                      row.isHighlighted
                        ? 'bg-[#10B981]/15 border-[#10B981]/50 ring-1 ring-[#10B981]/30'
                        : SWR_BG_MAP[row.color]
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-center">
                        <span className={`text-2xl font-bold font-mono ${SWR_COLOR_MAP[row.color]}`}>
                          {row.rate}%
                        </span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${SWR_COLOR_MAP[row.color]}`}>{row.label}</p>
                        {row.isHighlighted && (
                          <p className="text-xs text-[#10B981]/80">Trinity Study standard ⭐</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold font-mono text-lg">
                        {formatCurrency(row.annualSpending, defaultCurrency, true)}<span className="text-white/40 text-sm font-normal">/yr</span>
                      </p>
                      <p className="text-white/50 text-sm font-mono">
                        {formatCurrency(row.monthlySpending, defaultCurrency, true)}<span className="text-white/30 text-xs">/mo</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-4">
                Based on {formatCurrency(parseFloat(swr_savings), defaultCurrency, true)} total savings.
                These are historical guidelines — actual results vary with market conditions.
              </p>
            </GlassCard>
          ) : (
            <GlassCard padding="lg" className="text-center py-16">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white/50">Enter your total savings to see withdrawal rate scenarios</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── TAB 4: COMPOUND INTEREST ── */}
      {activeTab === 'compound' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Inputs</h3>
              <div className="space-y-4">
                <Input
                  label="Initial Investment"
                  type="number"
                  placeholder="10000"
                  value={ci_initial}
                  onChange={(e) => setCiInitial(e.target.value)}
                />
                <Input
                  label="Monthly Contribution"
                  type="number"
                  placeholder="500"
                  value={ci_monthly}
                  onChange={(e) => setCiMonthly(e.target.value)}
                />
                <Input
                  label="Annual Return %"
                  type="number"
                  placeholder="7"
                  value={ci_return}
                  onChange={(e) => setCiReturn(e.target.value)}
                  hint="S&P 500 historical average ~10%, or ~7% inflation-adjusted"
                />
                <Input
                  label="Investment Period (Years)"
                  type="number"
                  placeholder="20"
                  value={ci_years}
                  onChange={(e) => setCiYears(e.target.value)}
                />
              </div>
            </GlassCard>

            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-wider mb-4">Result</h3>
              {ciResult !== null ? (
                <div className="space-y-4">
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10 text-center">
                    <p className="text-white/40 text-sm mb-1">Final Portfolio Value</p>
                    <p className="text-4xl font-bold text-white font-mono">
                      {formatCurrency(ciResult.finalValue, defaultCurrency, true)}
                    </p>
                    <p className="text-white/30 text-sm mt-1">after {ci_years} years</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#10B981]/10 rounded-xl border border-[#10B981]/30">
                      <p className="text-[#10B981]/70 text-xs mb-1">Total Contributed</p>
                      <p className="text-lg font-bold text-white font-mono">
                        {formatCurrency(ciResult.totalContributed, defaultCurrency, true)}
                      </p>
                    </div>
                    <div className="p-3 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/30">
                      <p className="text-[#22C55E]/70 text-xs mb-1">Total Growth</p>
                      <p className="text-lg font-bold text-[#22C55E] font-mono">
                        +{formatCurrency(ciResult.totalGrowth, defaultCurrency, true)}
                      </p>
                    </div>
                  </div>
                  {ciResult.totalContributed > 0 && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Growth multiplier</span>
                        <span className="text-amber-400 font-bold font-mono">
                          {(ciResult.finalValue / ciResult.totalContributed).toFixed(2)}×
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-white/50">% growth</span>
                        <span className="text-[#22C55E] font-mono">
                          +{(((ciResult.finalValue - ciResult.totalContributed) / ciResult.totalContributed) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-white/30 text-center text-sm">Enter values to see compound growth calculation</p>
                </div>
              )}
            </GlassCard>
          </div>

          {ciResult && ciResult.chartData.length > 1 && (
            <GlassCard padding="lg">
              <h3 className="text-base font-semibold text-white mb-1">Growth Over Time</h3>
              <p className="text-white/40 text-sm mb-4">The power of compound interest — blue is what you put in, green is free growth</p>
              <CompoundInterestChart data={ciResult.chartData} currency={defaultCurrency} />
              <div className="flex gap-6 mt-4 text-xs text-white/40">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#10B981]/70" />
                  <span>Money you contributed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#22C55E]/70" />
                  <span>Compound growth</span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
