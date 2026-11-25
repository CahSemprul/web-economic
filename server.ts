import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  SEED_ASSETS,
  SEED_CALENDAR_EVENTS,
  SEED_NEWS_ARTICLES,
  SECTOR_PROFILES,
} from './src/data/seedMarketData.ts';
import type {
  AiImpactAnalysis,
  AutoInsightsResponse,
  ChartPoint,
  ChartRange,
  ChartResponse,
  MarketAsset,
  NewsArticle,
} from './src/types/market.ts';
import {
  calculateSMA,
  generateDeterministicSeries,
} from './src/utils/marketMath.ts';
import {
  buildMarketContextSummary,
  normalizeAiImpactPayload,
  parseAiJsonResponse,
  validateImpactInput,
} from './src/utils/aiImpact.ts';
import {
  detectSignificantTriggers,
  parseAutoInsightJsonResponse,
} from './src/utils/aiPulse.ts';
import {
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  injectRouteHeadMetadata,
  resolveRequestBaseUrl,
} from './src/utils/seoAeo.ts';
import {
  GLOBAL_NEWS_SOURCES,
  buildFallbackIndonesianArticle,
  parseEditorialArticlesJson,
  parseRssItems,
  selectBalancedFeedItems,
  type RawFeedNewsItem,
} from './src/utils/newsAggregator.ts';
import { computeMarketSentimentSummary } from './src/utils/marketSentiment.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const quotesCache: { entry: CacheEntry<MarketAsset[]> | null } = { entry: null };
const chartCache = new Map<string, CacheEntry<ChartResponse>>();
const newsCache: { entry: CacheEntry<NewsArticle[]> | null } = { entry: null };
let newsInFlight: Promise<NewsArticle[]> | null = null;
const aiImpactCache = new Map<string, CacheEntry<AiImpactAnalysis>>();
const autoInsightCache = new Map<string, CacheEntry<AutoInsightsResponse>>();
const autoInsightInFlight = new Map<string, Promise<AutoInsightsResponse>>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
};

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

async function fetchYahooChartRaw(
  symbol: string,
  range: ChartRange,
): Promise<YahooChartResponse | null> {
  const intervalMap: Record<ChartRange, string> = {
    '1d': '15m',
    '5d': '1h',
    '1mo': '1d',
    '6mo': '1d',
    '1y': '1wk',
  };
  const interval = intervalMap[range] || '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(3200),
    });
    if (!res.ok) return null;
    return (await res.json()) as YahooChartResponse;
  } catch {
    return null;
  }
}

async function getMarketQuotes(forceRefresh = false): Promise<MarketAsset[]> {
  const now = Date.now();
  if (!forceRefresh && quotesCache.entry && quotesCache.entry.expiresAt > now) {
    return quotesCache.entry.data;
  }

  const updatedAssets = await Promise.all(
    SEED_ASSETS.map(async (seed) => {
      const payload = await fetchYahooChartRaw(seed.symbol, '1d');
      const result = payload?.chart?.result?.[0];
      const meta = result?.meta;

      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        return {
          ...seed,
          updatedAt: new Date(now).toISOString(),
        };
      }

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? seed.prevClose;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : seed.changePercent;

      return {
        ...seed,
        price,
        prevClose,
        change,
        changePercent,
        dayHigh: meta.regularMarketDayHigh ?? Math.max(price, seed.dayHigh),
        dayLow: meta.regularMarketDayLow ?? Math.min(price, seed.dayLow),
        volume: meta.regularMarketVolume ?? seed.volume,
        updatedAt: new Date(now).toISOString(),
        isLive: true,
        source: 'Yahoo Finance',
      };
    }),
  );

  quotesCache.entry = {
    data: updatedAssets,
    expiresAt: now + 45_000,
  };

  return updatedAssets;
}

async function getAssetChart(
  symbol: string,
  range: ChartRange,
): Promise<ChartResponse> {
  const cacheKey = `${symbol}:${range}`;
  const now = Date.now();
  const cached = chartCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const seed = SEED_ASSETS.find((a) => a.symbol === symbol) ?? SEED_ASSETS[0];
  const payload = await fetchYahooChartRaw(seed.symbol, range);
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  const rawPoints: ChartPoint[] = [];
  if (timestamps.length > 4 && quote?.close) {
    for (let i = 0; i < timestamps.length; i++) {
      const closeVal = quote.close[i];
      if (typeof closeVal !== 'number' || !Number.isFinite(closeVal)) continue;
      const tsMs = timestamps[i] * 1000;
      const d = new Date(tsMs);
      const label =
        range === '1d'
          ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

      const openVal = typeof quote.open?.[i] === 'number' ? quote.open[i]! : closeVal;
      const highVal = typeof quote.high?.[i] === 'number' ? quote.high[i]! : closeVal;
      const lowVal = typeof quote.low?.[i] === 'number' ? quote.low[i]! : closeVal;
      const volVal = typeof quote.volume?.[i] === 'number' ? quote.volume[i]! : 0;

      rawPoints.push({
        timestamp: tsMs,
        label,
        close: Number(closeVal.toFixed(seed.price < 10 ? 4 : 2)),
        open: Number(openVal.toFixed(seed.price < 10 ? 4 : 2)),
        high: Number(highVal.toFixed(seed.price < 10 ? 4 : 2)),
        low: Number(lowVal.toFixed(seed.price < 10 ? 4 : 2)),
        volume: volVal,
      });
    }
  }

  const isLive = rawPoints.length >= 6;
  const points = isLive
    ? calculateSMA(rawPoints, 20)
    : generateDeterministicSeries(seed.price, range, `${seed.symbol}-${range}`);

  const response: ChartResponse = {
    symbol: seed.symbol,
    range,
    points,
    isLive,
    source: isLive ? 'Yahoo Finance' : 'Model Referensi Pasar',
    updatedAt: new Date(now).toISOString(),
  };

  // Prevent unbounded cache growth on 1GB RAM VPS
  if (chartCache.size > 120) {
    const oldestKey = chartCache.keys().next().value;
    if (oldestKey) chartCache.delete(oldestKey);
  }
  chartCache.set(cacheKey, { data: response, expiresAt: now + 60_000 });
  return response;
}

async function fetchRawFeedForSource(
  source: (typeof GLOBAL_NEWS_SOURCES)[number],
): Promise<RawFeedNewsItem[]> {
  const perUrl = await Promise.all(
    source.rssUrls.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': YAHOO_HEADERS['User-Agent'],
            Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*',
          },
          signal: AbortSignal.timeout(3500),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml, source, 2);
      } catch {
        return [];
      }
    }),
  );
  return perUrl.flat();
}

async function synthesizeEditorialBatch(
  ai: GoogleGenAI,
  batch: RawFeedNewsItem[],
): Promise<{ articles: NewsArticle[]; aiOk: boolean; errorNote?: string }> {
  if (batch.length === 0) return { articles: [], aiOk: true };
  const promptLines = batch
    .map(
      (item, idx) =>
        `${idx + 1}. ID: ${item.id}\nSumber: ${item.sourceName} (${item.sourceDomain})\nJudul Asli: ${item.originalTitle}\nRingkasan Sumber: ${item.summary.slice(0, 240)}`,
    )
    .join('\n\n');

  const prompt = [
    'Tulis artikel ringkasan & analisis pasar berbahasa Indonesia yang jelas dan akurat untuk setiap berita global berikut.',
    'Terjemahkan judul dan isi ke Bahasa Indonesia jurnalistik. Pertahankan fakta dan angka dari judul/ringkasan sumber tanpa mengarang data baru. Hubungkan secara singkat implikasinya bagi investor global dan pasar Indonesia (IHSG, USD/IDR, obligasi, komoditas) bila relevan.',
    '',
    promptLines,
  ].join('\n');

  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'] as const;
  let lastErrMsg = '';

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...(model === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          systemInstruction:
            'Anda adalah editor berita ekonomi internasional untuk portal riset pasar Indonesia EkonAnalisis. Ubah laporan media finansial global menjadi artikel editorial Bahasa Indonesia yang ringkas, objektif, dan faktual. Kembalikan JSON sesuai skema dan salin nilai "id" persis seperti yang diberikan.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              artikel: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    judul: {
                      type: Type.STRING,
                      description: 'Judul berita jurnalistik dalam Bahasa Indonesia (maks 16 kata).',
                    },
                    ringkasan: {
                      type: Type.STRING,
                      description: 'Ringkasan padat 1-2 kalimat dalam Bahasa Indonesia.',
                    },
                    paragraf: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '2 paragraf artikel berita informatif dalam Bahasa Indonesia.',
                    },
                    sentimen: {
                      type: Type.STRING,
                      description: 'Pilih tepat satu sentimen pasar dari berita ini: Bullish, Bearish, atau Neutral.',
                    },
                    skorSentimen: {
                      type: Type.INTEGER,
                      description: 'Skor sentimen numerik dari -100 (sangat Bearish) hingga +100 (sangat Bullish), 0 untuk Neutral.',
                    },
                  },
                  required: ['id', 'judul', 'ringkasan', 'paragraf', 'sentimen', 'skorSentimen'],
                },
              },
            },
            required: ['artikel'],
          },
        },
      });
      return {
        articles: parseEditorialArticlesJson((response.text ?? '').trim(), batch),
        aiOk: true,
      };
    } catch (err: unknown) {
      lastErrMsg = err instanceof Error ? err.message : String(err);
    }
  }

  console.warn('[News AI Synthesis Fallback]', lastErrMsg);
  return {
    articles: batch.map((item) => buildFallbackIndonesianArticle(item)),
    aiOk: false,
    errorNote: lastErrMsg,
  };
}

async function getAggregatedNews(forceRefresh = false): Promise<NewsArticle[]> {
  const now = Date.now();
  if (!forceRefresh && newsCache.entry && newsCache.entry.expiresAt > now) {
    return newsCache.entry.data;
  }

  if (newsInFlight) {
    return newsInFlight;
  }

  const run = (async (): Promise<NewsArticle[]> => {
    const settled = await Promise.allSettled(
      GLOBAL_NEWS_SOURCES.map((source) => fetchRawFeedForSource(source)),
    );
    const allRaw: RawFeedNewsItem[] = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        allRaw.push(...outcome.value);
      }
    }

    const selected = selectBalancedFeedItems(allRaw, 20);
    if (selected.length === 0) {
      const fallback = newsCache.entry?.data ?? SEED_NEWS_ARTICLES;
      newsCache.entry = { data: fallback, expiresAt: Date.now() + 2 * 60_000 };
      return fallback;
    }

    const ai = getGeminiClient();
    const synthesized: NewsArticle[] = [];
    if (ai) {
      // Process in chunks of 10 sequentially (max 2 requests per 20 articles)
      for (let i = 0; i < selected.length; i += 10) {
        const chunk = selected.slice(i, i + 10);
        const res = await synthesizeEditorialBatch(ai, chunk);
        synthesized.push(...res.articles);
      }
    } else {
      for (const item of selected) {
        synthesized.push(buildFallbackIndonesianArticle(item));
      }
    }

    const combined =
      synthesized.length >= 6
        ? synthesized
        : [...synthesized, ...SEED_NEWS_ARTICLES].slice(0, 20);

    newsCache.entry = {
      data: combined,
      expiresAt: Date.now() + 15 * 60_000,
    };
    return combined;
  })().finally(() => {
    newsInFlight = null;
  });

  newsInFlight = run;
  return run;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // Redirect www.dreceh.my.id to canonical apex domain https://dreceh.my.id
  app.use((req, res, next) => {
    const rawHost =
      (req.headers['x-forwarded-host'] as string | undefined) || req.get('host') || '';
    const host = rawHost.split(',')[0].trim().toLowerCase().split(':')[0];
    if (host === 'www.dreceh.my.id') {
      res.redirect(301, `https://dreceh.my.id${req.originalUrl || '/'}`);
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/market/quotes', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const assets = await getMarketQuotes(forceRefresh);
    res.json({
      assets,
      updatedAt: new Date().toISOString(),
      liveCount: assets.filter((a) => a.isLive).length,
    });
  });

  app.get('/api/market/chart', async (req, res) => {
    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : '^JKSE';
    const rawRange = typeof req.query.range === 'string' ? req.query.range : '1mo';
    const validRanges: ChartRange[] = ['1d', '5d', '1mo', '6mo', '1y'];
    const range: ChartRange = validRanges.includes(rawRange as ChartRange)
      ? (rawRange as ChartRange)
      : '1mo';

    const chart = await getAssetChart(symbol, range);
    res.json(chart);
  });

  app.get('/api/calendar', (_req, res) => {
    res.json({
      events: SEED_CALENDAR_EVENTS,
      updatedAt: new Date().toISOString(),
    });
  });

  app.get('/api/news', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const articles = await getAggregatedNews(forceRefresh);
    const activeSources = Array.from(new Set(articles.map((a) => a.source)));
    const nowIso = new Date().toISOString();
    const sentiment = computeMarketSentimentSummary(
      articles,
      GLOBAL_NEWS_SOURCES,
      nowIso,
    );
    res.json({
      articles,
      activeSources,
      totalConfiguredSources: GLOBAL_NEWS_SOURCES.length,
      sentiment,
      updatedAt: nowIso,
    });
  });

  app.get('/api/sentiment', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const articles = await getAggregatedNews(forceRefresh);
    const nowIso = new Date().toISOString();
    const sentiment = computeMarketSentimentSummary(
      articles,
      GLOBAL_NEWS_SOURCES,
      nowIso,
    );
    res.json(sentiment);
  });

  app.get('/api/sectors', (_req, res) => {
    res.json({ sectors: SECTOR_PROFILES });
  });

  app.post('/api/ai/analyze-impact', async (req, res) => {
    const rawHeadline = typeof req.body?.headline === 'string' ? req.body.headline : '';
    const rawContext = typeof req.body?.context === 'string' ? req.body.context.trim() : '';
    const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'custom';

    const validation = validateImpactInput(rawHeadline);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const cacheKey = `${mode}:${validation.cleaned.toLowerCase()}:${rawContext.slice(0, 120).toLowerCase()}`;
    const now = Date.now();
    const cached = aiImpactCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.json({ ...cached.data, cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Layanan analisis AI belum aktif karena GEMINI_API_KEY belum dikonfigurasi di Settings > Secrets.',
      });
      return;
    }

    try {
      const liveAssets = await getMarketQuotes(false);
      const marketSnapshot = buildMarketContextSummary(liveAssets);

      const prompt = [
        `Analisis dampak berita atau indikator ekonomi berikut terhadap pasar keuangan Indonesia dan global.`,
        `Topik/Berita: "${validation.cleaned}"`,
        rawContext ? `Konteks tambahan: ${rawContext.slice(0, 600)}` : '',
        `Data pasar terkini: ${marketSnapshot}`,
        `Wajib berikan proyeksi mekanisme transmisi yang konkret untuk saham IDX (mis. IHSG, BBCA, BBRI, TLKM, ADRO), valuta asing (USD/IDR, USD/JPY, EUR/USD), dan komoditas (EMAS, BRENT) yang paling relevan.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const requestParams = {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Anda adalah kepala analis makroekonomi dan pasar modal Indonesia di meja riset institusional. Berikan analisis transmisi ekonomi dalam Bahasa Indonesia yang ringkas, objektif, dan terukur. Jangan memberi saran beli/jual personal; fokus pada mekanisme sebab-akibat ke harga saham, valas (forex), dan komoditas.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ringkasanDampak: {
                type: Type.STRING,
                description: 'Ringkasan eksekutif 2-3 kalimat mengenai mekanisme dampak utama.',
              },
              sentimenUtama: {
                type: Type.STRING,
                description: 'Pilih tepat satu: Bullish, Bearish, Netral, atau Campuran.',
              },
              horizonWaktu: {
                type: Type.STRING,
                description: 'Horizon dampak utama, mis. Jangka Pendek (1–5 Hari) & Menengah.',
              },
              dampakAset: {
                type: Type.ARRAY,
                description: 'Daftar 4 sampai 6 aset paling terdampak (saham, forex, komoditas, indeks).',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kode: {
                      type: Type.STRING,
                      description: 'Kode singkat aset: IHSG, BBCA, BBRI, BMRI, TLKM, ADRO, USD/IDR, USD/JPY, EUR/USD, EMAS, BRENT, S&P 500, atau NVDA.',
                    },
                    kelas: {
                      type: Type.STRING,
                      description: 'Kelas aset: Saham IDX, Valas, Komoditas, atau Indeks.',
                    },
                    arah: {
                      type: Type.STRING,
                      description: 'Pilih tepat satu: Naik, Turun, Stabil, atau Volatil.',
                    },
                    besaranEstimasi: {
                      type: Type.STRING,
                      description: 'Frasa singkat arah gerak, mis. Menguat moderat atau Tertekan jangka pendek.',
                    },
                    alasan: {
                      type: Type.STRING,
                      description: 'Penjelasan 1 kalimat mekanisme ekonomi penyebab pergerakan aset tersebut.',
                    },
                  },
                  required: ['kode', 'kelas', 'arah', 'besaranEstimasi', 'alasan'],
                },
              },
              faktorRisiko: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 faktor risiko yang dapat membalikkan skenario.',
              },
            },
            required: ['ringkasanDampak', 'sentimenUtama', 'horizonWaktu', 'dampakAset', 'faktorRisiko'],
          },
        },
      };

      let parsed: Record<string, unknown> | null = null;
      let lastErr: unknown = null;
      const impactModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
      for (let attempt = 0; attempt < impactModels.length; attempt++) {
        const model = impactModels[attempt];
        try {
          const response = await ai.models.generateContent({
            ...requestParams,
            model,
            config: {
              ...requestParams.config,
              ...(model === 'gemini-4-hydrogen'
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                : { thinkingConfig: undefined }),
            },
          });
          const responseText = (response.text ?? '').trim();
          parsed = parseAiJsonResponse(responseText);
          break;
        } catch (attemptErr: unknown) {
          lastErr = attemptErr;
          const errMsg = attemptErr instanceof Error ? attemptErr.message : String(attemptErr);
          const isAuthOrConfig = /400|403|404|API_KEY_INVALID|PERMISSION_DENIED|NOT_FOUND/i.test(errMsg);
          if (isAuthOrConfig || attempt === impactModels.length - 1) {
            throw attemptErr;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      if (!parsed) {
        throw lastErr ?? new Error('Empty AI JSON response');
      }

      const analysis = normalizeAiImpactPayload(parsed, validation.cleaned, false);

      if (aiImpactCache.size > 80) {
        const oldest = aiImpactCache.keys().next().value;
        if (oldest) aiImpactCache.delete(oldest);
      }
      aiImpactCache.set(cacheKey, { data: analysis, expiresAt: now + 10 * 60_000 });

      res.json(analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AI Impact Error]', msg);
      const status =
        /429|RESOURCE_EXHAUSTED/i.test(msg)
          ? 429
          : /403|400|API_KEY|PERMISSION_DENIED/i.test(msg)
            ? 403
            : /404|NOT_FOUND/i.test(msg)
              ? 502
              : 502;
      const friendly =
        status === 429
          ? 'Kuota permintaan AI sementara penuh. Silakan coba lagi beberapa saat lagi.'
          : status === 403
            ? 'Kunci API Gemini tidak valid atau belum memiliki izin. Periksa panel Settings > Secrets.'
            : 'Layanan analisis AI gagal merespons sementara. Silakan ulangi permintaan Anda.';
      res.status(status).json({ error: friendly });
    }
  });

  app.get('/api/ai/auto-insights', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const liveAssets = await getMarketQuotes(false);
    const { triggers, signature } = detectSignificantTriggers(
      liveAssets,
      SEED_CALENDAR_EVENTS,
    );

    const now = Date.now();
    const cached = autoInsightCache.get(signature);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      res.json({ ...cached.data, cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Notifikasi AI otomatis belum aktif karena GEMINI_API_KEY belum dikonfigurasi di Settings > Secrets.',
      });
      return;
    }

    try {
      let pending = !forceRefresh ? autoInsightInFlight.get(signature) : undefined;
      if (!pending) {
        pending = (async (): Promise<AutoInsightsResponse> => {
          const marketSnapshot = buildMarketContextSummary(liveAssets);
          const triggerLines = triggers
            .map((t, i) => `${i + 1}. [${t.kategori}] ${t.detailMetrik}`)
            .join('\n');

          const prompt = [
            'Susun tepat 3 notifikasi insight AI yang sangat ringkas dan langsung bermanfaat bagi investor untuk perubahan pasar signifikan dan event kalender ekonomi berikut:',
            triggerLines,
            `Konteks harga terkini: ${marketSnapshot}`,
            'Setiap notifikasi wajib menjelaskan dengan padat apa artinya bagi pergerakan saham IDX, valuta asing (USD/IDR, USD/JPY), atau komoditas tanpa basa-basi.',
          ].join('\n\n');

          const requestParams = {
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              systemInstruction:
                'Anda adalah editor riset kilat meja pasar modal Indonesia. Tulis insight notifikasi dalam Bahasa Indonesia yang tajam, ringkas (maksimal 1 kalimat per ringkasan), objektif, dan bebas saran beli/jual personal.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  notifikasi: {
                    type: Type.ARRAY,
                    description: 'Daftar tepat 3 notifikasi insight singkat dari trigger yang terdeteksi.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kategori: {
                          type: Type.STRING,
                          description: 'Pilih tepat satu: Pasar Signifikan atau Kalender Ekonomi.',
                        },
                        judul: {
                          type: Type.STRING,
                          description: 'Judul singkat 6-10 kata.',
                        },
                        ringkasan: {
                          type: Type.STRING,
                          description: 'Insight 1 kalimat padat mengenai dampak ke aset terkait.',
                        },
                        arahDampak: {
                          type: Type.STRING,
                          description: 'Pilih tepat satu: Naik, Turun, Stabil, atau Volatil.',
                        },
                        asetFokus: {
                          type: Type.STRING,
                          description: 'Kode aset paling relevan: IHSG, BBCA, BBRI, BMRI, TLKM, ADRO, USD/IDR, USD/JPY, EMAS, BRENT, S&P 500, atau NVDA.',
                        },
                        metrikPemicu: {
                          type: Type.STRING,
                          description: 'Angka perubahan atau rilis data pemicu, mis. +1,85% atau BI-Rate 6,00%.',
                        },
                      },
                      required: ['kategori', 'judul', 'ringkasan', 'arahDampak', 'asetFokus', 'metrikPemicu'],
                    },
                  },
                },
                required: ['notifikasi'],
              },
            },
          };

          let alerts = null;
          let lastErr: unknown = null;
          const insightModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
          for (let attempt = 0; attempt < insightModels.length; attempt++) {
            const model = insightModels[attempt];
            try {
              const response = await ai.models.generateContent({
                ...requestParams,
                model,
                config: {
                  ...requestParams.config,
                  ...(model === 'gemini-4-hydrogen'
                    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                    : { thinkingConfig: undefined }),
                },
              });
              const text = (response.text ?? '').trim();
              alerts = parseAutoInsightJsonResponse(text, triggers, liveAssets);
              break;
            } catch (attemptErr: unknown) {
              lastErr = attemptErr;
              const errMsg = attemptErr instanceof Error ? attemptErr.message : String(attemptErr);
              const isAuthOrConfig = /400|403|404|API_KEY_INVALID|PERMISSION_DENIED|NOT_FOUND/i.test(errMsg);
              if (isAuthOrConfig || attempt === insightModels.length - 1) {
                throw attemptErr;
              }
              await new Promise((r) => setTimeout(r, 400));
            }
          }

          if (!alerts) {
            throw lastErr ?? new Error('Failed to generate auto insights');
          }

          const payload: AutoInsightsResponse = {
            signature,
            alerts,
            triggerCount: triggers.length,
            generatedAt: new Date().toISOString(),
            cached: false,
          };

          if (autoInsightCache.size > 24) {
            const oldest = autoInsightCache.keys().next().value;
            if (oldest) autoInsightCache.delete(oldest);
          }
          autoInsightCache.set(signature, {
            data: payload,
            expiresAt: Date.now() + 10 * 60_000,
          });

          return payload;
        })().finally(() => {
          autoInsightInFlight.delete(signature);
        });

        autoInsightInFlight.set(signature, pending);
      }

      const result = await pending;
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AI Auto Insights Error]', msg);
      const status =
        /429|RESOURCE_EXHAUSTED/i.test(msg)
          ? 429
          : /403|400|API_KEY|PERMISSION_DENIED/i.test(msg)
            ? 403
            : 502;
      const friendly =
        status === 429
          ? 'Kuota notifikasi AI sementara penuh. Coba muat ulang beberapa saat lagi.'
          : status === 403
            ? 'Kunci API Gemini tidak valid atau belum memiliki izin. Periksa panel Settings > Secrets.'
            : 'Gagal memuat ringkasan notifikasi AI otomatis sementara.';
      res.status(status).json({ error: friendly });
    }
  });

  const getBaseUrlForRequest = (req: express.Request): string => {
    const rawProto = (req.headers['x-forwarded-proto'] as string | undefined) || req.protocol;
    const proto = rawProto.split(',')[0].trim() || 'https';
    const rawHost =
      (req.headers['x-forwarded-host'] as string | undefined) || req.get('host') || '';
    const host = rawHost.split(',')[0].trim();
    const reqOrigin = host ? `${proto}://${host}` : null;
    const configuredUrl = process.env.PUBLIC_SITE_URL?.trim() || process.env.APP_URL;
    return resolveRequestBaseUrl(reqOrigin, configuredUrl);
  };

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8').send(buildRobotsTxt(getBaseUrlForRequest(req)));
  });

  app.get('/sitemap.xml', (req, res) => {
    const activeAssets = quotesCache.entry?.data ?? SEED_ASSETS;
    res
      .type('application/xml; charset=utf-8')
      .send(buildSitemapXml(getBaseUrlForRequest(req), activeAssets, SECTOR_PROFILES));
  });

  app.get('/llms.txt', (req, res) => {
    const activeAssets = quotesCache.entry?.data ?? SEED_ASSETS;
    res
      .type('text/plain; charset=utf-8')
      .send(
        buildLlmsTxt(
          getBaseUrlForRequest(req),
          activeAssets,
          SECTOR_PROFILES,
          SEED_CALENDAR_EVENTS,
        ),
      );
  });

  if (!IS_PROD) {
    app.get('/api/export-project-zip', (_req, res) => {
      const zipPath = path.resolve(__dirname, 'ekonanalisis-dreceh.zip');
      if (!fs.existsSync(zipPath)) {
        res.status(404).json({ error: 'Archive ekonanalisis-dreceh.zip not found' });
        return;
      }
      res.download(zipPath, 'ekonanalisis-dreceh.zip');
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      const accept = req.headers.accept ?? '';
      const isStaticAssetExt =
        /\.(?:js|mjs|cjs|ts|tsx|css|scss|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|json|xml|txt)$/i.test(
          req.path,
        );
      const isHtmlPageRequest =
        req.method === 'GET' &&
        !req.path.startsWith('/api/') &&
        !req.path.startsWith('/@') &&
        !req.path.startsWith('/src/') &&
        !req.path.startsWith('/node_modules/') &&
        !isStaticAssetExt &&
        accept.includes('text/html');

      if (!isHtmlPageRequest) {
        next();
        return;
      }

      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        const rawTemplate = fs.readFileSync(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const activeAssets = quotesCache.entry?.data ?? SEED_ASSETS;
        const enrichedHtml = injectRouteHeadMetadata(
          transformed,
          getBaseUrlForRequest(req),
          req.path,
          activeAssets,
          SECTOR_PROFILES,
          SEED_CALENDAR_EVENTS,
        );
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(enrichedHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        const rawHtml = fs.readFileSync(indexFile, 'utf-8');
        const activeAssets = quotesCache.entry?.data ?? SEED_ASSETS;
        const enrichedHtml = injectRouteHeadMetadata(
          rawHtml,
          getBaseUrlForRequest(req),
          req.path,
          activeAssets,
          SECTOR_PROFILES,
          SEED_CALENDAR_EVENTS,
        );
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(enrichedHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EkonAnalisis server listening on http://0.0.0.0:${PORT}`);
    // Pre-warm and auto-refresh 20-source global news articles every 15 minutes
    setTimeout(() => {
      getAggregatedNews(false).catch(() => {});
    }, 3000).unref();
    setInterval(() => {
      getAggregatedNews(true).catch(() => {});
    }, 15 * 60_000).unref();
  });
}

startServer();
