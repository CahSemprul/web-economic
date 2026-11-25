import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_NEWS_SOURCES,
  buildFallbackIndonesianArticle,
  extractDirectArticleUrl,
  parseEditorialArticlesJson,
  parseRssItems,
  selectBalancedFeedItems,
} from './newsAggregator.ts';

test('GLOBAL_NEWS_SOURCES includes all 20 requested authoritative domains', () => {
  assert.equal(GLOBAL_NEWS_SOURCES.length, 20);
  const domains = GLOBAL_NEWS_SOURCES.map((s) => s.domain);
  for (const required of [
    'bloomberg.com',
    'wsj.com',
    'ft.com',
    'reuters.com',
    'economist.com',
    'cnbc.com',
    'marketwatch.com',
    'finance.yahoo.com',
    'investing.com',
    'tradingview.com',
    'economictimes.indiatimes.com',
    'federalreserve.gov',
    'imf.org',
    'oecd.org',
    'businessinsider.com',
    'seekingalpha.com',
    'morningstar.com',
    'forbes.com',
    'fortune.com',
    'tradingeconomics.com',
  ]) {
    assert.ok(domains.includes(required), `Missing ${required}`);
  }
});

test('extractDirectArticleUrl unwraps Bing apiclick redirect links to original publisher URL', () => {
  const bingUrl =
    'http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.reuters.com%2fmarkets%2fus%2ffed-holds-rates-2026-11-24%2f&amp;mkt=en-us';
  assert.equal(
    extractDirectArticleUrl(bingUrl),
    'https://www.reuters.com/markets/us/fed-holds-rates-2026-11-24/',
  );
  assert.equal(
    extractDirectArticleUrl('https://www.bloomberg.com/news/articles/2026-11-24/test'),
    'https://www.bloomberg.com/news/articles/2026-11-24/test',
  );
});

test('parseRssItems enforces domain filter and extracts title, link, and image', () => {
  const reuters = GLOBAL_NEWS_SOURCES.find((s) => s.id === 'reuters')!;
  const xml = `<rss><channel>
    <item>
      <title><![CDATA[Federal Reserve&#x2019;s cautious path on rate cuts amid sticky inflation]]></title>
      <link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fwww.reuters.com%2fmarkets%2ffed-rate-path</link>
      <description><![CDATA[Policymakers noted resilient labor demand in recent minutes.]]></description>
      <pubDate>Tue, 24 Nov 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Unrelated non-Reuters spam link</title>
      <link>https://example.org/other</link>
      <description>Should be skipped by domain guard.</description>
    </item>
  </channel></rss>`;

  const items = parseRssItems(xml, reuters, 5);
  assert.equal(items.length, 1);
  assert.equal(
    items[0].originalTitle,
    'Federal Reserve\u2019s cautious path on rate cuts amid sticky inflation',
  );
  assert.equal(items[0].externalUrl, 'https://www.reuters.com/markets/fed-rate-path');
  assert.equal(items[0].sourceDomain, 'reuters.com');
  assert.equal(items[0].sourceName, 'Reuters');
});

test('selectBalancedFeedItems ensures breadth across multiple sources', () => {
  const now = Date.now();
  const raw = [
    {
      id: 'b1',
      sourceId: 'bloomberg',
      sourceName: 'Bloomberg',
      sourceDomain: 'bloomberg.com',
      originalTitle: 'Bloomberg Story 1',
      summary: 'Summary 1',
      externalUrl: 'https://bloomberg.com/1',
      publishedAt: new Date(now).toISOString(),
      publishedTs: now,
    },
    {
      id: 'b2',
      sourceId: 'bloomberg',
      sourceName: 'Bloomberg',
      sourceDomain: 'bloomberg.com',
      originalTitle: 'Bloomberg Story 2',
      summary: 'Summary 2',
      externalUrl: 'https://bloomberg.com/2',
      publishedAt: new Date(now - 1000).toISOString(),
      publishedTs: now - 1000,
    },
    {
      id: 'w1',
      sourceId: 'wsj',
      sourceName: 'The Wall Street Journal',
      sourceDomain: 'wsj.com',
      originalTitle: 'WSJ Story 1',
      summary: 'Summary W1',
      externalUrl: 'https://wsj.com/1',
      publishedAt: new Date(now - 5000).toISOString(),
      publishedTs: now - 5000,
    },
  ];
  const picked = selectBalancedFeedItems(raw, 2);
  assert.equal(picked.length, 2);
  assert.deepEqual(
    picked.map((p) => p.sourceId).sort(),
    ['bloomberg', 'wsj'],
  );
});

test('parseEditorialArticlesJson preserves exact externalUrl and source attribution from raw feed items', () => {
  const sourceItem = {
    id: 'live-bloomberg-abc',
    sourceId: 'bloomberg',
    sourceName: 'Bloomberg',
    sourceDomain: 'bloomberg.com',
    originalTitle: 'Treasury Yields Climb as Traders Reassess Fed Cut Odds',
    summary: 'US 10-year yields rose 6 bps.',
    externalUrl: 'https://www.bloomberg.com/news/articles/2026-11-24/treasury-yields',
    publishedAt: new Date().toISOString(),
    publishedTs: Date.now(),
  };

  const json = JSON.stringify({
    artikel: [
      {
        id: 'live-bloomberg-abc',
        judul: 'Imbal Hasil Obligasi AS Menguat Seiring Evaluasi Ulang Suku Bunga The Fed',
        ringkasan: 'Kenaikan yield US Treasury 10 tahun memicu penyesuaian portofolio saham dan valas global.',
        paragraf: [
          'Pelaku pasar global kembali menakar peluang pemangkasan suku bunga Federal Reserve menyusul data ekonomi AS yang tangguh.',
          'Kenaikan imbal hasil obligasi AS berpotensi memberi tekanan jangka pendek pada mata uang negara berkembang termasuk Rupiah.',
        ],
      },
    ],
  });

  const articles = parseEditorialArticlesJson(json, [sourceItem]);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].externalUrl, sourceItem.externalUrl);
  assert.equal(articles[0].source, 'Bloomberg');
  assert.equal(articles[0].sourceDomain, 'bloomberg.com');
  assert.equal(articles[0].content.length, 2);

  const fallback = buildFallbackIndonesianArticle(sourceItem);
  assert.equal(fallback.externalUrl, sourceItem.externalUrl);
});
