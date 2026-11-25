import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectSignificantTriggers,
  normalizeAutoInsights,
  parseAutoInsightJsonResponse,
} from './aiPulse.ts';
import { SEED_ASSETS, SEED_CALENDAR_EVENTS } from '../data/seedMarketData.ts';

test('detectSignificantTriggers surfaces top market movers and high-impact calendar events', () => {
  const modifiedAssets = SEED_ASSETS.map((a) => {
    if (a.symbol === 'NVDA') return { ...a, changePercent: -5.86 };
    if (a.symbol === '^JKSE') return { ...a, changePercent: 1.85 };
    if (a.symbol === 'USDIDR=X') return { ...a, changePercent: -0.65 };
    return { ...a, changePercent: 0.05 };
  });

  const result = detectSignificantTriggers(modifiedAssets, SEED_CALENDAR_EVENTS);
  assert.ok(result.triggers.length >= 2);
  assert.ok(result.triggers.length <= 3);
  assert.ok(result.triggers.some((t) => t.kategori === 'Pasar Signifikan'));
  assert.ok(result.triggers.some((t) => t.kategori === 'Kalender Ekonomi'));
  assert.ok(result.signature.length > 0);
});

test('detectSignificantTriggers prioritizes surprise calendar releases over routine items', () => {
  const flatAssets = SEED_ASSETS.map((a) => ({ ...a, changePercent: 0.01 }));
  const result = detectSignificantTriggers(flatAssets, SEED_CALENDAR_EVENTS);
  const firstCalendar = result.triggers.find((t) => t.kategori === 'Kalender Ekonomi');
  assert.ok(firstCalendar);
  assert.match(firstCalendar.judulPemicu, /BI-Rate|Neraca Perdagangan/i);
});

test('normalizeAutoInsights maps asset symbols and bounds alert length', () => {
  const { triggers } = detectSignificantTriggers(SEED_ASSETS, SEED_CALENDAR_EVENTS);
  const alerts = normalizeAutoInsights(
    {
      notifikasi: [
        {
          kategori: 'Pasar Signifikan',
          judul: 'IHSG menguat +1,85% ditopang saham bank besar',
          ringkasan: 'Arus dana institusi memperkuat prospek perbankan IDX jangka pendek.',
          arahDampak: 'Naik',
          asetFokus: 'BBCA',
          metrikPemicu: 'IHSG +1,85%',
        },
        {
          kategori: 'Kalender Ekonomi',
          judul: 'BI-Rate tetap 6,00% jaga daya tarik Rupiah',
          ringkasan: 'Selisih imbal hasil mendukung stabilitas USD/IDR dan obligasi SBN.',
          arahDampak: 'Stabil',
          asetFokus: 'USD/IDR',
          metrikPemicu: 'BI-Rate 6,00%',
        },
      ],
    },
    triggers,
    SEED_ASSETS,
  );

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].asetSymbol, 'BBCA.JK');
  assert.equal(alerts[0].arahDampak, 'Naik');
  assert.equal(alerts[1].asetSymbol, 'USDIDR=X');
  assert.equal(alerts[1].kategori, 'Kalender Ekonomi');
});

test('parseAutoInsightJsonResponse throws if model returns empty notifications array', () => {
  const { triggers } = detectSignificantTriggers(SEED_ASSETS, SEED_CALENDAR_EVENTS);
  assert.throws(() =>
    parseAutoInsightJsonResponse('{"notifikasi":[]}', triggers, SEED_ASSETS),
  );
});
