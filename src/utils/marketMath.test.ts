import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeoMetadata,
  calculatePriceStats,
  calculateSMA,
  filterCalendarEvents,
  filterNewsArticles,
  formatAssetPrice,
  formatSignedPercent,
  generateDeterministicSeries,
} from './marketMath.ts';
import type { ChartPoint, EconomicEvent, MarketAsset, NewsArticle } from '../types/market.ts';

test('calculateSMA computes 20-period rolling average and preserves array length', () => {
  const sample: ChartPoint[] = Array.from({ length: 25 }, (_, i) => ({
    timestamp: 1700000000000 + i * 60000,
    label: `T${i}`,
    close: 100 + i,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    volume: 1000,
  }));

  const result = calculateSMA(sample, 20);
  assert.equal(result.length, 25);
  assert.equal(result[18].sma20, null);
  // First 20 values: 100..119 -> average = 109.5
  assert.equal(result[19].sma20, 109.5);
  // Last 20 values: 105..124 -> average = 114.5
  assert.equal(result[24].sma20, 114.5);
});

test('calculatePriceStats returns accurate high, low, and percent delta', () => {
  const points: ChartPoint[] = [
    { timestamp: 1, label: '09:00', open: 100, high: 102, low: 98, close: 100, volume: 10 },
    { timestamp: 2, label: '10:00', open: 100, high: 112, low: 99, close: 108, volume: 20 },
    { timestamp: 3, label: '11:00', open: 108, high: 110, low: 95, close: 105, volume: 15 },
  ];
  const stats = calculatePriceStats(points);
  assert.equal(stats.first, 100);
  assert.equal(stats.latest, 105);
  assert.equal(stats.high, 112);
  assert.equal(stats.low, 95);
  assert.equal(stats.change, 5);
  assert.equal(stats.changePercent, 5);
});

test('formatAssetPrice formats IDR, JPY, EUR/USD, and index points correctly', () => {
  assert.equal(formatAssetPrice(15890, 'IDR', 'fx'), 'Rp 15.890');
  assert.equal(formatAssetPrice(154.35, 'JPY', 'fx'), '¥154.35');
  assert.equal(formatAssetPrice(1.0584, 'USD', 'fx'), '1.0584');
  assert.equal(formatAssetPrice(2642.5, 'USD', 'commodity'), '$2,642.50');
  assert.equal(formatSignedPercent(1.25), '+1,25%');
  assert.equal(formatSignedPercent(-0.42), '-0,42%');
});

test('filterCalendarEvents narrows by impact, country, and status', () => {
  const events: EconomicEvent[] = [
    {
      id: '1',
      dateISO: '2026-11-25',
      dateLabel: '25 Nov',
      timeWIB: '20:30 WIB',
      country: 'US',
      currency: 'USD',
      indicator: 'US CPI YoY',
      impact: 'high',
      status: 'upcoming',
      actual: '—',
      consensus: '2,6%',
      previous: '2,4%',
      macroNote: 'Test note',
    },
    {
      id: '2',
      dateISO: '2026-11-24',
      dateLabel: '24 Nov',
      timeWIB: '14:30 WIB',
      country: 'ID',
      currency: 'IDR',
      indicator: 'BI-Rate RDG',
      impact: 'high',
      status: 'released',
      actual: '6,00%',
      consensus: '6,00%',
      previous: '6,00%',
      macroNote: 'Test note',
    },
  ];

  assert.equal(filterCalendarEvents(events, { impact: 'high', country: 'US', status: 'all' }).length, 1);
  assert.equal(filterCalendarEvents(events, { impact: 'all', country: 'ID', status: 'released' }).length, 1);
  assert.equal(filterCalendarEvents(events, { impact: 'medium', country: 'all', status: 'all' }).length, 0);
});

test('filterNewsArticles matches sector tags and search queries', () => {
  const articles: NewsArticle[] = [
    {
      id: 'a1',
      title: 'Bank Indonesia Tahan BI-Rate di 6,00% Jaga Stabilitas Rupiah',
      summary: 'Keputusan RDG mendukung perbankan nasional.',
      content: ['Paragraf 1'],
      source: 'Kontan',
      publishedAt: '2026-11-24T10:00:00Z',
      timeAgo: '15 mnt lalu',
      sectorTag: 'Perbankan',
      sectorSlug: 'perbankan',
      assetSymbols: ['BBCA.JK', 'USDIDR=X'],
    },
    {
      id: 'a2',
      title: 'Harga Emas Spot Rebound Seiring Pelemahan Dolar AS',
      summary: 'Investor menanti data inflasi PCE.',
      content: ['Paragraf 1'],
      source: 'Reuters',
      publishedAt: '2026-11-24T09:00:00Z',
      timeAgo: '1 jam lalu',
      sectorTag: 'Komoditas',
      sectorSlug: 'komoditas',
      assetSymbols: ['GC=F'],
    },
  ];

  assert.equal(filterNewsArticles(articles, 'perbankan', '').length, 1);
  assert.equal(filterNewsArticles(articles, 'all', 'emas').length, 1);
  assert.equal(filterNewsArticles(articles, 'all', 'BBCA.JK').length, 1);
  assert.equal(filterNewsArticles(articles, 'komoditas', 'rupiah').length, 0);
});

test('buildSeoMetadata constructs dynamic asset titles and canonical paths', () => {
  const sampleAsset: MarketAsset = {
    symbol: 'BBCA.JK',
    shortCode: 'BBCA',
    name: 'Bank Central Asia Tbk',
    category: 'stock_idx',
    sectorSlug: 'perbankan',
    currency: 'IDR',
    exchange: 'IDX',
    price: 10125,
    change: 150,
    changePercent: 1.5,
    prevClose: 9975,
    dayHigh: 10200,
    dayLow: 9950,
    volume: 65000000,
    marketCapLabel: 'Rp 1.248 T',
    summary: 'Bank swasta terbesar di Indonesia.',
    thesis: 'Pertumbuhan kredit korporasi dan CASA solid.',
    updatedAt: '2026-11-24T10:00:00Z',
    isLive: true,
    source: 'Yahoo Finance',
  };

  const seo = buildSeoMetadata('asset', sampleAsset, null);
  assert.match(seo.title, /BBCA/);
  assert.match(seo.title, /Rp 10\.125/);
  assert.equal(seo.canonicalPath, '/aset/BBCA.JK');
  assert.equal(seo.schemaType, 'FinancialProduct');

  const chartSeo = buildSeoMetadata('chart', null, null);
  assert.equal(chartSeo.canonicalPath, '/grafik');
  assert.equal(chartSeo.schemaType, 'CollectionPage');
  assert.match(chartSeo.title, /Grafik/);
});

test('generateDeterministicSeries anchors final price and includes SMA20', () => {
  const series = generateDeterministicSeries(10125, '1mo', 'BBCA.JK-1mo');
  assert.equal(series.length, 30);
  assert.equal(series[series.length - 1].close, 10125);
  assert.ok(series[series.length - 1].sma20 !== null);
});
