import type {
  MarketSentimentLabel,
  MarketSentimentSummary,
  NewsArticle,
  SectorSentimentBreakdown,
  SourceSentimentItem,
} from '../types/market.ts';
import { GLOBAL_NEWS_SOURCES, type GlobalNewsSource } from './newsAggregator.ts';

const BULLISH_TERMS: RegExp[] = [
  /\b(bullish|rally|surge|soar|jump|gain|gains|rise|rises|rising|rebound|beat|beats|record high|optimis(?:t|tic)?|expansion|growth|grows|approve|approves|approved|cuts?\s+rates?|menguat|melesat|melonjak|naik|tumbuh|surplus|ekspansi|pemulihan|optimistis|positif|rekor|setujui|mendukung)\b/gi,
];

const BEARISH_TERMS: RegExp[] = [
  /\b(bearish|slide|slides|drop|drops|fall|falls|plunge|selloff|sell-off|slump|decline|loss|losses|unravel(?:ing)?|recession|crisis|war|conflict|risk|warn(?:s|ing)?|slowdown|melambat|tertekan|turun|melorot|koreksi|aksi jual|risiko|defisit|perang|krisis|anjlok|melemah|penipuan|pencurian)\b/gi,
];

export function normalizeSentimentLabel(
  raw: unknown,
  fallback: MarketSentimentLabel = 'Neutral',
): MarketSentimentLabel {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'bullish' || cleaned === 'positif') return 'Bullish';
  if (cleaned === 'bearish' || cleaned === 'negatif') return 'Bearish';
  if (cleaned === 'neutral' || cleaned === 'netral') return 'Neutral';
  return fallback;
}

export function clampSentimentScore(
  raw: unknown,
  label: MarketSentimentLabel = 'Neutral',
): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const rounded = Math.round(raw);
    return Math.max(-100, Math.min(100, rounded));
  }
  if (label === 'Bullish') return 45;
  if (label === 'Bearish') return -45;
  return 0;
}

export function classifyArticleSentimentHeuristic(text: string): {
  sentiment: MarketSentimentLabel;
  score: number;
} {
  const safeText = text || '';
  let bullHits = 0;
  let bearHits = 0;

  for (const re of BULLISH_TERMS) {
    const matches = safeText.match(re);
    if (matches) bullHits += matches.length;
  }
  for (const re of BEARISH_TERMS) {
    const matches = safeText.match(re);
    if (matches) bearHits += matches.length;
  }

  const delta = bullHits - bearHits;
  if (delta >= 1) {
    const score = Math.min(85, 22 + delta * 18);
    return { sentiment: 'Bullish', score };
  }
  if (delta <= -1) {
    const score = Math.max(-85, -22 + delta * 18);
    return { sentiment: 'Bearish', score };
  }
  return { sentiment: 'Neutral', score: 0 };
}

export function deriveOverallSentimentLabel(score: number): MarketSentimentLabel {
  if (score >= 12) return 'Bullish';
  if (score <= -12) return 'Bearish';
  return 'Neutral';
}

export function computeMarketSentimentSummary(
  articles: NewsArticle[],
  sources: GlobalNewsSource[] = GLOBAL_NEWS_SOURCES,
  analyzedAt = new Date().toISOString(),
): MarketSentimentSummary {
  const enrichedArticles = articles.map((article) => {
    const fallback = classifyArticleSentimentHeuristic(
      `${article.title} ${article.summary} ${article.originalTitle ?? ''}`,
    );
    const sentiment = article.sentiment
      ? normalizeSentimentLabel(article.sentiment, fallback.sentiment)
      : fallback.sentiment;
    const score =
      typeof article.sentimentScore === 'number' && Number.isFinite(article.sentimentScore)
        ? clampSentimentScore(article.sentimentScore, sentiment)
        : fallback.score;
    return { article, sentiment, score };
  });

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let totalScore = 0;

  for (const item of enrichedArticles) {
    if (item.sentiment === 'Bullish') bullishCount++;
    else if (item.sentiment === 'Bearish') bearishCount++;
    else neutralCount++;
    totalScore += item.score;
  }

  const totalAnalyzed = enrichedArticles.length;
  const averageScore =
    totalAnalyzed > 0 ? Math.round(totalScore / totalAnalyzed) : 0;
  const overallLabel = deriveOverallSentimentLabel(averageScore);

  const sourceBreakdown: SourceSentimentItem[] = sources.map((src) => {
    const matched = enrichedArticles.filter(
      ({ article }) =>
        article.source.toLowerCase() === src.name.toLowerCase() ||
        (article.sourceDomain &&
          article.sourceDomain.toLowerCase().includes(src.domain.replace(/^www\./, '').toLowerCase())),
    );

    if (matched.length === 0) {
      return {
        sourceId: src.id,
        sourceName: src.name,
        domain: src.domain,
        sentiment: 'Neutral',
        score: 0,
        headline: 'Menunggu rilis terbaru dalam siklus agregasi berikutnya.',
        sectorTag: src.defaultSectorTag,
        hasLiveArticle: false,
      };
    }

    const avgSourceScore = Math.round(
      matched.reduce((acc, m) => acc + m.score, 0) / matched.length,
    );
    const primary = matched[0];
    const sourceSentiment: MarketSentimentLabel =
      matched.length === 1
        ? primary.sentiment
        : deriveOverallSentimentLabel(avgSourceScore);

    return {
      sourceId: src.id,
      sourceName: src.name,
      domain: src.domain,
      sentiment: sourceSentiment,
      score: avgSourceScore,
      headline: primary.article.title,
      articleId: primary.article.id,
      externalUrl: primary.article.externalUrl,
      sectorTag: primary.article.sectorTag,
      hasLiveArticle: true,
    };
  });

  const sectorMap = new Map<
    string,
    { bullish: number; bearish: number; neutral: number }
  >();
  for (const { article, sentiment } of enrichedArticles) {
    const key = article.sectorTag || 'Makro & Pasar';
    const curr = sectorMap.get(key) ?? { bullish: 0, bearish: 0, neutral: 0 };
    if (sentiment === 'Bullish') curr.bullish++;
    else if (sentiment === 'Bearish') curr.bearish++;
    else curr.neutral++;
    sectorMap.set(key, curr);
  }

  const sectorBreakdown: SectorSentimentBreakdown[] = Array.from(
    sectorMap.entries(),
  ).map(([sectorTag, counts]) => {
    let dominant: MarketSentimentLabel = 'Neutral';
    if (counts.bullish > counts.bearish && counts.bullish >= counts.neutral) {
      dominant = 'Bullish';
    } else if (counts.bearish > counts.bullish && counts.bearish >= counts.neutral) {
      dominant = 'Bearish';
    }
    return {
      sectorTag,
      bullish: counts.bullish,
      bearish: counts.bearish,
      neutral: counts.neutral,
      dominant,
    };
  });

  const activeSourceCount = sourceBreakdown.filter((s) => s.hasLiveArticle).length;
  const isAiPowered = articles.some((a) => typeof a.sentiment === 'string');

  const summaryText =
    totalAnalyzed === 0
      ? 'Menunggu pembaruan berita dari 20 sumber ekonomi global.'
      : overallLabel === 'Bullish'
        ? `Sentimen pasar condong Bullish (${bullishCount} positif, ${neutralCount} netral, ${bearishCount} negatif) dari ${activeSourceCount} sumber aktif; dorongan optimisme terlihat pada aset berisiko dan pertumbuhan laba.`
        : overallLabel === 'Bearish'
          ? `Sentimen pasar condong Bearish (${bearishCount} negatif, ${neutralCount} netral, ${bullishCount} positif) dari ${activeSourceCount} sumber aktif; pelaku pasar mencermati tekanan risiko makro dan volatilitas sektor.`
          : `Sentimen pasar berada pada posisi Neutral (${neutralCount} netral, ${bullishCount} positif, ${bearishCount} negatif) dari ${activeSourceCount} sumber aktif; katalis positif dan risiko makro saling mengimbangi.`;

  return {
    overallLabel,
    sentimentScore: averageScore,
    bullishCount,
    bearishCount,
    neutralCount,
    totalAnalyzed,
    activeSourceCount,
    totalConfiguredSources: sources.length,
    summaryText,
    sourceBreakdown,
    sectorBreakdown,
    analyzedAt,
    isAiPowered,
  };
}
