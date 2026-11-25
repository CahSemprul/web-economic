import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Sparkles,
  Activity,
} from 'lucide-react';
import type {
  AiImpactAnalysis,
  AiImpactDirection,
  MarketAsset,
} from '../types/market.ts';
import { resolveAssetSymbolFromCode, validateImpactInput } from '../utils/aiImpact.ts';

interface AiImpactPanelProps {
  assets: MarketAsset[];
  analysis: AiImpactAnalysis | null;
  isLoading: boolean;
  error: string | null;
  activePrompt: string;
  onAnalyze: (headline: string, context?: string, mode?: 'news' | 'macro' | 'custom') => void;
  onSelectAsset: (symbol: string) => void;
}

const PRESET_SCENARIOS = [
  {
    label: 'BI-Rate 6,00% & Rupiah menguat',
    prompt: 'Bank Indonesia mempertahankan BI-Rate di 6,00% dan Rupiah menguat terhadap Dolar AS',
  },
  {
    label: 'Inflasi CPI AS naik di atas konsensus',
    prompt: 'Inflasi CPI AS naik melebihi konsensus, imbal hasil US Treasury melonjak',
  },
  {
    label: 'Harga emas naik & USD/JPY melemah',
    prompt: 'Harga emas global menguat tajam sementara USD/JPY melemah menjelang rapat FOMC',
  },
];

function DirectionLabel({ arah }: { arah: AiImpactDirection }) {
  if (arah === 'Naik') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        Naik
      </span>
    );
  }
  if (arah === 'Turun') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-red-700 dark:text-red-400">
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        Turun
      </span>
    );
  }
  if (arah === 'Volatil') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        Volatil
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      Stabil
    </span>
  );
}

export function AiImpactPanel({
  assets,
  analysis,
  isLoading,
  error,
  activePrompt,
  onAnalyze,
  onSelectAsset,
}: AiImpactPanelProps) {
  const [inputText, setInputText] = useState(
    activePrompt || 'BI-Rate tetap 6,00%, Rupiah menguat, inflasi domestik terkendali',
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (activePrompt) {
      setInputText(activePrompt);
    }
  }, [activePrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateImpactInput(inputText);
    if (!check.valid) {
      setValidationError(check.error ?? 'Input tidak valid.');
      return;
    }
    setValidationError(null);
    onAnalyze(check.cleaned, undefined, 'custom');
  };

  const handlePresetClick = (prompt: string) => {
    setInputText(prompt);
    setValidationError(null);
    onAnalyze(prompt, undefined, 'macro');
  };

  return (
    <section
      id="analisis-dampak-ai"
      aria-label="Analisis AI dampak berita dan indikator makro"
      className="scroll-mt-16 rounded-xl border border-slate-200 bg-white p-4 sm:scroll-mt-20 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Proyeksi Transmisi Pasar Berbasis AI
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-slate-950 dark:text-white">
            Analisis Dampak Berita &amp; Makro ke Saham, Valas, dan Komoditas
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Uji skenario seperti suku bunga BI-Rate, penguatan Rupiah, atau lonjakan inflasi terhadap instrumen pasar terkini.
          </p>
        </div>
      </div>

      {/* Quick Scenario Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Skenario cepat:
        </span>
        {PRESET_SCENARIOS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={isLoading}
            onClick={() => handlePresetClick(preset.prompt)}
            className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-800 hover:bg-blue-50/60 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Input Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ai-impact-input" className="sr-only">
          Masukkan judul berita atau kondisi makro ekonomi
        </label>
        <input
          id="ai-impact-input"
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="Contoh: BI rate 6%, Rupiah menguat, inflasi naik..."
          className="min-h-[44px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-800 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-950 px-5 py-2 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-900 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{isLoading ? 'Menganalisis...' : 'Analisis Dampak AI'}</span>
        </button>
      </form>

      {validationError && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">
          {validationError}
        </p>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-14 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && !isLoading && (
        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Topik dianalisis:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {analysis.headline}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Sentimen: <strong>{analysis.sentimenUtama}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{analysis.horizonWaktu}</span>
            </div>
          </div>

          <p className="max-w-4xl text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {analysis.ringkasanDampak}
          </p>

          {/* Asset Impact Matrix */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {analysis.dampakAset.map((item, idx) => {
              const targetSymbol = resolveAssetSymbolFromCode(item.kode, assets);
              return (
                <div
                  key={`${item.kode}-${idx}`}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {targetSymbol ? (
                          <button
                            type="button"
                            onClick={() => onSelectAsset(targetSymbol)}
                            className="font-mono text-sm font-bold text-blue-900 hover:underline dark:text-blue-400"
                          >
                            {item.kode}
                          </button>
                        ) : (
                          <span className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                            {item.kode}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {item.kelas}
                        </span>
                      </div>
                      <DirectionLabel arah={item.arah} />
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {item.besaranEstimasi}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.alasan}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {analysis.faktorRisiko.length > 0 && (
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Faktor Risiko &amp; Hal yang Perlu Dipantau
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6 dark:text-slate-300">
                {analysis.faktorRisiko.map((risk, i) => (
                  <li key={i}>• {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
