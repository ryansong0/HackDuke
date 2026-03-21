import { SearchResult } from './types';

const MOCK_RESULTS: Record<string, SearchResult> = {
  toothbrush: {
    originalItem: 'Electric Toothbrush',
    alternatives: [
      {
        name: 'Bamboo Electric Toothbrush Heads (8-Pack)',
        brand: 'Sustainable Tomorrow',
        description: 'Plant-based bamboo replacement heads compatible with Philips Sonicare. Biodegradable bristles and handles reduce plastic waste by 90%.',
        buyUrl: 'https://www.amazon.com/dp/B09EXAMPLE1',
        price: '$14.99',
        sustainabilityRating: 88,
        priceRating: 1,
        estimatedAnnualSavings: 22,
        impact: {
          carbonFootprint: '70% lower carbon footprint vs plastic heads',
          biodegradability: 'Bamboo handle fully biodegrades in 2-3 years',
          oceanImpact: 'Prevents ~8 plastic heads/year from entering landfills',
        },
        properties: ['Fits Philips Sonicare', 'Bamboo & plant-based bristles', 'Compostable packaging'],
      },
      {
        name: 'Recycled Ocean Plastic Toothbrush',
        brand: 'Preserve',
        description: 'Manual toothbrush made from recycled #5 plastics collected from ocean cleanup. Comes with mail-back recycling envelope.',
        buyUrl: 'https://www.target.com/p/preserve-toothbrush',
        price: '$4.99',
        sustainabilityRating: 82,
        priceRating: 1,
        estimatedAnnualSavings: 85,
        impact: {
          carbonFootprint: '50% lower than virgin plastic toothbrushes',
          biodegradability: 'Recyclable through mail-back program',
          oceanImpact: 'Each brush removes 1.5oz of ocean plastic',
        },
        properties: ['Made from recycled ocean plastic', 'Mail-back recycling', 'BPA-free'],
      },
      {
        name: 'Charcoal Bamboo Toothbrush (4-Pack)',
        brand: 'GREENZLA',
        description: 'Fully biodegradable bamboo toothbrush with activated charcoal-infused BPA-free bristles. Natural whitening effect.',
        buyUrl: 'https://www.amazon.com/dp/B09EXAMPLE2',
        price: '$7.99',
        sustainabilityRating: 91,
        priceRating: 1,
        estimatedAnnualSavings: 48,
        impact: {
          carbonFootprint: '85% less carbon than conventional toothbrushes',
          biodegradability: 'Handle composts in 6 months',
          oceanImpact: 'Zero plastic packaging, zero ocean waste',
        },
        properties: ['100% biodegradable handle', 'Charcoal-infused bristles', 'Plastic-free packaging'],
      },
      {
        name: 'Bite Toothpaste Bits + Bamboo Brush Kit',
        brand: 'Bite',
        description: 'Complete zero-waste dental kit with dissolvable toothpaste tablets and a sustainably-sourced bamboo toothbrush.',
        buyUrl: 'https://www.bitetoothpastebits.com/products/kit',
        price: '$35.00',
        sustainabilityRating: 95,
        priceRating: 2,
        estimatedAnnualSavings: 12,
        impact: {
          carbonFootprint: '90% lower footprint than traditional dental products',
          biodegradability: 'All components biodegradable or recyclable',
          oceanImpact: 'Eliminates toothpaste tubes and plastic brushes',
        },
        properties: ['Zero-waste system', 'Fluoride-free option', 'Subscription available'],
      },
    ],
  },

  bottle: {
    originalItem: 'Plastic Water Bottle (24-Pack)',
    alternatives: [
      {
        name: 'Hydro Flask Wide Mouth 32 oz',
        brand: 'Hydro Flask',
        description: 'Double-wall vacuum insulated stainless steel. Keeps drinks cold 24 hours, hot 12 hours. Lasts a lifetime.',
        buyUrl: 'https://www.amazon.com/dp/B09EXAMPLE3',
        price: '$44.95',
        sustainabilityRating: 92,
        priceRating: 2,
        estimatedAnnualSavings: 156,
        impact: {
          carbonFootprint: 'Offsets its carbon cost after 2 weeks of use',
          biodegradability: 'Stainless steel is infinitely recyclable',
          oceanImpact: 'Prevents ~600 plastic bottles/year from waste stream',
        },
        properties: ['Lifetime warranty', 'BPA-free', 'Dishwasher safe'],
      },
      {
        name: 'LifeStraw Go Water Filter Bottle',
        brand: 'LifeStraw',
        description: 'Built-in filter removes 99.99% of bacteria. Replaces 8,000 plastic bottles worth of water filtration.',
        buyUrl: 'https://www.amazon.com/dp/B09EXAMPLE4',
        price: '$39.95',
        sustainabilityRating: 94,
        priceRating: 2,
        estimatedAnnualSavings: 180,
        impact: {
          carbonFootprint: 'Filters tap water, avoiding bottled water transport emissions',
          biodegradability: 'Recyclable materials, replaceable filter',
          oceanImpact: 'Each filter replaces 8,000 single-use bottles',
        },
        properties: ['Built-in water filter', 'BPA-free Tritan', 'Removes 99.99% bacteria'],
      },
      {
        name: 'Klean Kanteen Classic 27 oz',
        brand: 'Klean Kanteen',
        description: 'Made from 90% recycled stainless steel. B-Corp certified. Climate Neutral certified since 2020.',
        buyUrl: 'https://www.kleankanteen.com/products/classic-27oz',
        price: '$26.95',
        sustainabilityRating: 96,
        priceRating: 2,
        estimatedAnnualSavings: 140,
        impact: {
          carbonFootprint: 'Climate Neutral certified, 90% recycled steel',
          biodegradability: '100% recyclable at end of life',
          oceanImpact: 'B-Corp with 1% for the Planet membership',
        },
        properties: ['90% recycled steel', 'Climate Neutral certified', 'B-Corp certified'],
      },
    ],
  },
};

export function getMockResult(productName: string): SearchResult {
  const lower = productName.toLowerCase();

  if (lower.includes('toothbrush') || lower.includes('dental') || lower.includes('oral')) {
    return MOCK_RESULTS.toothbrush;
  }
  if (lower.includes('bottle') || lower.includes('water') || lower.includes('drink')) {
    return MOCK_RESULTS.bottle;
  }

  // Default: return toothbrush data with the original item name replaced
  return {
    originalItem: productName,
    alternatives: MOCK_RESULTS.toothbrush.alternatives,
  };
}
