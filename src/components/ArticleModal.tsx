import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Minus,
  Sparkles,
  X,
} from 'lucide-react';
import type { AiImpactAnalysis, NewsArticle } from '../types/market.ts';
import { formatTickerLabel } from '../utils/marketMath.ts';

interface ArticleModalProps {
  article: NewsArticle | null;
  onClose: () => void;
  onSelectAsset: (symbol: string) => void;
}

export function ArticleModal({
  article,
  onClose,
  onSelectAsset,
}: ArticleModalProps) {
  const [aiResult, setAiResult] = useState<AiImpactAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imgErrored, setImgErrored] = useState(false);

  useEffect(() => {
    setAiResult(null);
    setAiLoading(false);
    setAiError(null);
    setImgErrored(false);
  }, [article?.id]);

  if (!article) return null;

  const handleAnalyzeInline = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/analyze-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'news',
          headline: article.title,
          context: article.summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || 'Gagal memproses analisis AI.');
      } else {
        setAiResult(data as AiImpactAnalysis);
      }
    } catch {
      setAiError('Koneksi ke layanan analisis AI terputus.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-7 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {article.source}
            </span>
            <span aria-hidden="true">·</span>
            <span>{article.sectorTag}</span>
            <span aria-hidden="true">·</span>
            <span>{article.timeAgo}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela artikel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <h2
          id="article-modal-title"
          className="mt-4 font-serif text-2xl font-bold leading-snug text-slate-950 dark:text-white"
        >
          {article.title}
        </h2>

        {article.imageUrl && !imgErrored && (
          <img
            src={article.imageUrl}
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={() => setImgErrored(true)}
            className="mt-4 aspect-[16/9] w-full rounded-lg object-cover"
          />
        )}

        <div className="mt-5 max-w-prose space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          {article.content.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        {article.externalUrl && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/70">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Sumber Berita Asli · {article.source}
              {article.sourceDomain ? ` (${article.sourceDomain})` : ''}
            </p>
            {article.originalTitle && article.originalTitle !== article.title && (
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Judul asli: &ldquo;{article.originalTitle}&rdquo;
              </p>
            )}
            <a
              href={article.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 font-semibold text-blue-900 underline-offset-4 hover:underline dark:text-blue-400"
            >
              <span>Baca berita lengkap di situs asli ({article.sourceDomain || article.source})</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}

        {/* Inline AI Impact Section */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Dampak Berita ke Saham, Valas &amp; Komoditas (AI)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Proyeksi arah pergerakan aset berdasarkan sentimen berita ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeInline}
              disabled={aiLoading}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {aiLoading
                  ? 'Menganalisis...'
                  : aiResult
                    ? 'Perbarui Analisis'
                    : 'Analisis Dampak AI'}
              </span>
            </button>
          </div>

          {aiError && !aiLoading && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{aiError}</span>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <strong className="font-semibold">Sentimen {aiResult.sentimenUtama}:</strong>{' '}
                {aiResult.ringkasanDampak}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {aiResult.dampakAset.map((item, idx) => (
                  <div
                    key={`${item.kode}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-950 dark:text-white">
                        {item.kode}{' '}
                        <span className="font-sans font-normal text-slate-500">
                          · {item.kelas}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-mono font-semibold ${
                          item.arah === 'Naik'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : item.arah === 'Turun'
                              ? 'text-red-700 dark:text-red-400'
                              : item.arah === 'Volatil'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.arah === 'Naik' ? (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : item.arah === 'Turun' ? (
                          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : item.arah === 'Volatil' ? (
                          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {item.arah}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{item.alasan}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Instrumen Terkait:
            </span>
            {article.assetSymbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  onSelectAsset(sym);
                  onClose();
                }}
                className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-1 font-mono text-xs font-semibold text-blue-800 hover:bg-slate-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                {formatTickerLabel(sym)}
              </button>
            ))}
          </div>

          {article.externalUrl && (
            <a
              href={article.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-blue-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <span>Baca Sumber Asli</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
