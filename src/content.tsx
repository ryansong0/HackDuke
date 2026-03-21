import React from 'react';
import ReactDOM from 'react-dom/client';
import { Leaf } from 'lucide-react';

const extractAmazonProductData = () => {
  const title = document.getElementById('productTitle')?.innerText.trim();
  const priceElement = document.querySelector('.a-price .a-offscreen') || document.querySelector('#priceblock_ourprice') || document.querySelector('#priceblock_dealprice');
  const price = priceElement?.textContent?.trim();
  const imageElement = document.getElementById('landingImage') as HTMLImageElement;
  const imageUrl = imageElement?.src;
  
  // Try to get category from breadcrumbs
  const breadcrumbs = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_container ul li a'))
    .map(el => el.textContent?.trim())
    .filter(Boolean);
  const category = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : '';

  return { title, price, imageUrl, category };
};

const injectEcoSwapButton = () => {
  const addToCartButton = document.getElementById('add-to-cart-button') || document.getElementById('buy-now-button');
  if (addToCartButton && !document.getElementById('ecoswap-extension-root')) {
    const productData = extractAmazonProductData();
    
    const container = document.createElement('div');
    container.id = 'ecoswap-extension-root';
    container.className = 'ecoswap-injected-container';
    
    addToCartButton.parentNode?.insertBefore(container, addToCartButton);

    const root = ReactDOM.createRoot(container);
    root.render(
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm mb-4 font-sans">
        <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
          <Leaf size={18} />
          <span>EcoSwap Assistant</span>
        </div>
        <div className="flex gap-3 mb-3">
          {productData.imageUrl && (
            <img src={productData.imageUrl} alt="" className="w-12 h-12 object-contain bg-white rounded-lg border border-emerald-100" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">Current Item</p>
            <p className="text-xs text-emerald-900 font-medium truncate">{productData.title}</p>
            <p className="text-[10px] text-emerald-700/60">{productData.price || 'Price unknown'}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const params = new URLSearchParams({
              search: productData.title || '',
              price: productData.price || '',
              img: productData.imageUrl || '',
              cat: productData.category || ''
            });
            window.open(`https://ais-dev-c3fqvpf2puu2leln3xkwlt-512326542045.us-east1.run.app?${params.toString()}`, '_blank');
          }}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2"
        >
          Find Sustainable Swaps
        </button>
      </div>
    );
  }
};

// Run when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectEcoSwapButton);
} else {
  injectEcoSwapButton();
}

// Also watch for dynamic changes (e.g. when switching product variants)
const observer = new MutationObserver((mutations) => {
  if (!document.getElementById('ecoswap-extension-root')) {
    injectEcoSwapButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
