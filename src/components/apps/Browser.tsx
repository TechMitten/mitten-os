'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  X,
  Plus,
  AlertTriangle,
  Home,
} from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  url: string;
}

const QUICK_LINKS = [
  { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📚' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org', icon: '📖' },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: '🔴' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', icon: '🟠' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'tab-1', title: 'New Tab', url: '' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tabCounter = useRef(1);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  // Clock update — defer first render to avoid hydration mismatch
  useEffect(() => {
    const update = () => {
      setCurrentTime(formatTime());
    };
    const rafId = requestAnimationFrame(update);
    const interval = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const navigate = useCallback(
    (rawUrl: string) => {
      let url = rawUrl.trim();
      if (!url) return;

      // Add https:// if no protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Check if it looks like a URL (has a dot)
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          // Treat as search query
          url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
        }
      }

      setIframeError(false);
      setLoading(true);

      // Update tab
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                url,
                title: url
                  .replace(/^https?:\/\//, '')
                  .split('/')[0],
              }
            : t
        )
      );
      setInputUrl(url);
    },
    [activeTabId]
  );

  const handleRefresh = useCallback(() => {
    if (!activeTab.url) return;
    setLoading(true);
    setIframeError(false);
    // Force iframe reload by re-setting the src
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 50);
    }
  }, [activeTab.url]);

  const handleGoBack = useCallback(() => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.back();
      } catch {
        // Cross-origin
      }
    }
  }, []);

  const handleGoForward = useCallback(() => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.forward();
      } catch {
        // Cross-origin
      }
    }
  }, []);

  const handleNewTab = useCallback(() => {
    tabCounter.current++;
    const newTab: Tab = {
      id: `tab-${tabCounter.current}`,
      title: 'New Tab',
      url: '',
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInputUrl('');
    setIframeError(false);
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (remaining.length === 0) {
          // Create a new tab if all are closed
          tabCounter.current++;
          const newTab: Tab = {
            id: `tab-${tabCounter.current}`,
            title: 'New Tab',
            url: '',
          };
          setActiveTabId(newTab.id);
          setInputUrl('');
          return [newTab];
        }
        if (tabId === activeTabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActive = remaining[Math.min(idx, remaining.length - 1)];
          setActiveTabId(newActive.id);
          setInputUrl(newActive.url);
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setLoading(false);
    setIframeError(true);
  }, []);

  const handleHomepageSearch = useCallback(
    (query: string) => {
      navigate(query);
    },
    [navigate]
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none">
      {/* Tab bar */}
      <div className="h-8 bg-zinc-800/30 flex items-center px-1 gap-0.5 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTabId(tab.id);
              setInputUrl(tab.url);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors min-w-0 max-w-[180px] group ${
              tab.id === activeTabId
                ? 'bg-zinc-900 text-white/80'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{tab.title || 'New Tab'}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleNewTab}
          className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="h-10 bg-zinc-800/60 border-b border-white/5 flex items-center px-2 gap-2 shrink-0">
        {/* Navigation buttons */}
        <button
          onClick={handleGoBack}
          className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleGoForward}
          className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          title="Go Forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleRefresh}
          className={`p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors ${
            loading ? 'animate-spin' : ''
          }`}
          title="Refresh"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Home button */}
        <button
          onClick={() => {
            setTabs((prev) =>
              prev.map((t) =>
                t.id === activeTabId ? { ...t, url: '', title: 'New Tab' } : t
              )
            );
            setInputUrl('');
            setIframeError(false);
          }}
          className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* URL bar */}
        <div className="flex-1 flex items-center">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(inputUrl);
              }
            }}
            placeholder="Search or enter URL..."
            className="flex-1 h-7 bg-zinc-700/50 rounded-md px-3 text-sm text-white/80 outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-white/30"
          />
        </div>

        {/* Go button */}
        <button
          onClick={() => navigate(inputUrl)}
          className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          title="Go"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-0.5 bg-zinc-800 shrink-0 overflow-hidden">
          <div className="h-full bg-amber-500 animate-pulse w-2/3" />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab.url ? (
          <>
            {/* iframe warning */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-[10px] text-amber-400/80">
                Some websites may not load in this embedded browser due to security restrictions.
              </span>
            </div>
            {iframeError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white/60 p-8">
                <AlertTriangle className="w-12 h-12 text-red-400/60 mb-4" />
                <h3 className="text-lg font-medium mb-2">Unable to Load Page</h3>
                <p className="text-sm text-white/40 text-center max-w-md mb-4">
                  The website at <span className="text-white/60">{activeTab.url}</span> could not
                  be loaded. This may be due to security restrictions that prevent embedding in
                  iframes.
                </p>
                <button
                  onClick={handleRefresh}
                  className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={activeTab.url}
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Browser content"
              />
            )}
          </>
        ) : (
          /* Homepage */
          <Homepage
            currentTime={currentTime}
            onSearch={handleHomepageSearch}
            onQuickLink={navigate}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Homepage Component ──────────────────────────────────── */

function Homepage({
  currentTime,
  onSearch,
  onQuickLink,
}: {
  currentTime: string | null;
  onSearch: (query: string) => void;
  onQuickLink: (url: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-8">
      {/* Greeting & Clock */}
      <div className="text-center mb-8">
        <p className="text-6xl font-light text-white/80 mb-2 tracking-tight">
          {currentTime ?? '\u00A0\u00A0\u00A0\u00A0\u00A0'}
        </p>
        <p className="text-lg text-white/40">{currentTime ? getGreeting() : '\u00A0'}</p>
      </div>

      {/* Search bar */}
      <div className="w-full max-w-lg mb-10">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                onSearch(searchQuery);
              }
            }}
            placeholder="Search the web..."
            className="w-full h-12 bg-zinc-700/40 border border-white/10 rounded-xl pl-11 pr-4 text-sm text-white/80 outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/30 placeholder:text-white/30 transition-all"
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.name}
            onClick={() => onQuickLink(link.url)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg group-hover:bg-white/10 transition-colors">
              {link.icon}
            </div>
            <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">
              {link.name}
            </span>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-white/15 mt-10 text-center">
        Note: Many websites block iframe embedding. Search with DuckDuckGo for best results.
      </p>
    </div>
  );
}
