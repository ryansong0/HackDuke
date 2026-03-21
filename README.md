# EcoSwap - Chrome Extension

Find eco-friendly alternatives while shopping online. EcoSwap automatically detects products on Amazon, Walmart, Target, eBay, Best Buy, and Etsy, then suggests sustainable alternatives powered by Google Gemini AI.

## Features

- **Auto-detect products** on major shopping sites
- **Inline eco-badge** appears next to the product title with a sustainability score
- **Slide-in sidebar** with detailed eco-friendly alternatives, pricing, and buy links
- **Impact dashboard** tracks your swaps, plastic diverted, and money saved
- **Configurable filters** for sustainability rating and price range

## Supported Sites

Amazon, Walmart, Target, eBay, Best Buy, Etsy (+ generic fallback via Open Graph metadata)

## Setup

**Prerequisites:** Node.js 18+, Google Chrome

1. Install dependencies:
   ```
   npm install
   ```

2. Build the extension:
   ```
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `dist/` folder

4. Click the EcoSwap icon in the toolbar and enter your [Gemini API key](https://aistudio.google.com/apikey) in Settings.

5. Visit any product page on a supported site -- the EcoSwap badge will appear automatically.

## Development

```
npm run lint    # TypeScript type check
npm run build   # Build to dist/
npm run clean   # Remove dist/
```
