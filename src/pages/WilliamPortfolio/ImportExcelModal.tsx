/**
 * William Excel import — native port of the classic ExcelImportModal.
 * Upload a broker .xlsx snapshot → preview parsed holdings → import selected.
 * Reuses the `parsePortfolioExcel` service and writes to the portfolio store
 * (addTrade + seed currentPrices from the Excel Last rate). William-styled:
 * mono numbers, lime/orange P&L, outline market chips, no emoji.
 */
import React, { useRef, useState } from 'react';
import { Modal, Button, Icon } from '../../components/william';
import { cn } from '../../components/william/cn';
import { ASSET_CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { parsePortfolioExcel, type ImportRow } from '../../services/excelImport';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useToast } from '../../hooks/useToast';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';
const CATEGORY_OPTIONS = ASSET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

export function ImportExcelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trades = usePortfolioStore((s) => s.trades);
  const addTrade = usePortfolioStore((s) => s.addTrade);
  const updateCurrentPrice = usePortfolioStore((s) => s.updateCurrentPrice);
  const toast = useToast();

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); setFileName(''); setParseError(null); };
  const close = () => { reset(); onClose(); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parsePortfolioExcel(file, trades);
      if (parsed.length === 0) throw new Error('No holdings found. Make sure the sheet has the expected column headers.');
      setRows(parsed);
    } catch (err: any) {
      setParseError(err.message ?? 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const toggle = (key: string) => setRows((p) => p.map((r) => (r.rowKey === key ? { ...r, selected: !r.selected } : r)));
  const toggleAll = () => { const all = rows.every((r) => r.selected); setRows((p) => p.map((r) => ({ ...r, selected: !all }))); };
  const setCategory = (key: string, assetCategory: AssetCategory) =>
    setRows((p) => p.map((r) => (r.rowKey === key ? { ...r, assetCategory } : r)));

  const selected = rows.filter((r) => r.selected);
  const conflicts = rows.filter((r) => r.hasConflict).length;

  const confirm = () => {
    selected.forEach((row) => {
      addTrade({
        id: crypto.randomUUID(),
        ticker: row.ticker, name: row.name, quantity: row.quantity, buyPrice: row.buyPrice,
        buyDate: row.buyDate, sellPrice: null, sellDate: null,
        assetCategory: row.assetCategory, notes: '', market: row.market, currency: row.currency,
      });
      // Seed current price from the Excel Last rate so gain shows before a refresh.
      updateCurrentPrice(row.ticker, row.rawLastRate, 'excel');
    });
    toast.success(`Imported ${selected.length} holding${selected.length !== 1 ? 's' : ''} — prices seeded from the Excel snapshot.`);
    close();
  };

  const fmt = (n: number, ccy: string) => formatCurrency(n, ccy);

  const footer = rows.length > 0 ? (
    <>
      <span className="num-mono mr-auto text-[12px] text-muted">
        {selected.length}/{rows.length} selected
        {conflicts > 0 && <span className="ml-2 text-secondary">· {conflicts} will merge</span>}
      </span>
      <Button variant="tonal" size="m" onClick={close}>Cancel</Button>
      <Button variant="primary" size="m" onClick={confirm} disabled={selected.length === 0}>
        Import {selected.length} holding{selected.length !== 1 ? 's' : ''}
      </Button>
    </>
  ) : null;

  return (
    <Modal open={open} onClose={close} title="Import from broker Excel" footer={footer} maxWidth={rows.length > 0 ? 900 : 480}>
      {/* Upload step */}
      {rows.length === 0 && !parsing && (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-secondary">
            Upload your broker's portfolio snapshot (.xlsx). Each row should represent one open position.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Icon name="import" size={28} className="text-secondary" />
            <span className="text-[15px] font-semibold text-ink">Click to select an .xlsx file</span>
            <span className="text-[13px] text-muted">Supports the standard broker portfolio export format</span>
          </button>
          <input
            ref={fileInputRef} type="file" className="hidden"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile}
          />
          {parseError && (
            <p className="rounded-xl bg-negative-bg px-3 py-2 text-[13px] text-negative">{parseError}</p>
          )}
        </div>
      )}

      {/* Parsing */}
      {parsing && <div className="py-16 text-center text-[14px] text-muted">Parsing file…</div>}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-secondary">
            <div>
              <span className="font-medium text-ink">{fileName}</span>
              <span className="ml-2">· {rows.length} holdings detected</span>
              {conflicts > 0 && <span className="ml-2 text-secondary">· {conflicts} already in portfolio</span>}
            </div>
            <Button variant="tonal" size="xs" onClick={reset}>Change file</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ minWidth: 720 }}>
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.4px] text-muted">
                  <th className="w-8 pb-2 pr-2 text-center">
                    <input type="checkbox" checked={rows.every((r) => r.selected)} onChange={toggleAll} className="align-middle accent-[var(--w-accent)]" />
                  </th>
                  <th className="pb-2 pr-4 text-left font-medium">Name / Symbol</th>
                  <th className="num-mono pb-2 pr-3 text-right font-medium">Qty</th>
                  <th className="num-mono pb-2 pr-3 text-right font-medium">Avg cost</th>
                  <th className="num-mono pb-2 pr-3 text-right font-medium">Last rate</th>
                  <th className="num-mono pb-2 pr-3 text-right font-medium">P&amp;L</th>
                  <th className="pb-2 pr-3 text-left font-medium" style={{ minWidth: 104 }}>Category</th>
                  <th className="pb-2 text-left font-medium">Market</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <React.Fragment key={row.rowKey}>
                    <tr className={cn('transition-opacity', !row.selected && 'opacity-40')}>
                      <td className="py-2.5 pr-2 text-center">
                        <input type="checkbox" checked={row.selected} onChange={() => toggle(row.rowKey)} className="align-middle accent-[var(--w-accent)]" />
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="max-w-[180px] truncate font-medium text-ink">{row.name}</div>
                        <div className="num-mono text-[12px] text-muted">{row.ticker}</div>
                      </td>
                      <td className="num-mono py-2.5 pr-3 text-right text-ink">{row.quantity.toLocaleString()}</td>
                      <td className="num-mono py-2.5 pr-3 text-right text-ink">{fmt(row.buyPrice, row.currency)}</td>
                      <td className="num-mono py-2.5 pr-3 text-right text-muted">{fmt(row.rawLastRate, row.currency)}</td>
                      <td className={cn('num-mono py-2.5 pr-3 text-right', row.totalPL >= 0 ? 'text-positive' : 'text-negative')}>
                        {row.totalPL >= 0 ? '+' : ''}{fmt(row.totalPL, row.currency)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <select
                          value={row.assetCategory}
                          onChange={(e) => setCategory(row.rowKey, e.target.value as AssetCategory)}
                          className="w-full rounded-lg bg-sunken px-2 py-1 text-[12px] text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2.5">
                        <span className="inline-block whitespace-nowrap rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-secondary">
                          {row.market === 'tase' ? 'TASE' : 'Global'}
                        </span>
                      </td>
                    </tr>
                    {row.hasConflict && row.selected && (
                      <tr>
                        <td />
                        <td colSpan={7} className="pb-2 text-[12px] leading-relaxed text-secondary">
                          <span className="num-mono">{row.ticker}</span> already in portfolio
                          ({row.existingQty.toLocaleString()} @ {fmt(row.existingBlendedCost, row.currency)} avg). After import:{' '}
                          <span className="font-medium text-ink">
                            {row.projectedQty.toLocaleString()} @ {fmt(row.projectedBlendedCost, row.currency)} blended avg
                          </span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] leading-relaxed text-muted">
            Avg cost is stored in each stock's native currency (USD for global, ₪ for TASE). Last rate and P&amp;L are
            shown for reference; Last rate is seeded as the current price — use Refresh to fetch live quotes.
          </p>
        </div>
      )}
    </Modal>
  );
}
