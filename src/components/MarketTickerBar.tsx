import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { MarketAsset } from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from '../utils/marketMath.ts';

interface MarketTickerBarProps {
  assets: MarketAsset[];
  selectedSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

export function MarketTickerBar({
  assets,
  selectedSymbol,
  onSelectAsset,
}: MarketTickerBarProps) {
  const featured = assets.slice(0, 8);

  return (
    <section
      aria-label="Ringkasan harga pasar terkini"
      className="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar sm:px-6">
        {featured.map((asset) => {
          const isUp = asset.changePercent >= 0;
          const isSelected = asset.symbol === selectedSymbol;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelectAsset(asset.symbol)}
              aria-pressed={isSelected}
              className={`flex min-h-[44px] shrink-0 items-center gap-3 rounded-lg border px-3 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${
                isSelected
                  ? 'border-blue-900 bg-blue-950/5 text-slate-950 dark:border-blue-500 dark:bg-blue-950/40 dark:text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                  {asset.shortCode}
                </span>
                <span className="font-mono text-xs font-medium tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                  {formatAssetPrice(asset.price, asset.currency, asset.category)}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                  isUp
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {isUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {formatSignedPercent(asset.changePercent)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
