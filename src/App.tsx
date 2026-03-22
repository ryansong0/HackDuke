/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Leaf, Recycle, Search, ArrowRight, Info, CheckCircle2, AlertCircle, Barcode, TrendingUp, Users, Wallet, History, X } from "lucide-react";
import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Alternative {
  name: string;
  brand: string;
  description: string;
  buyUrl: string;
  sustainabilityRating: number; // 1-100
  priceRating: number; // 1-5 (1 = cheapest, 5 = most expensive)
  estimatedAnnualSavings: number;
  carbonSavedKg: number;
  plasticSavedKg: number;
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
  carbonSavedKg: number;
  moneySaved: number;
  history: {
    item: string;
    alternative: string;
    brand: string;
    date: string;
    savings: number;
    carbonSavedKg: number;
    plasticSavedKg: number;
    url: string;
  }[];
}

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"search" | "dashboard">("search");
  const [globalImpact, setGlobalImpact] = useState(1240562);
  
  // Filters
  const [minSustainability, setMinSustainability] = useState(50);
  const [maxPrice, setMaxPrice] = useState(3); // 1-5 scale

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem("ecoSwapStats");
    return saved ? JSON.parse(saved) : {
      swapsCount: 0,
      plasticDivertedKg: 0,
      carbonSavedKg: 0,
      moneySaved: 0,
      history: []
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [chartMetric, setChartMetric] = useState<"carbon" | "plastic" | "money">("carbon");

  const analyzeItem = async (text?: string, base64Image?: string, mode: "general" | "barcode" = "general") => {
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
            "buyUrl": "string (MUST be a direct, valid URL to a product page on Amazon, Target, or official brand site. Ensure the link is active and not a 404)",
            "sustainabilityRating": number (1-100),
            "priceRating": number (1-5, where 1 is budget and 5 is premium),
            "estimatedAnnualSavings": number (dollars saved per year vs disposable alternative),
            "carbonSavedKg": number (kg of CO2 saved per year by switching to this product),
            "plasticSavedKg": number (kg of plastic waste avoided per year by switching to this product),
            "impact": { "carbonFootprint": "string", "biodegradability": "string", "oceanImpact": "string" },
            "properties": ["string"]
          }
        ]
      }`;

      const filterContext = `The user wants to buy REAL products AVAILABLE TODAY. 
      1. Use Google Search to find specific, real-world eco-friendly alternatives that are currently in stock.
      2. Ensure each alternative has at least ${minSustainability}/100 sustainability and a price rating no higher than ${maxPrice}/5.
      3. CRITICAL: The 'buyUrl' MUST be a direct, verified link to a product page on a major retailer (Amazon, Target, Walmart) or the official brand website. 
      4. DO NOT provide generic search result pages or broken links. Provide the exact product page URL.
      5. Verify the brand and product name match the URL provided.
      Provide up to 3 diverse options matching these criteria.`;

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
      } else {
        prompt = `Suggest real-world eco-friendly products to replace: "${text}". ${filterContext} Response must be JSON: ${jsonStructure}`;
        contents = prompt;
      }

      const response = await genAI.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      const data = JSON.parse(response.text || "{}");
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (alt: Alternative) => {
    if (!result) return;
    
    // Log the purchase for impact tracking
    const newSwap = {
      item: result.originalItem,
      alternative: alt.name,
      brand: alt.brand,
      date: new Date().toLocaleDateString(),
      savings: alt.estimatedAnnualSavings,
      carbonSavedKg: alt.carbonSavedKg || 0,
      plasticSavedKg: alt.plasticSavedKg || 0,
      url: alt.buyUrl
    };

    setStats(prev => ({
      swapsCount: prev.swapsCount + 1,
      plasticDivertedKg: prev.plasticDivertedKg + (alt.plasticSavedKg || 0),
      carbonSavedKg: (prev.carbonSavedKg || 0) + (alt.carbonSavedKg || 0),
      moneySaved: prev.moneySaved + alt.estimatedAnnualSavings,
      history: [newSwap, ...prev.history].slice(0, 10)
    }));
    
    // Open the purchase URL
    window.open(alt.buyUrl, '_blank');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      analyzeItem(input);
    }
  };

  const triggerImageUpload = (mode: "general" | "barcode") => {
    setScanMode(mode);
    fileInputRef.current?.click();
  };

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
            onClick={() => setView(view === "search" ? "dashboard" : "search")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-full text-sm font-medium hover:bg-emerald-50 transition-all"
          >
            {view === "search" ? (
              <><TrendingUp size={18} className="text-emerald-600" /> My Impact</>
            ) : (
              <><Search size={18} className="text-emerald-600" /> Search</>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24">
        {view === "search" ? (
          <>
            {/* Hero & Global Ticker */}
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
                    <span className="text-emerald-600 font-bold">{"$".repeat(maxPrice)}</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setMaxPrice(level)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          maxPrice === level 
                            ? "bg-emerald-600 text-white" 
                            : "bg-[#f5f5f0] text-black/40 hover:bg-emerald-50"
                        }`}
                      >
                        {"$".repeat(level)}
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
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
                  <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
                  <p className="text-emerald-700 font-medium">Finding real products for you...</p>
                  <p className="text-emerald-600 text-sm animate-pulse mt-2">Verifying real-time availability & current prices via Google Search...</p>
                </motion.div>
              )}

              {result && !loading && (
                <div className="space-y-12">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-serif italic">Products to replace <span className="opacity-40">{result.originalItem}</span></h3>
                    <div className="h-px flex-1 bg-black/5" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {result.alternatives.map((alt, idx) => (
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
                            <h4 className="text-2xl font-serif italic text-emerald-800">{alt.name}</h4>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <div key={s} className={`w-1.5 h-4 rounded-full ${s <= alt.priceRating ? 'bg-emerald-600' : 'bg-emerald-100'}`} />
                            ))}
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
                          {alt.properties.slice(0, 2).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs opacity-70">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              {p}
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => handleBuy(alt)}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                          Buy Now
                        </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 mb-4">
                    <Leaf size={24} />
                  </div>
                  <div className="text-4xl font-serif italic mb-1">{(stats.carbonSavedKg || 0).toFixed(1)}kg</div>
                  <p className="text-sm opacity-50 uppercase tracking-widest font-bold">CO₂ Saved</p>
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif italic flex items-center gap-2">
                  <TrendingUp size={24} className="text-emerald-600" /> Green Purchases Over Time
                </h3>
                {stats.history.length > 0 && (
                  <div className="flex gap-2">
                    {(["carbon", "plastic", "money"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${chartMetric === m ? "bg-emerald-600 text-white" : "bg-[#f5f5f0] text-black/40 hover:bg-emerald-50"}`}
                      >
                        {m === "carbon" ? "CO₂" : m === "plastic" ? "Plastic" : "Money"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {stats.history.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-100 rounded-2xl">
                  <Leaf size={32} className="text-emerald-200" />
                  <p className="text-sm opacity-40 italic">Make your first green swap to see your impact here</p>
                </div>
              ) : (() => {
                const metricConfig = {
                  carbon:  { label: "CO₂ Saved (kg)",    getValue: (e: typeof stats.history[0]) => e.carbonSavedKg  || 0, color: "bg-green-500"   },
                  plastic: { label: "Plastic Saved (kg)", getValue: (e: typeof stats.history[0]) => e.plasticSavedKg || 0, color: "bg-blue-500"    },
                  money:   { label: "Money Saved ($)",    getValue: (e: typeof stats.history[0]) => e.savings        || 0, color: "bg-emerald-500" },
                } as const;
                const cfg = metricConfig[chartMetric];
                const reversed = [...stats.history].reverse();
                const values = reversed.map(cfg.getValue);
                const max = Math.max(...values.map(v => Number(v)), 0.01);
                return (
                  <>
                    <p className="text-xs opacity-40 uppercase tracking-widest font-bold mb-4">{cfg.label} per swap</p>
                    <div className="flex items-end gap-3 h-40">
                      {reversed.map((entry, i) => {
                        const val = cfg.getValue(entry);
                        const height = (val / max) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {val.toFixed(1)} · {entry.alternative}
                            </div>
                            <div className="w-full flex items-end" style={{ height: "100%" }}>
                              <div
                                className={`w-full rounded-t-lg ${cfg.color} transition-all duration-500`}
                                style={{ height: `${height}%`, minHeight: val > 0 ? "4px" : "0" }}
                              />
                            </div>
                            <p className="text-[9px] opacity-30 text-center truncate w-full">{entry.date}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>

            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-serif italic flex items-center gap-2">
                  <History size={24} className="text-emerald-600" /> Purchase History
                </h3>
              </div>
              
              {stats.history.length > 0 ? (
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
    </div>
  );
}
