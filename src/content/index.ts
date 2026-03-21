import { detectProduct } from './detectors';
import { createBadge, updateBadgeStatus, injectBadge } from './badge';
import { EcoSwapSidebar } from './sidebar';
import { SearchResult, Alternative } from '../shared/types';

let sidebar: EcoSwapSidebar | null = null;
let currentResult: SearchResult | null = null;
let badge: HTMLElement | null = null;
let analyzed = false;

console.log('[EcoSwap] Content script loaded on', window.location.hostname);

function sendMessageWithTimeout<T>(
  message: any,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timed out. The extension may need to be reloaded.'));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as T);
        }
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

function cleanErrorMessage(raw: string): string {
  if (raw.includes('Extension context invalidated') || raw.includes('context invalidated')) {
    return 'Extension was updated. Please refresh this page (Cmd+R / F5) to reconnect.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'API rate limit reached. Wait a minute and try again, or use a new API key from a different Google Cloud project.';
  }
  if (raw.includes('API key not valid') || raw.includes('API_KEY_INVALID')) {
    return 'Invalid API key. Click the EcoSwap icon and update your key in Settings.';
  }
  if (raw.includes('timed out')) {
    return 'Request timed out. The API may be slow — try again.';
  }
  if (raw.includes('API key') || raw.includes('Settings')) {
    return raw;
  }
  if (raw.length > 150) {
    return 'Something went wrong with the API. Check your API key in Settings and try again.';
  }
  return raw;
}

function init(): void {
  if (document.getElementById('ecoswap-badge')) return;

  const product = detectProduct();
  if (!product) {
    console.log('[EcoSwap] No product detected on this page');
    return;
  }

  console.log('[EcoSwap] Product detected:', product.name);

  sidebar = new EcoSwapSidebar(handleBuy);

  badge = createBadge(() => {
    if (!sidebar) return;
    sidebar.toggle();
    if (!analyzed) triggerAnalysis();
  });

  injectBadge(badge);

  sendMessageWithTimeout({ type: 'GET_SETTINGS' }, 3000)
    .then((settings: any) => {
      if (settings?.autoAnalyze) triggerAnalysis();
    })
    .catch(() => {
      triggerAnalysis();
    });
}

async function triggerAnalysis(): Promise<void> {
  if (analyzed && currentResult) {
    sidebar?.showResults(currentResult);
    sidebar?.open();
    return;
  }

  const product = detectProduct();
  if (!product || !sidebar) return;

  analyzed = true;
  sidebar.showLoading(product.name);
  sidebar.open();

  console.log('[EcoSwap] Analyzing:', product.name);

  try {
    const response: any = await sendMessageWithTimeout(
      { type: 'ANALYZE_PRODUCT', product },
      20000,
    );

    if (!response) {
      throw new Error('No response from extension.');
    }

    if (response.type === 'ANALYSIS_RESULT' && response.data) {
      currentResult = response.data;
      sidebar?.showResults(response.data);

      const alts = response.data.alternatives;
      const avgScore = alts.length
        ? Math.round(alts.reduce((s: number, a: Alternative) => s + a.sustainabilityRating, 0) / alts.length)
        : null;
      if (badge) updateBadgeStatus(badge, avgScore);
    } else if (response.type === 'ANALYSIS_ERROR') {
      throw new Error(response.error || 'Analysis failed.');
    } else {
      throw new Error('Unexpected response from extension.');
    }
  } catch (err: any) {
    const msg = cleanErrorMessage(err.message || 'Unknown error');
    console.error('[EcoSwap]', msg);
    sidebar?.showError(msg);
    if (badge) updateBadgeStatus(badge, null, msg);
    analyzed = false;
  }
}

function handleBuy(alt: Alternative, originalItem: string): void {
  chrome.runtime.sendMessage({
    type: 'LOG_PURCHASE',
    item: originalItem,
    alternative: alt,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRIGGER_ANALYSIS') {
    if (!sidebar) {
      const product = detectProduct();
      if (!product) {
        sendResponse({ ok: false, error: 'No product detected on this page.' });
        return;
      }
      sidebar = new EcoSwapSidebar(handleBuy);
      if (!badge) {
        badge = createBadge(() => sidebar?.toggle());
        injectBadge(badge);
      }
    }
    analyzed = false;
    triggerAnalysis();
    sendResponse({ ok: true });
  }
});

function tryInit(retries = 3): void {
  if (detectProduct()) {
    init();
  } else if (retries > 0) {
    setTimeout(() => tryInit(retries - 1), 1500);
  }
}

if (document.readyState === 'complete') {
  setTimeout(() => tryInit(), 500);
} else {
  window.addEventListener('load', () => setTimeout(() => tryInit(), 500));
}

let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    analyzed = false;
    currentResult = null;
    badge?.remove();
    badge = null;
    sidebar?.destroy();
    sidebar = null;
    setTimeout(() => tryInit(), 1000);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
