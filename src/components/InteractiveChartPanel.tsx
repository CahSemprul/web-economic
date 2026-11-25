import { useId, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import type { ChartPoint, ChartRange, MarketAsset } from '../types/market.ts';
import {
  calculatePriceStats,
  formatAssetPrice,
  formatCompactVolume,
  formatSignedPercent,
} from '../utils/marketMath.ts';

interface InteractiveChartPanelProps {
  asset: MarketAsset;
  points: ChartPoint[];
  range: ChartRange;
  isLoading: boolean;
  isLive: boolean;
  source: string;
  isWatched: boolean;
  onRangeChange: (range: ChartRange) => void;
  onToggleWatchlist: (symbol: string) => void;
  onOpenAssetPage?: (symbol: string) => void;
}

const RANGES: Array<{ value: ChartRange; label: string }> = [
  { value: '1d', label: '1H' },
  { value: '5d', label: '5H' },
  { value: '1mo', label: '1B' },
  { value: '6mo', label: '6B' },
  { value: '1y', label: '1T' },
];

export default function InteractiveChartPanel({
  asset,
  points,
  range,
  isLoading,
  isLive,
  source,
  isWatched,
  onRangeChange,
  onToggleWatchlist,
  onOpenAssetPage,
}: InteractiveChartPanelProps) {
  const [showSma, setShowSma] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const gradientId = useId();

  const stats = useMemo(() => calculatePriceStats(points), [points]);
  const isPositive = asset.changePercent >= 0;
  const strokeColor = isPositive ? '#047857' : '#b91c1c';

  const domainBounds = useMemo(() => {
    if (points.length === 0) return ['auto', 'auto'] as const;
    const values = points.map((p) => p.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.12, max * 0.002);
    return [min - pad, max + pad] as const;
  }, [points]);

  return (
    <section
      aria-label={`Grafik harga interaktif ${asset.name}`}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Asset Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{asset.exchange}</span>
            <span aria-hidden="true">·</span>
            <span>{asset.symbol}</span>
            <span aria-hidden="true">·</span>
            <span>{isLive ? `Live (${source})` : source}</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {asset.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-slate-950 sm:text-4xl dark:text-white">
              {formatAssetPrice(asset.price, asset.currency, asset.category)}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${
                isPositive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              )}
              {formatSignedPercent(asset.changePercent)} ({isPositive ? 'Naik' : 'Turun'})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleWatchlist(asset.symbol)}
            aria-pressed={isWatched}
            aria-label={
              isWatched
                ? `Hapus ${asset.shortCode} dari pantauan`
                : `Simpan ${asset.shortCode} ke pantauan`
            }
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${
              isWatched
                ? 'border-blue-900 bg-blue-950 text-white dark:border-blue-500 dark:bg-blue-600'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`}
              aria-hidden="true"
            />
            {isWatched ? 'Dipantau' : 'Pantau Aset'}
          </button>

          {onOpenAssetPage && (
            <button
              type="button"
              onClick={() => onOpenAssetPage(asset.symbol)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 whitespace-nowrap transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Analisis Detail</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Controls Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Pilih rentang waktu grafik"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange(r.value)}
              aria-pressed={range === r.value}
              className={`min-h-[36px] min-w-[40px] rounded-md px-3 py-1.5 font-mono text-xs font-semibold whitespace-nowrap transition-colors ${
                range === r.value
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSma((prev) => !prev)}
            aria-pressed={showSma}
            className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              showSma
                ? 'border-blue-800/30 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            SMA 20
          </button>
          <button
            type="button"
            onClick={() => setShowVolume((prev) => !prev)}
            aria-pressed={showVolume}
            className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              showVolume
                ? 'border-blue-800/30 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="relative mt-4 h-[290px] w-full sm:h-[340px]" data-testid="interactive-chart-canvas">
        {isLoading && points.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            Memuat data grafik {asset.shortCode}...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(148, 163, 184, 0.22)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                yAxisId="price"
                domain={domainBounds as [number, number]}
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={66}
                tickFormatter={(val: number) =>
                  asset.currency === 'IDR'
                    ? new Intl.NumberFormat('id-ID').format(Math.round(val))
                    : val >= 1000
                      ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)
                      : val.toFixed(2)
                }
              />
              {showVolume && (
                <YAxis yAxisId="vol" orientation="left" hide domain={[0, 'dataMax * 4']} />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0].payload as ChartPoint;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
                      <div className="font-medium text-slate-500 dark:text-slate-400">
                        {point.label}
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
                        {formatAssetPrice(point.close, asset.currency, asset.category)}
                      </div>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
                        <span>T: {formatAssetPrice(point.high, asset.currency, asset.category)}</span>
                        <span>R: {formatAssetPrice(point.low, asset.currency, asset.category)}</span>
                      </div>
                      {showSma && point.sma20 != null && (
                        <div className="mt-1 font-mono text-[11px] tabular-nums text-blue-700 dark:text-blue-400">
                          SMA 20: {formatAssetPrice(point.sma20, asset.currency, asset.category)}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {showVolume && (
                <Bar
                  yAxisId="vol"
                  dataKey="volume"
                  fill="rgba(100, 116, 139, 0.25)"
                  radius={[2, 2, 0, 0]}
                />
              )}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
              {showSma && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="sma20"
                  stroke="#1d4ed8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period Summary Strip */}
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Tertinggi Periode</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatAssetPrice(stats.high || asset.dayHigh, asset.currency, asset.category)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Terendah Periode</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatAssetPrice(stats.low || asset.dayLow, asset.currency, asset.category)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Volume Perdagangan</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCompactVolume(asset.volume)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Kapitalisasi / Kelas</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {asset.marketCapLabel}
          </dd>
        </div>
      </dl>
    </section>
  );
}
