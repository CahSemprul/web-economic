import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Minus,
  RefreshCw,
  X,
} from 'lucide-react';
import type { AiImpactDirection, AutoAiAlert } from '../types/market.ts';

interface AiAutoInsightsBarProps {
  alerts: AutoAiAlert[];
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  unreadCount: number;
  onToggleExpand: () => void;
  onMarkAllRead: () => void;
  onDismissAlert: (id: string) => void;
  onOpenFullAnalysis: (prompt: string) => void;
  onSelectAsset: (symbol: string) => void;
  onRetry: () => void;
}

function CompactDirectionBadge({ arah }: { arah: AiImpactDirection }) {
  if (arah === 'Naik') {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        Naik
      </span>
    );
  }
  if (arah === 'Turun') {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold text-red-700 dark:text-red-400">
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        Turun
      </span>
    );
  }
  if (arah === 'Volatil') {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        Volatil
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      Stabil
    </span>
  );
}

export function AiAutoInsightsBar({
  alerts,
  isLoading,
  error,
  isExpanded,
  unreadCount,
  onToggleExpand,
  onMarkAllRead,
  onDismissAlert,
  onOpenFullAnalysis,
  onSelectAsset,
  onRetry,
}: AiAutoInsightsBarProps) {
  if (!isExpanded) return null;

  return (
    <section
      aria-label="Notifikasi insight AI otomatis dari perubahan pasar dan kalender ekonomi"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Bell className="h-4 w-4 text-blue-900 dark:text-blue-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Notifikasi Insight AI Otomatis
          </h2>
          <span aria-hidden="true">·</span>
          <span>
            {isLoading
              ? 'Memindai perubahan pasar & kalender...'
              : `${alerts.length} sinyal pasar & kalender terdeteksi`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && !isLoading && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Tandai dibaca
            </button>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            className="min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Sembunyikan
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
            />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div
          role="alert"
          className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1 font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Muat Ulang</span>
          </button>
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-slate-600 dark:text-slate-400">
          <span>Semua notifikasi insight AI telah ditandai selesai.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Perbarui Sinyal AI</span>
          </button>
        </div>
      )}

      {!isLoading && !error && alerts.length > 0 && (
        <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className="flex flex-col justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                      {alert.kategori}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {alert.metrikPemicu}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <CompactDirectionBadge arah={alert.arahDampak} />
                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.id)}
                      aria-label={`Tutup notifikasi ${alert.asetFokus}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-1.5 text-sm font-bold leading-snug text-slate-950 dark:text-white">
                  {alert.judul}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {alert.ringkasan}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-800">
                {alert.asetSymbol ? (
                  <button
                    type="button"
                    onClick={() => onSelectAsset(alert.asetSymbol!)}
                    className="min-h-[32px] font-mono text-xs font-semibold text-blue-900 hover:underline dark:text-blue-400"
                  >
                    Grafik {alert.asetFokus}
                  </button>
                ) : (
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {alert.asetFokus}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onOpenFullAnalysis(alert.promptLengkap)}
                  className="inline-flex min-h-[32px] items-center gap-0.5 text-xs font-semibold text-slate-800 hover:text-blue-900 hover:underline dark:text-slate-200 dark:hover:text-blue-400"
                >
                  <span>Bedah Dampak</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
