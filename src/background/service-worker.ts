import { analyzeProduct } from '../shared/gemini';
import { getSettings, logPurchase, getStats, saveSettings } from '../shared/storage';
import { ProductInfo, SearchResult } from '../shared/types';

const cache = new Map<string, SearchResult>();

console.log('[EcoSwap] Service worker started');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[EcoSwap] Message received:', message.type);

  switch (message.type) {
    case 'ANALYZE_PRODUCT':
      handleAnalyze(message.product)
        .then((result) => {
          console.log('[EcoSwap] Analysis complete:', result.type);
          sendResponse(result);
        })
        .catch((err) => {
          console.error('[EcoSwap] Analysis error:', err);
          sendResponse({ type: 'ANALYSIS_ERROR', error: err.message });
        });
      return true;

    case 'LOG_PURCHASE':
      logPurchase(message.item, message.alternative).then(sendResponse);
      return true;

    case 'GET_STATS':
      getStats().then(sendResponse);
      return true;

    case 'GET_SETTINGS':
      getSettings().then(sendResponse);
      return true;

    case 'SAVE_SETTINGS':
      saveSettings(message.settings).then(() => sendResponse({ ok: true }));
      return true;

    case 'ANALYZE_CURRENT_TAB':
      handleAnalyzeCurrentTab(sender)
        .then(sendResponse)
        .catch((err) => sendResponse({ type: 'ANALYSIS_ERROR', error: err.message }));
      return true;
  }
});

async function handleAnalyze(
  product: ProductInfo,
): Promise<{ type: string; data?: SearchResult; error?: string }> {
  const cacheKey = product.url;
  if (cache.has(cacheKey)) {
    console.log('[EcoSwap] Cache hit for:', product.name);
    return { type: 'ANALYSIS_RESULT', data: cache.get(cacheKey)! };
  }

  const settings = await getSettings();
  if (!settings.demoMode && !settings.apiKey) {
    return {
      type: 'ANALYSIS_ERROR',
      error: 'API key not set. Click the EcoSwap icon in the toolbar and go to Settings to add your Gemini API key, or enable Demo Mode.',
    };
  }

  const data = await analyzeProduct(
    product,
    settings.apiKey,
    settings.minSustainability,
    settings.maxPrice,
    settings.demoMode,
  );
  cache.set(cacheKey, data);

  return { type: 'ANALYSIS_RESULT', data };
}

async function handleAnalyzeCurrentTab(
  _sender: chrome.runtime.MessageSender,
): Promise<{ type: string; data?: SearchResult; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { type: 'ANALYSIS_ERROR', error: 'No active tab found.' };
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title =
          document.querySelector('#productTitle')?.textContent?.trim() ||
          document.querySelector('h1')?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          document.title;

        const priceEl =
          document.querySelector('.a-price .a-offscreen') ||
          document.querySelector('[itemprop="price"]') ||
          document.querySelector('meta[property="og:price:amount"]');
        const price = priceEl?.textContent?.trim() ||
          priceEl?.getAttribute('content') || 'N/A';

        return { name: title || '', price, url: window.location.href, site: window.location.hostname.replace('www.', '') };
      },
    });

    const productInfo = result?.result as { name: string; price: string; url: string; site: string } | null;
    if (!productInfo?.name) {
      return { type: 'ANALYSIS_ERROR', error: 'Could not detect a product on this page.' };
    }

    return handleAnalyze({
      name: productInfo.name,
      price: productInfo.price,
      category: '',
      imageUrl: '',
      url: productInfo.url,
      site: productInfo.site,
    });
  } catch (err: any) {
    return { type: 'ANALYSIS_ERROR', error: `Cannot access this page: ${err.message}` };
  }
}
