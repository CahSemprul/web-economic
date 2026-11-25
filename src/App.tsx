import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  LayoutGrid,
  Moon,
  Newspaper,
  RefreshCw,
  Sun,
} from 'lucide-react';
import {
  SEED_ASSETS,
  SEED_CALENDAR_EVENTS,
  SEED_NEWS_ARTICLES,
  SECTOR_PROFILES,
} from './data/seedMarketData.ts';
import type {
  AiImpactAnalysis,
  AutoAiAlert,
  AutoInsightsResponse,
  ChartPoint,
  ChartRange,
  ChartResponse,
  EconomicEvent,
  MarketAsset,
  MarketSentimentSummary,
  NewsArticle,
  SectorProfile,
  SectorSlug,
} from './types/market.ts';
import { buildSeoMetadata } from './utils/marketMath.ts';
import { computeMarketSentimentSummary } from './utils/marketSentiment.ts';
import { GLOBAL_NEWS_SOURCES } from './utils/newsAggregator.ts';
import {
  DEFAULT_OG_IMAGE_PATH,
  buildStructuredDataGraph,
  resolveRequestBaseUrl,
} from './utils/seoAeo.ts';
import { MarketTickerBar } from './components/MarketTickerBar.tsx';
import { MarketTablePanel } from './components/MarketTablePanel.tsx';
import { EconomicCalendarPanel } from './components/EconomicCalendarPanel.tsx';
import { NewsFeedPanel } from './components/NewsFeedPanel.tsx';
import { AiImpactPanel } from './components/AiImpactPanel.tsx';
import { AiAutoInsightsBar } from './components/AiAutoInsightsBar.tsx';
import { MarketSentimentPanel } from './components/MarketSentimentPanel.tsx';
import { SeoFaqSection } from './components/SeoFaqSection.tsx';
import { AssetDetailView } from './components/AssetDetailView.tsx';
import { SectorView } from './components/SectorView.tsx';
import { ArticleModal } from './components/ArticleModal.tsx';
import { WatchlistDrawer } from './components/WatchlistDrawer.tsx';

const InteractiveChartPanel = lazy(
  () => import('./components/InteractiveChartPanel.tsx'),
);

type ActiveRoute =
  | { view: 'overview' }
  | { view: 'chart' }
  | { view: 'calendar' }
  | { view: 'news' }
  | { view: 'asset'; symbol: string }
  | { view: 'sector'; slug: SectorSlug };

function parseLocationRoute(pathname: string): ActiveRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/grafik') return { view: 'chart' };
  if (clean === '/kalender') return { view: 'calendar' };
  if (clean === '/berita') return { view: 'news' };
  if (clean.startsWith('/aset/')) {
    const rawSym = decodeURIComponent(clean.slice('/aset/'.length));
    if (rawSym) return { view: 'asset', symbol: rawSym };
  }
  if (clean.startsWith('/sektor/')) {
    const rawSlug = decodeURIComponent(clean.slice('/sektor/'.length)) as SectorSlug;
    if (SECTOR_PROFILES.some((s) => s.slug === rawSlug)) {
      return { view: 'sector', slug: rawSlug };
    }
  }
  return { view: 'overview' };
}

function readInitialWatchlist(): string[] {
  try {
    const raw = window.localStorage.getItem('ekon_watchlist');
    if (!raw) return ['^JKSE', 'BBCA.JK', 'USDIDR=X'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return ['^JKSE', 'BBCA.JK', 'USDIDR=X'];
  }
}

function readInitialTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem('ekon_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage access issues
  }
  return 'light';
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>(() =>
    parseLocationRoute(window.location.pathname),
  );
  const [assets, setAssets] = useState<MarketAsset[]>(SEED_ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    const initial = parseLocationRoute(window.location.pathname);
    return initial.view === 'asset' ? initial.symbol : '^JKSE';
  });
  const [chartRange, setChartRange] = useState<ChartRange>('1mo');
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [chartLive, setChartLive] = useState(false);
  const [chartSource, setChartSource] = useState('Referensi Pasar');
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>(
    SEED_CALENDAR_EVENTS,
  );
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(SEED_NEWS_ARTICLES);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentimentSummary>(() =>
    computeMarketSentimentSummary(SEED_NEWS_ARTICLES, GLOBAL_NEWS_SOURCES),
  );
  const [sectors] = useState<SectorProfile[]>(SECTOR_PROFILES);

  const [watchlist, setWatchlist] = useState<string[]>(readInitialWatchlist);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(readInitialTheme);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  );
  const [liveCount, setLiveCount] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AiImpactAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState(
    'BI-Rate tetap 6,00%, Rupiah menguat, inflasi domestik terkendali',
  );
  const [autoAlerts, setAutoAlerts] = useState<AutoAiAlert[]>([]);
  const [autoAlertsLoading, setAutoAlertsLoading] = useState(true);
  const [autoAlertsError, setAutoAlertsError] = useState<string | null>(null);
  const [autoAlertsExpanded, setAutoAlertsExpanded] = useState(true);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('ekon_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist watchlist
  useEffect(() => {
    try {
      window.localStorage.setItem('ekon_watchlist', JSON.stringify(watchlist));
    } catch {
      // ignore
    }
  }, [watchlist]);

  // Browser back/forward navigation
  useEffect(() => {
    const handlePop = () => {
      const next = parseLocationRoute(window.location.pathname);
      setRoute(next);
      if (next.view === 'asset') {
        setSelectedSymbol(next.symbol);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigateTo = useCallback((nextRoute: ActiveRoute, path: string) => {
    setRoute(nextRoute);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchAutoInsights = useCallback(async (force = false) => {
    setAutoAlertsLoading(true);
    setAutoAlertsError(null);
    if (force) {
      setDismissedAlertIds([]);
    }
    try {
      const res = await fetch(`/api/ai/auto-insights${force ? '?refresh=1' : ''}`);
      const data = (await res.json()) as Partial<AutoInsightsResponse> & { error?: string };
      if (!res.ok) {
        setAutoAlertsError(data?.error || 'Gagal memuat notifikasi AI otomatis.');
      } else if (Array.isArray(data.alerts)) {
        setAutoAlerts(data.alerts);
      }
    } catch {
      setAutoAlertsError('Koneksi ke layanan notifikasi AI terputus.');
    } finally {
      setAutoAlertsLoading(false);
    }
  }, []);

  const fetchMarketData = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/market/quotes${force ? '?refresh=1' : ''}`);
      if (res.ok) {
        const data = (await res.json()) as {
          assets: MarketAsset[];
          liveCount: number;
          updatedAt: string;
        };
        if (Array.isArray(data.assets) && data.assets.length > 0) {
          setAssets(data.assets);
          setLiveCount(data.liveCount || 0);
          setLastUpdatedLabel(
            new Date(data.updatedAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
        }
      }
    } catch {
      // fallback remains active cleanly
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchNewsArticles = useCallback(async (force = false) => {
    setIsRefreshingNews(true);
    try {
      const res = await fetch(`/api/news${force ? '?refresh=1' : ''}`);
      if (res.ok) {
        const d = (await res.json()) as {
          articles?: NewsArticle[];
          sentiment?: MarketSentimentSummary;
        };
        if (Array.isArray(d.articles) && d.articles.length > 0) {
          setNewsArticles(d.articles);
          setMarketSentiment(
            d.sentiment ??
              computeMarketSentimentSummary(d.articles, GLOBAL_NEWS_SOURCES),
          );
        }
      }
    } catch {
      // keep existing articles cleanly
    } finally {
      setIsRefreshingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData(false).then(() => fetchAutoInsights(false));
    fetchNewsArticles(false);

    fetch('/api/calendar')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.events) setCalendarEvents(d.events);
      })
      .catch(() => {});
  }, [fetchMarketData, fetchAutoInsights, fetchNewsArticles]);

  // Auto-refresh quotes every 60 seconds and global news every 15 minutes
  useEffect(() => {
    const quoteTimer = window.setInterval(() => {
      fetchMarketData(false);
    }, 60_000);
    const newsTimer = window.setInterval(() => {
      fetchNewsArticles(false);
    }, 15 * 60_000);
    return () => {
      window.clearInterval(quoteTimer);
      window.clearInterval(newsTimer);
    };
  }, [fetchMarketData, fetchNewsArticles]);

  // Fetch chart series whenever selectedSymbol or chartRange changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingChart(true);

    fetch(
      `/api/market/chart?symbol=${encodeURIComponent(selectedSymbol)}&range=${encodeURIComponent(
        chartRange,
      )}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ChartResponse | null) => {
        if (cancelled || !data) return;
        setChartPoints(data.points || []);
        setChartLive(Boolean(data.isLive));
        setChartSource(data.source || 'Referensi Pasar');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingChart(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, chartRange]);

  const activeAsset = useMemo(
    () => assets.find((a) => a.symbol === selectedSymbol) ?? assets[0],
    [assets, selectedSymbol],
  );

  const activeSector = useMemo(() => {
    if (route.view === 'sector') {
      return sectors.find((s) => s.slug === route.slug) ?? sectors[0];
    }
    return sectors.find((s) => s.slug === activeAsset.sectorSlug) ?? sectors[0];
  }, [route, sectors, activeAsset]);

  // Dynamic SEO meta tags & Schema.org @graph JSON-LD updater
  useEffect(() => {
    const seoView =
      route.view === 'asset'
        ? 'asset'
        : route.view === 'sector'
          ? 'sector'
          : route.view === 'chart'
            ? 'chart'
            : route.view === 'calendar'
              ? 'calendar'
              : route.view === 'news'
                ? 'news'
                : 'overview';

    const routeAsset = route.view === 'asset' ? activeAsset : null;
    const routeSector = route.view === 'sector' ? activeSector : null;
    const meta = buildSeoMetadata(seoView, routeAsset, routeSector);
    const baseUrl = resolveRequestBaseUrl(window.location.origin, null);
    const canonicalUrl = `${baseUrl}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
    const ogImageUrl = `${baseUrl}${DEFAULT_OG_IMAGE_PATH}`;

    document.title = meta.title;

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };
    setMetaTag('meta[name="description"]', meta.description);
    setMetaTag('meta[property="og:title"]', meta.title);
    setMetaTag('meta[property="og:description"]', meta.description);
    setMetaTag('meta[property="og:url"]', canonicalUrl);
    setMetaTag('meta[property="og:image"]', ogImageUrl);
    setMetaTag('meta[name="twitter:title"]', meta.title);
    setMetaTag('meta[name="twitter:description"]', meta.description);
    setMetaTag('meta[name="twitter:image"]', ogImageUrl);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const jsonLdEl = document.getElementById('ekon-jsonld');
    if (jsonLdEl) {
      jsonLdEl.textContent = JSON.stringify(
        buildStructuredDataGraph({
          baseUrl,
          meta,
          asset: routeAsset,
          sector: routeSector,
          includeFaq: route.view === 'overview',
        }),
      );
    }
  }, [route, activeAsset, activeSector]);

  const handleSelectAsset = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      if (route.view === 'asset') {
        navigateTo({ view: 'asset', symbol }, `/aset/${encodeURIComponent(symbol)}`);
      } else if (route.view === 'calendar' || route.view === 'news' || route.view === 'sector') {
        navigateTo({ view: 'asset', symbol }, `/aset/${encodeURIComponent(symbol)}`);
      }
    },
    [route.view, navigateTo],
  );

  const handleOpenAssetPage = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      navigateTo({ view: 'asset', symbol }, `/aset/${encodeURIComponent(symbol)}`);
    },
    [navigateTo],
  );

  const handleOpenSectorPage = useCallback(
    (slug: SectorSlug) => {
      navigateTo({ view: 'sector', slug }, `/sektor/${slug}`);
    },
    [navigateTo],
  );

  const handleToggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  }, []);

  const handleAnalyzeImpact = useCallback(
    async (
      headline: string,
      context?: string,
      mode: 'news' | 'macro' | 'custom' = 'custom',
      scrollToPanel = false,
    ) => {
      setAiPrompt(headline);
      setAiLoading(true);
      setAiError(null);
      if (scrollToPanel) {
        window.setTimeout(() => {
          document.getElementById('analisis-dampak-ai')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 60);
      }
      try {
        const res = await fetch('/api/ai/analyze-impact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline, context, mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAiError(data?.error || 'Gagal memproses analisis AI.');
        } else {
          setAiAnalysis(data as AiImpactAnalysis);
        }
      } catch {
        setAiError('Koneksi ke layanan analisis AI terputus.');
      } finally {
        setAiLoading(false);
      }
    },
    [],
  );

  const handleAnalyzeCalendarEvent = useCallback(
    (ev: EconomicEvent) => {
      const headline = `${ev.indicator} (${ev.country}, Aktual: ${ev.actual}, Konsensus: ${ev.consensus}, Sebelumnya: ${ev.previous})`;
      handleAnalyzeImpact(headline, ev.macroNote, 'macro', true);
    },
    [handleAnalyzeImpact],
  );

  const handleAnalyzeNewsArticle = useCallback(
    (article: NewsArticle) => {
      handleAnalyzeImpact(article.title, article.summary, 'news', true);
    },
    [handleAnalyzeImpact],
  );

  const visibleAutoAlerts = useMemo(
    () => autoAlerts.filter((a) => !dismissedAlertIds.includes(a.id)),
    [autoAlerts, dismissedAlertIds],
  );

  const unreadAlertCount = useMemo(
    () => visibleAutoAlerts.filter((a) => !readAlertIds.includes(a.id)).length,
    [visibleAutoAlerts, readAlertIds],
  );

  const handleMarkAllAlertsRead = useCallback(() => {
    setReadAlertIds((prev) => Array.from(new Set([...prev, ...visibleAutoAlerts.map((a) => a.id)])));
  }, [visibleAutoAlerts]);

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const relatedAssetNews = useMemo(
    () =>
      newsArticles.filter(
        (n) =>
          n.assetSymbols.includes(activeAsset.symbol) ||
          n.sectorSlug === activeAsset.sectorSlug,
      ),
    [newsArticles, activeAsset],
  );

  const chartFallback = (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      Menyiapkan grafik interaktif...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7F4] pb-20 text-slate-900 md:pb-10 dark:bg-[#0B0F17] dark:text-slate-100">
      {/* Sticky Top Header (Strict 3-Zone Contract, <= 56px mobile height) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-8 px-4 sm:h-14 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo({ view: 'overview' }, '/');
            }}
            className="font-serif text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 sm:text-xl dark:text-white"
          >
            EkonAnalisis
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo({ view: 'overview' }, '/');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white ${
                route.view === 'overview'
                  ? 'font-semibold text-blue-900 underline decoration-2 underline-offset-8 dark:text-blue-400'
                  : ''
              }`}
            >
              Pasar
            </a>
            <a
              href="/grafik"
              onClick={(e) => {
                e.preventDefault();
                navigateTo({ view: 'chart' }, '/grafik');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white ${
                route.view === 'chart' || route.view === 'asset'
                  ? 'font-semibold text-blue-900 underline decoration-2 underline-offset-8 dark:text-blue-400'
                  : ''
              }`}
            >
              Grafik
            </a>
            <a
              href="/kalender"
              onClick={(e) => {
                e.preventDefault();
                navigateTo({ view: 'calendar' }, '/kalender');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white ${
                route.view === 'calendar'
                  ? 'font-semibold text-blue-900 underline decoration-2 underline-offset-8 dark:text-blue-400'
                  : ''
              }`}
            >
              Kalender
            </a>
            <a
              href="/berita"
              onClick={(e) => {
                e.preventDefault();
                navigateTo({ view: 'news' }, '/berita');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white ${
                route.view === 'news'
                  ? 'font-semibold text-blue-900 underline decoration-2 underline-offset-8 dark:text-blue-400'
                  : ''
              }`}
            >
              Berita
            </a>
            <a
              href="/sektor/perbankan"
              onClick={(e) => {
                e.preventDefault();
                handleOpenSectorPage('perbankan');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white ${
                route.view === 'sector'
                  ? 'font-semibold text-blue-900 underline decoration-2 underline-offset-8 dark:text-blue-400'
                  : ''
              }`}
            >
              Sektor
            </a>
          </nav>

          {/* Zone 3: 1 primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setWatchlistOpen(true)}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-blue-950 px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 sm:min-h-[40px] sm:px-4 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Pantauan ({watchlist.length})
            </button>
          </div>
        </div>
      </header>

      {/* Market Ticker Strip */}
      <MarketTickerBar
        assets={assets}
        selectedSymbol={activeAsset.symbol}
        onSelectAsset={handleSelectAsset}
      />

      {/* Workspace Control & Freshness Strip (Below header, per Top Bar Contract) */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Pembaruan terakhir:{' '}
            <strong className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-200">
              {lastUpdatedLabel} WIB
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {liveCount > 0
              ? `Umpan Yahoo Finance aktif (${liveCount}/${assets.length} instrumen)`
              : 'Data referensi pasar tersinkron'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (route.view !== 'overview') {
                navigateTo({ view: 'overview' }, '/');
                setAutoAlertsExpanded(true);
              } else {
                setAutoAlertsExpanded((prev) => !prev);
              }
            }}
            aria-expanded={route.view === 'overview' ? autoAlertsExpanded : undefined}
            aria-label={`Notifikasi AI otomatis, ${unreadAlertCount} belum dibaca`}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              autoAlertsExpanded && route.view === 'overview'
                ? 'border-blue-900/30 bg-blue-50 text-blue-950 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Notifikasi AI</span>
            {unreadAlertCount > 0 && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-950 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white dark:bg-blue-500 dark:text-slate-950">
                {unreadAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => fetchMarketData(true).then(() => fetchAutoInsights(false))}
            disabled={isRefreshing}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Memperbarui...' : 'Perbarui Data'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label={
              theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'
            }
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Mode Gelap</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Mode Terang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 pt-4 sm:px-6">
        {route.view === 'asset' ? (
          <Suspense fallback={chartFallback}>
            <AssetDetailView
              asset={activeAsset}
              sector={sectors.find((s) => s.slug === activeAsset.sectorSlug)}
              points={chartPoints}
              range={chartRange}
              isLoadingChart={isLoadingChart}
              isLiveChart={chartLive}
              chartSource={chartSource}
              isWatched={watchlist.includes(activeAsset.symbol)}
              relatedArticles={relatedAssetNews}
              onBack={() => navigateTo({ view: 'overview' }, '/')}
              onRangeChange={setChartRange}
              onToggleWatchlist={handleToggleWatchlist}
              onOpenSector={handleOpenSectorPage}
              onOpenArticle={setActiveArticle}
            />
          </Suspense>
        ) : route.view === 'sector' ? (
          <SectorView
            sectors={sectors}
            activeSector={activeSector}
            assets={assets}
            articles={newsArticles}
            onSelectSector={handleOpenSectorPage}
            onOpenAsset={handleOpenAssetPage}
            onOpenArticle={setActiveArticle}
            onBack={() => navigateTo({ view: 'overview' }, '/')}
          />
        ) : route.view === 'calendar' ? (
          <div className="space-y-6">
            <EconomicCalendarPanel
              events={calendarEvents}
              onAnalyzeEvent={handleAnalyzeCalendarEvent}
            />
            <AiImpactPanel
              assets={assets}
              analysis={aiAnalysis}
              isLoading={aiLoading}
              error={aiError}
              activePrompt={aiPrompt}
              onAnalyze={(h, c, m) => handleAnalyzeImpact(h, c, m, false)}
              onSelectAsset={handleOpenAssetPage}
            />
          </div>
        ) : route.view === 'news' ? (
          <div className="space-y-6">
            <AiImpactPanel
              assets={assets}
              analysis={aiAnalysis}
              isLoading={aiLoading}
              error={aiError}
              activePrompt={aiPrompt}
              onAnalyze={(h, c, m) => handleAnalyzeImpact(h, c, m, false)}
              onSelectAsset={handleOpenAssetPage}
            />
            <NewsFeedPanel
              articles={newsArticles}
              isRefreshing={isRefreshingNews}
              onRefreshNews={() => fetchNewsArticles(true)}
              onOpenArticle={setActiveArticle}
              onSelectAsset={handleOpenAssetPage}
              onAnalyzeArticle={handleAnalyzeNewsArticle}
            />
          </div>
        ) : route.view === 'chart' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Suspense fallback={chartFallback}>
                <InteractiveChartPanel
                  asset={activeAsset}
                  points={chartPoints}
                  range={chartRange}
                  isLoading={isLoadingChart}
                  isLive={chartLive}
                  source={chartSource}
                  isWatched={watchlist.includes(activeAsset.symbol)}
                  onRangeChange={setChartRange}
                  onToggleWatchlist={handleToggleWatchlist}
                  onOpenAssetPage={handleOpenAssetPage}
                />
              </Suspense>
            </div>
            <div className="lg:col-span-4">
              <MarketTablePanel
                assets={assets}
                selectedSymbol={activeAsset.symbol}
                watchlist={watchlist}
                onSelectAsset={setSelectedSymbol}
                onToggleWatchlist={handleToggleWatchlist}
              />
            </div>
          </div>
        ) : (
          /* Default Overview: Auto AI Alerts + Full Terminal + AI Impact + Calendar + News Broadsheet */
          <>
            <AiAutoInsightsBar
              alerts={visibleAutoAlerts}
              isLoading={autoAlertsLoading}
              error={autoAlertsError}
              isExpanded={autoAlertsExpanded}
              unreadCount={unreadAlertCount}
              onToggleExpand={() => setAutoAlertsExpanded((prev) => !prev)}
              onMarkAllRead={handleMarkAllAlertsRead}
              onDismissAlert={handleDismissAlert}
              onOpenFullAnalysis={(prompt) => {
                handleMarkAllAlertsRead();
                handleAnalyzeImpact(prompt, undefined, 'macro', true);
              }}
              onSelectAsset={(symbol) => {
                handleMarkAllAlertsRead();
                setSelectedSymbol(symbol);
              }}
              onRetry={() => fetchAutoInsights(true)}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <Suspense fallback={chartFallback}>
                  <InteractiveChartPanel
                    asset={activeAsset}
                    points={chartPoints}
                    range={chartRange}
                    isLoading={isLoadingChart}
                    isLive={chartLive}
                    source={chartSource}
                    isWatched={watchlist.includes(activeAsset.symbol)}
                    onRangeChange={setChartRange}
                    onToggleWatchlist={handleToggleWatchlist}
                    onOpenAssetPage={handleOpenAssetPage}
                  />
                </Suspense>
              </div>
              <div className="lg:col-span-4">
                <MarketTablePanel
                  assets={assets}
                  selectedSymbol={activeAsset.symbol}
                  watchlist={watchlist}
                  onSelectAsset={setSelectedSymbol}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            </div>

            <MarketSentimentPanel
              sentiment={marketSentiment}
              articles={newsArticles}
              isRefreshing={isRefreshingNews}
              onRefreshSentiment={() => fetchNewsArticles(true)}
              onOpenArticle={setActiveArticle}
            />

            <AiImpactPanel
              assets={assets}
              analysis={aiAnalysis}
              isLoading={aiLoading}
              error={aiError}
              activePrompt={aiPrompt}
              onAnalyze={(h, c, m) => handleAnalyzeImpact(h, c, m, false)}
              onSelectAsset={handleOpenAssetPage}
            />

            <EconomicCalendarPanel
              events={calendarEvents}
              onAnalyzeEvent={handleAnalyzeCalendarEvent}
            />

            <NewsFeedPanel
              articles={newsArticles}
              isRefreshing={isRefreshingNews}
              onRefreshNews={() => fetchNewsArticles(true)}
              onOpenArticle={setActiveArticle}
              onSelectAsset={handleOpenAssetPage}
              onAnalyzeArticle={handleAnalyzeNewsArticle}
            />

            <SeoFaqSection />
          </>
        )}
      </main>

      {/* Quiet Editorial Footer with Sector SEO Links */}
      <footer className="mx-auto mt-10 max-w-[1400px] border-t border-slate-200 px-4 py-6 sm:px-6 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-serif text-base font-bold text-slate-900 dark:text-white">
              EkonAnalisis
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Data pasar disajikan untuk tujuan analisis informasi ekonomi &amp; riset sektor.
            </p>
          </div>

          <nav aria-label="Tautan halaman sektor" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            {sectors.map((sec) => (
              <a
                key={sec.slug}
                href={`/sektor/${sec.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenSectorPage(sec.slug);
                }}
                className="hover:text-slate-950 hover:underline dark:hover:text-white"
              >
                {sec.name}
              </a>
            ))}
          </nav>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Navigation (9:16 optimized, 56px height) */}
      <nav
        aria-label="Navigasi cepat seluler"
        className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-950/95"
      >
        <button
          type="button"
          onClick={() => navigateTo({ view: 'overview' }, '/')}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.view === 'overview'
              ? 'font-semibold text-blue-900 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          <span>Pasar</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo({ view: 'chart' }, '/grafik')}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.view === 'chart' || route.view === 'asset'
              ? 'font-semibold text-blue-900 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          <span>Grafik</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo({ view: 'calendar' }, '/kalender')}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.view === 'calendar'
              ? 'font-semibold text-blue-900 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <span>Kalender</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo({ view: 'news' }, '/berita')}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.view === 'news' || route.view === 'sector'
              ? 'font-semibold text-blue-900 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Newspaper className="h-4 w-4" aria-hidden="true" />
          <span>Berita</span>
        </button>
      </nav>

      {/* Modals & Drawers */}
      <ArticleModal
        article={activeArticle}
        onClose={() => setActiveArticle(null)}
        onSelectAsset={handleOpenAssetPage}
      />

      <WatchlistDrawer
        open={watchlistOpen}
        assets={assets}
        watchlist={watchlist}
        onClose={() => setWatchlistOpen(false)}
        onSelectAsset={handleOpenAssetPage}
        onRemoveAsset={handleToggleWatchlist}
      />
    </div>
  );
}
