const LEAF_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2.5 1.5 6.5c0 .6 0 1.2-.1 1.8"/>
  <path d="M11.7 15.7c.6-.6 1.1-1.3 1.5-2"/>
</svg>`;

export function createBadge(onClick: () => void): HTMLElement {
  const badge = document.createElement('div');
  badge.id = 'ecoswap-badge';

  Object.assign(badge.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: 'white',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.2s ease',
    zIndex: '10000',
    margin: '8px 0',
    userSelect: 'none',
    lineHeight: '1',
  });

  badge.innerHTML = `
    ${LEAF_SVG}
    <span>EcoSwap</span>
    <span id="ecoswap-badge-status" style="font-size:11px;opacity:0.8">Analyzing...</span>
  `;

  badge.addEventListener('mouseenter', () => {
    badge.style.transform = 'scale(1.05)';
    badge.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.4)';
  });

  badge.addEventListener('mouseleave', () => {
    badge.style.transform = 'scale(1)';
    badge.style.boxShadow = '0 2px 8px rgba(5, 150, 105, 0.3)';
  });

  badge.addEventListener('click', onClick);
  return badge;
}

export function updateBadgeStatus(badge: HTMLElement, score: number | null, error?: string): void {
  const statusEl = badge.querySelector('#ecoswap-badge-status') as HTMLElement | null;
  if (!statusEl) return;

  if (error) {
    statusEl.textContent = 'Click to set up';
    badge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  } else if (score !== null) {
    statusEl.textContent = `${score}/100 eco-score`;
  }
}

export function injectBadge(badge: HTMLElement): void {
  const existing = document.getElementById('ecoswap-badge');
  if (existing) existing.remove();

  const titleSelectors = [
    '#productTitle',                         // Amazon
    '[data-automation-id="product-title"]',  // Walmart
    'h1[itemprop="name"]',                   // Walmart fallback
    '[data-test="product-title"]',           // Target
    '.x-item-title__mainTitle',              // eBay
    '.sku-title h1',                         // Best Buy
    'h1[data-buy-box-listing-title]',        // Etsy
    'h1',                                    // Generic fallback
  ];

  for (const selector of titleSelectors) {
    const titleEl = document.querySelector(selector);
    if (titleEl) {
      titleEl.parentElement?.insertBefore(badge, titleEl.nextSibling);
      return;
    }
  }

  document.body.prepend(badge);
}
