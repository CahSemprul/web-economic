import type { NewsArticle, SectorSlug } from '../types/market.ts';
import { parseAiJsonResponse } from './aiImpact.ts';

export interface GlobalNewsSource {
  id: string;
  name: string;
  domain: string;
  rssUrls: string[];
  requiredDomainPattern?: RegExp;
  defaultSectorTag: string;
  defaultSectorSlug: SectorSlug;
}

export interface RawFeedNewsItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  originalTitle: string;
  summary: string;
  externalUrl: string;
  publishedAt: string;
  publishedTs: number;
  imageUrl?: string;
}

export const GLOBAL_NEWS_SOURCES: GlobalNewsSource[] = [
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    domain: 'bloomberg.com',
    rssUrls: ['https://feeds.bloomberg.com/markets/news.rss'],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'wsj',
    name: 'The Wall Street Journal',
    domain: 'wsj.com',
    rssUrls: ['https://feeds.content.dowjones.io/public/rss/RSSMarketsMain'],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'ft',
    name: 'Financial Times',
    domain: 'ft.com',
    rssUrls: ['https://www.ft.com/rss/home'],
    defaultSectorTag: 'Valuta Asing',
    defaultSectorSlug: 'valuta-asing',
  },
  {
    id: 'reuters',
    name: 'Reuters',
    domain: 'reuters.com',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:reuters.com+business&format=rss&setlang=en-US',
      'https://www.bing.com/news/search?q=site:reuters.com+markets&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /reuters\.com/i,
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'economist',
    name: 'The Economist',
    domain: 'economist.com',
    rssUrls: ['https://www.economist.com/finance-and-economics/rss.xml'],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'cnbc',
    name: 'CNBC',
    domain: 'cnbc.com',
    rssUrls: [
      'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258',
    ],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    domain: 'marketwatch.com',
    rssUrls: ['https://feeds.content.dowjones.io/public/rss/mw_topstories'],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    domain: 'finance.yahoo.com',
    rssUrls: [
      'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,GC=F,USDIDR=X&region=US&lang=en-US',
    ],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'investing',
    name: 'Investing.com',
    domain: 'investing.com',
    rssUrls: ['https://www.investing.com/rss/news.rss'],
    defaultSectorTag: 'Valuta Asing',
    defaultSectorSlug: 'valuta-asing',
  },
  {
    id: 'tradingview',
    name: 'TradingView',
    domain: 'tradingview.com',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:www.tradingview.com+markets&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /tradingview\.com/i,
    defaultSectorTag: 'Komoditas',
    defaultSectorSlug: 'komoditas',
  },
  {
    id: 'economic-times',
    name: 'The Economic Times',
    domain: 'economictimes.indiatimes.com',
    rssUrls: ['https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'],
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'fed-fred',
    name: 'Federal Reserve / FRED',
    domain: 'federalreserve.gov',
    rssUrls: [
      'https://www.federalreserve.gov/feeds/press_all.xml',
      'https://fredblog.stlouisfed.org/feed/',
    ],
    defaultSectorTag: 'Valuta Asing',
    defaultSectorSlug: 'valuta-asing',
  },
  {
    id: 'imf-worldbank',
    name: 'IMF & World Bank',
    domain: 'imf.org',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:imf.org+economic+outlook&format=rss&setlang=en-US',
      'https://www.bing.com/news/search?q=site:worldbank.org+economic&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /(imf|worldbank)\.org/i,
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'oecd',
    name: 'OECD',
    domain: 'oecd.org',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:oecd.org+economic&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /oecd\.org/i,
    defaultSectorTag: 'Makro & Pasar',
    defaultSectorSlug: 'indeks-global',
  },
  {
    id: 'business-insider',
    name: 'Business Insider',
    domain: 'businessinsider.com',
    rssUrls: ['https://markets.businessinsider.com/rss/news'],
    defaultSectorTag: 'Teknologi',
    defaultSectorSlug: 'teknologi-telekomunikasi',
  },
  {
    id: 'seeking-alpha',
    name: 'Seeking Alpha',
    domain: 'seekingalpha.com',
    rssUrls: ['https://seekingalpha.com/market_currents.xml'],
    defaultSectorTag: 'Perbankan',
    defaultSectorSlug: 'perbankan',
  },
  {
    id: 'morningstar',
    name: 'Morningstar',
    domain: 'morningstar.com',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:morningstar.com+market&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /morningstar\.com/i,
    defaultSectorTag: 'Perbankan',
    defaultSectorSlug: 'perbankan',
  },
  {
    id: 'forbes',
    name: 'Forbes',
    domain: 'forbes.com',
    rssUrls: ['https://www.forbes.com/business/feed/'],
    defaultSectorTag: 'Teknologi',
    defaultSectorSlug: 'teknologi-telekomunikasi',
  },
  {
    id: 'fortune',
    name: 'Fortune',
    domain: 'fortune.com',
    rssUrls: ['https://fortune.com/feed/'],
    defaultSectorTag: 'Teknologi',
    defaultSectorSlug: 'teknologi-telekomunikasi',
  },
  {
    id: 'trading-economics',
    name: 'Trading Economics',
    domain: 'tradingeconomics.com',
    rssUrls: [
      'https://www.bing.com/news/search?q=site:tradingeconomics.com&format=rss&setlang=en-US',
    ],
    requiredDomainPattern: /tradingeconomics\.com/i,
    defaultSectorTag: 'Valuta Asing',
    defaultSectorSlug: 'valuta-asing',
  },
];

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractDirectArticleUrl(rawUrl: string): string {
  const cleaned = decodeHtmlEntities(rawUrl).trim();
  if (!cleaned) return '';

  try {
    const parsed = new URL(cleaned);
    if (
      parsed.hostname.endsWith('bing.com') &&
      parsed.pathname.includes('apiclick.aspx')
    ) {
      const target = parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        return target;
      }
    }
    if (/^https?:$/i.test(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return '';
}

export function formatTimeAgoId(dateStr: string, nowMs = Date.now()): string {
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return 'Baru saja';
  const diffMins = Math.max(1, Math.floor((nowMs - ts) / 60_000));
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hr lalu`;
}

export function classifyNewsSectorAndAssets(
  text: string,
  fallbackTag = 'Makro & Pasar',
  fallbackSlug: SectorSlug = 'indeks-global',
): {
  sectorTag: string;
  sectorSlug: SectorSlug;
  assetSymbols: string[];
} {
  const lower = text.toLowerCase();
  if (
    /\b(bank|banking|credit|kredit|bi-rate|jpmorgan|goldman|bca|bri|mandiri|ihsg|idx|yields?|treasury|bond)\b/.test(
      lower,
    )
  ) {
    return {
      sectorTag: 'Perbankan',
      sectorSlug: 'perbankan',
      assetSymbols: ['^JKSE', 'BBCA.JK', 'BBRI.JK', 'BMRI.JK'],
    };
  }
  if (
    /\b(gold|emas|oil|minyak|brent|opec|crude|energy|energi|commodity|komoditas|copper|coal|nickel|nikel)\b/.test(
      lower,
    )
  ) {
    return {
      sectorTag: 'Komoditas',
      sectorSlug: 'komoditas',
      assetSymbols: ['GC=F', 'BZ=F', 'ADRO.JK'],
    };
  }
  if (
    /\b(fed|fomc|federal reserve|ecb|boj|central bank|inflation|inflasi|cpi|pce|interest rate|suku bunga|dollar|usd|rupiah|idr|yen|jpy|euro|eur|forex|valas|fx|gdp|pdb|payroll|nfp|imf|oecd|world bank)\b/.test(
      lower,
    )
  ) {
    return {
      sectorTag: 'Valuta Asing',
      sectorSlug: 'valuta-asing',
      assetSymbols: ['USDIDR=X', 'USDJPY=X', 'EURUSD=X', '^JKSE'],
    };
  }
  if (
    /\b(ai|chip|semiconductor|nvidia|nvda|tech|teknologi|cloud|data center|telkom|microsoft|apple|alphabet|meta)\b/.test(
      lower,
    )
  ) {
    return {
      sectorTag: 'Teknologi',
      sectorSlug: 'teknologi-telekomunikasi',
      assetSymbols: ['NVDA', 'TLKM.JK', '^GSPC'],
    };
  }
  return {
    sectorTag: fallbackTag,
    sectorSlug: fallbackSlug,
    assetSymbols: ['^GSPC', '^JKSE', '^N225'],
  };
}

function makeStableFeedId(sourceId: string, url: string, title: string): string {
  const raw = `${sourceId}:${url || title}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `live-${sourceId}-${(hash >>> 0).toString(36)}`;
}

export function parseRssItems(
  xml: string,
  source: GlobalNewsSource,
  maxItems = 3,
): RawFeedNewsItem[] {
  if (!xml || xml.length < 30) return [];
  const itemMatches =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ??
    [];

  const results: RawFeedNewsItem[] = [];
  for (const rawItem of itemMatches) {
    if (results.length >= maxItems) break;

    const titleMatch = rawItem.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
    const descMatch =
      rawItem.match(/<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i) ??
      rawItem.match(/<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/i) ??
      rawItem.match(/<content(?:\s[^>]*)?>([\s\S]*?)<\/content>/i);
    const linkTagMatch = rawItem.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
    const atomLinkMatch = rawItem.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
    const pubMatch =
      rawItem.match(/<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/i) ??
      rawItem.match(/<published(?:\s[^>]*)?>([\s\S]*?)<\/published>/i) ??
      rawItem.match(/<updated(?:\s[^>]*)?>([\s\S]*?)<\/updated>/i);
    const mediaMatch =
      rawItem.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["'](https?:\/\/[^"']+)["'][^>]*>/i);

    const originalTitle = decodeHtmlEntities(titleMatch?.[1] ?? '');
    const rawSummary = decodeHtmlEntities(descMatch?.[1] ?? '');
    const rawUrl = linkTagMatch?.[1]?.trim() || atomLinkMatch?.[1]?.trim() || '';
    const externalUrl = extractDirectArticleUrl(rawUrl);

    if (!originalTitle || originalTitle.length < 15 || !externalUrl) continue;
    if (
      source.requiredDomainPattern &&
      !source.requiredDomainPattern.test(externalUrl)
    ) {
      continue;
    }

    const rawDate = pubMatch?.[1]?.trim() || '';
    const parsedDate = Date.parse(rawDate);
    const publishedTs = Number.isNaN(parsedDate) ? Date.now() : parsedDate;
    const publishedAt = new Date(publishedTs).toISOString();

    let resolvedDomain = source.domain;
    try {
      resolvedDomain = new URL(externalUrl).hostname.replace(/^www\./i, '');
    } catch {
      // keep default source.domain
    }

    const rawImageUrl = mediaMatch?.[1];
    const safeImageUrl =
      rawImageUrl && !/investing\.com/i.test(rawImageUrl) ? rawImageUrl : undefined;

    results.push({
      id: makeStableFeedId(source.id, externalUrl, originalTitle),
      sourceId: source.id,
      sourceName: source.name,
      sourceDomain: resolvedDomain,
      originalTitle,
      summary: rawSummary || originalTitle,
      externalUrl,
      publishedAt,
      publishedTs,
      imageUrl: safeImageUrl,
    });
  }

  return results;
}

export function selectBalancedFeedItems(
  items: RawFeedNewsItem[],
  limit = 18,
): RawFeedNewsItem[] {
  const bySource = new Map<string, RawFeedNewsItem[]>();
  const sortedAll = [...items].sort((a, b) => b.publishedTs - a.publishedTs);

  for (const item of sortedAll) {
    const existing = bySource.get(item.sourceId) ?? [];
    if (!existing.some((e) => e.externalUrl === item.externalUrl)) {
      existing.push(item);
      bySource.set(item.sourceId, existing);
    }
  }

  const selected: RawFeedNewsItem[] = [];
  const seenUrls = new Set<string>();
  const queues = Array.from(bySource.values());

  let round = 0;
  while (selected.length < limit && queues.some((q) => q.length > round)) {
    for (const queue of queues) {
      if (selected.length >= limit) break;
      const candidate = queue[round];
      if (!candidate || seenUrls.has(candidate.externalUrl)) continue;
      seenUrls.add(candidate.externalUrl);
      selected.push(candidate);
    }
    round++;
  }

  return selected.sort((a, b) => b.publishedTs - a.publishedTs);
}

export function buildFallbackIndonesianArticle(
  item: RawFeedNewsItem,
  nowMs = Date.now(),
): NewsArticle {
  const sourceMeta = GLOBAL_NEWS_SOURCES.find((s) => s.id === item.sourceId);
  const classified = classifyNewsSectorAndAssets(
    `${item.originalTitle} ${item.summary}`,
    sourceMeta?.defaultSectorTag,
    sourceMeta?.defaultSectorSlug,
  );

  const excerpt =
    item.summary && item.summary !== item.originalTitle
      ? item.summary
      : item.originalTitle;

  return {
    id: item.id,
    title: item.originalTitle,
    originalTitle: item.originalTitle,
    summary: `Laporan ${item.sourceName} (${item.sourceDomain}): ${excerpt}`,
    content: [
      `Laporan pasar terkini dari ${item.sourceName} menyoroti perkembangan utama: "${item.originalTitle}".`,
      excerpt,
      `Bagi pelaku pasar Indonesia, dinamika global dari ${item.sourceName} ini relevan dicermati kaitannya dengan pergerakan IHSG, arah nilai tukar USD/IDR, serta sentimen aset berisiko dan komoditas global.`,
    ],
    source: item.sourceName,
    sourceDomain: item.sourceDomain,
    publishedAt: item.publishedAt,
    timeAgo: formatTimeAgoId(item.publishedAt, nowMs),
    sectorTag: classified.sectorTag,
    sectorSlug: classified.sectorSlug,
    assetSymbols: classified.assetSymbols,
    imageUrl: item.imageUrl,
    externalUrl: item.externalUrl,
  };
}

export function parseEditorialArticlesJson(
  rawText: string,
  sourceItems: RawFeedNewsItem[],
  nowMs = Date.now(),
): NewsArticle[] {
  const parsed = parseAiJsonResponse(rawText);
  const rawList = Array.isArray(parsed.artikel) ? parsed.artikel : [];
  if (rawList.length === 0) {
    throw new Error('AI editorial returned empty artikel array');
  }

  const byId = new Map(sourceItems.map((item) => [item.id, item]));
  const seenIds = new Set<string>();
  const output: NewsArticle[] = [];

  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id.trim() : '';
    const rawItem = byId.get(id);
    if (!rawItem || seenIds.has(id)) continue;

    const judul =
      typeof obj.judul === 'string' && obj.judul.trim().length >= 8
        ? obj.judul.trim()
        : rawItem.originalTitle;
    const ringkasan =
      typeof obj.ringkasan === 'string' && obj.ringkasan.trim().length >= 12
        ? obj.ringkasan.trim()
        : rawItem.summary;

    const rawParagraphs = Array.isArray(obj.paragraf)
      ? obj.paragraf
          .filter((p): p is string => typeof p === 'string' && p.trim().length >= 12)
          .map((p) => p.trim())
          .slice(0, 4)
      : [];

    const content =
      rawParagraphs.length >= 2
        ? rawParagraphs
        : buildFallbackIndonesianArticle(rawItem, nowMs).content;

    const sourceMeta = GLOBAL_NEWS_SOURCES.find((s) => s.id === rawItem.sourceId);
    const classified = classifyNewsSectorAndAssets(
      `${judul} ${ringkasan} ${rawItem.originalTitle}`,
      sourceMeta?.defaultSectorTag,
      sourceMeta?.defaultSectorSlug,
    );

    const rawSentiment = typeof obj.sentimen === 'string' ? obj.sentimen.trim().toLowerCase() : '';
    const sentiment =
      rawSentiment === 'bullish' || rawSentiment === 'positif'
        ? ('Bullish' as const)
        : rawSentiment === 'bearish' || rawSentiment === 'negatif'
          ? ('Bearish' as const)
          : rawSentiment === 'neutral' || rawSentiment === 'netral'
            ? ('Neutral' as const)
            : undefined;

    const rawScore = typeof obj.skorSentimen === 'number' && Number.isFinite(obj.skorSentimen)
      ? Math.max(-100, Math.min(100, Math.round(obj.skorSentimen)))
      : undefined;

    seenIds.add(id);
    output.push({
      id: rawItem.id,
      title: judul,
      originalTitle: rawItem.originalTitle,
      summary: ringkasan,
      content,
      source: rawItem.sourceName,
      sourceDomain: rawItem.sourceDomain,
      publishedAt: rawItem.publishedAt,
      timeAgo: formatTimeAgoId(rawItem.publishedAt, nowMs),
      sectorTag: classified.sectorTag,
      sectorSlug: classified.sectorSlug,
      assetSymbols: classified.assetSymbols,
      imageUrl: rawItem.imageUrl,
      externalUrl: rawItem.externalUrl,
      ...(sentiment ? { sentiment } : {}),
      ...(rawScore !== undefined ? { sentimentScore: rawScore } : {}),
    });
  }

  if (output.length === 0) {
    throw new Error('AI editorial returned no valid mapped articles');
  }

  for (const item of sourceItems) {
    if (!seenIds.has(item.id)) {
      output.push(buildFallbackIndonesianArticle(item, nowMs));
    }
  }

  return output;
}
