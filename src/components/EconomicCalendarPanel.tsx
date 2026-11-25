import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info, Sparkles } from 'lucide-react';
import type {
  EconomicEvent,
  EventCountry,
  EventImpact,
  EventStatus,
} from '../types/market.ts';
import { filterCalendarEvents } from '../utils/marketMath.ts';

interface EconomicCalendarPanelProps {
  events: EconomicEvent[];
  onAnalyzeEvent?: (event: EconomicEvent) => void;
}

export function EconomicCalendarPanel({
  events,
  onAnalyzeEvent,
}: EconomicCalendarPanelProps) {
  const [impact, setImpact] = useState<EventImpact | 'all'>('all');
  const [country, setCountry] = useState<EventCountry | 'all'>('all');
  const [status, setStatus] = useState<EventStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id ?? null);

  const filtered = useMemo(
    () => filterCalendarEvents(events, { impact, country, status }),
    [events, impact, country, status],
  );

  return (
    <section
      aria-label="Kalender ekonomi makro terjadwal"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Jadwal Data Makro
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-slate-950 dark:text-white">
            Kalender Ekonomi Global &amp; Domestik
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Rilis inflasi CPI, suku bunga The Fed &amp; BI-Rate, PDB, serta NFP dengan konsensus pasar dalam WIB.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { value: 'all', label: 'Semua Dampak' },
                { value: 'high', label: 'Tinggi' },
                { value: 'medium', label: 'Sedang' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setImpact(opt.value)}
                aria-pressed={impact === opt.value}
                className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  impact === opt.value
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label htmlFor="calendar-country-select" className="sr-only">
            Filter negara kalender ekonomi
          </label>
          <select
            id="calendar-country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value as EventCountry | 'all')}
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Semua Kawasan</option>
            <option value="ID">Indonesia (IDR)</option>
            <option value="US">Amerika Serikat (USD)</option>
            <option value="JP">Jepang (JPY)</option>
          </select>

          <label htmlFor="calendar-status-select" className="sr-only">
            Filter status rilis kalender ekonomi
          </label>
          <select
            id="calendar-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus | 'all')}
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Semua Status</option>
            <option value="upcoming">Mendatang</option>
            <option value="released">Sudah Dirilis</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-2.5 pr-4">Waktu (WIB)</th>
              <th className="py-2.5 pr-4">Kawasan</th>
              <th className="py-2.5 pr-4">Indikator Ekonomi</th>
              <th className="py-2.5 pr-4">Dampak</th>
              <th className="py-2.5 pr-4 text-right">Aktual</th>
              <th className="py-2.5 pr-4 text-right">Konsensus</th>
              <th className="py-2.5 pr-4 text-right">Sebelumnya</th>
              <th className="py-2.5 text-right">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Tidak ada agenda ekonomi pada kombinasi filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((ev) => {
                const isExpanded = expandedId === ev.id;
                return (
                  <Fragment key={ev.id}>
                    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-4 font-mono text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {ev.dateLabel}
                        </span>{' '}
                        · {ev.timeWIB}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {ev.country} · {ev.currency}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-950 dark:text-white">
                        {ev.indicator}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            ev.impact === 'high'
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {ev.impact === 'high' ? (
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {ev.impact === 'high' ? 'Tinggi' : 'Sedang'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap text-slate-950 dark:text-white">
                        {ev.actual}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {ev.consensus}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {ev.previous}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                          aria-expanded={isExpanded}
                          aria-label={`Lihat analisis dampak ${ev.indicator}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          <span>{isExpanded ? 'Tutup' : 'Dampak'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                        <td colSpan={8} className="px-4 py-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <strong className="font-semibold text-slate-950 dark:text-white">
                                Implikasi Pasar:
                              </strong>{' '}
                              {ev.macroNote}
                            </div>
                            {onAnalyzeEvent && (
                              <button
                                type="button"
                                onClick={() => onAnalyzeEvent(ev)}
                                className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-blue-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 whitespace-nowrap hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
                              >
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Analisis Dampak AI</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (9:16 optimized) */}
      <div className="mt-4 divide-y divide-slate-100 md:hidden dark:divide-slate-800">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Tidak ada agenda ekonomi pada kombinasi filter ini.
          </p>
        ) : (
          filtered.map((ev) => {
            const isExpanded = expandedId === ev.id;
            return (
              <div key={ev.id} className="py-3.5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    {ev.dateLabel} · {ev.timeWIB} · {ev.country}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      ev.impact === 'high'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {ev.impact === 'high' ? (
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {ev.impact === 'high' ? 'Dampak Tinggi' : 'Dampak Sedang'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  aria-expanded={isExpanded}
                  className="mt-1.5 flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">
                    {ev.indicator}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                </button>

                <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Aktual: </span>
                    <span className="font-semibold text-slate-950 dark:text-white">{ev.actual}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Kons: </span>
                    <span className="text-slate-700 dark:text-slate-200">{ev.consensus}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Sblm: </span>
                    <span className="text-slate-600 dark:text-slate-300">{ev.previous}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2.5 space-y-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                    <p>{ev.macroNote}</p>
                    {onAnalyzeEvent && (
                      <button
                        type="button"
                        onClick={() => onAnalyzeEvent(ev)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-400"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Analisis Dampak AI</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
