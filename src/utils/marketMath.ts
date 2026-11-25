import type {
  AssetCategory,
  ChartPoint,
  ChartRange,
  EconomicEvent,
  EventCountry,
  EventImpact,
  EventStatus,
  MarketAsset,
  NewsArticle,
  SectorProfile,
  SeoMetadata,
} from '../types/market.ts';

export function calculateSMA(points: ChartPoint[], period = 20): ChartPoint[] {
  if (points.length === 0) return [];
  const effectivePeriod = Math.max(2, Math.min(period, points.length));
  let rollingSum = 0;

  return points.map((point, index) => {
    rollingSum += point.close;
    if (index >= effectivePeriod) {
      rollingSum -= points[index - effectivePeriod].close;
    }
    const sma20 =
      index >= effectivePeriod - 1
        ? Number((rollingSum / effectivePeriod).toFixed(4))
        : null;
    return {
      ...point,
      sma20,
    };
  });
}

export interface PriceStats {
  latest: number;
  first: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
}

export function calculatePriceStats(points: ChartPoint[]): PriceStats {
  if (points.length === 0) {
    return { latest: 0, first: 0, high: 0, low: 0, change: 0, changePercent: 0 };
  }
  const first = points[0].close;
  const latest = points[points.length - 1].close;
  let high = -Infinity;
  let low = Infinity;

  for (const p of points) {
    if (p.high > high) high = p.high;
    if (p.low < low) low = p.low;
  }

  const change = latest - first;
  const changePercent = first !== 0 ? (change / first) * 100 : 0;

  return {
    latest,
    first,
    high,
    low,
    change,
    changePercent,
  };
}

export function formatAssetPrice(
  price: number,
  currency: MarketAsset['currency'],
  category: AssetCategory,
): string {
  if (!Number.isFinite(price)) return '—';

  if (category === 'fx') {
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price)}`;
    }
    if (currency === 'JPY') {
      return `¥${price.toFixed(2)}`;
    }
    return price.toFixed(4);
  }

  if (currency === 'IDR') {
    return `Rp ${new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)}`;
  }

  if (currency === 'PTS') {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)}`;
}

export function formatSignedPercent(pct: number): string {
  if (!Number.isFinite(pct)) return '0,00%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2).replace('.', ',')}%`;
}

const TICKER_LABEL_MAP: Record<string, string> = {
  '^JKSE': 'IHSG',
  '^GSPC': 'S&P 500',
  '^N225': 'NIKKEI',
  'GC=F': 'EMAS',
  'BZ=F': 'BRENT',
  'USDIDR=X': 'USD/IDR',
  'USDJPY=X': 'USD/JPY',
  'EURUSD=X': 'EUR/USD',
};

export function formatTickerLabel(symbol: string): string {
  if (TICKER_LABEL_MAP[symbol]) return TICKER_LABEL_MAP[symbol];
  return symbol.replace('.JK', '').replace('=X', '');
}

export function formatCompactVolume(volume: number): string {
  if (!Number.isFinite(volume) || volume <= 0) return '—';
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(Math.round(volume));
}

export interface CalendarFilters {
  impact: EventImpact | 'all';
  country: EventCountry | 'all';
  status: EventStatus | 'all';
}

export function filterCalendarEvents(
  events: EconomicEvent[],
  filters: CalendarFilters,
): EconomicEvent[] {
  return events.filter((ev) => {
    if (filters.impact !== 'all' && ev.impact !== filters.impact) return false;
    if (filters.country !== 'all' && ev.country !== filters.country) return false;
    if (filters.status !== 'all' && ev.status !== filters.status) return false;
    return true;
  });
}

export function filterNewsArticles(
  articles: NewsArticle[],
  sector: string,
  query: string,
): NewsArticle[] {
  const normalizedQuery = query.trim().toLowerCase();
  return articles.filter((article) => {
    const matchesSector =
      sector === 'all' ||
      article.sectorSlug === sector ||
      article.sectorTag.toLowerCase() === sector.toLowerCase();
    if (!matchesSector) return false;

    if (!normalizedQuery) return true;
    const haystack = [
      article.title,
      article.originalTitle ?? '',
      article.summary,
      article.source,
      article.sourceDomain ?? '',
      article.sectorTag,
      ...article.assetSymbols,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function buildSeoMetadata(
  view: 'overview' | 'chart' | 'asset' | 'sector' | 'calendar' | 'news',
  asset?: MarketAsset | null,
  sector?: SectorProfile | null,
): SeoMetadata {
  if (view === 'asset' && asset) {
    const formatted = formatAssetPrice(asset.price, asset.currency, asset.category);
    return {
      title: `${asset.shortCode} (${formatted}) – Grafik & Analisis | EkonAnalisis`,
      description: `Pantau harga real-time ${asset.name} (${asset.symbol}) di ${formatted} (${formatSignedPercent(asset.changePercent)}), grafik interaktif Recharts, dan sentimen pasar terkini.`,
      canonicalPath: `/aset/${encodeURIComponent(asset.symbol)}`,
      schemaType: 'FinancialProduct',
      schemaName: `${asset.name} (${asset.symbol})`,
    };
  }

  if (view === 'sector' && sector) {
    return {
      title: sector.seoTitle,
      description: sector.seoDescription,
      canonicalPath: `/sektor/${sector.slug}`,
      schemaType: 'CollectionPage',
      schemaName: `Analisis Sektor ${sector.name}`,
    };
  }

  if (view === 'chart') {
    return {
      title: 'Grafik Tren Pasar Interaktif & Indikator SMA20 | EkonAnalisis',
      description:
        'Visualisasi grafik interaktif IHSG, saham IDX, valuta asing USD/IDR, USD/JPY, dan emas berjangka lengkap dengan indikator tren SMA20 dan rentang waktu fleksibel.',
      canonicalPath: '/grafik',
      schemaType: 'CollectionPage',
      schemaName: 'Grafik Tren Pasar Interaktif EkonAnalisis',
    };
  }

  if (view === 'calendar') {
    return {
      title: 'Kalender Ekonomi Makro (CPI, BI-Rate, The Fed, NFP) | EkonAnalisis',
      description:
        'Jadwal rilis indikator ekonomi global dan Indonesia: inflasi CPI AS, suku bunga The Fed, BI-Rate, PDB, dan Non-Farm Payrolls lengkap dengan konsensus pasar.',
      canonicalPath: '/kalender',
      schemaType: 'CollectionPage',
      schemaName: 'Kalender Ekonomi Makro EkonAnalisis',
    };
  }

  if (view === 'news') {
    return {
      title: 'Berita Ekonomi & Analisis Sektor Pasar Modal | EkonAnalisis',
      description:
        'Agregasi berita ekonomi, pasar saham IDX, valuta asing, dan komoditas terkurasi dengan tagging sektor untuk investor Indonesia.',
      canonicalPath: '/berita',
      schemaType: 'CollectionPage',
      schemaName: 'Berita Finansial EkonAnalisis',
    };
  }

  return {
    title: 'EkonAnalisis — Analisis Ekonomi & Pasar Real-Time',
    description:
      'Portal analisis ekonomi real-time untuk memantau IHSG, saham IDX, valuta asing, komoditas global, kalender ekonomi makro, grafik interaktif Recharts, dan agregator berita finansial.',
    canonicalPath: '/',
    schemaType: 'WebApplication',
    schemaName: 'EkonAnalisis',
  };
}

export function generateDeterministicSeries(
  basePrice: number,
  range: ChartRange,
  seedKey: string,
): ChartPoint[] {
  const counts: Record<ChartRange, number> = {
    '1d': 26,
    '5d': 35,
    '1mo': 30,
    '6mo': 42,
    '1y': 52,
  };
  const stepMs: Record<ChartRange, number> = {
    '1d': 15 * 60 * 1000,
    '5d': 4 * 60 * 60 * 1000,
    '1mo': 24 * 60 * 60 * 1000,
    '6mo': 4 * 24 * 60 * 60 * 1000,
    '1y': 7 * 24 * 60 * 60 * 1000,
  };

  let hash = 2166136261;
  for (let i = 0; i < seedKey.length; i++) {
    hash ^= seedKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };

  const total = counts[range];
  const volatility = range === '1d' ? 0.004 : range === '5d' ? 0.009 : range === '1mo' ? 0.016 : 0.025;
  const now = Date.now();
  const rawCloses: number[] = [];

  let cursor = basePrice * (0.965 + nextRand() * 0.05);
  for (let i = 0; i < total; i++) {
    const drift = (nextRand() - 0.485) * volatility;
    cursor = Math.max(basePrice * 0.75, cursor * (1 + drift));
    rawCloses.push(cursor);
  }

  // Anchor final point cleanly to basePrice
  const scale = basePrice / rawCloses[rawCloses.length - 1];
  const points: ChartPoint[] = rawCloses.map((val, i) => {
    const close = Number((val * scale).toFixed(basePrice < 10 ? 4 : 2));
    const spread = close * (volatility * 0.35);
    const open = Number((close * (1 + (nextRand() - 0.5) * 0.005)).toFixed(basePrice < 10 ? 4 : 2));
    const high = Number((Math.max(open, close) + spread * nextRand()).toFixed(basePrice < 10 ? 4 : 2));
    const low = Number((Math.min(open, close) - spread * nextRand()).toFixed(basePrice < 10 ? 4 : 2));
    const ts = now - (total - 1 - i) * stepMs[range];
    const d = new Date(ts);
    const label =
      range === '1d'
        ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

    return {
      timestamp: ts,
      label,
      close,
      open,
      high,
      low,
      volume: Math.round((400000 + nextRand() * 1800000) * (range === '1d' ? 0.25 : 1)),
    };
  });

  return calculateSMA(points, 20);
}
