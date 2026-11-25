import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarketContextSummary,
  normalizeAiImpactPayload,
  parseAiJsonResponse,
  resolveAssetSymbolFromCode,
  validateImpactInput,
} from './aiImpact.ts';
import { SEED_ASSETS } from '../data/seedMarketData.ts';

test('validateImpactInput rejects empty/short prompts and normalizes whitespace', () => {
  assert.equal(validateImpactInput('   ').valid, false);
  assert.equal(validateImpactInput('BI').valid, false);

  const ok = validateImpactInput('  BI rate   6%, Rupiah menguat, inflasi naik  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned, 'BI rate 6%, Rupiah menguat, inflasi naik');
});

test('normalizeAiImpactPayload enforces safe defaults and limits', () => {
  const normalized = normalizeAiImpactPayload(
    {
      ringkasanDampak: 'Suku bunga stabil menjaga daya tarik SBN dan Rupiah.',
      sentimenUtama: 'Bullish',
      horizonWaktu: '1–5 Hari Bursa',
      dampakAset: [
        {
          kode: 'BBCA',
          kelas: 'Saham IDX',
          arah: 'Naik',
          besaranEstimasi: '+0,5% s.d. +1,5%',
          alasan: 'Likuiditas perbankan terjaga.',
        },
        {
          kode: 'USD/IDR',
          kelas: 'Valas',
          arah: 'Turun',
          besaranEstimasi: 'Rupiah menguat',
          alasan: 'Arus masuk obligasi menopang IDR.',
        },
      ],
      faktorRisiko: ['Lonjakan US Treasury yield'],
    },
    'BI-Rate tetap 6,00%',
    true,
  );

  assert.equal(normalized.sentimenUtama, 'Bullish');
  assert.equal(normalized.dampakAset.length, 2);
  assert.equal(normalized.dampakAset[0].arah, 'Naik');
  assert.equal(normalized.cached, true);
});

test('buildMarketContextSummary formats live snapshot prices cleanly', () => {
  const summary = buildMarketContextSummary(SEED_ASSETS);
  assert.match(summary, /IHSG:/);
  assert.match(summary, /USD\/IDR:/);
  assert.match(summary, /EMAS:/);
});

test('resolveAssetSymbolFromCode maps short codes back to internal symbols', () => {
  assert.equal(resolveAssetSymbolFromCode('BBCA', SEED_ASSETS), 'BBCA.JK');
  assert.equal(resolveAssetSymbolFromCode('IHSG', SEED_ASSETS), '^JKSE');
  assert.equal(resolveAssetSymbolFromCode('USD/IDR', SEED_ASSETS), 'USDIDR=X');
  assert.equal(resolveAssetSymbolFromCode('UNKNOWN', SEED_ASSETS), null);
});

test('parseAiJsonResponse strips markdown fences and isolates outermost JSON object', () => {
  const clean = parseAiJsonResponse('```json\n{"sentimenUtama":"Bullish"}\n```');
  assert.equal(clean.sentimenUtama, 'Bullish');

  const wrapped = parseAiJsonResponse('Berikut hasilnya:\n{"sentimenUtama":"Netral"}\nSelesai.');
  assert.equal(wrapped.sentimenUtama, 'Netral');

  assert.throws(() => parseAiJsonResponse('   '));
});

