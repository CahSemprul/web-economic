import type {
  AiImpactAnalysis,
  AiImpactAssetItem,
  AiImpactDirection,
  MarketAsset,
} from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from './marketMath.ts';

export function validateImpactInput(headline: string): {
  valid: boolean;
  error?: string;
  cleaned: string;
} {
  const cleaned = headline.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 6) {
    return {
      valid: false,
      error: 'Masukkan minimal 6 karakter berita atau skenario makro untuk dianalisis.',
      cleaned,
    };
  }
  if (cleaned.length > 500) {
    return {
      valid: false,
      error: 'Teks skenario maksimal 500 karakter agar analisis tetap fokus.',
      cleaned: cleaned.slice(0, 500),
    };
  }
  return { valid: true, cleaned };
}

const VALID_DIRECTIONS: AiImpactDirection[] = ['Naik', 'Turun', 'Stabil', 'Volatil'];
const VALID_SENTIMENTS: AiImpactAnalysis['sentimenUtama'][] = [
  'Bullish',
  'Bearish',
  'Netral',
  'Campuran',
];

export function normalizeAiImpactPayload(
  raw: unknown,
  headline: string,
  cached = false,
): AiImpactAnalysis {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawSentiment = String(obj.sentimenUtama ?? 'Campuran');
  const sentimenUtama = VALID_SENTIMENTS.includes(
    rawSentiment as AiImpactAnalysis['sentimenUtama'],
  )
    ? (rawSentiment as AiImpactAnalysis['sentimenUtama'])
    : 'Campuran';

  const rawItems = Array.isArray(obj.dampakAset) ? obj.dampakAset : [];
  const dampakAset: AiImpactAssetItem[] = rawItems
    .slice(0, 8)
    .map((item) => {
      const rec = (item && typeof item === 'object' ? item : {}) as Record<
        string,
        unknown
      >;
      const rawDir = String(rec.arah ?? 'Volatil');
      const arah: AiImpactDirection = VALID_DIRECTIONS.includes(
        rawDir as AiImpactDirection,
      )
        ? (rawDir as AiImpactDirection)
        : 'Volatil';

      return {
        kode: String(rec.kode ?? 'IHSG').trim() || 'IHSG',
        kelas: String(rec.kelas ?? 'Pasar').trim() || 'Pasar',
        arah,
        besaranEstimasi: String(rec.besaranEstimasi ?? 'Moderat').trim() || 'Moderat',
        alasan:
          String(rec.alasan ?? 'Sensitif terhadap perubahan suku bunga dan likuiditas.').trim(),
      };
    });

  const rawRisks = Array.isArray(obj.faktorRisiko) ? obj.faktorRisiko : [];
  const faktorRisiko = rawRisks
    .map((r) => String(r).trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    headline,
    ringkasanDampak:
      String(
        obj.ringkasanDampak ??
          'Analisis transmisi makro terhadap pasar saham, valuta asing, dan komoditas.',
      ).trim(),
    sentimenUtama,
    horizonWaktu: String(obj.horizonWaktu ?? 'Jangka Pendek (1–5 Hari)').trim(),
    dampakAset,
    faktorRisiko,
    generatedAt: new Date().toISOString(),
    cached,
  };
}

export function buildMarketContextSummary(assets: MarketAsset[]): string {
  const keyCodes = ['^JKSE', 'USDIDR=X', 'USDJPY=X', 'GC=F', 'BZ=F', 'BBCA.JK', 'BBRI.JK'];
  const lines = assets
    .filter((a) => keyCodes.includes(a.symbol))
    .map(
      (a) =>
        `${a.shortCode}: ${formatAssetPrice(a.price, a.currency, a.category)} (${formatSignedPercent(a.changePercent)})`,
    );
  return lines.join(' | ');
}

export function resolveAssetSymbolFromCode(
  kode: string,
  assets: MarketAsset[],
): string | null {
  const norm = kode.trim().toUpperCase();
  const found = assets.find(
    (a) =>
      a.shortCode.toUpperCase() === norm ||
      a.symbol.toUpperCase() === norm ||
      a.symbol.replace('.JK', '').replace('=X', '').toUpperCase() === norm,
  );
  return found ? found.symbol : null;
}

export function parseAiJsonResponse(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Empty AI JSON response');
  }

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const direct = JSON.parse(unfenced);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // Fall back to extracting outermost JSON object
  }

  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Malformed AI JSON response');
  }

  const sliced = unfenced.slice(start, end + 1);
  const parsed = JSON.parse(sliced);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI JSON root must be an object');
  }
  return parsed as Record<string, unknown>;
}

