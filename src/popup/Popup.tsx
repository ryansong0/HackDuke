import { useState, useEffect } from 'react';
import { Leaf, TrendingUp, Recycle, Wallet, ArrowRight, Eye, EyeOff, Settings, ChevronLeft, ExternalLink, Search, Zap } from 'lucide-react';
import type { UserStats, ExtensionSettings } from '../shared/types';

type View = 'main' | 'settings';

const PRICE_RANGES = ['$0–$49', '$50–$99', '$100–$149', '$150–$249', '$250+'];

export function Popup() {
  const [view, setView] = useState<View>('main');
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    autoAnalyze: true,
    demoMode: false,
    minSustainability: 50,
    maxPrice: 3,
  });
  const [stats, setStats] = useState<UserStats>({
    swapsCount: 0,
    plasticDivertedKg: 0,
    moneySaved: 0,
    history: [],
  });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res) setSettings(res);
    });
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
      if (res) setStats(res);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ settings }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleAnalyzeCurrentPage = () => {
    if (!settings.apiKey && !settings.demoMode) {
      setAnalyzeResult('Please set your API key or enable Demo Mode in Settings.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeResult(null);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setAnalyzing(false);
        setAnalyzeResult('No active tab found.');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_ANALYSIS' }, (response) => {
        setAnalyzing(false);
        if (chrome.runtime.lastError) {
          setAnalyzeResult('Content script not loaded. Make sure you are on a supported shopping site and refresh the page.');
          return;
        }
        if (response?.ok) {
          setAnalyzeResult('Sidebar opened! Check the product page.');
          setTimeout(() => window.close(), 1500);
        } else {
          setAnalyzeResult(response?.error || 'Could not analyze this page.');
        }
      });
    });
  };

  if (view === 'settings') {
    return (
      <div className="popup">
        <header className="popup-header">
          <button className="back-btn" onClick={() => setView('main')}>
            <ChevronLeft size={18} />
          </button>
          <div className="header-title">
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <div style={{ width: 32 }} />
        </header>

        <div className="popup-body">
          <div className="field">
            <label className="field-label">Gemini API Key</label>
            <div className="key-input-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                className="field-input"
                placeholder="AIza..."
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              />
              <button className="key-toggle" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="field-hint">
              Get a free key at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>
            </p>
          </div>

          <div className="field">
            <label className="field-label">Demo Mode</label>
            <div className="toggle-row">
              <span className="toggle-desc">Use mock data — no API key needed</span>
              <button
                className={`toggle ${settings.demoMode ? 'on' : ''}`}
                onClick={() => setSettings({ ...settings, demoMode: !settings.demoMode })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Auto-Analyze Products</label>
            <div className="toggle-row">
              <span className="toggle-desc">Automatically analyze when visiting product pages</span>
              <button
                className={`toggle ${settings.autoAnalyze ? 'on' : ''}`}
                onClick={() => setSettings({ ...settings, autoAnalyze: !settings.autoAnalyze })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          <div className="field">
            <div className="field-top">
              <label className="field-label">Min Sustainability</label>
              <span className="field-value">{settings.minSustainability}/100</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.minSustainability}
              onChange={(e) => setSettings({ ...settings, minSustainability: parseInt(e.target.value) })}
              className="range-input"
            />
          </div>

          <div className="field">
            <div className="field-top">
              <label className="field-label">Max Price Level</label>
              <span className="field-value">{PRICE_RANGES[settings.maxPrice - 1]}</span>
            </div>
            <div className="price-btns">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  className={`price-btn ${settings.maxPrice === level ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, maxPrice: level })}
                >
                  {PRICE_RANGES[level - 1]}
                </button>
              ))}
            </div>
          </div>

          <button className="save-btn" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="header-title">
          <div className="logo-circle">
            <Leaf size={16} />
          </div>
          <span>EcoSwap</span>
        </div>
        <button className="settings-btn" onClick={() => setView('settings')}>
          <Settings size={16} />
        </button>
      </header>

      <div className="popup-body">
        {!settings.apiKey && !settings.demoMode && (
          <div className="alert">
            <p>Set your Gemini API key or enable Demo Mode in Settings.</p>
            <button className="alert-btn" onClick={() => setView('settings')}>
              Open Settings
            </button>
          </div>
        )}

        {settings.demoMode && (
          <div className="analyze-result success">
            Demo Mode is on — using mock data, no API calls.
          </div>
        )}

        <button
          className="analyze-btn"
          onClick={handleAnalyzeCurrentPage}
          disabled={analyzing}
        >
          <Zap size={16} />
          {analyzing ? 'Analyzing...' : 'Analyze This Page'}
        </button>

        {analyzeResult && (
          <div className={`analyze-result ${analyzeResult.includes('Sidebar') ? 'success' : 'info'}`}>
            {analyzeResult}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">
              <Recycle size={18} />
            </div>
            <div className="stat-num">{stats.swapsCount}</div>
            <div className="stat-label">Eco Swaps</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <TrendingUp size={18} />
            </div>
            <div className="stat-num">{stats.plasticDivertedKg.toFixed(1)}kg</div>
            <div className="stat-label">Plastic Diverted</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon white">
              <Wallet size={18} />
            </div>
            <div className="stat-num">${stats.moneySaved.toFixed(0)}</div>
            <div className="stat-label">Annual Savings</div>
          </div>
        </div>

        <div className="history-section">
          <h3 className="section-title">Recent Swaps</h3>
          {stats.history.length > 0 ? (
            <div className="history-list">
              {stats.history.slice(0, 5).map((entry, i) => (
                <div key={i} className="history-item">
                  <div className="history-main">
                    <div className="history-swap">
                      <span className="history-old">{entry.item}</span>
                      <ArrowRight size={12} className="history-arrow" />
                      <span className="history-new">{entry.alternative}</span>
                    </div>
                    <span className="history-brand">{entry.brand}</span>
                  </div>
                  <div className="history-right">
                    <span className="history-savings">+${entry.savings}</span>
                    <a href={entry.url} target="_blank" rel="noreferrer" className="history-link">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">
              Visit a product page on Amazon, Walmart, or other supported sites to start finding eco-friendly alternatives.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
