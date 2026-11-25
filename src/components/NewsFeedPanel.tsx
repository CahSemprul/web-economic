import { useMemo, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Search, Sparkles } from 'lucide-react';
import type { NewsArticle } from '../types/market.ts';
import { filterNewsArticles, formatTickerLabel } from '../utils/marketMath.ts';

interface NewsFeedPanelProps {
  articles: NewsArticle[];
  isRefreshing?: boolean;
  onRefreshNews?: () => void;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectAsset: (symbol: string) => void;
  onAnalyzeArticle?: (article: NewsArticle) => void;
}

const SECTOR_FILTERS = [
  { slug: 'all', label: 'Semua' },
  { slug: 'perbankan', label: 'Perbankan' },
  { slug: 'komoditas', label: 'Komoditas' },
  { slug: 'valuta-asing', label: 'Valuta Asing' },
  { slug: 'teknologi-telekomunikasi', label: 'Teknologi' },
  { slug: 'indeks-global', label: 'Makro & Indeks' },
];

function EditorialImage({
  src,
  alt,
  aspectClass,
  sourceLabel,
  sourceDomain,
  sectorTag,
  variant = 'lead',
}: {
  src?: string;
  alt: string;
  aspectClass: string;
  sourceLabel?: string;
  sourceDomain?: string;
  sectorTag?: string;
  variant?: 'lead' | 'thumb';
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    if (variant === 'thumb') return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 px-4 py-3.5 dark:border-slate-800 dark:from-slate-800/80 dark:via-blue-950/30 dark:to-slate-900">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-950 text-white dark:bg-blue-600">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {sourceLabel || 'Liputan Ekonomi Global'}
            </p>
            {sourceDomain && (
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {sourceDomain}
              </p>
            )}
          </div>
        </div>
        {sectorTag && (
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {sectorTag}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${aspectClass} w-full rounded-lg object-cover`}
    />
  );
}

export function NewsFeedPanel({
  articles,
  isRefreshing = false,
  onRefreshNews,
  onOpenArticle,
  onSelectAsset,
  onAnalyzeArticle,
}: NewsFeedPanelProps) {
  const [sector, setSector] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => filterNewsArticles(articles, sector, query),
    [articles, sector, query],
  );

  const leadArticle = filtered[0] ?? null;
  const secondaryArticles = filtered.slice(1, 3);
  const wireArticles = filtered.slice(3);

  return (
    <section
      aria-label="Berita dan analisis ekonomi terkini"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Agregator Riset &amp; Berita · 20 Media Ekonomi Global
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-slate-950 dark:text-white">
            Berita Finansial &amp; Analisis Sektor
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Diperbarui otomatis dari Bloomberg, WSJ, FT, Reuters, Economist, CNBC, Yahoo Finance, Fed/FRED, IMF, OECD &amp; lainnya.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="news-search-input" className="sr-only">
              Cari berita ekonomi atau emiten
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="news-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berita (Bloomberg, Fed, Emas)..."
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-800 focus:bg-white focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          {onRefreshNews && (
            <button
              type="button"
              onClick={onRefreshNews}
              disabled={isRefreshing}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isRefreshing ? 'Memperbarui...' : 'Perbarui Berita'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sector Filter Tabs */}
      <div
        role="group"
        aria-label="Filter berita berdasarkan sektor"
        className="mt-4 flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 no-scrollbar dark:bg-slate-800"
      >
        {SECTOR_FILTERS.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setSector(item.slug)}
            aria-pressed={sector === item.slug}
            className={`min-h-[38px] shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              sector === item.slug
                ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada berita yang cocok dengan kata kunci atau sektor terpilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setSector('all');
              setQuery('');
            }}
            className="mt-3 min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Tampilkan Semua Berita
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Tier 1 + Tier 2 Editorial Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {leadArticle && (
              <article className="lg:col-span-7">
                <button
                  type="button"
                  onClick={() => onOpenArticle(leadArticle)}
                  className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-blue-800"
                >
                  <EditorialImage
                    src={leadArticle.imageUrl}
                    alt={leadArticle.title}
                    aspectClass="aspect-[16/9]"
                    sourceLabel={leadArticle.source}
                    sourceDomain={leadArticle.sourceDomain}
                    sectorTag={leadArticle.sectorTag}
                    variant="lead"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {leadArticle.source}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{leadArticle.sectorTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{leadArticle.timeAgo}</span>
                  </div>
                  <h3 className="mt-1.5 font-serif text-xl font-bold leading-snug text-slate-950 group-hover:text-blue-900 sm:text-2xl dark:text-white dark:group-hover:text-blue-400">
                    {leadArticle.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {leadArticle.summary}
                  </p>
                </button>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {leadArticle.assetSymbols.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Aset terkait:</span>
                      {leadArticle.assetSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => onSelectAsset(sym)}
                          className="min-h-[32px] font-mono font-semibold text-blue-800 hover:underline dark:text-blue-400"
                        >
                          {formatTickerLabel(sym)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {leadArticle.externalUrl && (
                      <a
                        href={leadArticle.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <span>Sumber Asli</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    {onAnalyzeArticle && (
                      <button
                        type="button"
                        onClick={() => onAnalyzeArticle(leadArticle)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-900/20 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-900 whitespace-nowrap hover:bg-blue-100/70 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Analisis Dampak AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )}

            {secondaryArticles.length > 0 && (
              <div className="divide-y divide-slate-100 lg:col-span-5 dark:divide-slate-800">
                {secondaryArticles.map((article, idx) => (
                  <article
                    key={article.id}
                    className={idx === 0 ? 'pb-5' : 'pt-5'}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenArticle(article)}
                      className="group flex w-full items-start gap-4 text-left focus-visible:outline-2 focus-visible:outline-blue-800"
                    >
                      {article.imageUrl && (
                        <div className="w-28 shrink-0 sm:w-32">
                          <EditorialImage
                            src={article.imageUrl}
                            alt={article.title}
                            aspectClass="aspect-[4/3]"
                            variant="thumb"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {article.source}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{article.sectorTag}</span>
                          <span aria-hidden="true">·</span>
                          <span>{article.timeAgo}</span>
                        </div>
                        <h3 className="mt-1 font-serif text-base font-bold leading-snug text-slate-950 group-hover:text-blue-900 dark:text-white dark:group-hover:text-blue-400">
                          {article.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {article.summary}
                        </p>
                      </div>
                    </button>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-4">
                      {article.externalUrl && (
                        <a
                          href={article.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[34px] items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 hover:underline dark:text-slate-400 dark:hover:text-white"
                        >
                          <span>Sumber Asli</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      )}
                      {onAnalyzeArticle && (
                        <button
                          type="button"
                          onClick={() => onAnalyzeArticle(article)}
                          className="inline-flex min-h-[34px] items-center gap-1 text-xs font-semibold text-blue-800 hover:underline dark:text-blue-400"
                        >
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Analisis Dampak AI</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Tier 3 Compact Wire List */}
          {wireArticles.length > 0 && (
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Aliran Berita Pasar Lainnya
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-x-6 divide-y divide-slate-100 md:grid-cols-2 md:divide-y-0 dark:divide-slate-800">
                {wireArticles.map((article) => (
                  <article
                    key={article.id}
                    className="border-b border-slate-100 py-3 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenArticle(article)}
                      className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-blue-800"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {article.source}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{article.sectorTag}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.timeAgo}</span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold leading-snug text-slate-900 group-hover:text-blue-900 dark:text-slate-100 dark:group-hover:text-blue-400">
                        {article.title}
                      </h4>
                    </button>
                    {article.externalUrl && (
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">{article.sourceDomain}</span>
                        <a
                          href={article.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-800 whitespace-nowrap hover:underline dark:text-blue-400"
                        >
                          <span>Sumber Asli</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
