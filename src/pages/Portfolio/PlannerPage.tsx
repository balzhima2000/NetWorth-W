import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePlannerStore, PLANNER_COLORS } from '../../stores/plannerStore';
import type { PlannerProfile, PlannerCategory, PlannerAssignment } from '../../stores/plannerStore';
import type { CurrentHolding } from '../../types/index';
import { GlassCard, Button, Input, Modal, ConfirmDialog, EmptyState } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import { useIsMobile } from '../../hooks/useIsMobile';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  holdings: CurrentHolding[];
  totalValue: number;
  defaultCurrency: string;
}

interface TileRect { x: number; y: number; w: number; h: number }
interface TileLayout { id: string; rect: TileRect }

// ── Squarified treemap algorithm ─────────────────────────────────────────────

function squarify(
  items: Array<{ id: string; value: number }>,
  bounds: TileRect,
  minFraction = 0.04   // each tile gets at least this fraction of total area visually
): TileLayout[] {
  if (!items.length) return [];
  const totalArea = bounds.w * bounds.h;
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  if (totalValue === 0 || totalArea === 0) return [];

  // 1. Proportional areas
  const raw = [...items]
    .sort((a, b) => b.value - a.value)
    .map(i => ({ id: i.id, area: (i.value / totalValue) * totalArea }));

  // 2. Apply per-item visual minimum, then renormalise back to totalArea
  const minArea = totalArea * minFraction;
  const bumped = raw.map(i => ({ ...i, area: Math.max(i.area, minArea) }));
  const bumpedTotal = bumped.reduce((s, i) => s + i.area, 0);
  const scaled = bumped.map(i => ({ ...i, area: (i.area / bumpedTotal) * totalArea }));

  return _squarifyStep(scaled, bounds, []);
}

function _squarifyStep(
  items: Array<{ id: string; area: number }>,
  bounds: TileRect,
  acc: TileLayout[]
): TileLayout[] {
  if (!items.length) return acc;
  if (items.length === 1) return [...acc, { id: items[0].id, rect: bounds }];

  const { x, y, w, h } = bounds;
  const isH = w >= h;
  const short = isH ? h : w;

  // Find row that minimizes worst aspect ratio
  let rowSize = 0;
  let best = Infinity;
  let rowEnd = 0;

  for (let i = 0; i < items.length; i++) {
    rowSize += items[i].area;
    const rowDim = rowSize / short;
    let worst = 0;
    let running = 0;
    for (let j = 0; j <= i; j++) {
      running += items[j].area;
      const slot = items[j].area / rowDim;
      worst = Math.max(worst, Math.max(rowDim / slot, slot / rowDim));
    }
    if (worst < best) {
      best = worst;
      rowEnd = i + 1;
    } else if (i > 0) {
      break;
    }
  }

  const row = items.slice(0, rowEnd);
  const rowArea = row.reduce((s, i) => s + i.area, 0);
  const rowDim = rowArea / short;

  let pos = isH ? y : x;
  const rowLayouts: TileLayout[] = row.map(item => {
    const slot = item.area / rowDim;
    const rect: TileRect = isH
      ? { x, y: pos, w: rowDim, h: slot }
      : { x: pos, y, w: slot, h: rowDim };
    pos += slot;
    return { id: item.id, rect };
  });

  const remaining: TileRect = isH
    ? { x: x + rowDim, y, w: w - rowDim, h }
    : { x, y: y + rowDim, w, h: h - rowDim };

  return _squarifyStep(items.slice(rowEnd), remaining, [...acc, ...rowLayouts]);
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── useContainerSize ─────────────────────────────────────────────────────────

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return size;
}

// ── Template picker ───────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS = [
  { id: 'blank',    label: 'Blank',         desc: 'Start with empty categories' },
  { id: 'strategy', label: 'Strategy',      desc: 'Growth / Value / Dividend / Speculative' },
  { id: 'risk',     label: 'Risk Level',    desc: 'Core / Moderate / High Risk' },
  { id: 'income',   label: 'Income Focus',  desc: 'Yield / Dividend Growth / Fixed Income' },
  { id: 'sector',   label: 'Sector',        desc: 'Technology / Healthcare / Financials…' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryStrip({
  assignedCount,
  totalCount,
  primaryCount,
  largestPrimary,
}: {
  assignedCount: number;
  totalCount: number;
  primaryCount: number;
  largestPrimary: string | null;
}) {
  const pct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 px-1">
      <Stat label="Classified" value={`${assignedCount} / ${totalCount}`} sub={`${pct}% of holdings`} />
      <Stat label="Categories" value={String(primaryCount)} sub="primary groups" />
      {largestPrimary && <Stat label="Largest group" value={largestPrimary} />}
      {assignedCount < totalCount && (
        <Stat
          label="Unassigned"
          value={String(totalCount - assignedCount)}
          valueColor="text-white/40"
          sub="need classification"
        />
      )}
    </div>
  );
}

function Stat({ label, value, sub, valueColor = 'text-white' }: {
  label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div>
      <p className="text-white/35 text-xs mb-0.5">{label}</p>
      <p className={`text-sm font-semibold font-mono ${valueColor}`}>{value}</p>
      {sub && <p className="text-white/25 text-xs">{sub}</p>}
    </div>
  );
}

// ── Desktop treemap tile ──────────────────────────────────────────────────────

const TILE_GAP = 3;
const PANEL_HEADER = 30;
const PANEL_PAD = 8;
const GROUP_GAP = 6;

function TreemapTile({
  holding,
  rect,
  isSelected,
  secondaryColor,
  onClick,
}: {
  holding: CurrentHolding;
  rect: TileRect;
  isSelected: boolean;
  secondaryColor: string | null;
  onClick: () => void;
}) {
  const area = rect.w * rect.h;
  const showValue = area > 3600;
  const showWeight = area > 1400 && !showValue;
  const showTicker = area > 400;

  const bg = secondaryColor
    ? hexToRgba(secondaryColor, 0.18)
    : 'rgba(255,255,255,0.05)';
  const border = secondaryColor
    ? hexToRgba(secondaryColor, 0.30)
    : 'rgba(255,255,255,0.07)';

  return (
    <div
      onClick={onClick}
      title={`${holding.ticker} — ${holding.name}`}
      style={{
        position: 'absolute',
        left: rect.x + TILE_GAP / 2,
        top: rect.y + TILE_GAP / 2,
        width: rect.w - TILE_GAP,
        height: rect.h - TILE_GAP,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        cursor: 'pointer',
        outline: isSelected ? `2px solid rgba(16,185,129,0.55)` : 'none',
        outlineOffset: -2,
        transition: 'outline 150ms ease, background 150ms ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        boxSizing: 'border-box',
      }}
    >
      {showTicker && (
        <p
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: area > 3000 ? 13 : 11,
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: 1.1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {holding.ticker}
        </p>
      )}
      {showValue && (
        <p
          style={{
            color: 'rgba(255,255,255,0.50)',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            textAlign: 'center',
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {/* compact value shown inside tile */}
          {holding.portfolioPercent.toFixed(1)}%
        </p>
      )}
      {showWeight && (
        <p
          style={{
            color: 'rgba(255,255,255,0.40)',
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            textAlign: 'center',
            marginTop: 1,
          }}
        >
          {holding.portfolioPercent.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// ── Desktop treemap canvas ────────────────────────────────────────────────────

function TreemapCanvas({
  categories,
  holdings,
  assignments,
  profileId,
  totalValue,
  defaultCurrency,
  selectedTicker,
  onSelectTicker,
}: {
  categories: PlannerCategory[];
  holdings: CurrentHolding[];
  assignments: PlannerAssignment[];
  profileId: string;
  totalValue: number;
  defaultCurrency: string;
  selectedTicker: string | null;
  onSelectTicker: (t: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height: containerHeight } = useContainerSize(containerRef);
  const height = Math.max(380, Math.min(560, containerHeight || 480));

  const primaryCats = useMemo(
    () => categories.filter(c => c.kind === 'primary').sort((a, b) => a.order - b.order),
    [categories]
  );
  const secondaryCats = useMemo(
    () => categories.filter(c => c.kind === 'secondary'),
    [categories]
  );

  const profileAssignments = useMemo(
    () => assignments.filter(a => a.profileId === profileId),
    [assignments, profileId]
  );

  // Group holdings by primary category
  const grouped = useMemo(() => {
    const map = new Map<string | null, CurrentHolding[]>();
    map.set(null, []); // unassigned

    primaryCats.forEach(c => map.set(c.id, []));

    holdings.forEach(h => {
      const assignment = profileAssignments.find(a => a.assetId === h.ticker);
      const key = assignment?.primaryCategoryId ?? null;
      if (!map.has(key)) map.set(null, [...(map.get(null) ?? []), h]);
      else map.get(key)!.push(h);
    });
    return map;
  }, [holdings, primaryCats, profileAssignments]);

  // Build group items for top-level treemap
  const groupItems = useMemo(() => {
    const items: Array<{ id: string | null; value: number }> = [];
    primaryCats.forEach(c => {
      const hs = grouped.get(c.id) ?? [];
      const val = hs.reduce((s, h) => s + h.currentValue, 0);
      if (val > 0) items.push({ id: c.id, value: val });
    });
    const unassigned = grouped.get(null) ?? [];
    const unassignedVal = unassigned.reduce((s, h) => s + h.currentValue, 0);
    if (unassignedVal > 0) items.push({ id: null, value: unassignedVal });
    return items;
  }, [grouped, primaryCats]);

  // Layout: squarify primary groups
  const groupLayouts = useMemo(() => {
    if (width === 0) return [];
    const items = groupItems.map(g => ({ id: String(g.id ?? '__unassigned__'), value: g.value }));
    return squarify(items, { x: 0, y: 0, w: width, h: height });
  }, [groupItems, width, height]);

  // For each group, squarify holdings inside (with header offset + padding)
  const holdingLayouts = useMemo(() => {
    if (width === 0) return new Map<string, TileLayout[]>();
    const result = new Map<string, TileLayout[]>();

    groupLayouts.forEach(gl => {
      const realId = gl.id === '__unassigned__' ? null : gl.id;
      const hs = grouped.get(realId) ?? [];
      if (!hs.length) return;

      const innerBounds: TileRect = {
        x: gl.rect.x + PANEL_PAD + GROUP_GAP / 2,
        y: gl.rect.y + PANEL_HEADER + PANEL_PAD + GROUP_GAP / 2,
        w: gl.rect.w - PANEL_PAD * 2 - GROUP_GAP,
        h: gl.rect.h - PANEL_HEADER - PANEL_PAD * 2 - GROUP_GAP,
      };
      if (innerBounds.w <= 0 || innerBounds.h <= 0) return;

      const items = hs.map(h => ({ id: h.ticker, value: h.currentValue }));
      const layouts = squarify(items, innerBounds);
      result.set(gl.id, layouts);
    });

    return result;
  }, [groupLayouts, grouped]);

  if (width === 0) {
    return (
      <div ref={containerRef} style={{ height }} className="w-full bg-transparent" />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, position: 'relative' }}
      className="w-full select-none"
      onClick={e => {
        if (e.target === containerRef.current) onSelectTicker(null);
      }}
    >
      {groupLayouts.map(gl => {
        const realId = gl.id === '__unassigned__' ? null : gl.id;
        const cat = realId ? primaryCats.find(c => c.id === realId) : null;
        const catHoldings = grouped.get(realId) ?? [];
        const catValue = catHoldings.reduce((s, h) => s + h.currentValue, 0);
        const catPct = totalValue > 0 ? (catValue / totalValue) * 100 : 0;
        const tiles = holdingLayouts.get(gl.id) ?? [];
        const panelBg = cat
          ? hexToRgba(cat.color, 0.055)
          : 'rgba(255,255,255,0.02)';
        const panelBorder = cat
          ? hexToRgba(cat.color, 0.18)
          : 'rgba(255,255,255,0.06)';

        return (
          <div
            key={gl.id}
            style={{
              position: 'absolute',
              left: gl.rect.x + GROUP_GAP / 2,
              top: gl.rect.y + GROUP_GAP / 2,
              width: gl.rect.w - GROUP_GAP,
              height: gl.rect.h - GROUP_GAP,
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                height: PANEL_HEADER,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                borderBottom: `1px solid ${panelBorder}`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {cat && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    color: 'rgba(255,255,255,0.70)',
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {cat?.name ?? 'Unassigned'}
                </span>
              </div>
              {gl.rect.w > 100 && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatCurrency(catValue, defaultCurrency)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                    {catPct.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Holding tiles — positioned relative to panel, not canvas */}
            {tiles.map(tile => {
              const h = catHoldings.find(h => h.ticker === tile.id);
              if (!h) return null;
              const assignment = profileAssignments.find(a => a.assetId === h.ticker);
              const secCat = assignment?.secondaryCategoryId
                ? secondaryCats.find(c => c.id === assignment.secondaryCategoryId)
                : null;

              // Adjust rect to be relative to this panel (subtract panel offset + header)
              const tileRelativeRect: TileRect = {
                x: tile.rect.x - gl.rect.x - GROUP_GAP / 2 - PANEL_PAD,
                y: tile.rect.y - gl.rect.y - GROUP_GAP / 2 - PANEL_HEADER - PANEL_PAD,
                w: tile.rect.w,
                h: tile.rect.h,
              };

              // Offset inside the panel content area
              const finalRect: TileRect = {
                x: tileRelativeRect.x + PANEL_PAD,
                y: tileRelativeRect.y + PANEL_HEADER + PANEL_PAD,
                w: tileRelativeRect.w,
                h: tileRelativeRect.h,
              };

              return (
                <TreemapTile
                  key={h.ticker}
                  holding={h}
                  rect={finalRect}
                  isSelected={selectedTicker === h.ticker}
                  secondaryColor={secCat?.color ?? null}
                  onClick={() => onSelectTicker(h.ticker === selectedTicker ? null : h.ticker)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile grouped view ───────────────────────────────────────────────────────

function MobilePlannerView({
  categories,
  holdings,
  assignments,
  profileId,
  totalValue,
  defaultCurrency,
  selectedTicker,
  onSelectTicker,
}: {
  categories: PlannerCategory[];
  holdings: CurrentHolding[];
  assignments: PlannerAssignment[];
  profileId: string;
  totalValue: number;
  defaultCurrency: string;
  selectedTicker: string | null;
  onSelectTicker: (t: string | null) => void;
}) {
  const primaryCats = categories.filter(c => c.kind === 'primary').sort((a, b) => a.order - b.order);
  const profileAssignments = assignments.filter(a => a.profileId === profileId);

  const grouped = useMemo(() => {
    const map = new Map<string | null, CurrentHolding[]>();
    map.set(null, []);
    primaryCats.forEach(c => map.set(c.id, []));
    holdings.forEach(h => {
      const assignment = profileAssignments.find(a => a.assetId === h.ticker);
      const key = assignment?.primaryCategoryId ?? null;
      if (!map.has(key)) map.get(null)!.push(h);
      else map.get(key)!.push(h);
    });
    return map;
  }, [holdings, primaryCats, profileAssignments]);

  const sortedGroups = useMemo(() => {
    const groups: Array<{ cat: PlannerCategory | null; holdings: CurrentHolding[]; total: number }> = [];
    primaryCats.forEach(c => {
      const hs = [...(grouped.get(c.id) ?? [])].sort((a, b) => b.currentValue - a.currentValue);
      groups.push({ cat: c, holdings: hs, total: hs.reduce((s, h) => s + h.currentValue, 0) });
    });
    const unassigned = [...(grouped.get(null) ?? [])].sort((a, b) => b.currentValue - a.currentValue);
    if (unassigned.length) {
      groups.push({ cat: null, holdings: unassigned, total: unassigned.reduce((s, h) => s + h.currentValue, 0) });
    }
    return groups.filter(g => g.holdings.length > 0).sort((a, b) => b.total - a.total);
  }, [grouped, primaryCats]);

  const maxVal = sortedGroups[0]?.total ?? 1;

  return (
    <div className="space-y-2">
      {sortedGroups.map(group => {
        const pct = totalValue > 0 ? (group.total / totalValue) * 100 : 0;
        const color = group.cat?.color ?? '#6B7280';
        return (
          <GlassCard key={group.cat?.id ?? '__unassigned__'} padding="md">
            {/* Category header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-white/80 text-sm font-medium">
                  {group.cat?.name ?? 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs font-mono">{formatCurrency(group.total, defaultCurrency)}</span>
                <span className="text-white/25 text-xs font-mono">{pct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Allocation bar */}
            <div className="h-0.5 bg-white/5 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(group.total / maxVal) * 100}%`,
                  background: hexToRgba(color, 0.70),
                }}
              />
            </div>

            {/* Holdings list */}
            <div className="space-y-1.5">
              {group.holdings.map(h => {
                const hPct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                const isSelected = selectedTicker === h.ticker;
                return (
                  <button
                    key={h.ticker}
                    onClick={() => onSelectTicker(isSelected ? null : h.ticker)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/85 text-sm font-mono font-semibold">{h.ticker}</span>
                        <span className="text-white/30 text-xs truncate">{h.name}</span>
                      </div>
                      <div className="h-0.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${hPct * 3}%`,
                            maxWidth: '100%',
                            background: hexToRgba(color, 0.55),
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/70 text-sm font-mono">
                        {formatCurrency(h.currentValue, defaultCurrency)}
                      </p>
                      <p className="text-white/30 text-xs font-mono">{hPct.toFixed(1)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Holding detail panel ──────────────────────────────────────────────────────

function HoldingDetailPanel({
  holding,
  profileId,
  categories,
  assignments,
  defaultCurrency,
  onAssign,
  onClose,
}: {
  holding: CurrentHolding;
  profileId: string;
  categories: PlannerCategory[];
  assignments: PlannerAssignment[];
  defaultCurrency: string;
  onAssign: (primaryId: string | null, secondaryId?: string | null) => void;
  onClose: () => void;
}) {
  const primaryCats = categories.filter(c => c.kind === 'primary').sort((a, b) => a.order - b.order);
  const secondaryCats = categories.filter(c => c.kind === 'secondary').sort((a, b) => a.order - b.order);
  const assignment = assignments.find(a => a.profileId === profileId && a.assetId === holding.ticker);

  const [editingPrimary, setEditingPrimary] = useState(assignment?.primaryCategoryId ?? null);
  const [editingSecondary, setEditingSecondary] = useState(assignment?.secondaryCategoryId ?? null);

  const gainColor = holding.unrealizedGain >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]';

  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-mono font-bold text-xl leading-none">{holding.ticker}</h3>
          <p className="text-white/40 text-sm mt-0.5">{holding.name}</p>
          <p className="text-white/25 text-xs mt-0.5 font-mono">
            {holding.sharesHeld % 1 === 0 ? holding.sharesHeld.toFixed(0) : holding.sharesHeld.toFixed(4)} {holding.sharesHeld === 1 ? 'share' : 'shares'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/65 hover:bg-white/8 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Key metrics */}
      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-white/30 text-xs mb-0.5">Value</p>
          <p className="text-white font-mono font-semibold">{formatCurrency(holding.currentValue, defaultCurrency)}</p>
        </div>
        <div>
          <p className="text-white/30 text-xs mb-0.5">Weight</p>
          <p className="text-white font-mono font-semibold">{holding.portfolioPercent.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-white/30 text-xs mb-0.5">Gain</p>
          <p className={`font-mono font-semibold ${gainColor}`}>
            {holding.unrealizedGain >= 0 ? '+' : ''}{holding.unrealizedGainPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Assignment editor */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <p className="text-white/40 text-xs font-medium uppercase tracking-wide">Classification</p>

        {/* Primary */}
        <div>
          <p className="text-white/30 text-xs mb-1.5">Primary group</p>
          <div className="flex flex-wrap gap-1.5">
            {primaryCats.map(c => (
              <button
                key={c.id}
                onClick={() => setEditingPrimary(editingPrimary === c.id ? null : c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  editingPrimary === c.id ? 'text-white' : 'text-white/40 hover:text-white/65'
                }`}
                style={{
                  background: editingPrimary === c.id ? hexToRgba(c.color, 0.25) : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${editingPrimary === c.id ? hexToRgba(c.color, 0.45) : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {c.name}
              </button>
            ))}
            {primaryCats.length === 0 && (
              <p className="text-white/25 text-xs">No primary categories — add some first</p>
            )}
          </div>
        </div>

        {/* Secondary */}
        {secondaryCats.length > 0 && (
          <div>
            <p className="text-white/30 text-xs mb-1.5">Secondary (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {secondaryCats.map(c => (
                <button
                  key={c.id}
                  onClick={() => setEditingSecondary(editingSecondary === c.id ? null : c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    editingSecondary === c.id ? 'text-white' : 'text-white/40 hover:text-white/65'
                  }`}
                  style={{
                    background: editingSecondary === c.id ? hexToRgba(c.color, 0.25) : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${editingSecondary === c.id ? hexToRgba(c.color, 0.45) : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save / Remove */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAssign(editingPrimary, editingSecondary)}
            disabled={editingPrimary === assignment?.primaryCategoryId && editingSecondary === assignment?.secondaryCategoryId}
          >
            Save
          </Button>
          {assignment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssign(null, null)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ── Category manager modal ────────────────────────────────────────────────────

function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onAdd,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string;
  categories: PlannerCategory[];
  onAdd: (kind: 'primary' | 'secondary', name: string, color: string) => void;
  onUpdate?: (id: string, updates: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<'primary' | 'secondary'>('primary');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PLANNER_COLORS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = categories.filter(c => c.kind === tab).sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(tab, newName.trim(), newColor);
    setNewName('');
    setNewColor(PLANNER_COLORS[(filtered.length + 1) % PLANNER_COLORS.length]);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Categories"
        size="md"
        footer={<Button variant="ghost" onClick={onClose}>Done</Button>}
      >
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
            {(['primary', 'secondary'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t ? 'bg-white/[0.09] text-white' : 'text-white/45 hover:text-white/70'
                }`}
              >
                {t === 'primary' ? 'Primary groups' : 'Secondary labels'}
              </button>
            ))}
          </div>

          <p className="text-white/35 text-xs">
            {tab === 'primary'
              ? 'Primary groups are the main buckets that partition your map (e.g. Growth, Value).'
              : 'Secondary labels color tiles and add context within each primary group.'}
          </p>

          {/* Existing categories */}
          <div className="space-y-1.5">
            {filtered.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="text-white/75 text-sm flex-1">{cat.name}</span>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="text-white/20 hover:text-[#EF4444] transition-colors p-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-white/25 text-sm py-2">No {tab} categories yet.</p>
            )}
          </div>

          {/* Add new */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <p className="text-white/40 text-xs font-medium">Add category</p>
            <div className="flex gap-2">
              <Input
                placeholder={tab === 'primary' ? 'e.g. Growth' : 'e.g. Technology'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex items-center gap-1">
                {PLANNER_COLORS.slice(0, 8).map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full transition-transform"
                    style={{
                      background: c,
                      transform: newColor === c ? 'scale(1.25)' : 'scale(1)',
                      outline: newColor === c ? `2px solid rgba(255,255,255,0.4)` : 'none',
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAdd} disabled={!newName.trim()}>
              + Add
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
        title="Remove Category"
        message="Remove this category? Holdings assigned to it will become unassigned."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  );
}

// ── Create profile modal ──────────────────────────────────────────────────────

function CreateProfileModal({
  isOpen,
  onClose,
  existingProfiles,
  onCreateFromTemplate,
  onDuplicate,
}: {
  isOpen: boolean;
  onClose: () => void;
  existingProfiles: PlannerProfile[];
  onCreateFromTemplate: (name: string, template: string) => void;
  onDuplicate: (name: string, fromId: string) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('strategy');
  const [dupFrom, setDupFrom] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    if (dupFrom) onDuplicate(name.trim(), dupFrom);
    else onCreateFromTemplate(name.trim(), selected);
    setName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Profile"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Profile name"
          placeholder="e.g. Strategic Allocation"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <div>
          <p className="text-white/40 text-xs font-medium mb-2">Starting point</p>
          <div className="space-y-1.5">
            {TEMPLATE_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelected(t.id); setDupFrom(null); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected === t.id && !dupFrom
                    ? 'border-[#10B981]/50 bg-[#10B981]/8'
                    : 'border-white/7 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-white/80 text-sm font-medium">{t.label}</p>
                <p className="text-white/35 text-xs mt-0.5">{t.desc}</p>
              </button>
            ))}

            {existingProfiles.length > 0 && (
              <>
                <p className="text-white/25 text-xs pt-1">Or duplicate an existing profile</p>
                {existingProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setDupFrom(p.id); setSelected(''); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      dupFrom === p.id
                        ? 'border-[#10B981]/50 bg-[#10B981]/8'
                        : 'border-white/7 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className="text-white/80 text-sm font-medium">Copy of "{p.name}"</p>
                    <p className="text-white/35 text-xs">Duplicate categories + assignments</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign Holdings Modal ─────────────────────────────────────────────────────

function AssignHoldingsModal({
  isOpen,
  onClose,
  holdings,
  profileId,
  categories,
  assignments,
  onAssign,
}: {
  isOpen: boolean;
  onClose: () => void;
  holdings: CurrentHolding[];
  profileId: string;
  categories: PlannerCategory[];
  assignments: PlannerAssignment[];
  onAssign: (assetId: string, primaryCategoryId: string | null, secondaryCategoryId?: string | null) => void;
}) {
  const primaryCats = categories.filter(c => c.kind === 'primary').sort((a, b) => a.order - b.order);
  const secondaryCats = categories.filter(c => c.kind === 'secondary').sort((a, b) => a.order - b.order);
  const profileAssignments = assignments.filter(a => a.profileId === profileId);
  const [localAssignments, setLocalAssignments] = useState<Record<string, { primary: string | null; secondary: string | null }>>({});

  useEffect(() => {
    if (isOpen) {
      const init: typeof localAssignments = {};
      holdings.forEach(h => {
        const a = profileAssignments.find(x => x.assetId === h.ticker);
        init[h.ticker] = { primary: a?.primaryCategoryId ?? null, secondary: a?.secondaryCategoryId ?? null };
      });
      setLocalAssignments(init);
    }
  }, [isOpen]);

  const handleSave = () => {
    Object.entries(localAssignments).forEach(([ticker, { primary, secondary }]) => {
      onAssign(ticker, primary, secondary);
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Holdings"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save assignments</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-white/40 text-sm">Set a primary group for each holding. Secondary label is optional.</p>
        {holdings.sort((a, b) => b.currentValue - a.currentValue).map(h => {
          const local = localAssignments[h.ticker] ?? { primary: null, secondary: null };
          return (
            <div key={h.ticker} className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-white font-mono font-semibold text-sm">{h.ticker}</span>
                  <span className="text-white/35 text-xs ml-2">{h.name}</span>
                </div>
                <span className="text-white/40 text-xs font-mono">{h.portfolioPercent.toFixed(1)}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Primary */}
                <div className="flex flex-wrap gap-1">
                  {primaryCats.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setLocalAssignments(prev => ({
                        ...prev,
                        [h.ticker]: { ...local, primary: local.primary === c.id ? null : c.id },
                      }))}
                      className="px-2 py-0.5 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: local.primary === c.id ? hexToRgba(c.color, 0.25) : 'rgba(255,255,255,0.05)',
                        color: local.primary === c.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.40)',
                        border: `1px solid ${local.primary === c.id ? hexToRgba(c.color, 0.40) : 'transparent'}`,
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                {secondaryCats.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-2 border-l border-white/8">
                    {secondaryCats.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setLocalAssignments(prev => ({
                          ...prev,
                          [h.ticker]: { ...local, secondary: local.secondary === c.id ? null : c.id },
                        }))}
                        className="px-2 py-0.5 rounded-md text-xs transition-all"
                        style={{
                          background: local.secondary === c.id ? hexToRgba(c.color, 0.18) : 'transparent',
                          color: local.secondary === c.id ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.28)',
                          border: `1px solid ${local.secondary === c.id ? hexToRgba(c.color, 0.35) : 'rgba(255,255,255,0.05)'}`,
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Main Planner Page ─────────────────────────────────────────────────────────

export default function PlannerPage({ holdings, totalValue, defaultCurrency }: Props) {
  const {
    profiles, categories, assignments, activeProfileId,
    createProfile, updateProfile, deleteProfile, setActiveProfile,
    addCategory, updateCategory, deleteCategory,
    assignAsset, removeAssignment,
  } = usePlannerStore();

  const isMobile = useIsMobile();

  // UI state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteProfile, setShowDeleteProfile] = useState(false);
  const [editingProfileName, setEditingProfileName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null;
  const activeCategories = categories.filter(c => c.profileId === activeProfileId);
  const profileAssignments = assignments.filter(a => a.profileId === activeProfileId);

  // Summary stats
  const { assignedCount, largestPrimary } = useMemo(() => {
    const assigned = holdings.filter(h =>
      profileAssignments.some(a => a.assetId === h.ticker && a.primaryCategoryId)
    ).length;

    const primaryCats = activeCategories.filter(c => c.kind === 'primary');
    let largest: string | null = null;
    let largestVal = 0;
    primaryCats.forEach(c => {
      const val = holdings
        .filter(h => profileAssignments.some(a => a.assetId === h.ticker && a.primaryCategoryId === c.id))
        .reduce((s, h) => s + h.currentValue, 0);
      if (val > largestVal) { largestVal = val; largest = c.name; }
    });

    return { assignedCount: assigned, largestPrimary: largest };
  }, [holdings, profileAssignments, activeCategories]);

  const selectedHolding = holdings.find(h => h.ticker === selectedTicker) ?? null;

  const handleAssign = useCallback((assetId: string, primaryId: string | null, secondaryId: string | null = null) => {
    if (!activeProfileId) return;
    if (primaryId === null && secondaryId === null) {
      removeAssignment(activeProfileId, assetId);
    } else {
      assignAsset(activeProfileId, assetId, primaryId, secondaryId);
    }
  }, [activeProfileId, assignAsset, removeAssignment]);

  const handleDetailAssign = (primaryId: string | null, secondaryId: string | null = null) => {
    if (!selectedTicker || !activeProfileId) return;
    handleAssign(selectedTicker, primaryId, secondaryId);
  };

  // ── Empty states ────────────────────────────────────────────────────────────

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon="🗺"
        title="No holdings to plan"
        description="Add holdings to your portfolio first, then use the Planner to classify and visualize them."
      />
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="space-y-4">
        <GlassCard padding="lg" className="text-center">
          <h3 className="text-white font-semibold text-lg mb-2">Portfolio Planner</h3>
          <p className="text-white/45 text-sm max-w-md mx-auto mb-1">
            The Planner is a separate interpretation layer on top of your holdings.
            Create a profile to classify your positions by strategy, risk, or sector.
          </p>
          <p className="text-white/25 text-xs mb-5">Your holdings data is unchanged — Planner is view-only metadata.</p>
          <Button variant="primary" onClick={() => setShowCreateProfile(true)}>
            Create your first profile
          </Button>
        </GlassCard>
        <CreateProfileModal
          isOpen={showCreateProfile}
          onClose={() => setShowCreateProfile(false)}
          existingProfiles={profiles}
          onCreateFromTemplate={(name, template) => createProfile(name, template as any)}
          onDuplicate={(name, fromId) => createProfile(name, 'blank', fromId)}
        />
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Profile row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Profile switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.09] rounded-xl text-sm font-medium text-white transition-colors"
            >
              <span className="truncate max-w-[160px]">{activeProfile?.name ?? 'Select profile'}</span>
              <svg className="w-3 h-3 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProfileMenu && (
              <div className="absolute top-full mt-1 left-0 z-20 w-56 glass rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProfile(p.id); setShowProfileMenu(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      p.id === activeProfileId
                        ? 'bg-[#10B981]/12 text-white'
                        : 'text-white/65 hover:bg-white/5'
                    }`}
                  >
                    <span>{p.name}</span>
                    {p.id === activeProfileId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    )}
                  </button>
                ))}
                <div className="border-t border-white/8 p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileNameInput(activeProfile?.name ?? '');
                      setEditingProfileName(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/75 hover:bg-white/5 transition-colors"
                  >
                    Rename profile
                  </button>
                  <button
                    onClick={() => { setShowDeleteProfile(true); setShowProfileMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/8 transition-colors"
                  >
                    Delete profile
                  </button>
                </div>
              </div>
            )}
            {showProfileMenu && (
              <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setShowAssignModal(true)}>
            Assign
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCategoryManager(true)}>
            Categories
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCreateProfile(true)}>
            + New
          </Button>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────── */}
      {activeProfile && (
        <SummaryStrip
          assignedCount={assignedCount}
          totalCount={holdings.length}
          primaryCount={activeCategories.filter(c => c.kind === 'primary').length}
          largestPrimary={largestPrimary}
        />
      )}

      {/* ── No categories yet ─────────────────────────────────────── */}
      {activeCategories.filter(c => c.kind === 'primary').length === 0 && (
        <GlassCard padding="md" className="text-center py-6">
          <p className="text-white/40 text-sm mb-3">
            This profile has no primary categories yet.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setShowCategoryManager(true)}>
            Add categories
          </Button>
        </GlassCard>
      )}

      {/* ── Main visualization ────────────────────────────────────── */}
      {activeProfileId && activeCategories.filter(c => c.kind === 'primary').length > 0 && (
        <>
          {isMobile ? (
            <MobilePlannerView
              categories={activeCategories}
              holdings={holdings}
              assignments={assignments}
              profileId={activeProfileId}
              totalValue={totalValue}
              defaultCurrency={defaultCurrency}
              selectedTicker={selectedTicker}
              onSelectTicker={setSelectedTicker}
            />
          ) : (
            <GlassCard padding="none" className="overflow-hidden">
              <TreemapCanvas
                categories={activeCategories}
                holdings={holdings}
                assignments={assignments}
                profileId={activeProfileId}
                totalValue={totalValue}
                defaultCurrency={defaultCurrency}
                selectedTicker={selectedTicker}
                onSelectTicker={setSelectedTicker}
              />
            </GlassCard>
          )}

          {/* Legend for secondary categories */}
          {activeCategories.filter(c => c.kind === 'secondary').length > 0 && !isMobile && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
              {activeCategories.filter(c => c.kind === 'secondary').map(c => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: hexToRgba(c.color, 0.55) }} />
                  <span className="text-white/35 text-xs">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Selected holding detail ───────────────────────────────── */}
      {selectedHolding && activeProfileId && (
        <HoldingDetailPanel
          holding={selectedHolding}
          profileId={activeProfileId}
          categories={activeCategories}
          assignments={assignments}
          defaultCurrency={defaultCurrency}
          onAssign={handleDetailAssign}
          onClose={() => setSelectedTicker(null)}
        />
      )}

      {/* ── Unassigned holdings section ───────────────────────────── */}
      {(() => {
        const unassigned = holdings.filter(h =>
          !profileAssignments.some(a => a.assetId === h.ticker && a.primaryCategoryId)
        );
        if (!unassigned.length || !activeProfileId) return null;
        return (
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wide">
                Unassigned ({unassigned.length})
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowAssignModal(true)}>
                Assign all
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unassigned.sort((a, b) => b.currentValue - a.currentValue).map(h => (
                <button
                  key={h.ticker}
                  onClick={() => setSelectedTicker(h.ticker)}
                  className={`px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/8 rounded-lg text-xs font-mono text-white/55 hover:text-white/80 transition-colors ${selectedTicker === h.ticker ? 'border-[#10B981]/40 text-white/80' : ''}`}
                >
                  {h.ticker}
                </button>
              ))}
            </div>
          </GlassCard>
        );
      })()}

      {/* ── Modals ────────────────────────────────────────────────── */}

      <CreateProfileModal
        isOpen={showCreateProfile}
        onClose={() => setShowCreateProfile(false)}
        existingProfiles={profiles}
        onCreateFromTemplate={(name, template) => createProfile(name, template as any)}
        onDuplicate={(name, fromId) => createProfile(name, 'blank', fromId)}
      />

      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        profileId={activeProfileId ?? ''}
        categories={activeCategories}
        onAdd={(kind, name, color) => activeProfileId && addCategory(activeProfileId, kind, name, color)}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />

      <AssignHoldingsModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        holdings={holdings}
        profileId={activeProfileId ?? ''}
        categories={activeCategories}
        assignments={assignments}
        onAssign={(assetId, primary, secondary) => handleAssign(assetId, primary, secondary ?? null)}
      />

      <Modal
        isOpen={editingProfileName}
        onClose={() => setEditingProfileName(false)}
        title="Rename Profile"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingProfileName(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (activeProfileId && profileNameInput.trim()) {
                  updateProfile(activeProfileId, { name: profileNameInput.trim() });
                }
                setEditingProfileName(false);
              }}
              disabled={!profileNameInput.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Profile name"
          value={profileNameInput}
          onChange={e => setProfileNameInput(e.target.value)}
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteProfile}
        onClose={() => setShowDeleteProfile(false)}
        onConfirm={() => {
          if (activeProfileId) deleteProfile(activeProfileId);
          setShowDeleteProfile(false);
        }}
        title="Delete Profile"
        message={`Delete "${activeProfile?.name}"? All categories and assignments in this profile will be removed. Your holdings are unaffected.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
