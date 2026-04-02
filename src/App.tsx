/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Search, 
  FileText, 
  Globe, 
  Settings, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Copy,
  RefreshCw,
  LayoutDashboard,
  Sparkles,
  ExternalLink,
  Languages,
  Link
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from './translations';

// --- Types ---

type ToolType = 'keywords' | 'content' | 'meta' | 'audit' | 'urlModifier';

interface AuditHistoryItem {
  id: string;
  url: string;
  date: string;
  score: number;
}

// --- Components ---

const Header = ({ lang, setLang, t }: { lang: Language, setLang: (l: Language) => void, t: any }) => (
  <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{t.appName}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-zinc-100 rounded-lg p-1 border border-zinc-200">
          <button 
            onClick={() => setLang('en')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLang('zh')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${lang === 'zh' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            中文
          </button>
        </div>
        <span className="hidden sm:inline-block text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{t.proVersion}</span>
        <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
          <Settings className="w-4 h-4 text-zinc-500" />
        </div>
      </div>
    </div>
  </header>
);

const Sidebar = ({ activeTool, setActiveTool, t }: { activeTool: ToolType, setActiveTool: (t: ToolType) => void, t: any }) => {
  const items: { id: ToolType; label: string; icon: any }[] = [
    { id: 'keywords', label: t.keywordResearch, icon: Search },
    { id: 'content', label: t.contentOptimizer, icon: FileText },
    { id: 'meta', label: t.metaTagGenerator, icon: LayoutDashboard },
    { id: 'urlModifier', label: t.urlModifier, icon: Link },
    { id: 'audit', label: t.urlAuditor, icon: Globe },
  ];

  return (
    <nav className="w-64 border-r border-zinc-200 h-[calc(100vh-64px)] p-4 hidden md:block bg-zinc-50/50">
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTool(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTool === item.id 
                ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' 
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <item.icon className={`w-4 h-4 ${activeTool === item.id ? 'text-indigo-600' : 'text-zinc-400'}`} />
            {item.label}
          </button>
        ))}
      </div>
      
      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h3 className="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t.quickStats}</h3>
        <div className="px-3 space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">{t.apiUsage}</span>
              <span className="text-zinc-900 font-medium">84%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 w-[84%]" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- Main Application ---

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTool, setActiveTool] = useState<ToolType>('keywords');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [titleLimit, setTitleLimit] = useState(60);
  const [descriptionLimit, setDescriptionLimit] = useState(160);

  const t = translations[lang];

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      setAi(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
    }
    
    // Load history from localStorage
    const savedHistory = localStorage.getItem('seo_audit_history');
    if (savedHistory) {
      try {
        setAuditHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse audit history", e);
      }
    }
  }, []);

  useEffect(() => {
    // Save history to localStorage
    localStorage.setItem('seo_audit_history', JSON.stringify(auditHistory));
  }, [auditHistory]);

  const handleAction = async () => {
    if (!ai || !input.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      let prompt = '';
      let tools: any[] = [];
      const langInstruction = lang === 'zh' ? "Please provide the response in Chinese." : "Please provide the response in English.";

      switch (activeTool) {
        case 'keywords':
          prompt = `As an SEO expert, generate a comprehensive list of high-value keywords related to: "${input}". 
          Include a detailed markdown table with the following columns:
          1. Keyword
          2. Type (Primary, Long-tail, Semantic)
          3. Search Intent (Informational, Transactional, Navigational, Commercial)
          4. Monthly Search Volume (Simulated estimate)
          5. Keyword Difficulty (KD%): A score from 0-100
          6. Difficulty Category: 'Easy' (0-30), 'Medium' (31-70), 'Hard' (71-100)
          7. CPC (Simulated USD)
          
          Provide a brief summary of the keyword landscape and strategic recommendations for these keywords. ${langInstruction}`;
          break;
        case 'content':
          prompt = `Analyze the following content for SEO optimization:
          "${input}"
          
          Provide a detailed report including:
          1. Keyword Density Analysis: Identify primary and secondary keywords.
          2. Readability Score: Assess the ease of reading for the target audience.
          3. Sentiment Analysis: Analyze the emotional tone (Positive, Neutral, Negative) and its impact on user engagement and SEO.
          4. LSI (Latent Semantic Indexing) Keywords: Suggest a list of semantically related keywords to improve topical relevance and authority.
          5. Heading Structure: Evaluate H1-H3 usage and suggest optimizations.
          6. Actionable Improvements: Prioritized steps to improve search engine ranking. ${langInstruction}`;
          break;
        case 'meta':
          prompt = `Generate optimized Meta Title and Meta Description for a page about: "${input}".
          Ensure:
          - Title is under ${titleLimit} characters.
          - Description is under ${descriptionLimit} characters.
          - Includes primary keywords.
          - High CTR (Click-Through Rate) focus.
          Provide 3 different variations. ${langInstruction}`;
          break;
        case 'audit':
          prompt = `Perform a deep SEO audit for the website: ${input}. 
          Analyze the page structure, meta tags, performance indicators, and mobile-friendliness.
          Provide a detailed report with a score out of 100 and prioritized recommendations. ${langInstruction}`;
          tools = [{ urlContext: {} }];
          break;
        case 'urlModifier':
          prompt = `As an SEO expert, optimize the following URL or generate an SEO-friendly slug for the following title: "${input}".
          
          Provide:
          1. Optimized SEO Slug: A clean, lowercase, hyphenated version.
          2. URL Structure Recommendations: How to structure the path for better ranking.
          3. UTM Parameter Suggestions: Recommended source, medium, and campaign names for tracking.
          4. Canonical URL Advice: Best practices for this specific page.
          5. Redirect Suggestions: If the URL is being changed, what 301 redirects are needed.
          
          ${langInstruction}`;
          break;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: tools.length > 0 ? tools : undefined,
        }
      });

      const text = response.text || t.noResponse;
      setResult(text);

      // Save to history if it's an audit
      if (activeTool === 'audit' && input.trim()) {
        // Extract score from text if possible, otherwise use a default/random for demo
        // In a real app, we'd parse the structured response
        const scoreMatch = text.match(/score:?\s*(\d+)/i) || text.match(/(\d+)\/100/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 84; // Default to 84 if not found

        const newHistoryItem: AuditHistoryItem = {
          id: Date.now().toString(),
          url: input.trim(),
          date: new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'),
          score: score
        };
        setAuditHistory(prev => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10
      }
    } catch (error) {
      console.error("SEO Tool Error:", error);
      setResult(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const clearHistory = () => {
    setAuditHistory([]);
  };

  const renderToolInput = () => {
    switch (activeTool) {
      case 'keywords':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700">{t.topicLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.topicPlaceholder}
                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        );
      case 'content':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700">{t.contentLabel}</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.contentPlaceholder}
              rows={8}
              className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>
        );
      case 'meta':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">{t.titleLimit}</label>
                <input
                  type="number"
                  value={titleLimit}
                  onChange={(e) => setTitleLimit(parseInt(e.target.value) || 60)}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">{t.descLimit}</label>
                <input
                  type="number"
                  value={descriptionLimit}
                  onChange={(e) => setDescriptionLimit(parseInt(e.target.value) || 160)}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">{t.metaLabel}</label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.metaPlaceholder}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        );
      case 'audit':
        return (
          <>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-700">{t.urlLabel}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="url"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-zinc-500 italic">{t.auditNote}</p>
            </div>
          
          {/* Audit History Section */}
          {activeTool === 'audit' && auditHistory.length > 0 && (
            <div className="mt-8 pt-8 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-zinc-400" />
                  {t.auditHistory}
                </h4>
                <button 
                  onClick={clearHistory}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                >
                  {t.clearHistory}
                </button>
              </div>
              <div className="space-y-2">
                {auditHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-indigo-200 transition-colors cursor-pointer group"
                    onClick={() => setInput(item.url)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-sm font-medium text-zinc-900 truncate">{item.url}</div>
                        <div className="text-[10px] text-zinc-400">{item.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        item.score >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.score}
                      </div>
                      <ArrowRight className="w-3 h-3 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
      case 'urlModifier':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700">{t.urlModifierLabel}</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.urlModifierPlaceholder}
                className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Header lang={lang} setLang={setLang} t={t} />
      
      <div className="flex">
        <Sidebar activeTool={activeTool} setActiveTool={(t) => { setActiveTool(t); setResult(null); setInput(''); }} t={t} />
        
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">{t.aiSeoAssistant}</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              {activeTool === 'keywords' && t.keywordIntelligence}
              {activeTool === 'content' && t.contentOptimization}
              {activeTool === 'meta' && t.metaTagGeneration}
              {activeTool === 'urlModifier' && (t.urlOptimization || "URL Optimization")}
              {activeTool === 'audit' && t.fullSiteAudit}
            </h2>
            <p className="mt-3 text-lg text-zinc-500">
              {activeTool === 'keywords' && t.keywordDesc}
              {activeTool === 'content' && t.contentDesc}
              {activeTool === 'meta' && t.metaDesc}
              {activeTool === 'urlModifier' && t.urlModifierDesc}
              {activeTool === 'audit' && t.auditDesc}
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              {renderToolInput()}
              <button
                onClick={handleAction}
                disabled={loading || !input.trim()}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                  loading || !input.trim() 
                    ? 'bg-zinc-300 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    {t.generateInsights}
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6 bg-zinc-50/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {t.analysisResults}
                    </h3>
                    <div className="flex items-center gap-2">
                      {copyFeedback && <span className="text-xs text-emerald-600 font-medium">{t.copySuccess}</span>}
                      <button 
                        onClick={handleCopy}
                        className="text-zinc-400 hover:text-indigo-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-zinc prose-indigo max-w-none prose-sm sm:prose-base">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm overflow-x-auto markdown-body">
                      <Markdown>{result}</Markdown>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {t.seoScore}
                      </div>
                      <div className="text-2xl font-black text-emerald-800">84/100</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
                        <AlertCircle className="w-4 h-4" />
                        {t.keyIssues}
                      </div>
                      <div className="text-2xl font-black text-amber-800">3 {t.found}</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-1">
                        <ArrowRight className="w-4 h-4" />
                        {t.nextStep}
                      </div>
                      <div className="text-sm font-medium text-indigo-800">Optimize H1 Tags</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!result && !loading && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/30">
                <h4 className="font-bold text-zinc-900 mb-2">{t.whyUse}</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {t.whyUseDesc}
                </p>
              </div>
              <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/30">
                <h4 className="font-bold text-zinc-900 mb-2">{t.proTip}</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {t.proTipDesc}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
      
      <footer className="mt-20 border-t border-zinc-200 py-10 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-6">
            <a href="#" className="text-zinc-400 hover:text-zinc-600"><Globe className="w-5 h-5" /></a>
            <a href="#" className="text-zinc-400 hover:text-zinc-600"><BarChart3 className="w-5 h-5" /></a>
            <a href="#" className="text-zinc-400 hover:text-zinc-600"><Settings className="w-5 h-5" /></a>
          </div>
          <p className="text-zinc-400 text-sm">{t.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
