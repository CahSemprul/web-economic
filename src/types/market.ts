export type AssetCategory = 'index' | 'stock_idx' | 'stock_us' | 'fx' | 'commodity';

export type SectorSlug =
  | 'perbankan'
  | 'komoditas'
  | 'valuta-asing'
  | 'indeks-global'
  | 'teknologi-telekomunikasi';

export type ChartRange = '1d' | '5d' | '1mo' | '6mo' | '1y';

export interface MarketAsset {
  symbol: string;
  shortCode: string;
  name: string;
  category: AssetCategory;
  sectorSlug: SectorSlug;
  currency: 'IDR' | 'USD' | 'JPY' | 'PTS';
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCapLabel: string;
  summary: string;
  thesis: string;
  updatedAt: string;
  isLive: boolean;
  source: string;
}

export interface ChartPoint {
  timestamp: number;
  label: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  sma20?: number | null;
}

export interface ChartResponse {
  symbol: string;
  range: ChartRange;
  points: ChartPoint[];
  isLive: boolean;
  source: string;
  updatedAt: string;
}

export type EventImpact = 'high' | 'medium' | 'low';
export type EventCountry = 'ID' | 'US' | 'JP' | 'EU' | 'CN';
export type EventStatus = 'upcoming' | 'released';

export interface EconomicEvent {
  id: string;
  dateISO: string;
  dateLabel: string;
  timeWIB: string;
  country: EventCountry;
  currency: string;
  indicator: string;
  impact: EventImpact;
  status: EventStatus;
  actual: string;
  consensus: string;
  previous: string;
  macroNote: string;
}

export type MarketSentimentLabel = 'Bullish' | 'Bearish' | 'Neutral';

export interface NewsArticle {
  id: string;
  title: string;
  originalTitle?: string;
  summary: string;
  content: string[];
  source: string;
  sourceDomain?: string;
  publishedAt: string;
  timeAgo: string;
  sectorTag: string;
  sectorSlug: SectorSlug | 'makro';
  assetSymbols: string[];
  imageUrl?: string;
  externalUrl?: string;
  sentiment?: MarketSentimentLabel;
  sentimentScore?: number;
}

export interface SectorProfile {
  slug: SectorSlug;
  name: string;
  headline: string;
  description: string;
  keyDrivers: string[];
  constituentSymbols: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  schemaType: 'WebApplication' | 'FinancialProduct' | 'CollectionPage';
  schemaName: string;
}

export type AiImpactDirection = 'Naik' | 'Turun' | 'Stabil' | 'Volatil';

export interface AiImpactAssetItem {
  kode: string;
  kelas: string;
  arah: AiImpactDirection;
  besaranEstimasi: string;
  alasan: string;
}

export interface AiImpactAnalysis {
  headline: string;
  ringkasanDampak: string;
  sentimenUtama: 'Bullish' | 'Bearish' | 'Netral' | 'Campuran';
  horizonWaktu: string;
  dampakAset: AiImpactAssetItem[];
  faktorRisiko: string[];
  generatedAt: string;
  cached?: boolean;
}

export type AutoAlertCategory = 'Pasar Signifikan' | 'Kalender Ekonomi';

export interface AutoAlertTrigger {
  id: string;
  kategori: AutoAlertCategory;
  kode: string;
  symbol?: string;
  judulPemicu: string;
  detailMetrik: string;
  skorSignifikansi: number;
}

export interface AutoAiAlert {
  id: string;
  kategori: AutoAlertCategory;
  judul: string;
  ringkasan: string;
  arahDampak: AiImpactDirection;
  asetFokus: string;
  asetSymbol: string | null;
  metrikPemicu: string;
  promptLengkap: string;
}

export interface AutoInsightsResponse {
  signature: string;
  alerts: AutoAiAlert[];
  triggerCount: number;
  generatedAt: string;
  cached?: boolean;
}

export interface SourceSentimentItem {
  sourceId: string;
  sourceName: string;
  domain: string;
  sentiment: MarketSentimentLabel;
  score: number;
  headline: string;
  articleId?: string;
  externalUrl?: string;
  sectorTag?: string;
  hasLiveArticle: boolean;
}

export interface SectorSentimentBreakdown {
  sectorTag: string;
  bullish: number;
  bearish: number;
  neutral: number;
  dominant: MarketSentimentLabel;
}

export interface MarketSentimentSummary {
  overallLabel: MarketSentimentLabel;
  sentimentScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalAnalyzed: number;
  activeSourceCount: number;
  totalConfiguredSources: number;
  summaryText: string;
  sourceBreakdown: SourceSentimentItem[];
  sectorBreakdown: SectorSentimentBreakdown[];
  analyzedAt: string;
  isAiPowered: boolean;
}
