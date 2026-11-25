import test from 'node:test';
import assert from 'node:assert/strict';
import type { NewsArticle } from '../types/market.ts';
import { GLOBAL_NEWS_SOURCES } from './newsAggregator.ts';
import {
  classifyArticleSentimentHeuristic,
  computeMarketSentimentSummary,
  deriveOverallSentimentLabel,
  normalizeSentimentLabel,
} from './marketSentiment.ts';

test('normalizeSentimentLabel normalizes Indonesian and English sentiment variants', () => {
  assert.equal(normalizeSentimentLabel('bullish'), 'Bullish');
  assert.equal(normalizeSentimentLabel('BEARISH'), 'Bearish');
  assert.equal(normalizeSentimentLabel('Netral'), 'Neutral');
  assert.equal(normalizeSentimentLabel('neutral'), 'Neutral');
  assert.equal(normalizeSentimentLabel('unknown', 'Neutral'), 'Neutral');
});

test('classifyArticleSentimentHeuristic distinguishes bullish, bearish, and neutral headlines', () => {
  const bull = classifyArticleSentimentHeuristic(
    'Saham perbankan melesat dan pertumbuhan laba melampaui ekspektasi pasar',
  );
  assert.equal(bull.sentiment, 'Bullish');
  assert.ok(bull.score > 0);

  const bear = classifyArticleSentimentHeuristic(
    'Bursa Asia tertekan aksi jual tajam akibat risiko resesi dan penurunan ekspor',
  );
  assert.equal(bear.sentiment, 'Bearish');
  assert.ok(bear.score < 0);

  const neut = classifyArticleSentimentHeuristic(
    'Bank sentral menjadwalkan konferensi pers rutin pekan depan',
  );
  assert.equal(neut.sentiment, 'Neutral');
  assert.equal(neut.score, 0);
});

test('deriveOverallSentimentLabel maps composite score thresholds cleanly', () => {
  assert.equal(deriveOverallSentimentLabel(18), 'Bullish');
  assert.equal(deriveOverallSentimentLabel(5), 'Neutral');
  assert.equal(deriveOverallSentimentLabel(-15), 'Bearish');
});

test('computeMarketSentimentSummary aggregates across all 20 registered sources and sectors', () => {
  const sampleArticles: NewsArticle[] = [
    {
      id: '1',
      title: 'Saham teknologi rally tajam dorong indeks AS',
      summary: 'Optimisme laba mengangkat sentimen pasar.',
      content: ['Paragraf 1', 'Paragraf 2'],
      source: 'Bloomberg',
      sourceDomain: 'bloomberg.com',
      publishedAt: '2026-11-25T07:00:00Z',
      timeAgo: '5 mnt lalu',
      sectorTag: 'Teknologi',
      sectorSlug: 'teknologi-telekomunikasi',
      assetSymbols: ['NVDA'],
      sentiment: 'Bullish',
      sentimentScore: 65,
    },
    {
      id: '2',
      title: 'IMF setujui fasilitas kredit dan proyeksi pertumbuhan stabil',
      summary: 'Dukungan likuiditas global terjaga.',
      content: ['Paragraf 1', 'Paragraf 2'],
      source: 'IMF & World Bank',
      sourceDomain: 'imf.org',
      publishedAt: '2026-11-25T06:00:00Z',
      timeAgo: '1 jam lalu',
      sectorTag: 'Makro & Pasar',
      sectorSlug: 'indeks-global',
      assetSymbols: ['^GSPC'],
      sentiment: 'Bullish',
      sentimentScore: 40,
    },
    {
      id: '3',
      title: 'Pasar obligasi menanti risalah bank sentral',
      summary: 'Investor bersikap hati-hati menjelang data inflasi.',
      content: ['Paragraf 1', 'Paragraf 2'],
      source: 'Reuters',
      sourceDomain: 'reuters.com',
      publishedAt: '2026-11-25T05:00:00Z',
      timeAgo: '2 jam lalu',
      sectorTag: 'Valuta Asing',
      sectorSlug: 'valuta-asing',
      assetSymbols: ['USDIDR=X'],
      sentiment: 'Neutral',
      sentimentScore: 0,
    },
  ];

  const summary = computeMarketSentimentSummary(
    sampleArticles,
    GLOBAL_NEWS_SOURCES,
    '2026-11-25T07:30:00Z',
  );

  assert.equal(summary.overallLabel, 'Bullish');
  assert.equal(summary.bullishCount, 2);
  assert.equal(summary.neutralCount, 1);
  assert.equal(summary.bearishCount, 0);
  assert.equal(summary.activeSourceCount, 3);
  assert.equal(summary.totalConfiguredSources, 20);
  assert.equal(summary.sourceBreakdown.length, 20);
  assert.equal(summary.isAiPowered, true);

  const bloombergItem = summary.sourceBreakdown.find((s) => s.sourceId === 'bloomberg');
  assert.equal(bloombergItem?.sentiment, 'Bullish');
  assert.equal(bloombergItem?.hasLiveArticle, true);

  const wsjItem = summary.sourceBreakdown.find((s) => s.sourceId === 'wsj');
  assert.equal(wsjItem?.hasLiveArticle, false);
  assert.equal(wsjItem?.sentiment, 'Neutral');
});
