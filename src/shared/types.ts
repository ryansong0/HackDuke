export interface Alternative {
  name: string;
  brand: string;
  description: string;
  buyUrl: string;
  price: string;
  sustainabilityRating: number;
  priceRating: number;
  estimatedAnnualSavings: number;
  impact: {
    carbonFootprint: string;
    biodegradability: string;
    oceanImpact: string;
  };
  properties: string[];
}

export interface SearchResult {
  originalItem: string;
  alternatives: Alternative[];
}

export interface ProductInfo {
  name: string;
  price: string;
  category: string;
  imageUrl: string;
  url: string;
  site: string;
}

export interface UserStats {
  swapsCount: number;
  plasticDivertedKg: number;
  moneySaved: number;
  history: SwapEntry[];
}

export interface SwapEntry {
  item: string;
  alternative: string;
  brand: string;
  date: string;
  savings: number;
  url: string;
}

export interface ExtensionSettings {
  apiKey: string;
  autoAnalyze: boolean;
  demoMode: boolean;
  minSustainability: number;
  maxPrice: number;
}
