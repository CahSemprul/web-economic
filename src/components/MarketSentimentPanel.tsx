import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  MarketSentimentLabel,
  MarketSentimentSummary,
  NewsArticle,
  SourceSentimentItem,
} from '../types/market.ts';

interface MarketSentimentPanelProps {
  sentiment: MarketSentimentSummary;
  articles: NewsArticle[];
  isRefreshing?: boolean;
  onRefreshSentiment?: () => void;
  onOpenArticle?: (article: NewsArticle) => void;
}

type SentimentFilter = 'all' | MarketSentimentLabel;

function getSentimentTextClass(label: MarketSentimentLabel): string {
  if (label === 'Bullish') return 'text-emerald-700 dark:text-emerald-400';
  if (label === 'Bearish') return 'text-red-700 dark:text-red-400';
  return 'text-slate-600 dark:text-slate-300';
}

function getSentimentDotClass(label: MarketSentimentLabel): string {
  if (label === 'Bullish') return 'bg-emerald-600 dark:bg-emerald-400';
  if (label === 'Bearish') return 'bg-red-600 dark:bg-red-400';
  return 'bg-slate-400 dark:bg-slate-500';
}

function SentimentIcon({
  label,
  className = 'h-5 w-5',
}: {
  label: MarketSentimentLabel;
  className?: string;
}) {
  if (label === 'Bullish') return <TrendingUp className={className} aria-hidden="true" />;
  if (label === 'Bearish') return <TrendingDown className={className} aria-hidden="true" />;
  return <Minus className={className} aria-hidden="true" />;
}

export function MarketSentimentPanel({
  sentiment,
  articles,
  isRefreshing = false,
  onRefreshSentiment,
  onOpenArticle,
}: MarketSentimentPanelProps) {
  const [filter, setFilter] = useState<SentimentFilter>('all');
  const [showAllSources, setShowAllSources] = useState(true);

  const total = Math.max(1, sentiment.totalAnalyzed);
  const bullishPct = Math.round((sentiment.bullishCount / total) * 100);
  const bearishPct = Math.round((sentiment.bearishCount / total) * 100);
  const neutralPct = Math.max(0, 100 - bullishPct - bearishPct);

  const gaugePositionPct = Math.max(
    4,
    Math.min(96, Math.round(((sentiment.sentimentScore + 100) / 200) * 100)),
  );

  const analyzedTimeLabel = useMemo(() => {
    const ts = Date.parse(sentiment.analyzedAt);
    if (Number.isNaN(ts)) return 'Baru saja';
    return new Date(ts).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [sentiment.analyzedAt]);

  const filteredSources = useMemo(() => {
    if (filter === 'all') return sentiment.sourceBreakdown;
    return sentiment.sourceBreakdown.filter((item) => item.sentiment === filter);
  }, [sentiment.sourceBreakdown, filter]);

  const handleSourceClick = (item: SourceSentimentItem) => {
    if (!item.articleId || !onOpenArticle) return;
    const matched = articles.find((a) => a.id === item.articleId);
    if (matched) onOpenArticle(matched);
  };

  return (
    <section
      aria-label="Visualisasi sentimen berita pasar global"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header Row */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sentimen Berita Global · Evaluasi Berkala tiap 15 Menit
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">
            Indikator Sentimen Pasar ({sentiment.activeSourceCount}/{sentiment.totalConfiguredSources} Sumber Aktif)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Analisis:{' '}
            <strong className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {analyzedTimeLabel} WIB
            </strong>
          </span>
          {onRefreshSentiment && (
            <button
              type="button"
              onClick={onRefreshSentiment}
              disabled={isRefreshing}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isRefreshing ? 'Menganalisis...' : 'Perbarui Sentimen'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Indicator & Distribution Grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Dominant Sentiment Dial */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Konsensus Berita Terkini
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                Skor {sentiment.sentimentScore > 0 ? `+${sentiment.sentimentScore}` : sentiment.sentimentScore} / 100
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2.5">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${getSentimentTextClass(
                  sentiment.overallLabel,
                )}`}
              >
                <SentimentIcon label={sentiment.overallLabel} className="h-5 w-5" />
              </span>
              <div>
                <p
                  data-testid="market-sentiment-indicator"
                  className={`font-serif text-3xl font-bold tracking-tight ${getSentimentTextClass(
                    sentiment.overallLabel,
                  )}`}
                >
                  {sentiment.overallLabel}
                </p>
              </div>
            </div>

            {/* Linear Bearish-Neutral-Bullish Spectrum Gauge */}
            <div className="mt-4">
              <div
                className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="img"
                aria-label={`Posisi skor sentimen ${sentiment.sentimentScore} dengan status ${sentiment.overallLabel}`}
              >
                <div className="grid h-full w-full grid-cols-3 opacity-85">
                  <div className="bg-red-500/70" />
                  <div className="bg-slate-400/60" />
                  <div className="bg-emerald-500/75" />
                </div>
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-sm dark:border-slate-900 dark:bg-white"
                  style={{ left: `${gaugePositionPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Bearish (-100)</span>
                <span>Neutral (0)</span>
                <span>Bullish (+100)</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {sentiment.summaryText}
          </p>
        </div>

        {/* Distribution Bars & Sector Sentiment */}
        <div className="flex flex-col justify-between space-y-5 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Distribusi Sentimen Artikel ({sentiment.totalAnalyzed} Berita)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {sentiment.isAiPowered ? 'Klasifikasi Editorial AI' : 'Klasifikasi Leksikon Pasar'}
              </span>
            </div>

            {/* 3-segment proportional bar */}
            <div
              className="mt-3 flex h-3.5 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
              role="img"
              aria-label={`Distribusi Bullish ${bullishPct} persen, Neutral ${neutralPct} persen, Bearish ${bearishPct} persen`}
            >
              {bullishPct > 0 && (
                <div
                  className="bg-emerald-600 transition-all duration-300 dark:bg-emerald-500"
                  style={{ width: `${bullishPct}%` }}
                />
              )}
              {neutralPct > 0 && (
                <div
                  className="bg-slate-400 transition-all duration-300 dark:bg-slate-600"
                  style={{ width: `${neutralPct}%` }}
                />
              )}
              {bearishPct > 0 && (
                <div
                  className="bg-red-600 transition-all duration-300 dark:bg-red-500"
                  style={{ width: `${bearishPct}%` }}
                />
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>Bullish</span>
                </div>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                  {sentiment.bullishCount}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({bullishPct}%)
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span>Neutral</span>
                </div>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                  {sentiment.neutralCount}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({neutralPct}%)
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-600 dark:bg-red-400" />
                  <span>Bearish</span>
                </div>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                  {sentiment.bearishCount}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({bearishPct}%)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Sector Sentiment Breakdown */}
          {sentiment.sectorBreakdown.length > 0 && (
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Arah Sentimen per Sektor Utama
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {sentiment.sectorBreakdown.map((sec) => (
                  <div
                    key={sec.sectorTag}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {sec.sectorTag}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {sec.bullish}/{sec.neutral}/{sec.bearish}
                      </span>
                      <span
                        className={`font-mono font-semibold ${getSentimentTextClass(
                          sec.dominant,
                        )}`}
                      >
                        {sec.dominant}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 20 Registered Sources Matrix */}
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Filter sumber berdasarkan sentimen"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 no-scrollbar dark:bg-slate-800"
          >
            {(
              [
                { id: 'all', label: `Semua (${sentiment.sourceBreakdown.length})` },
                {
                  id: 'Bullish',
                  label: `Bullish (${
                    sentiment.sourceBreakdown.filter((s) => s.sentiment === 'Bullish').length
                  })`,
                },
                {
                  id: 'Neutral',
                  label: `Neutral (${
                    sentiment.sourceBreakdown.filter((s) => s.sentiment === 'Neutral').length
                  })`,
                },
                {
                  id: 'Bearish',
                  label: `Bearish (${
                    sentiment.sourceBreakdown.filter((s) => s.sentiment === 'Bearish').length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={filter === tab.id}
                className={`min-h-[38px] shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAllSources((prev) => !prev)}
            aria-expanded={showAllSources}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>{showAllSources ? 'Ringkas 20 Sumber' : 'Tampilkan 20 Sumber'}</span>
            {showAllSources ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {showAllSources && (
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredSources.length === 0 ? (
              <p className="col-span-full py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada sumber berita dengan indikator {filter} pada siklus pembaruan saat ini.
              </p>
            ) : (
              filteredSources.map((item) => {
                const interactive = Boolean(item.articleId && onOpenArticle);
                if (interactive) {
                  return (
                    <button
                      key={item.sourceId}
                      type="button"
                      onClick={() => handleSourceClick(item)}
                      className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-800/40 hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:outline-blue-800 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-blue-500/40 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {item.sourceName}
                          </p>
                          <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {item.domain}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold ${getSentimentTextClass(
                            item.sentiment,
                          )}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${getSentimentDotClass(
                              item.sentiment,
                            )}`}
                          />
                          <span>{item.sentiment}</span>
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
                        {item.headline}
                      </p>
                    </button>
                  );
                }

                return (
                  <div
                    key={item.sourceId}
                    className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-950/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                          {item.sourceName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {item.domain}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold ${getSentimentTextClass(
                          item.sentiment,
                        )}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getSentimentDotClass(
                            item.sentiment,
                          )}`}
                        />
                        <span>{item.sentiment}</span>
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {item.headline}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}
