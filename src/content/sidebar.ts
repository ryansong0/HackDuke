import { SearchResult, Alternative } from '../shared/types';

const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #2c2c2c;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: #fdfcf9;
    box-shadow: -4px 0 24px rgba(0,0,0,0.1);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .header {
    padding: 16px 20px;
    background: #059669;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 16px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn {
    background: rgba(255,255,255,0.15);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.25); }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }

  .original-product {
    padding: 12px 16px;
    background: white;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.05);
    margin-bottom: 16px;
  }

  .label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #9ca3af;
    margin: 0 0 4px;
  }

  .product-name {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
    line-height: 1.4;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 20px;
    text-align: center;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(5,150,105,0.15);
    border-top-color: #059669;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-text {
    font-size: 13px;
    color: #059669;
    font-weight: 500;
  }

  .loading-sub {
    font-size: 11px;
    color: #6b7280;
    margin-top: 4px;
  }

  .error-box {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    color: #991b1b;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .card {
    background: white;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid rgba(0,0,0,0.05);
    margin-bottom: 12px;
    transition: box-shadow 0.2s;
  }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .brand-tag {
    display: inline-block;
    padding: 3px 8px;
    background: #ecfdf5;
    color: #059669;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: 999px;
    margin-bottom: 4px;
  }

  .alt-name {
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 17px;
    color: #065f46;
    margin: 0 0 2px;
    line-height: 1.3;
  }

  .alt-price {
    font-size: 14px;
    font-weight: 700;
    color: #059669;
  }

  .price-tier {
    font-size: 9px;
    font-weight: 700;
    color: #059669;
    background: #ecfdf5;
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid #d1fae5;
    white-space: nowrap;
  }

  .card-desc {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 14px;
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 14px;
  }

  .stat-box {
    padding: 10px 12px;
    border-radius: 12px;
    background: #f5f5f0;
  }

  .stat-box.green { background: #ecfdf5; }

  .stat-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    margin: 0 0 2px;
  }

  .stat-value {
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 18px;
    color: #065f46;
    margin: 0;
  }

  .prop-list {
    list-style: none;
    padding: 0;
    margin: 0 0 14px;
  }

  .prop-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #6b7280;
    padding: 3px 0;
  }

  .prop-check {
    color: #059669;
    flex-shrink: 0;
  }

  .buy-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    transition: background 0.2s;
  }
  .buy-btn:hover { background: #047857; }

  .impact-section {
    margin-top: 10px;
    padding: 10px 12px;
    background: #f0fdf4;
    border-radius: 10px;
    border: 1px solid #dcfce7;
  }

  .impact-row {
    display: flex;
    gap: 6px;
    font-size: 10px;
    color: #374151;
    padding: 2px 0;
  }

  .impact-icon { flex-shrink: 0; }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
    font-style: italic;
    font-size: 13px;
  }
`;

const LEAF_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2.5 1.5 6.5c0 .6 0 1.2-.1 1.8"/>
  <path d="M11.7 15.7c.6-.6 1.1-1.3 1.5-2"/>
</svg>`;

const CHECK_SVG = `<svg class="prop-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`;

function getPriceRange(rating: number): string {
  switch (rating) {
    case 1: return '$0–$49';
    case 2: return '$50–$99';
    case 3: return '$100–$149';
    case 4: return '$150–$249';
    case 5: return '$250+';
    default: return '';
  }
}

export class EcoSwapSidebar {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private sidebar: HTMLElement;
  private contentEl: HTMLElement;
  private onBuy: (alt: Alternative, originalItem: string) => void;

  constructor(onBuy: (alt: Alternative, originalItem: string) => void) {
    this.onBuy = onBuy;

    this.host = document.createElement('div');
    this.host.id = 'ecoswap-sidebar-host';
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    this.shadow.appendChild(style);

    this.sidebar = document.createElement('div');
    this.sidebar.className = 'sidebar';
    this.sidebar.innerHTML = `
      <div class="header">
        <div class="logo">
          <div class="logo-icon">${LEAF_SVG}</div>
          <span>EcoSwap</span>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="content"></div>
    `;
    this.shadow.appendChild(this.sidebar);

    this.contentEl = this.sidebar.querySelector('.content')!;
    this.sidebar.querySelector('.close-btn')!.addEventListener('click', () => this.close());
  }

  open(): void {
    requestAnimationFrame(() => {
      this.sidebar.classList.add('open');
    });
  }

  close(): void {
    this.sidebar.classList.remove('open');
  }

  toggle(): void {
    if (this.sidebar.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  showLoading(productName: string): void {
    this.contentEl.innerHTML = `
      <div class="original-product">
        <p class="label">Eco alternatives for</p>
        <p class="product-name">${escapeHtml(productName)}</p>
      </div>
      <div class="loading">
        <div class="spinner"></div>
        <p class="loading-text">Finding eco-friendly alternatives...</p>
        <p class="loading-sub">This usually takes 5–10 seconds</p>
      </div>
    `;
  }

  showError(message: string): void {
    const existing = this.contentEl.querySelector('.loading');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'error-box';
    errorEl.textContent = message;

    const firstChild = this.contentEl.querySelector('.original-product');
    if (firstChild) {
      firstChild.after(errorEl);
    } else {
      this.contentEl.prepend(errorEl);
    }
  }

  showResults(result: SearchResult): void {
    this.contentEl.innerHTML = `
      <div class="original-product">
        <p class="label">Eco alternatives for</p>
        <p class="product-name">${escapeHtml(result.originalItem)}</p>
      </div>
    `;

    if (!result.alternatives.length) {
      this.contentEl.innerHTML += `<div class="empty-state">No eco-friendly alternatives found for this product.</div>`;
      return;
    }

    const cardsContainer = document.createElement('div');

    for (const alt of result.alternatives) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top">
          <div>
            <span class="brand-tag">${escapeHtml(alt.brand)}</span>
            <h3 class="alt-name">${escapeHtml(alt.name)}</h3>
            <span class="alt-price">${escapeHtml(alt.price)}</span>
          </div>
          <span class="price-tier">${getPriceRange(alt.priceRating)}</span>
        </div>
        <p class="card-desc">${escapeHtml(alt.description)}</p>
        <div class="stats-row">
          <div class="stat-box">
            <p class="stat-label">Sustainability</p>
            <p class="stat-value">${alt.sustainabilityRating}/100</p>
          </div>
          <div class="stat-box green">
            <p class="stat-label">Est. Savings</p>
            <p class="stat-value">$${alt.estimatedAnnualSavings}</p>
          </div>
        </div>
        <ul class="prop-list">
          ${alt.properties
            .slice(0, 3)
            .map((p) => `<li class="prop-item">${CHECK_SVG} ${escapeHtml(p)}</li>`)
            .join('')}
        </ul>
        <div class="impact-section">
          <div class="impact-row"><span class="impact-icon">🌍</span> ${escapeHtml(alt.impact.carbonFootprint)}</div>
          <div class="impact-row"><span class="impact-icon">♻️</span> ${escapeHtml(alt.impact.biodegradability)}</div>
          <div class="impact-row"><span class="impact-icon">🌊</span> ${escapeHtml(alt.impact.oceanImpact)}</div>
        </div>
      `;

      const buyBtn = document.createElement('a');
      buyBtn.className = 'buy-btn';
      buyBtn.textContent = 'Buy Now';
      buyBtn.href = alt.buyUrl;
      buyBtn.target = '_blank';
      buyBtn.rel = 'noopener noreferrer';
      buyBtn.style.marginTop = '12px';
      buyBtn.addEventListener('click', () => {
        this.onBuy(alt, result.originalItem);
      });

      card.appendChild(buyBtn);
      cardsContainer.appendChild(card);
    }

    this.contentEl.appendChild(cardsContainer);
  }

  destroy(): void {
    this.host.remove();
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
