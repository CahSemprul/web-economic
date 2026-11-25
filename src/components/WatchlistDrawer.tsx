import { Trash2, X } from 'lucide-react';
import type { MarketAsset } from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from '../utils/marketMath.ts';

interface WatchlistDrawerProps {
  open: boolean;
  assets: MarketAsset[];
  watchlist: string[];
  onClose: () => void;
  onSelectAsset: (symbol: string) => void;
  onRemoveAsset: (symbol: string) => void;
}

export function WatchlistDrawer({
  open,
  assets,
  watchlist,
  onClose,
  onSelectAsset,
  onRemoveAsset,
}: WatchlistDrawerProps) {
  if (!open) return null;

  const watchedAssets = assets.filter((a) => watchlist.includes(a.symbol));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="watchlist-drawer-title"
              className="font-serif text-xl font-bold text-slate-950 dark:text-white"
            >
              Daftar Pantauan Saya
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tersimpan otomatis di peramban Anda ({watchedAssets.length} aset)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar pantauan"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {watchedAssets.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Belum ada aset dalam pantauan Anda.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Klik tombol &ldquo;Pantau Aset&rdquo; pada grafik atau daftar pasar untuk menyimpannya.
              </p>
            </div>
          ) : (
            watchedAssets.map((asset) => {
              const isUp = asset.changePercent >= 0;
              return (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset.symbol);
                      onClose();
                    }}
                    className="flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        {asset.shortCode}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {asset.name}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        {formatAssetPrice(asset.price, asset.currency, asset.category)}
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          isUp
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {formatSignedPercent(asset.changePercent)}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveAsset(asset.symbol)}
                    aria-label={`Hapus ${asset.shortCode} dari pantauan`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
