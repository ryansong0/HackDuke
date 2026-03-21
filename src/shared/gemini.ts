import { SearchResult, ProductInfo } from './types';
import { getMockResult } from './mock-data';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    originalItem: { type: 'STRING' },
    alternatives: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          brand: { type: 'STRING' },
          description: { type: 'STRING' },
          buyUrl: { type: 'STRING' },
          price: { type: 'STRING' },
          sustainabilityRating: { type: 'NUMBER' },
          priceRating: { type: 'NUMBER' },
          estimatedAnnualSavings: { type: 'NUMBER' },
          impact: {
            type: 'OBJECT',
            properties: {
              carbonFootprint: { type: 'STRING' },
              biodegradability: { type: 'STRING' },
              oceanImpact: { type: 'STRING' },
            },
            required: ['carbonFootprint', 'biodegradability', 'oceanImpact'],
          },
          properties: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: [
          'name', 'brand', 'description', 'buyUrl', 'price',
          'sustainabilityRating', 'priceRating', 'estimatedAnnualSavings',
          'impact', 'properties',
        ],
      },
    },
  },
  required: ['originalItem', 'alternatives'],
};

export async function analyzeProduct(
  product: ProductInfo,
  apiKey: string,
  minSustainability: number = 50,
  maxPrice: number = 3,
  demoMode: boolean = false,
): Promise<SearchResult> {
  if (demoMode) {
    console.log('[EcoSwap] Demo mode — returning mock data for:', product.name);
    await new Promise((r) => setTimeout(r, 600));
    return getMockResult(product.name);
  }

  const key = apiKey.trim();
  if (!key || !key.startsWith('AIza')) {
    throw new Error('Invalid API key. Go to Settings and enter a valid Gemini API key.');
  }

  const MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

  const prompt = `Suggest 4 eco-friendly alternatives to "${product.name}" (${product.price}) on ${product.site}.
Each must have sustainabilityRating >= ${minSustainability}/100 and priceRating <= ${maxPrice}/5.
buyUrl must be a real product page URL (Amazon, Target, Walmart, or brand site). No homepage links.
estimatedAnnualSavings = annual disposable cost minus eco alternative cost.`;

  let lastError: Error | null = null;

  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`[EcoSwap] Calling ${model}...`);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
        },
      );

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text();
        const isRetryable =
          res.status === 429 || res.status === 404 || res.status === 503;

        if (isRetryable) {
          console.warn(`[EcoSwap] ${model}: ${res.status}, trying next...`);
          lastError = new Error(body);
          continue;
        }

        throw new Error(body);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');

      console.log(`[EcoSwap] Got response from ${model}`);
      const data: SearchResult = JSON.parse(text);

      if (!data.alternatives || !Array.isArray(data.alternatives)) {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (err: any) {
      clearTimeout(timer);

      if (err.name === 'AbortError') {
        console.warn(`[EcoSwap] ${model} timed out, trying next...`);
        lastError = new Error(`${model} timed out after 15s`);
        continue;
      }

      lastError = err;
      const msg = err.message || '';
      const isRetryable =
        msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('404') || msg.includes('NOT_FOUND') ||
        msg.includes('503');

      if (isRetryable) continue;
      throw err;
    }
  }

  throw lastError || new Error('All models failed. Try again in a minute.');
}
