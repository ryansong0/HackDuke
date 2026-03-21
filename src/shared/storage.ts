import { UserStats, ExtensionSettings, SwapEntry, Alternative } from './types';

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  autoAnalyze: true,
  demoMode: false,
  minSustainability: 50,
  maxPrice: 3,
};

const DEFAULT_STATS: UserStats = {
  swapsCount: 0,
  plasticDivertedKg: 0,
  moneySaved: 0,
  history: [],
};

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({ settings: { ...current, ...settings } });
}

export async function getStats(): Promise<UserStats> {
  const data = await chrome.storage.local.get('stats');
  return { ...DEFAULT_STATS, ...data.stats };
}

export async function logPurchase(item: string, alt: Alternative): Promise<UserStats> {
  const stats = await getStats();
  const newEntry: SwapEntry = {
    item,
    alternative: alt.name,
    brand: alt.brand,
    date: new Date().toLocaleDateString(),
    savings: alt.estimatedAnnualSavings,
    url: alt.buyUrl,
  };

  const updated: UserStats = {
    swapsCount: stats.swapsCount + 1,
    plasticDivertedKg: stats.plasticDivertedKg + 0.5,
    moneySaved: stats.moneySaved + alt.estimatedAnnualSavings,
    history: [newEntry, ...stats.history].slice(0, 50),
  };

  await chrome.storage.local.set({ stats: updated });
  return updated;
}
