import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type {
  ChartPoint,
  ChartRange,
  MarketAsset,
  NewsArticle,
  SectorProfile,
} from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from '../utils/marketMath.ts';
import InteractiveChartPanel from './InteractiveChartPanel.tsx';

interface AssetDetailViewProps {
  asset: MarketAsset;
  sector: SectorProfile | undefined;
  points: ChartPoint[];
  range: ChartRange;
  isLoadingChart: boolean;
  isLiveChart: boolean;
  chartSource: string;
  isWatched: boolean;
  relatedArticles: NewsArticle[];
  onBack: () => void;
  onRangeChange: (range: ChartRange) => void;
  onToggleWatchlist: (symbol: string) => void;
  onOpenSector: (slug: SectorProfile['slug']) => void;
  onOpenArticle: (article: NewsArticle) => void;
}

export function AssetDetailView({
  asset,
  sector,
  points,
  range,
  isLoadingChart,
  isLiveChart,
  chartSource,
  isWatched,
  relatedArticles,
  onBack,
  onRangeChange,
  onToggleWatchlist,
  onOpenSector,
  onOpenArticle,
}: AssetDetailViewProps) {
  const rangeSpan = Math.max(asset.dayHigh - asset.dayLow, 0.0001);
  const dayProgress = Math.min(
    100,
    Math.max(0, ((asset.price - asset.dayLow) / rangeSpan) * 100),
  );
  const isUp = asset.changePercent >= 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & SEO Route Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke Ringkasan Pasar</span>
        </button>

        {sector && (
          <button
            type="button"
            onClick={() => onOpenSector(sector.slug)}
            className="min-h-[44px] text-xs font-semibold text-blue-800 hover:underline dark:text-blue-400"
          >
            Sektor: {sector.name} &rarr;
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <InteractiveChartPanel
            asset={asset}
            points={points}
            range={range}
            isLoading={isLoadingChart}
            isLive={isLiveChart}
            source={chartSource}
            isWatched={isWatched}
            onRangeChange={onRangeChange}
            onToggleWatchlist={onToggleWatchlist}
          />
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">
              Profil &amp; Tesis Instrumen
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {asset.summary}
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Poin Analisis Utama
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {asset.thesis}
              </p>
            </div>

            {/* Intraday Range Bar */}
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Rentang Harian</span>
                <span
                  className={`inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums ${
                    isUp
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {isUp ? (
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {formatSignedPercent(asset.changePercent)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-900 dark:bg-blue-500"
                  style={{ width: `${dayProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                <span>{formatAssetPrice(asset.dayLow, asset.currency, asset.category)}</span>
                <span>{formatAssetPrice(asset.dayHigh, asset.currency, asset.category)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">
              Berita Terkait {asset.shortCode}
            </h2>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {relatedArticles.length === 0 ? (
                <p className="py-4 text-xs text-slate-500 dark:text-slate-400">
                  Belum ada berita spesifik untuk instrumen ini.
                </p>
              ) : (
                relatedArticles.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onOpenArticle(art)}
                    className="block w-full py-3 text-left hover:text-blue-900 dark:hover:text-blue-400"
                  >
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {art.source} · {art.timeAgo}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                      {art.title}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
