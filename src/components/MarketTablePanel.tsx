import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bookmark, Search } from 'lucide-react';
import type { AssetCategory, MarketAsset } from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from '../utils/marketMath.ts';

interface MarketTablePanelProps {
  assets: MarketAsset[];
  selectedSymbol: string;
  watchlist: string[];
  onSelectAsset: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
}

type FilterKey = 'all' | 'stock' | 'fx' | 'commodity' | 'index';

const FILTER_TABS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'stock', label: 'Saham' },
  { key: 'fx', label: 'Valas' },
  { key: 'commodity', label: 'Komoditas' },
  { key: 'index', label: 'Indeks' },
];

function matchesCategory(cat: AssetCategory, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'stock') return cat === 'stock_idx' || cat === 'stock_us';
  return cat === filter;
}

export function MarketTablePanel({
  assets,
  selectedSymbol,
  watchlist,
  onSelectAsset,
  onToggleWatchlist,
}: MarketTablePanelProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (!matchesCategory(a.category, filter)) return false;
      if (!q) return true;
      return (
        a.shortCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q)
      );
    });
  }, [assets, filter, search]);

  return (
    <aside
      aria-label="Daftar instrumen pasar"
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">
          Pantauan Pasar
        </h2>
        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {filtered.length} aset
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="group"
        aria-label="Filter kategori instrumen"
        className="mt-3 grid grid-cols-5 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            aria-pressed={filter === tab.key}
            className={`min-h-[36px] rounded-md px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors sm:px-2 sm:text-xs ${
              filter === tab.key
                ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Field */}
      <div className="relative mt-3">
        <label htmlFor="market-asset-search" className="sr-only">
          Cari kode saham, valuta, atau komoditas
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="market-asset-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode (BBCA, USD/JPY, Emas)..."
          className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-800 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
        />
      </div>

      {/* Asset List */}
      <div className="mt-3 divide-y divide-slate-100 lg:max-h-[415px] lg:overflow-y-auto lg:pr-1 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tidak ada aset yang cocok dengan pencarian Anda.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearch('');
              }}
              className="mt-2 min-h-[40px] px-3 text-xs font-semibold text-blue-800 hover:underline dark:text-blue-400"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          filtered.map((asset) => {
            const isSelected = asset.symbol === selectedSymbol;
            const isUp = asset.changePercent >= 0;
            const isWatched = watchlist.includes(asset.symbol);

            return (
              <div
                key={asset.symbol}
                className={`flex items-center justify-between gap-2 py-2 transition-colors ${
                  isSelected
                    ? 'bg-blue-950/[0.04] dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectAsset(asset.symbol)}
                  className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left focus-visible:outline-2 focus-visible:outline-blue-800"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {asset.shortCode}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {asset.exchange}
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {asset.name}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
                      {formatAssetPrice(asset.price, asset.currency, asset.category)}
                    </div>
                    <div
                      className={`inline-flex items-center justify-end gap-0.5 font-mono text-xs font-medium tabular-nums ${
                        isUp
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                      )}
                      {formatSignedPercent(asset.changePercent)}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWatchlist(asset.symbol)}
                  aria-pressed={isWatched}
                  aria-label={
                    isWatched
                      ? `Hapus ${asset.shortCode} dari pantauan`
                      : `Tambah ${asset.shortCode} ke pantauan`
                  }
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-800 ${
                    isWatched
                      ? 'text-blue-800 dark:text-blue-400'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Bookmark
                    className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
