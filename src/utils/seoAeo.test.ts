import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_ASSETS,
  SEED_CALENDAR_EVENTS,
  SECTOR_PROFILES,
} from '../data/seedMarketData.ts';
import {
  DEFAULT_PUBLIC_APP_URL,
  SEO_FAQ_ITEMS,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredDataGraph,
  injectRouteHeadMetadata,
  resolveRequestBaseUrl,
  resolveRouteMetadataForPath,
} from './seoAeo.ts';

test('resolveRequestBaseUrl prefers non-local request origin and falls back cleanly', () => {
  assert.equal(DEFAULT_PUBLIC_APP_URL, 'https://dreceh.my.id');
  assert.equal(
    resolveRequestBaseUrl('https://dreceh.my.id/', DEFAULT_PUBLIC_APP_URL),
    'https://dreceh.my.id',
  );
  assert.equal(
    resolveRequestBaseUrl('http://localhost:3000', DEFAULT_PUBLIC_APP_URL),
    DEFAULT_PUBLIC_APP_URL,
  );
  assert.equal(
    resolveRequestBaseUrl(null, null),
    DEFAULT_PUBLIC_APP_URL,
  );
});

test('buildRobotsTxt permits Googlebot and AI Search bots and points to sitemap.xml', () => {
  const txt = buildRobotsTxt('https://example.com');
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /User-agent: Googlebot/);
  assert.match(txt, /User-agent: OAI-SearchBot/);
  assert.match(txt, /User-agent: PerplexityBot/);
  assert.match(txt, /Disallow: \/api\//);
  assert.match(txt, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
});

test('buildSitemapXml includes core routes, all sectors, and all encoded asset URLs', () => {
  const xml = buildSitemapXml('https://example.com', SEED_ASSETS, SECTOR_PROFILES, '2026-11-24');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/grafik<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/kalender<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/berita<\/loc>/);
  for (const sector of SECTOR_PROFILES) {
    assert.ok(xml.includes(`https://example.com/sektor/${encodeURIComponent(sector.slug)}`));
  }
  for (const asset of SEED_ASSETS) {
    assert.ok(xml.includes(`https://example.com/aset/${encodeURIComponent(asset.symbol)}`));
  }
  // Ensure bare unescaped ampersands do not appear in XML
  assert.equal(xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g), null);
});

test('buildLlmsTxt renders structured markdown with instruments, sectors, calendar, and FAQ', () => {
  const md = buildLlmsTxt(
    'https://example.com',
    SEED_ASSETS,
    SECTOR_PROFILES,
    SEED_CALENDAR_EVENTS,
    SEO_FAQ_ITEMS,
  );
  assert.match(md, /^# EkonAnalisis/);
  assert.match(md, /## Halaman Utama/);
  assert.match(md, /## Sektor Ekonomi/);
  assert.match(md, /## Instrumen Pasar yang Dipantau/);
  assert.match(md, /## Sorotan Kalender Ekonomi Makro/);
  assert.match(md, /## Pertanyaan Umum \(AEO FAQ\)/);
  assert.ok(md.includes('BBCA.JK'));
  assert.ok(md.includes('BI-Rate'));
});

test('buildStructuredDataGraph emits valid @graph with WebSite, Organization, BreadcrumbList, and FAQPage', () => {
  const { meta } = resolveRouteMetadataForPath('/', SEED_ASSETS, SECTOR_PROFILES);
  const graph = buildStructuredDataGraph({
    baseUrl: 'https://example.com',
    meta,
    includeFaq: true,
  });
  const nodes = graph['@graph'] as Array<Record<string, unknown>>;
  assert.equal(graph['@context'], 'https://schema.org');
  assert.ok(nodes.some((n) => n['@type'] === 'WebSite'));
  assert.ok(nodes.some((n) => n['@type'] === 'Organization'));
  assert.ok(nodes.some((n) => n['@type'] === 'WebApplication'));
  assert.ok(nodes.some((n) => n['@type'] === 'BreadcrumbList'));
  const faqNode = nodes.find((n) => n['@type'] === 'FAQPage');
  assert.ok(faqNode);
  const mainEntity = faqNode.mainEntity as Array<Record<string, unknown>>;
  assert.equal(mainEntity.length, SEO_FAQ_ITEMS.length);
});

test('injectRouteHeadMetadata rewrites title, canonical, og:url, JSON-LD, and noscript summary per route', () => {
  const sampleHtml = `<!doctype html><html lang="id"><head>
    <title>Default</title>
    <meta name="description" content="Default desc" />
    <meta property="og:title" content="Default" />
    <meta property="og:description" content="Default desc" />
    <meta property="og:url" content="https://example.com/" />
    <meta property="og:image" content="https://example.com/old.jpg" />
    <meta name="twitter:title" content="Default" />
    <meta name="twitter:description" content="Default desc" />
    <meta name="twitter:image" content="https://example.com/old.jpg" />
    <link rel="canonical" href="https://example.com/" />
    <script id="ekon-jsonld" type="application/ld+json">{}</script>
  </head><body><div id="root"></div><noscript id="ekon-ssr-summary"></noscript></body></html>`;

  const injected = injectRouteHeadMetadata(
    sampleHtml,
    'https://example.com',
    '/aset/BBCA.JK',
    SEED_ASSETS,
    SECTOR_PROFILES,
    SEED_CALENDAR_EVENTS,
  );

  assert.match(injected, /<title>BBCA .*EkonAnalisis<\/title>/);
  assert.match(injected, /<link rel="canonical" href="https:\/\/example\.com\/aset\/BBCA\.JK" \/>/);
  assert.match(injected, /content="https:\/\/example\.com\/aset\/BBCA\.JK"/);
  assert.match(injected, /FinancialProduct/);
  assert.match(injected, /Bank Central Asia Tbk/);
});
