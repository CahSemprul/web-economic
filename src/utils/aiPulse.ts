import type {
  AiImpactDirection,
  AutoAiAlert,
  AutoAlertCategory,
  AutoAlertTrigger,
  EconomicEvent,
  MarketAsset,
} from '../types/market.ts';
import { formatAssetPrice, formatSignedPercent } from './marketMath.ts';
import { parseAiJsonResponse, resolveAssetSymbolFromCode } from './aiImpact.ts';

const VALID_DIRECTIONS: AiImpactDirection[] = ['Naik', 'Turun', 'Stabil', 'Volatil'];

export function detectSignificantTriggers(
  assets: MarketAsset[],
  events: EconomicEvent[],
): {
  triggers: AutoAlertTrigger[];
  signature: string;
} {
  const assetTriggers: AutoAlertTrigger[] = [];

  for (const asset of assets) {
    const absPct = Math.abs(asset.changePercent);
    let threshold = 1.2;
    let weight = 1.4;

    if (asset.category === 'fx') {
      threshold = 0.25;
      weight = 4.0;
    } else if (asset.category === 'index' || asset.category === 'commodity') {
      threshold = 0.6;
      weight = 2.2;
    }

    if (absPct >= threshold) {
      const priceText = formatAssetPrice(asset.price, asset.currency, asset.category);
      const pctText = formatSignedPercent(asset.changePercent);
      const dirWord = asset.changePercent >= 0 ? 'menguat' : 'melemah';

      assetTriggers.push({
        id: `mkt-${asset.shortCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        kategori: 'Pasar Signifikan',
        kode: asset.shortCode,
        symbol: asset.symbol,
        judulPemicu: `${asset.shortCode} ${dirWord} ${pctText} ke ${priceText}`,
        detailMetrik: `${asset.shortCode} (${asset.name}) bergerak ${pctText} ke level ${priceText}`,
        skorSignifikansi: Number((absPct * weight).toFixed(2)),
      });
    }
  }

  assetTriggers.sort((a, b) => b.skorSignifikansi - a.skorSignifikansi);

  const eventTriggers: AutoAlertTrigger[] = [];
  for (const ev of events) {
    if (ev.status === 'released') {
      const surprise =
        ev.actual && ev.consensus && ev.actual !== '—' && ev.actual !== ev.consensus;
      const baseScore = ev.impact === 'high' ? 4.8 : 3.1;
      eventTriggers.push({
        id: `cal-${ev.id}`,
        kategori: 'Kalender Ekonomi',
        kode: ev.country,
        judulPemicu: `${ev.indicator}: Aktual ${ev.actual} (Kons. ${ev.consensus})`,
        detailMetrik: `${ev.country} · ${ev.indicator} · Aktual ${ev.actual} vs Konsensus ${ev.consensus}. ${ev.macroNote}`,
        skorSignifikansi: Number((baseScore + (surprise ? 2.0 : 0)).toFixed(2)),
      });
    } else if (ev.impact === 'high') {
      eventTriggers.push({
        id: `cal-${ev.id}`,
        kategori: 'Kalender Ekonomi',
        kode: ev.country,
        judulPemicu: `Menjelang ${ev.indicator} (${ev.dateLabel} ${ev.timeWIB})`,
        detailMetrik: `${ev.country} · Jadwal ${ev.dateLabel} ${ev.timeWIB} · Konsensus ${ev.consensus} vs Sebelumnya ${ev.previous}. ${ev.macroNote}`,
        skorSignifikansi: 2.6,
      });
    }
  }

  eventTriggers.sort((a, b) => b.skorSignifikansi - a.skorSignifikansi);

  const topMarket = assetTriggers.slice(0, 2);
  const topEvents = eventTriggers.slice(0, topMarket.length >= 2 ? 1 : 2);
  const combined = [...topMarket, ...topEvents];

  // If market moves are unusually flat, fill up to 3 triggers from available assets/events
  if (combined.length < 3) {
    const remainingMarket = assetTriggers
      .slice(2)
      .concat(
        events
          .filter((e) => !combined.some((c) => c.id === `cal-${e.id}`))
          .map((ev) => ({
            id: `cal-${ev.id}`,
            kategori: 'Kalender Ekonomi' as const,
            kode: ev.country,
            judulPemicu: `${ev.indicator} (${ev.dateLabel} ${ev.timeWIB})`,
            detailMetrik: `${ev.country} · Konsensus ${ev.consensus}. ${ev.macroNote}`,
            skorSignifikansi: 1.5,
          })),
      );
    for (const extra of remainingMarket) {
      if (combined.length >= 3) break;
      combined.push(extra);
    }
  }

  const signatureParts = combined.map((t) => {
    const assetMatch = assets.find((a) => a.symbol === t.symbol);
    if (assetMatch) {
      const step = assetMatch.category === 'fx' ? 0.2 : 0.5;
      const bucket = Math.round(assetMatch.changePercent / step) * step;
      return `${t.id}:${bucket.toFixed(1)}`;
    }
    return `${t.id}:${t.judulPemicu.slice(0, 32)}`;
  });

  return {
    triggers: combined,
    signature: signatureParts.join('|') || 'baseline',
  };
}

export function normalizeAutoInsights(
  raw: unknown,
  triggers: AutoAlertTrigger[],
  assets: MarketAsset[],
): AutoAiAlert[] {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawList = Array.isArray(obj.notifikasi) ? obj.notifikasi : [];

  return rawList.slice(0, 3).map((item, idx) => {
    const rec = (item && typeof item === 'object' ? item : {}) as Record<
      string,
      unknown
    >;
    const fallbackTrigger = triggers[idx % Math.max(1, triggers.length)];
    const rawCategory = String(rec.kategori ?? fallbackTrigger?.kategori ?? 'Pasar Signifikan');
    const kategori: AutoAlertCategory = rawCategory.includes('Kalender')
      ? 'Kalender Ekonomi'
      : 'Pasar Signifikan';

    const rawDir = String(rec.arahDampak ?? 'Volatil');
    const arahDampak: AiImpactDirection = VALID_DIRECTIONS.includes(
      rawDir as AiImpactDirection,
    )
      ? (rawDir as AiImpactDirection)
      : 'Volatil';

    const asetFokus =
      String(rec.asetFokus ?? fallbackTrigger?.kode ?? 'IHSG').trim() || 'IHSG';
    const asetSymbol =
      resolveAssetSymbolFromCode(asetFokus, assets) ?? fallbackTrigger?.symbol ?? null;

    const judul =
      String(rec.judul ?? fallbackTrigger?.judulPemicu ?? 'Pembaruan Sinyal Pasar').trim();
    const ringkasan = String(
      rec.ringkasan ?? 'Pergerakan instrumen utama memerlukan pantauan terhadap sentimen likuiditas.',
    ).trim();
    const metrikPemicu = String(
      rec.metrikPemicu ?? fallbackTrigger?.judulPemicu ?? asetFokus,
    ).trim();

    return {
      id: `${fallbackTrigger?.id ?? 'alert'}-${idx}`,
      kategori,
      judul,
      ringkasan,
      arahDampak,
      asetFokus,
      asetSymbol,
      metrikPemicu,
      promptLengkap: `${judul}. ${metrikPemicu}. ${ringkasan}`,
    };
  });
}

export function parseAutoInsightJsonResponse(
  rawText: string,
  triggers: AutoAlertTrigger[],
  assets: MarketAsset[],
): AutoAiAlert[] {
  const parsed = parseAiJsonResponse(rawText);
  const alerts = normalizeAutoInsights(parsed, triggers, assets);
  if (alerts.length === 0) {
    throw new Error('AI returned zero insight notifications');
  }
  return alerts;
}
