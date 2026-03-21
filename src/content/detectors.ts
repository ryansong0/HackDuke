import { ProductInfo } from '../shared/types';

interface SiteDetector {
  siteName: string;
  match: (url: string) => boolean;
  detect: () => ProductInfo | null;
}

const detectors: SiteDetector[] = [
  {
    siteName: 'Amazon',
    match: (url) => /amazon\.(com|co\.uk|ca|de|fr|co\.jp|in)/.test(url),
    detect: () => {
      const name = document.querySelector('#productTitle')?.textContent?.trim();
      if (!name) return null;

      const priceEl =
        document.querySelector('.a-price .a-offscreen') ||
        document.querySelector('#priceblock_ourprice') ||
        document.querySelector('#priceblock_dealprice') ||
        document.querySelector('.a-price-whole');
      const price = priceEl?.textContent?.trim() || 'N/A';

      const categoryEl = document.querySelector('#wayfinding-breadcrumbs_container');
      const category =
        categoryEl
          ?.textContent?.trim()
          ?.split('\n')
          .filter((s) => s.trim())[0]
          ?.trim() || '';

      const imageEl = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'Amazon' };
    },
  },
  {
    siteName: 'Walmart',
    match: (url) => url.includes('walmart.com'),
    detect: () => {
      const name = document.querySelector(
        '[data-automation-id="product-title"], h1[itemprop="name"]',
      )?.textContent?.trim();
      if (!name) return null;

      const priceEl = document.querySelector(
        '[itemprop="price"], [data-automation-id="product-price"] .f2',
      );
      const price = priceEl?.textContent?.trim() || 'N/A';

      const breadcrumbs = document.querySelector('[data-automation-id="breadcrumb"]');
      const category = breadcrumbs?.textContent?.trim() || '';

      const imageEl = document.querySelector(
        '[data-automation-id="hero-image"] img, .hover-zoom-hero-image img',
      ) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'Walmart' };
    },
  },
  {
    siteName: 'Target',
    match: (url) => url.includes('target.com'),
    detect: () => {
      const name = document.querySelector(
        '[data-test="product-title"], h1',
      )?.textContent?.trim();
      if (!name) return null;

      const priceEl = document.querySelector('[data-test="product-price"]');
      const price = priceEl?.textContent?.trim() || 'N/A';

      const breadcrumbs = document.querySelector('[data-test="breadcrumb"]');
      const category = breadcrumbs?.textContent?.trim() || '';

      const imageEl = document.querySelector(
        '[data-test="product-image"] img, picture img',
      ) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'Target' };
    },
  },
  {
    siteName: 'eBay',
    match: (url) => url.includes('ebay.com'),
    detect: () => {
      const name = document.querySelector(
        '.x-item-title__mainTitle span, h1.it-ttl',
      )?.textContent?.trim();
      if (!name) return null;

      const priceEl = document.querySelector('.x-price-primary span, #prcIsum');
      const price = priceEl?.textContent?.trim() || 'N/A';

      const breadcrumbs = document.querySelector('.breadcrumb');
      const category = breadcrumbs?.textContent?.trim() || '';

      const imageEl = document.querySelector(
        '.ux-image-carousel-item img, #icImg',
      ) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'eBay' };
    },
  },
  {
    siteName: 'Best Buy',
    match: (url) => url.includes('bestbuy.com'),
    detect: () => {
      const name = document.querySelector(
        '.sku-title h1, .heading-5',
      )?.textContent?.trim();
      if (!name) return null;

      const priceEl = document.querySelector(
        '.priceView-customer-price span, .priceView-hero-price span',
      );
      const price = priceEl?.textContent?.trim() || 'N/A';

      const breadcrumbs = document.querySelector('.breadcrumb');
      const category = breadcrumbs?.textContent?.trim() || '';

      const imageEl = document.querySelector(
        '.primary-image, .shop-media-gallery img',
      ) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'Best Buy' };
    },
  },
  {
    siteName: 'Etsy',
    match: (url) => url.includes('etsy.com'),
    detect: () => {
      const name = document.querySelector(
        'h1[data-buy-box-listing-title], h1',
      )?.textContent?.trim();
      if (!name) return null;

      const priceEl = document.querySelector(
        '.wt-text-title-larger, [data-buy-box-region="price"] p',
      );
      const price = priceEl?.textContent?.trim() || 'N/A';

      const breadcrumbs = document.querySelector('[data-breadcrumbs]');
      const category = breadcrumbs?.textContent?.trim() || '';

      const imageEl = document.querySelector(
        '.image-carousel-container img, [data-carousel-image] img',
      ) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      return { name, price, category, imageUrl, url: window.location.href, site: 'Etsy' };
    },
  },
];

function genericDetect(): ProductInfo | null {
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const name = ogTitle || document.title;
  if (!name) return null;

  const priceEl = document.querySelector(
    'meta[property="og:price:amount"], meta[property="product:price:amount"]',
  );
  const priceCurrency = document.querySelector(
    'meta[property="og:price:currency"], meta[property="product:price:currency"]',
  );
  const price = priceEl
    ? `${priceCurrency?.getAttribute('content') || '$'}${priceEl.getAttribute('content')}`
    : 'N/A';

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const hostname = window.location.hostname.replace('www.', '');

  return {
    name,
    price,
    category: '',
    imageUrl: ogImage || '',
    url: window.location.href,
    site: hostname,
  };
}

export function detectProduct(): ProductInfo | null {
  const url = window.location.href;

  for (const detector of detectors) {
    if (detector.match(url)) {
      const product = detector.detect();
      if (product) return product;
    }
  }

  return genericDetect();
}
