import { useState } from 'react';
import { Leaf, X, ExternalLink } from 'lucide-react';
import { getMockResult } from '../shared/mock-data';
import type { SearchResult, Alternative } from '../shared/types';

const SAMPLE_PRODUCTS = [
  { name: 'Oral-B Pro 1000 Electric Toothbrush', price: '$49.99', site: 'amazon.com' },
  { name: 'Aquafina Purified Water (24-Pack)', price: '$5.98', site: 'walmart.com' },
  { name: 'Crest 3D White Toothpaste', price: '$12.99', site: 'target.com' },
];

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

export function Preview() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [activeProduct, setActiveProduct] = useState(SAMPLE_PRODUCTS[0]);

  const handleAnalyze = (product: typeof SAMPLE_PRODUCTS[0]) => {
    setActiveProduct(product);
    setSidebarOpen(true);
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      setResult(getMockResult(product.name));
      setLoading(false);
    }, 800);
  };

  const handleBuy = (alt: Alternative) => {
    alert(`In the real extension, this would open:\n${alt.buyUrl}`);
  };

  return (
    <div className="preview-root">
      {/* Top Banner */}
      <div className="demo-banner">
        <Leaf size={16} />
        <span>EcoSwap Preview — This standalone page demonstrates the extension without Chrome or an API key.</span>
      </div>

      {/* Fake Shopping Page */}
      <div className={`shop-page ${sidebarOpen ? 'shifted' : ''}`}>
        <header className="shop-header">
          <div className="shop-logo">FakeShop.com</div>
          <div className="shop-search">
            <input type="text" placeholder="Search products..." disabled />
          </div>
          <div className="shop-cart">Cart (0)</div>
        </header>

        <main className="shop-main">
          <h2 className="shop-section-title">Featured Products</h2>
          <p className="shop-section-sub">Click "Find Eco Alternative" to see the EcoSwap sidebar in action.</p>

          <div className="products-grid">
            {SAMPLE_PRODUCTS.map((p, i) => (
              <div key={i} className="product-card">
                <div className="product-img-placeholder">
                  <span>{p.name.charAt(0)}</span>
                </div>
                <div className="product-info">
                  <p className="product-site">{p.site}</p>
                  <h3 className="product-name">{p.name}</h3>
                  <p className="product-price">{p.price}</p>
                  <button
                    className="eco-btn"
                    onClick={() => handleAnalyze(p)}
                  >
                    <Leaf size={14} />
                    Find Eco Alternative
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* EcoSwap Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Leaf size={16} color="white" />
            </div>
            <span>EcoSwap</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-content">
          <div className="original-product">
            <p className="label">Eco alternatives for</p>
            <p className="product-title">{activeProduct.name}</p>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p className="loading-text">Finding eco-friendly alternatives...</p>
              <p className="loading-sub">This usually takes 5–10 seconds</p>
            </div>
          )}

          {result && result.alternatives.map((alt, i) => (
            <div key={i} className="alt-card">
              <div className="alt-card-top">
                <div>
                  <span className="brand-tag">{alt.brand}</span>
                  <h3 className="alt-name">{alt.name}</h3>
                  <span className="alt-price">{alt.price}</span>
                </div>
                <span className="price-tier">{getPriceRange(alt.priceRating)}</span>
              </div>

              <p className="alt-desc">{alt.description}</p>

              <div className="alt-stats">
                <div className="stat-box">
                  <p className="stat-label">Sustainability</p>
                  <p className="stat-value">{alt.sustainabilityRating}/100</p>
                </div>
                <div className="stat-box green">
                  <p className="stat-label">Est. Savings</p>
                  <p className="stat-value">${alt.estimatedAnnualSavings}</p>
                </div>
              </div>

              <ul className="prop-list">
                {alt.properties.slice(0, 3).map((prop, j) => (
                  <li key={j} className="prop-item">
                    <span className="prop-check">✓</span> {prop}
                  </li>
                ))}
              </ul>

              <div className="impact-section">
                <div className="impact-row"><span>🌍</span> {alt.impact.carbonFootprint}</div>
                <div className="impact-row"><span>♻️</span> {alt.impact.biodegradability}</div>
                <div className="impact-row"><span>🌊</span> {alt.impact.oceanImpact}</div>
              </div>

              <button className="buy-btn" onClick={() => handleBuy(alt)}>
                <ExternalLink size={14} />
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
