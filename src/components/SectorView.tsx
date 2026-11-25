import { ArrowDownRight, ArrowUpRight, ArrowLeft } from 'lucide-react';
import type { MarketAsset, NewsArticle, SectorProfile, SectorSlug } from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from '../utils/marketMath.ts';

interface SectorViewProps {
  sectors: SectorProfile[];
  activeSector: SectorProfile;
  assets: MarketAsset[];
  articles: NewsArticle[];
  onSelectSector: (slug: SectorSlug) => void;
  onOpenAsset: (symbol: string) => void;
  onOpenArticle: (article: NewsArticle) => void;
  onBack: () => void;
}

export function SectorView({
  sectors,
  activeSector,
  assets,
  articles,
  onSelectSector,
  onOpenAsset,
  onOpenArticle,
  onBack,
}: SectorViewProps) {
  const sectorAssets = assets.filter(
    (a) =>
      a.sectorSlug === activeSector.slug ||
      activeSector.constituentSymbols.includes(a.symbol),
  );
  const sectorNews = articles.filter(
    (n) =>
      n.sectorSlug === activeSector.slug ||
      n.assetSymbols.some((sym) => activeSector.constituentSymbols.includes(sym)),
  );
  const avgChange =
    sectorAssets.length > 0
      ? sectorAssets.reduce((acc, cur) => acc + cur.changePercent, 0) / sectorAssets.length
      : 0;
  const isUp = avgChange >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke Pasar</span>
        </button>

        <div
          role="group"
          aria-label="Pilih sektor ekonomi"
          className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 no-scrollbar dark:bg-slate-800"
        >
          {sectors.map((sec) => (
            <button
              key={sec.slug}
              type="button"
              onClick={() => onSelectSector(sec.slug)}
              aria-pressed={sec.slug === activeSector.slug}
              className={`min-h-[38px] shrink-0 rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                sec.slug === activeSector.slug
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Hero Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Halaman Sektor &amp; Struktur SEO
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
              {activeSector.name}
            </h1>
            <p className="mt-2 text-base font-medium text-slate-800 dark:text-slate-200">
              {activeSector.headline}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {activeSector.description}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Rata-rata Pergerakan Sektor
            </div>
            <div
              className={`mt-1 inline-flex items-center gap-1 font-mono text-2xl font-bold tabular-nums ${
                isUp
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {isUp ? (
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-5 w-5" aria-hidden="true" />
              )}
              {formatSignedPercent(avgChange)}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Katalis &amp; Penggerak Utama Sektor
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {activeSector.keyDrivers.map((driver, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
              >
                <span className="font-mono text-xs font-semibold text-slate-400">
                  0{idx + 1}.{' '}
                </span>
                {driver}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Constituent Assets & Sector News */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">
            Instrumen Utama Sektor
          </h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {sectorAssets.map((asset) => {
              const assetUp = asset.changePercent >= 0;
              return (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => onOpenAsset(asset.symbol)}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {asset.shortCode}{' '}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        · {asset.exchange}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{asset.name}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {formatAssetPrice(asset.price, asset.currency, asset.category)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        assetUp
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {formatSignedPercent(asset.changePercent)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">
            Berita &amp; Liputan Sektor
          </h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {sectorNews.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                Belum ada berita baru pada sektor ini.
              </p>
            ) : (
              sectorNews.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onOpenArticle(art)}
                  className="block w-full py-3.5 text-left hover:text-blue-900 dark:hover:text-blue-400"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {art.source} · {art.timeAgo}
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {art.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                    {art.summary}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
