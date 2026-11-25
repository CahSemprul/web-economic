import type {
  EconomicEvent,
  MarketAsset,
  SectorProfile,
  SectorSlug,
  SeoMetadata,
} from '../types/market.ts';
import {
  buildSeoMetadata,
  formatAssetPrice,
  formatSignedPercent,
} from './marketMath.ts';

export const DEFAULT_PUBLIC_APP_URL = 'https://dreceh.my.id';

export const DEFAULT_OG_IMAGE_PATH =
  '/src/assets/images/editorial_jakarta_finance_1795566928304.jpg';

export interface SeoFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const SEO_FAQ_ITEMS: SeoFaqItem[] = [
  {
    id: 'faq-apa-itu-ekonanalisis',
    question:
      'Apa itu EkonAnalisis dan data pasar apa saja yang dipantau secara real-time?',
    answer:
      'EkonAnalisis adalah portal riset dan pemantauan ekonomi real-time untuk pasar Indonesia dan global. Platform ini melacak indeks saham (IHSG, S&P 500, Nikkei 225), saham unggulan IDX (BBCA, BBRI, BMRI, TLKM, ADRO) serta NVIDIA, nilai tukar valuta asing (USD/IDR, USD/JPY, EUR/USD), hingga komoditas strategis seperti Emas COMEX dan Minyak Mentah Brent.',
  },
  {
    id: 'faq-dampak-bi-rate-inflasi',
    question:
      'Bagaimana kebijakan BI-Rate 6,00% dan rilis inflasi memengaruhi IHSG, saham perbankan, serta kurs USD/IDR?',
    answer:
      'Suku bunga acuan BI-Rate yang terjaga kompetitif membantu menahan pelebaran selisih imbal hasil terhadap Federal Reserve sehingga menopang stabilitas kurs USD/IDR dan menekan risiko arus keluar modal asing. Bagi saham perbankan berkapitalisasi besar seperti BBCA, BBRI, dan BMRI, stabilitas suku bunga dan inflasi domestik yang terkendali menjaga rasio dana murah (CASA) serta kualitas margin bunga bersih (NIM).',
  },
  {
    id: 'faq-kalender-ekonomi',
    question:
      'Bagaimana cara membaca kalender ekonomi makro (CPI, The Fed, BI-Rate, NFP) di EkonAnalisis?',
    answer:
      'Kalender ekonomi EkonAnalisis menampilkan jadwal rilis indikator berdampak tinggi dalam zona waktu WIB lengkap dengan angka Aktual, Konsensus pasar, dan data Sebelumnya. Jika angka aktual inflasi CPI atau tenaga kerja NFP AS melampaui konsensus secara signifikan, volatilitas jangka pendek umumnya meningkat pada imbal hasil obligasi AS, harga emas, pasangan USD/IDR, serta pembukaan IHSG.',
  },
  {
    id: 'faq-ai-impact-notifikasi',
    question:
      'Bagaimana cara kerja Analisis Dampak AI dan Notifikasi AI otomatis di dasbor utama?',
    answer:
      'Sistem secara otomatis memindai pergerakan harga pasar signifikan dan rilis indikator kalender ekonomi utama, lalu menyajikan ringkasan dampak kilat beserta badge jumlah insight yang belum dibaca. Pengguna juga dapat mengklik tombol Analisis Dampak AI pada berita atau mengetikkan skenario makro khusus untuk memetakan arah pergerakan saham IDX, valas, dan komoditas beserta faktor risikonya.',
  },
  {
    id: 'faq-grafik-sma20',
    question:
      'Apakah tersedia grafik tren harga historis dengan indikator teknikal di EkonAnalisis?',
    answer:
      'Ya, setiap aset dilengkapi grafik tren interaktif berbasis Recharts dengan pilihan rentang waktu 1 hari (1H), 5 hari (5H), 1 bulan (1B), 6 bulan (6B), dan 1 tahun (1T) lengkap dengan garis rata-rata bergerak 20 periode (SMA20), nilai tertinggi-terendah periode, serta ringkasan volume transaksi.',
  },
  {
    id: 'faq-halaman-sektor-aset',
    question:
      'Bagaimana mengakses halaman khusus per aset dan analisis sektor ekonomi?',
    answer:
      'Setiap instrumen memiliki URL kanonik tersendiri di rute /aset/[kode-simbol] (seperti /aset/BBCA.JK atau /aset/USDIDR%3DX) dan setiap sektor industri memiliki halaman khusus di /sektor/[slug-sektor] untuk Perbankan, Komoditas, Valuta Asing, Indeks Global, serta Teknologi & Infrastruktur Data.',
  },
];

function normalizeOrigin(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'MY_APP_URL') return null;
  if (!/^https?:\/\/[^/\s]+/i.test(trimmed)) return null;
  return trimmed;
}

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
}

export function resolveRequestBaseUrl(
  reqOrigin?: string | null,
  envAppUrl?: string | null,
): string {
  const cleanReq = normalizeOrigin(reqOrigin);
  const cleanEnv = normalizeOrigin(envAppUrl);

  if (cleanReq && !isLocalOrigin(cleanReq)) {
    return cleanReq;
  }
  if (cleanEnv && !isLocalOrigin(cleanEnv)) {
    return cleanEnv;
  }
  if (cleanReq) {
    return cleanReq;
  }
  return DEFAULT_PUBLIC_APP_URL;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function serializeJsonLdSafe(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function buildRobotsTxt(baseUrl: string): string {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);
  return [
    '# EkonAnalisis Crawl & AEO Policy',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    `# LLMs Index: ${cleanBase}/llms.txt`,
  ].join('\n');
}

export function buildSitemapXml(
  baseUrl: string,
  assets: MarketAsset[],
  sectors: SectorProfile[],
  lastModISO = new Date().toISOString().slice(0, 10),
): string {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);
  const entries: Array<{
    loc: string;
    changefreq: 'hourly' | 'daily' | 'weekly';
    priority: string;
  }> = [
    { loc: `${cleanBase}/`, changefreq: 'hourly', priority: '1.0' },
    { loc: `${cleanBase}/grafik`, changefreq: 'hourly', priority: '0.9' },
    { loc: `${cleanBase}/kalender`, changefreq: 'daily', priority: '0.9' },
    { loc: `${cleanBase}/berita`, changefreq: 'hourly', priority: '0.85' },
  ];

  for (const sector of sectors) {
    entries.push({
      loc: `${cleanBase}/sektor/${encodeURIComponent(sector.slug)}`,
      changefreq: 'daily',
      priority: '0.85',
    });
  }

  for (const asset of assets) {
    entries.push({
      loc: `${cleanBase}/aset/${encodeURIComponent(asset.symbol)}`,
      changefreq: 'hourly',
      priority: '0.80',
    });
  }

  const urlBlocks = entries
    .map(
      (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${escapeXml(lastModISO)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>`;
}

export function buildLlmsTxt(
  baseUrl: string,
  assets: MarketAsset[],
  sectors: SectorProfile[],
  events: EconomicEvent[],
  faqs: SeoFaqItem[] = SEO_FAQ_ITEMS,
): string {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);

  const sectorLines = sectors
    .map(
      (s) =>
        `- [${s.name}](${cleanBase}/sektor/${encodeURIComponent(s.slug)}): ${s.headline}. ${s.description}`,
    )
    .join('\n');

  const assetLines = assets
    .map((a) => {
      const priceText = formatAssetPrice(a.price, a.currency, a.category);
      const pctText = formatSignedPercent(a.changePercent);
      return `- [${a.shortCode} — ${a.name} (${a.symbol})](${cleanBase}/aset/${encodeURIComponent(a.symbol)}): ${a.exchange} | Harga acuan ${priceText} (${pctText}). ${a.summary}`;
    })
    .join('\n');

  const eventLines = events
    .slice(0, 8)
    .map(
      (ev) =>
        `- ${ev.dateLabel} ${ev.timeWIB} [${ev.country}] ${ev.indicator} (Dampak: ${ev.impact}, Status: ${ev.status}, Aktual: ${ev.actual}, Konsensus: ${ev.consensus}, Sebelumnya: ${ev.previous}): ${ev.macroNote}`,
    )
    .join('\n');

  const faqLines = faqs
    .map((f) => `### ${f.question}\n${f.answer}`)
    .join('\n\n');

  return [
    '# EkonAnalisis — Analisis Ekonomi & Pasar Real-Time',
    '',
    '> Portal analisis ekonomi Indonesia & global berbahasa Indonesia. Memantau pergerakan indeks (IHSG, S&P 500, Nikkei 225), saham IDX & AS, kurs valuta asing (USD/IDR, USD/JPY, EUR/USD), komoditas (Emas, Brent), kalender ekonomi makro (WIB), agregasi berita sektor, dan analisis transmisi dampak berbasis AI.',
    '',
    '## Halaman Utama',
    `- [Dasbor Pasar Real-Time](${cleanBase}/): Ringkasan terminal pasar, notifikasi AI otomatis, grafik interaktif, kalender ekonomi, dan berita terkini.`,
    `- [Grafik Tren Interaktif & SMA20](${cleanBase}/grafik): Visualisasi harga historis dan rata-rata bergerak 20 periode.`,
    `- [Kalender Ekonomi Makro WIB](${cleanBase}/kalender): Jadwal rilis BI-Rate, Inflasi IHK/CPI, Core PCE, PDB AS, dan Non-Farm Payrolls.`,
    `- [Berita Ekonomi & Tagging Sektor](${cleanBase}/berita): Agregasi berita finansial terkurasi beserta fitur analisis dampak AI.`,
    `- [Sitemap XML](${cleanBase}/sitemap.xml): Daftar URL terindeks lengkap.`,
    '',
    '## Sektor Ekonomi',
    sectorLines,
    '',
    '## Instrumen Pasar yang Dipantau',
    assetLines,
    '',
    '## Sorotan Kalender Ekonomi Makro',
    eventLines,
    '',
    '## Pertanyaan Umum (AEO FAQ)',
    faqLines,
    '',
  ].join('\n');
}

export interface StructuredDataGraphParams {
  baseUrl: string;
  meta: SeoMetadata;
  asset?: MarketAsset | null;
  sector?: SectorProfile | null;
  includeFaq?: boolean;
  faqs?: SeoFaqItem[];
}

export function buildStructuredDataGraph({
  baseUrl,
  meta,
  asset = null,
  sector = null,
  includeFaq = false,
  faqs = SEO_FAQ_ITEMS,
}: StructuredDataGraphParams): Record<string, unknown> {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);
  const pageUrl = `${cleanBase}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
  const ogImageUrl = `${cleanBase}${DEFAULT_OG_IMAGE_PATH}`;

  const websiteNode = {
    '@type': 'WebSite',
    '@id': `${cleanBase}/#website`,
    name: 'EkonAnalisis',
    alternateName: 'EkonAnalisis — Analisis Ekonomi & Pasar Real-Time',
    url: `${cleanBase}/`,
    inLanguage: 'id-ID',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${cleanBase}/berita?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationNode = {
    '@type': 'Organization',
    '@id': `${cleanBase}/#organization`,
    name: 'EkonAnalisis',
    url: `${cleanBase}/`,
    logo: {
      '@type': 'ImageObject',
      url: ogImageUrl,
    },
  };

  const breadcrumbItems: Array<Record<string, unknown>> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Beranda Pasar',
      item: `${cleanBase}/`,
    },
  ];

  if (meta.canonicalPath !== '/') {
    if (sector && meta.canonicalPath.startsWith('/sektor/')) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: `Sektor ${sector.name}`,
        item: pageUrl,
      });
    } else if (asset && meta.canonicalPath.startsWith('/aset/')) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: `${asset.shortCode} (${asset.symbol})`,
        item: pageUrl,
      });
    } else {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: meta.schemaName,
        item: pageUrl,
      });
    }
  }

  const breadcrumbNode = {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  const primaryNode: Record<string, unknown> =
    meta.schemaType === 'WebApplication'
      ? {
          '@type': 'WebApplication',
          '@id': `${pageUrl}#webapp`,
          name: meta.schemaName,
          url: pageUrl,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'All',
          inLanguage: 'id-ID',
          description: meta.description,
          image: ogImageUrl,
          publisher: { '@id': `${cleanBase}/#organization` },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'IDR',
          },
        }
      : meta.schemaType === 'FinancialProduct' && asset
        ? {
            '@type': 'FinancialProduct',
            '@id': `${pageUrl}#product`,
            name: meta.schemaName,
            url: pageUrl,
            inLanguage: 'id-ID',
            description: meta.description,
            category: asset.category,
            provider: {
              '@type': 'Organization',
              name: asset.exchange,
            },
            offers: {
              '@type': 'Offer',
              price: Number.isFinite(asset.price) ? String(asset.price) : '0',
              priceCurrency: asset.currency === 'PTS' ? 'IDR' : asset.currency,
            },
          }
        : {
            '@type': 'CollectionPage',
            '@id': `${pageUrl}#webpage`,
            name: meta.schemaName,
            url: pageUrl,
            inLanguage: 'id-ID',
            description: meta.description,
            isPartOf: { '@id': `${cleanBase}/#website` },
            breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
          };

  const graph: Array<Record<string, unknown>> = [
    websiteNode,
    organizationNode,
    primaryNode,
    breadcrumbNode,
  ];

  if (includeFaq && faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${cleanBase}/#faq`,
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function resolveRouteMetadataForPath(
  pathname: string,
  assets: MarketAsset[],
  sectors: SectorProfile[],
): {
  seoView: 'overview' | 'chart' | 'asset' | 'sector' | 'calendar' | 'news';
  meta: SeoMetadata;
  asset: MarketAsset | null;
  sector: SectorProfile | null;
  includeFaq: boolean;
} {
  const clean = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';

  if (clean === '/grafik') {
    return {
      seoView: 'chart',
      meta: buildSeoMetadata('chart', null, null),
      asset: null,
      sector: null,
      includeFaq: false,
    };
  }
  if (clean === '/kalender') {
    return {
      seoView: 'calendar',
      meta: buildSeoMetadata('calendar', null, null),
      asset: null,
      sector: null,
      includeFaq: false,
    };
  }
  if (clean === '/berita') {
    return {
      seoView: 'news',
      meta: buildSeoMetadata('news', null, null),
      asset: null,
      sector: null,
      includeFaq: false,
    };
  }
  if (clean.startsWith('/aset/')) {
    const rawSym = decodeURIComponent(clean.slice('/aset/'.length));
    const asset = assets.find((a) => a.symbol === rawSym) ?? assets[0] ?? null;
    return {
      seoView: 'asset',
      meta: buildSeoMetadata('asset', asset, null),
      asset,
      sector: null,
      includeFaq: false,
    };
  }
  if (clean.startsWith('/sektor/')) {
    const rawSlug = decodeURIComponent(clean.slice('/sektor/'.length)) as SectorSlug;
    const sector = sectors.find((s) => s.slug === rawSlug) ?? sectors[0] ?? null;
    return {
      seoView: 'sector',
      meta: buildSeoMetadata('sector', null, sector),
      asset: null,
      sector,
      includeFaq: false,
    };
  }

  return {
    seoView: 'overview',
    meta: buildSeoMetadata('overview', null, null),
    asset: null,
    sector: null,
    includeFaq: true,
  };
}

function buildNoscriptSummaryHtml(
  baseUrl: string,
  meta: SeoMetadata,
  assets: MarketAsset[],
  sectors: SectorProfile[],
  events: EconomicEvent[],
): string {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);
  const assetLinks = assets
    .slice(0, 8)
    .map(
      (a) =>
        `<li><a href="${escapeHtmlAttr(`${cleanBase}/aset/${encodeURIComponent(a.symbol)}`)}">${escapeHtmlText(a.shortCode)} — ${escapeHtmlText(a.name)} (${escapeHtmlText(formatAssetPrice(a.price, a.currency, a.category))})</a></li>`,
    )
    .join('');

  const sectorLinks = sectors
    .map(
      (s) =>
        `<li><a href="${escapeHtmlAttr(`${cleanBase}/sektor/${encodeURIComponent(s.slug)}`)}">${escapeHtmlText(s.name)}</a></li>`,
    )
    .join('');

  const eventHighlights = events
    .slice(0, 4)
    .map(
      (ev) =>
        `<li><strong>${escapeHtmlText(ev.indicator)}</strong> (${escapeHtmlText(ev.dateLabel)} ${escapeHtmlText(ev.timeWIB)}): Aktual ${escapeHtmlText(ev.actual)}, Konsensus ${escapeHtmlText(ev.consensus)}. ${escapeHtmlText(ev.macroNote)}</li>`,
    )
    .join('');

  const faqHtml = SEO_FAQ_ITEMS.map(
    (f) =>
      `<dt>${escapeHtmlText(f.question)}</dt><dd>${escapeHtmlText(f.answer)}</dd>`,
  ).join('');

  return `<noscript id="ekon-ssr-summary">
      <main>
        <h1>${escapeHtmlText(meta.schemaName)}</h1>
        <p>${escapeHtmlText(meta.description)}</p>
        <nav aria-label="Navigasi Portal EkonAnalisis">
          <ul>
            <li><a href="${escapeHtmlAttr(`${cleanBase}/`)}">Beranda Pasar Real-Time</a></li>
            <li><a href="${escapeHtmlAttr(`${cleanBase}/grafik`)}">Grafik Tren Interaktif</a></li>
            <li><a href="${escapeHtmlAttr(`${cleanBase}/kalender`)}">Kalender Ekonomi Makro</a></li>
            <li><a href="${escapeHtmlAttr(`${cleanBase}/berita`)}">Berita Ekonomi &amp; Sektor</a></li>
          </ul>
        </nav>
        <section>
          <h2>Instrumen Pasar Utama</h2>
          <ul>${assetLinks}</ul>
        </section>
        <section>
          <h2>Analisis Sektor Ekonomi</h2>
          <ul>${sectorLinks}</ul>
        </section>
        <section>
          <h2>Kalender Ekonomi Terkini</h2>
          <ul>${eventHighlights}</ul>
        </section>
        <section>
          <h2>Pertanyaan Umum (FAQ)</h2>
          <dl>${faqHtml}</dl>
        </section>
      </main>
    </noscript>`;
}

export function injectRouteHeadMetadata(
  html: string,
  baseUrl: string,
  pathname: string,
  assets: MarketAsset[],
  sectors: SectorProfile[],
  events: EconomicEvent[] = [],
): string {
  const cleanBase = resolveRequestBaseUrl(baseUrl, null);
  const { meta, asset, sector, includeFaq } = resolveRouteMetadataForPath(
    pathname,
    assets,
    sectors,
  );
  const canonicalUrl = `${cleanBase}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
  const ogImageUrl = `${cleanBase}${DEFAULT_OG_IMAGE_PATH}`;
  const graph = buildStructuredDataGraph({
    baseUrl: cleanBase,
    meta,
    asset,
    sector,
    includeFaq,
  });

  let updated = html;

  updated = updated.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtmlText(meta.title)}</title>`,
  );

  const replaceMetaContent = (
    source: string,
    attr: 'name' | 'property',
    key: string,
    value: string,
  ): string => {
    const escaped = escapeHtmlAttr(value);
    const regex = new RegExp(
      `(<meta\\b[^>]*\\b${attr}=["']${key}["'][^>]*\\bcontent=["'])[^"']*(["'][^>]*>)`,
      'i',
    );
    if (regex.test(source)) {
      return source.replace(regex, `$1${escaped}$2`);
    }
    const reverseRegex = new RegExp(
      `(<meta\\b[^>]*\\bcontent=["'])[^"']*(["'][^>]*\\b${attr}=["']${key}["'][^>]*>)`,
      'i',
    );
    if (reverseRegex.test(source)) {
      return source.replace(reverseRegex, `$1${escaped}$2`);
    }
    return source.replace(
      /<\/head>/i,
      `  <meta ${attr}="${key}" content="${escaped}" />\n  </head>`,
    );
  };

  updated = replaceMetaContent(updated, 'name', 'description', meta.description);
  updated = replaceMetaContent(updated, 'property', 'og:title', meta.title);
  updated = replaceMetaContent(
    updated,
    'property',
    'og:description',
    meta.description,
  );
  updated = replaceMetaContent(updated, 'property', 'og:url', canonicalUrl);
  updated = replaceMetaContent(updated, 'property', 'og:image', ogImageUrl);
  updated = replaceMetaContent(updated, 'name', 'twitter:title', meta.title);
  updated = replaceMetaContent(
    updated,
    'name',
    'twitter:description',
    meta.description,
  );
  updated = replaceMetaContent(updated, 'name', 'twitter:image', ogImageUrl);

  if (/<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(updated)) {
    updated = updated.replace(
      /(<link\b[^>]*rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i,
      `$1${escapeHtmlAttr(canonicalUrl)}$2`,
    );
  } else {
    updated = updated.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />\n  </head>`,
    );
  }

  const jsonLdScript = `<script id="ekon-jsonld" type="application/ld+json">${serializeJsonLdSafe(graph)}</script>`;
  if (/<script\b[^>]*id=["']ekon-jsonld["'][^>]*>[\s\S]*?<\/script>/i.test(updated)) {
    updated = updated.replace(
      /<script\b[^>]*id=["']ekon-jsonld["'][^>]*>[\s\S]*?<\/script>/i,
      jsonLdScript,
    );
  } else {
    updated = updated.replace(/<\/head>/i, `  ${jsonLdScript}\n  </head>`);
  }

  const noscriptSummary = buildNoscriptSummaryHtml(
    cleanBase,
    meta,
    assets,
    sectors,
    events,
  );
  if (/<noscript\b[^>]*id=["']ekon-ssr-summary["'][^>]*>[\s\S]*?<\/noscript>/i.test(updated)) {
    updated = updated.replace(
      /<noscript\b[^>]*id=["']ekon-ssr-summary["'][^>]*>[\s\S]*?<\/noscript>/i,
      noscriptSummary,
    );
  }

  return updated;
}
