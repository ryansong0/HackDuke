/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Leaf, Recycle, Search, ArrowRight, Info, CheckCircle2, AlertCircle, Barcode, TrendingUp, Users, Wallet, History, X, Minimize2, HelpCircle } from "lucide-react";
import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Alternative {
  name: string;
  brand: string;
  description: string;
  buyUrl: string;
  price: string;
  sustainabilityRating: number; // 1-100
  priceRating: number; // 1-5 (1 = cheapest, 5 = most expensive)
  estimatedAnnualSavings: number;
  impact: {
    carbonFootprint: string;
    biodegradability: string;
    oceanImpact: string;
  };
  properties: string[];
}

interface SearchResult {
  originalItem: string;
  alternatives: Alternative[];
}

interface UserStats {
  swapsCount: number;
  plasticDivertedKg: number;
  moneySaved: number;
  history: {
    item: string;
    alternative: string;
    brand: string;
    date: string;
    savings: number;
    url: string;
  }[];
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  results?: SearchResult;
}

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"search" | "dashboard">("search");
  const [globalImpact, setGlobalImpact] = useState(1240562);
  const [amazonContext, setAmazonContext] = useState<{
    title: string | null;
    price: string | null;
    img: string | null;
    cat: string | null;
  }>({ title: null, price: null, img: null, cat: null });
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "model", text: "Hi, how can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Filters
  const [minSustainability, setMinSustainability] = useState(50);
  const [maxPrice, setMaxPrice] = useState(3); // 1-5 scale

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem("ecoSwapStats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          swapsCount: parsed.swapsCount || 0,
          plasticDivertedKg: parsed.plasticDivertedKg || 0,
          moneySaved: parsed.moneySaved || 0,
          history: parsed.history || []
        };
      } catch (e) {
        console.error("Failed to parse stats", e);
      }
    }
    return {
      swapsCount: 0,
      plasticDivertedKg: 0,
      moneySaved: 0,
      history: []
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get("search");
    const price = params.get("price");
    const img = params.get("img");
    const cat = params.get("cat");

    if (searchQuery) {
      setAmazonContext({ title: searchQuery, price, img, cat });
      setInput(searchQuery);
      analyzeItem(searchQuery);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ecoSwapStats", JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalImpact(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [scanMode, setScanMode] = useState<"general" | "barcode">("general");
  const [showScanner, setShowScanner] = useState(false);

  const getPriceRange = (rating: number) => {
    switch (rating) {
      case 1: return "$0 - $49";
      case 2: return "$50 - $99";
      case 3: return "$100 - $149";
      case 4: return "$150 - $249";
      case 5: return "$250+";
      default: return "";
    }
  };

  const analyzeItem = async (text?: string, base64Image?: string, mode: "general" | "barcode" = "general", barcodeValue?: string) => {
    setLoading(true);
    setError(null);
    try {
      const model = "gemini-3-flash-preview";
      let prompt = "";
      let contents: any = [];

      const jsonStructure = `{ 
        "originalItem": "string", 
        "alternatives": [
          {
            "name": "string (specific product name)", 
            "brand": "string (real brand name)",
            "description": "string", 
            "buyUrl": "string (MUST be a direct, valid URL to a product page on Amazon, Target, Walmart, or official brand site. DO NOT GUESS. Use the exact URL from search results.)",
            "price": "string (the current price, e.g., $19.99)",
            "sustainabilityRating": number (1-100),
            "priceRating": number (1-5, where 1 is budget and 5 is premium),
            "estimatedAnnualSavings": number,
            "impact": { "carbonFootprint": "string", "biodegradability": "string", "oceanImpact": "string" },
            "properties": ["string"]
          }
        ]
      }`;

      const filterContext = `The user wants to buy REAL, PHYSICAL products AVAILABLE TODAY. 
      1. Use Google Search to find specific, real-world eco-friendly alternatives that are currently in stock on major retailers like Amazon, Target, Walmart, or official brand stores.
      2. Ensure each alternative has at least ${minSustainability}/100 sustainability and a price rating no higher than ${maxPrice}/5.
      3. CRITICAL: The 'buyUrl' MUST be a direct, verified link to a SPECIFIC product page (e.g., https://www.amazon.com/dp/B08XW7Y8XW or https://www.target.com/p/product-name). 
      4. DO NOT provide general website homepages. If you cannot find a direct product page, search for the product on Amazon and provide that link.
      5. Verify the brand and product name match the URL provided.
      6. If a barcode was provided (${barcodeValue || "none"}), search for that specific product first to understand what it is.
      7. IF YOU CANNOT FIND A DIRECT, VERIFIED PRODUCT PAGE URL, DO NOT SUGGEST THAT PRODUCT.
      8. DO NOT recommend products from the brand "Cariuma" under any circumstances.
      9. SAVINGS METRIC: The 'estimatedAnnualSavings' is calculated as (Cost of disposable/low-quality item per year) - (Cost of durable/eco alternative + maintenance). 
         Example: If a user buys 52 plastic bottles/year at $1.50 each ($78), and a reusable bottle costs $30, the savings is $48.
      Provide up to 6 diverse options matching these criteria to give the user a wide range of choices.`;

      if (base64Image) {
        prompt = mode === "barcode"
          ? `This image contains a barcode or product packaging. First, identify the exact product from the barcode/packaging. Then, suggest eco-friendly alternatives. ${filterContext} Response must be JSON: ${jsonStructure}`
          : `Identify the plastic item in this image. ${filterContext} Response must be JSON: ${jsonStructure}`;
        
        contents = {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
          ],
        };
      } else if (barcodeValue) {
        prompt = `The user scanned a barcode: ${barcodeValue}. Identify this product and suggest real-world eco-friendly alternatives. ${filterContext} Response must be JSON: ${jsonStructure}`;
        contents = prompt;
      } else {
        prompt = `Suggest real-world eco-friendly products to replace: "${text}". ${filterContext} Response must be JSON: ${jsonStructure}`;
        contents = prompt;
      }

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          originalItem: { type: Type.STRING },
          alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                brand: { type: Type.STRING },
                description: { type: Type.STRING },
                buyUrl: { type: Type.STRING },
                price: { type: Type.STRING },
                sustainabilityRating: { type: Type.NUMBER },
                priceRating: { type: Type.NUMBER },
                estimatedAnnualSavings: { type: Type.NUMBER },
                impact: {
                  type: Type.OBJECT,
                  properties: {
                    carbonFootprint: { type: Type.STRING },
                    biodegradability: { type: Type.STRING },
                    oceanImpact: { type: Type.STRING }
                  },
                  required: ["carbonFootprint", "biodegradability", "oceanImpact"]
                },
                properties: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["name", "brand", "description", "buyUrl", "price", "sustainabilityRating", "priceRating", "estimatedAnnualSavings", "impact", "properties"]
            }
          }
        },
        required: ["originalItem", "alternatives"]
      };

      const response = await genAI.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from AI");
      
      const data = JSON.parse(responseText);
      if (!data || !data.alternatives) {
        throw new Error("Invalid response format from AI");
      }
      
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isVerifiedRetailer = (url: string) => {
    const retailers = ['amazon.com', 'target.com', 'walmart.com', 'ebay.com', 'etsy.com', 'patagonia.com', 'allbirds.com', 'blueland.com'];
    return retailers.some(r => url.toLowerCase().includes(r));
  };

  const handleBuy = (alt: Alternative) => {
    if (!alt.buyUrl) return;
    
    // Log the purchase for impact tracking
    const newSwap = {
      item: result?.originalItem || input || "Unknown Item",
      alternative: alt.name,
      brand: alt.brand,
      date: new Date().toLocaleDateString(),
      savings: alt.estimatedAnnualSavings,
      url: alt.buyUrl
    };

    setStats(prev => ({
      swapsCount: prev.swapsCount + 1,
      plasticDivertedKg: prev.plasticDivertedKg + 0.5,
      moneySaved: prev.moneySaved + alt.estimatedAnnualSavings,
      history: [newSwap, ...prev.history].slice(0, 10)
    }));
    
    // Open the purchase URL
    window.open(alt.buyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      analyzeItem(input);
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const model = "gemini-3-flash-preview";
      const jsonStructure = `{ 
        "originalItem": "string (the item or category being discussed)", 
        "alternatives": [
          {
            "name": "string", 
            "brand": "string",
            "description": "string", 
            "buyUrl": "string",
            "price": "string (e.g., $19.99)",
            "sustainabilityRating": number,
            "priceRating": number,
            "estimatedAnnualSavings": number,
            "impact": { "carbonFootprint": "string", "biodegradability": "string", "oceanImpact": "string" },
            "properties": ["string"]
          }
        ],
        "conversationalResponse": "string (a helpful, friendly response to the user's query)"
      }`;

      const prompt = `The user is asking: "${userMsg}". 
      Based on their description, find real-world eco-friendly products that are currently in stock.
      DO NOT recommend products from the brand "Cariuma".
      Provide up to 6 diverse options.
      The 'buyUrl' MUST be a direct, verified link to a SPECIFIC product page (e.g., Amazon, Target, or Brand Product Page).
      DO NOT provide general website homepages.
      Response must be JSON: ${jsonStructure}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          originalItem: { type: Type.STRING },
          conversationalResponse: { type: Type.STRING },
          alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                brand: { type: Type.STRING },
                description: { type: Type.STRING },
                buyUrl: { type: Type.STRING },
                price: { type: Type.STRING },
                sustainabilityRating: { type: Type.NUMBER },
                priceRating: { type: Type.NUMBER },
                estimatedAnnualSavings: { type: Type.NUMBER },
                impact: {
                  type: Type.OBJECT,
                  properties: {
                    carbonFootprint: { type: Type.STRING },
                    biodegradability: { type: Type.STRING },
                    oceanImpact: { type: Type.STRING }
                  },
                  required: ["carbonFootprint", "biodegradability", "oceanImpact"]
                },
                properties: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["name", "brand", "description", "buyUrl", "price", "sustainabilityRating", "priceRating", "estimatedAnnualSavings", "impact", "properties"]
            }
          }
        },
        required: ["originalItem", "alternatives", "conversationalResponse"]
      };

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response");
      const data = JSON.parse(responseText);
      
      setChatMessages(prev => [...prev, { 
        role: "model", 
        text: data.conversationalResponse || "Here are some products that match your description:",
        results: data
      }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "model", text: "I'm sorry, I had trouble finding those products. Could you try describing them differently?" }]);
    } finally {
      setLoading(false);
    }
  };

  const triggerImageUpload = (mode: "general" | "barcode") => {
    if (mode === "barcode") {
      setShowScanner(true);
    } else {
      setScanMode(mode);
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (showScanner) {
      html5QrCode = new Html5Qrcode("reader");
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          html5QrCode?.stop().then(() => {
            setShowScanner(false);
            analyzeItem(undefined, undefined, "barcode", decodedText);
          }).catch(err => console.error("Failed to stop scanner", err));
        },
        () => {
          // Frame error, ignore
        }
      ).catch(err => {
        console.error("Unable to start scanning", err);
      });
    }

    return () => {
      if (html5QrCode) {
        // Stop scanning if active
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Error stopping scanner on cleanup", err));
        }
      }
    };
  }, [showScanner]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        analyzeItem(undefined, reader.result as string, scanMode);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be uploaded again if needed
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-[#fdfcf9] text-[#2c2c2c] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 pt-12 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("search")}>
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
            <Leaf size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">EcoSwap</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView(view === "dashboard" ? "search" : "dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              view === "dashboard" ? "bg-emerald-600 text-white" : "bg-white border border-black/5 hover:bg-emerald-50"
            }`}
          >
            {view === "dashboard" ? (
              <><Search size={18} className="text-white" /> Search</>
            ) : (
              <><TrendingUp size={18} className="text-emerald-600" /> My Impact</>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24">
        {view === "search" ? (
          <>
            {/* Amazon Context Header */}
            {amazonContext.title && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 bg-white rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center gap-6"
              >
                <div className="flex items-center gap-3 text-emerald-600 font-bold text-xs uppercase tracking-widest sm:hidden w-full">
                  <Leaf size={14} /> Shopping Assistant
                </div>
                {amazonContext.img && (
                  <img src={amazonContext.img} alt="" className="w-20 h-20 object-contain bg-[#fdfcf9] rounded-2xl p-2 border border-black/5" />
                )}
                <div className="flex-1 text-center sm:text-left">
                  <div className="hidden sm:flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-1">
                    <Leaf size={12} /> Shopping Assistant
                  </div>
                  <h3 className="text-lg font-medium leading-tight mb-1">{amazonContext.title}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-sm opacity-60">
                    <span>{amazonContext.price}</span>
                    {amazonContext.cat && (
                      <>
                        <span className="w-1 h-1 bg-black/20 rounded-full" />
                        <span>{amazonContext.cat}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-30">Status</div>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 size={16} /> Analyzing for Swaps
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hero & Global Ticker */}
            {!amazonContext.title && (
              <section className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="max-w-2xl">
                  <h2 className="text-4xl sm:text-6xl font-serif italic mb-4 leading-tight">
                    Swap plastic for <span className="text-emerald-700">better</span> alternatives.
                  </h2>
                  <p className="text-lg opacity-70">
                    Find and buy real-world sustainable products that fit your budget and values.
                  </p>
                </div>
                
                <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-lg min-w-[280px]">
                  <div className="flex items-center gap-2 opacity-60 text-xs font-bold uppercase tracking-widest mb-2">
                    <Users size={14} /> Global Community Impact
                  </div>
                  <div className="text-4xl font-mono font-bold text-emerald-400">
                    {globalImpact.toLocaleString()}
                  </div>
                  <p className="text-xs opacity-60 mt-1">Plastic items diverted today</p>
                </div>
              </section>
            )}

            {/* Filters & Search */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-black/5 pb-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold uppercase tracking-widest opacity-40">Min Sustainability</label>
                    <span className="text-emerald-600 font-bold">{minSustainability}/100</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={minSustainability} 
                    onChange={(e) => setMinSustainability(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold uppercase tracking-widest opacity-40">Max Price Level</label>
                    <span className="text-emerald-600 font-bold">{getPriceRange(maxPrice)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setMaxPrice(level)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${
                          maxPrice === level 
                            ? "bg-emerald-600 text-white" 
                            : "bg-[#f5f5f0] text-black/40 hover:bg-emerald-50"
                        }`}
                      >
                        {getPriceRange(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
                  <input
                    type="text"
                    placeholder="Search for a plastic item (e.g. plastic bottle)..."
                    className="w-full pl-12 pr-4 py-4 bg-[#f5f5f0] rounded-2xl border-none focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => triggerImageUpload("barcode")}
                    className="p-4 bg-[#f5f5f0] rounded-2xl hover:bg-[#ebebe5] transition-colors text-emerald-700 flex items-center gap-2 group relative"
                    title="Scan Barcode"
                  >
                    <Barcode size={24} />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Scan Barcode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerImageUpload("general")}
                    className="p-4 bg-[#f5f5f0] rounded-2xl hover:bg-[#ebebe5] transition-colors text-emerald-700 flex items-center gap-2 group relative"
                    title="Upload Image"
                  >
                    <Camera size={24} />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Upload Image</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? "Analyzing..." : "Find Alternatives"}
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </form>
            </div>

            {/* Results Area */}
            <AnimatePresence mode="wait">
              {showScanner && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                >
                  <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative shadow-2xl">
                    <button 
                      onClick={() => setShowScanner(false)}
                      className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                    <h3 className="text-2xl font-serif italic mb-6">Scan Barcode</h3>
                    <div id="reader" className="overflow-hidden rounded-2xl border-2 border-emerald-100"></div>
                    <p className="mt-4 text-center text-sm opacity-60">
                      Center the barcode in the box to scan automatically.
                    </p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
                  <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
                  <p className="text-emerald-700 font-medium">Finding real products for you...</p>
                  <p className="text-emerald-600 text-sm animate-pulse mt-2">Verifying real-time availability & current prices via Google Search...</p>
                </motion.div>
              )}

              {result && !loading && (
                <div className="space-y-12">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-serif italic">Products to replace <span className="opacity-40">{result.originalItem}</span></h3>
                    <div className="group relative">
                      <HelpCircle size={18} className="text-emerald-600 cursor-help" />
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-black/5 text-xs leading-relaxed text-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <p className="font-bold text-emerald-600 mb-1">How we calculate savings:</p>
                        Savings are estimated based on the annual replacement cost of disposable items (e.g., 52 plastic bottles/year) vs. the one-time cost of a durable alternative.
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {result?.alternatives?.map((alt, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5 flex flex-col"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full w-fit mb-2">
                              {alt.brand}
                            </div>
                            <h4 className="text-2xl font-serif italic text-emerald-800 leading-tight">{alt.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-emerald-600 font-bold">{alt.price}</p>
                              {isVerifiedRetailer(alt.buyUrl) && (
                                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  <CheckCircle2 size={10} /> Verified Retailer
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                            {getPriceRange(alt.priceRating)}
                          </div>
                        </div>

                        <p className="text-sm opacity-60 leading-relaxed mb-6 flex-1">
                          {alt.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-[#f5f5f0] p-4 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Sustainability</p>
                            <p className="text-xl font-serif italic text-emerald-700">{alt.sustainabilityRating}/100</p>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Savings</p>
                            <p className="text-xl font-serif italic text-emerald-900">${alt.estimatedAnnualSavings}</p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-8">
                          {alt?.properties?.slice(0, 2)?.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs opacity-70">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              {p}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleBuy(alt)}
                            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          >
                            Buy Now
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* Dashboard View */
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
            <section>
              <h2 className="text-4xl font-serif italic mb-8">Your Sustainability Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <Recycle size={24} />
                  </div>
                  <div className="text-4xl font-serif italic mb-1">{stats.swapsCount}</div>
                  <p className="text-sm opacity-50 uppercase tracking-widest font-bold">Total Purchases</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                    <TrendingUp size={24} />
                  </div>
                  <div className="text-4xl font-serif italic mb-1">{stats.plasticDivertedKg.toFixed(1)}kg</div>
                  <p className="text-sm opacity-50 uppercase tracking-widest font-bold">Plastic Diverted</p>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[2rem] shadow-xl text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4">
                    <Wallet size={24} />
                  </div>
                  <div className="text-4xl font-serif italic mb-1">${stats.moneySaved.toFixed(0)}</div>
                  <p className="text-sm opacity-70 uppercase tracking-widest font-bold">Estimated Annual Savings</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-serif italic flex items-center gap-2">
                  <History size={24} className="text-emerald-600" /> Purchase History
                </h3>
              </div>
              
              {stats?.history?.length > 0 ? (
                <div className="space-y-4">
                  {stats.history.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#fdfcf9] rounded-2xl border border-black/5 hover:border-emerald-200 transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm line-through opacity-40">{entry.item}</span>
                          <ArrowRight size={14} className="opacity-20" />
                          <span className="font-medium text-emerald-800">{entry.alternative}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">{entry.brand}</span>
                        </div>
                        <p className="text-xs opacity-40">{entry.date}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-emerald-600 font-bold text-sm">+${entry.savings}</div>
                          <p className="text-[10px] opacity-40 uppercase tracking-widest">Saved/Year</p>
                        </div>
                        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Search size={18} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 opacity-40 italic">
                  No purchases logged yet. Start searching to make your first impact!
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* Who Are We Section */}
        <section className="mt-24 pt-24 border-t border-black/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-serif italic mb-6 text-emerald-900 leading-tight">Who Are We?</h2>
              <p className="text-lg text-emerald-800/70 leading-relaxed mb-8">
                We are a team of students at <span className="font-bold text-emerald-900">Duke University</span> united by a single mission: to solve the plastic pollution crisis. 
                EcoSwap was born out of our shared passion for sustainability and our belief that small, everyday choices can lead to massive global change.
              </p>
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 w-fit">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/40">Our Team</p>
                  <p className="text-sm font-medium text-emerald-900">Ryan, Adelene, Lida, & Grace</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square bg-emerald-100 rounded-[2rem] flex items-center justify-center text-emerald-600 text-4xl font-serif italic shadow-sm">R</div>
              <div className="aspect-square bg-emerald-200 rounded-[2rem] flex items-center justify-center text-emerald-700 text-4xl font-serif italic mt-8 shadow-sm">A</div>
              <div className="aspect-square bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 text-4xl font-serif italic -mt-8 shadow-sm">L</div>
              <div className="aspect-square bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-serif italic shadow-md">G</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40 text-sm">
        <p>© 2026 EcoSwap. Making sustainability simple.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-emerald-700">Privacy</a>
          <a href="#" className="hover:text-emerald-700">Terms</a>
          <a href="#" className="hover:text-emerald-700">API</a>
        </div>
      </footer>
      {/* Floating Chatbot Widget */}
      <div className={`fixed bottom-6 right-6 z-[90] transition-all duration-500 ease-out ${isChatOpen ? "w-[400px] h-[600px]" : "w-16 h-16"}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl border border-black/5 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10">
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Users size={16} />
                </div>
                <span className="font-medium text-sm">EcoSwap Assistant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fdfcf9]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 ${
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white" 
                      : "bg-white text-[#2c2c2c] shadow-sm border border-black/5"
                  }`}>
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                    {msg.results && msg.results.alternatives && (
                      <div className="mt-3 space-y-2">
                        {msg.results.alternatives.map((alt, idx) => (
                          <div key={idx} className="bg-[#f5f5f0] rounded-xl p-2 border border-black/5">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">{alt.brand}</p>
                                <p className="font-serif italic text-xs">{alt.name}</p>
                                <p className="text-[10px] text-emerald-600 font-bold">{alt.price}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {alt.sustainabilityRating}/100
                                </span>
                                <span className="text-[7px] font-bold text-emerald-700 bg-white px-1 py-0.5 rounded border border-emerald-100">
                                  {getPriceRange(alt.priceRating)}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleBuy(alt)}
                              className="w-full py-1.5 bg-emerald-600 text-white text-[10px] rounded-lg font-bold hover:bg-emerald-700"
                            >
                              View Product
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-black/5 flex gap-2">
              <input
                type="text"
                placeholder="Ask about a product..."
                className="flex-1 px-4 py-2 bg-[#f5f5f0] rounded-xl text-xs border border-transparent focus:border-emerald-500/20 outline-none transition-all"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <Search size={16} />
              </button>
            </form>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full h-full bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
          >
            <Users size={28} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
          </button>
        )}
      </div>
    </div>
  );
}
