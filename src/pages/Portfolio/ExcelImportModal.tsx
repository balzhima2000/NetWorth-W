import React, { useState, useRef } from 'react';
import { Modal, Button } from '../../components/ui';
import { ASSET_CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { parsePortfolioExcel } from '../../services/excelImport';
import type { ImportRow } from '../../services/excelImport';
import type { StockTrade } from '../../types/index';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTrades: StockTrade[];
  onImport: (rows: ImportRow[]) => void;
}

const CATEGORY_OPTIONS = ASSET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

export function ExcelImportModal({
  isOpen,
  onClose,
  existingTrades,
  onImport,
}: ExcelImportModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File handling ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parsePortfolioExcel(file, existingTrades);
      if (parsed.length === 0) throw new Error('No holdings found in file. Make sure the sheet has the expected column headers.');
      setRows(parsed);
    } catch (err: any) {
      setParseError(err.message ?? 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  /* ── Row state helpers ── */
  const toggleSelect = (rowKey: string) =>
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, selected: !r.selected } : r)));

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const updateRow = (rowKey: string, updates: Partial<ImportRow>) =>
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...updates } : r)));

  /* ── Derived state ── */
  const selectedRows = rows.filter((r) => r.selected);
  const conflictCount = rows.filter((r) => r.hasConflict).length;
  const selectedConflicts = selectedRows.filter((r) => r.hasConflict).length;

  /* ── Actions ── */
  const handleConfirm = () => {
    onImport(selectedRows);
    resetState();
    onClose();
  };

  const resetState = () => {
    setRows([]);
    setFileName('');
    setParseError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  /* ── Format helpers ── */
  const fmtNum = (n: number, currency: string) => formatCurrency(n, currency);
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📥 Import from Broker Excel"
      size="xl"
      footer={
        rows.length > 0 ? (
          <>
            <span className="text-white/40 text-xs mr-auto">
              {selectedRows.length}/{rows.length} selected
              {selectedConflicts > 0 && (
                <span className="text-yellow-400 ml-2">· {selectedConflicts} will merge with existing</span>
              )}
            </span>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={selectedRows.length === 0}
            >
              Import {selectedRows.length} holding{selectedRows.length !== 1 ? 's' : ''}
            </Button>
          </>
        ) : null
      }
    >
      {/* ── Upload step ── */}
      {rows.length === 0 && !parsing && (
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Upload your broker's portfolio snapshot (.xlsx). Each row should represent one open position.
          </p>
          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-white/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-5xl mb-3">📊</p>
            <p className="text-white/70 font-medium">Click to select .xlsx file</p>
            <p className="text-white/30 text-xs mt-1">Supports the standard broker portfolio export format</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
          {parseError && (
            <p className="text-[#EF4444] text-sm bg-[#EF4444]/10 rounded-lg px-3 py-2">{parseError}</p>
          )}
        </div>
      )}

      {/* ── Parsing spinner ── */}
      {parsing && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-white/50 text-sm">Parsing file…</p>
        </div>
      )}

      {/* ── Preview table ── */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-white/60">
              <span className="font-medium text-white/80">{fileName}</span>
              <span className="ml-2">· {rows.length} holdings detected</span>
              {conflictCount > 0 && (
                <span className="ml-2 text-yellow-400">
                  · ⚠️ {conflictCount} ticker{conflictCount > 1 ? 's' : ''} already in portfolio
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={resetState}>
              Change file
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-1 rounded-lg">
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="pb-2 pr-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={toggleAll}
                      className="rounded"
                      style={{ accentColor: '#10B981' }}
                    />
                  </th>
                  <th className="pb-2 pr-4 text-left">Name / Symbol</th>
                  <th className="pb-2 pr-3 text-right">Qty</th>
                  <th className="pb-2 pr-3 text-right">Avg Cost</th>
                  <th className="pb-2 pr-3 text-right">Last Rate</th>
                  <th className="pb-2 pr-3 text-right">Total Value</th>
                  <th className="pb-2 pr-3 text-right">P&L</th>
                  <th className="pb-2 pr-3 text-right">Yield</th>
                  <th className="pb-2 pr-3 text-right">Position&nbsp;%</th>
                  <th className="pb-2 pr-3 text-left" style={{ minWidth: 110 }}>Category</th>
                  <th className="pb-2 text-left">Market</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <React.Fragment key={row.rowKey}>
                    {/* Main data row */}
                    <tr className={`transition-opacity ${!row.selected ? 'opacity-35' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-2.5 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleSelect(row.rowKey)}
                          className="rounded"
                          style={{ accentColor: '#10B981' }}
                        />
                      </td>

                      {/* Name + ticker */}
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-white text-xs leading-tight max-w-[160px] truncate">{row.name}</div>
                        <div className="text-white/50 text-xs font-mono">{row.ticker}</div>
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 pr-3 text-right font-mono text-white text-xs">
                        {row.quantity.toLocaleString()}
                      </td>

                      {/* Avg Cost — native currency */}
                      <td className="py-2.5 pr-3 text-right font-mono text-xs">
                        <div className="text-white">{fmtNum(row.buyPrice, row.currency)}</div>
                      </td>

                      {/* Last Rate (preview-only, in native currency) */}
                      <td className="py-2.5 pr-3 text-right font-mono text-white/60 text-xs">
                        {fmtNum(row.rawLastRate, row.currency)}
                      </td>

                      {/* Total Value (preview-only, broker-reported) */}
                      <td className="py-2.5 pr-3 text-right font-mono text-white/60 text-xs">
                        {fmtNum(row.totalValue, row.currency)}
                      </td>

                      {/* P&L (preview-only) */}
                      <td className={`py-2.5 pr-3 text-right font-mono text-xs ${row.totalPL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {row.totalPL >= 0 ? '+' : ''}{fmtNum(row.totalPL, row.currency)}
                      </td>

                      {/* Yield (preview-only) */}
                      <td className={`py-2.5 pr-3 text-right font-mono text-xs ${row.totalYield >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {fmtPct(row.totalYield)}
                      </td>

                      {/* Position % (preview-only) */}
                      <td className="py-2.5 pr-3 text-right font-mono text-white/60 text-xs">
                        {row.positionRatio.toFixed(2)}%
                      </td>

                      {/* Category — editable */}
                      <td className="py-2.5 pr-3">
                        <select
                          value={row.assetCategory}
                          onChange={(e) => updateRow(row.rowKey, { assetCategory: e.target.value as AssetCategory })}
                          className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-full focus:outline-none focus:ring-1 focus:ring-[#10B981]/50"
                          style={{ colorScheme: 'dark' }}
                        >
                          {CATEGORY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: '#111111' }}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Market badge */}
                      <td className="py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            row.market === 'tase'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {row.market === 'tase' ? '🇮🇱 TASE' : '🌐 Global'}
                        </span>
                      </td>
                    </tr>

                    {/* Conflict sub-row */}
                    {row.hasConflict && row.selected && (
                      <tr className="bg-yellow-500/5">
                        <td />
                        <td colSpan={11} className="pb-2 text-xs text-yellow-400/80 leading-relaxed">
                          ⚠️ <span className="font-mono">{row.ticker}</span> already in portfolio&nbsp;
                          ({row.existingQty.toLocaleString()} shares&nbsp;@&nbsp;{fmtNum(row.existingBlendedCost, row.currency)}&nbsp;avg).
                          &nbsp;After import:&nbsp;
                          <span className="text-yellow-300 font-medium">
                            {row.projectedQty.toLocaleString()} shares&nbsp;@&nbsp;
                            {fmtNum(row.projectedBlendedCost, row.currency)}&nbsp;blended avg
                          </span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info note */}
          <p className="text-white/30 text-xs">
            💡 Avg Cost is stored in each stock's native currency (USD for global stocks, ₪ for TASE).
            Columns shown in grey (Last Rate, Total Value, P&L, Yield, Position&nbsp;%) are for reference only and will not be stored.
            Last Rate is seeded as the current price — click <span className="text-white/50 font-medium">🔄 Refresh Prices</span> to fetch live quotes.
          </p>
        </div>
      )}
    </Modal>
  );
}
