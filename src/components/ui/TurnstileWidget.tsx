'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDesktopStore } from '@/stores/desktop-store';
import { ShieldCheck, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: 'auto' | 'light' | 'dark';
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      ready?: (callback: () => void) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  className?: string;
}

/**
 * Checks whether the current window origin is a local/development environment.
 */
function isDevOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.endsWith('.github.dev') ||
    hostname.endsWith('.app.github.dev') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    process.env.NODE_ENV === 'development'
  );
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const theme = useDesktopStore((s) => s.theme) || 'dark';
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [devBypassed, setDevBypassed] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    // If no site key is configured, bypass Turnstile
    if (!siteKey || !siteKey.trim()) {
      onVerify('bypassed-no-key');
      return;
    }

    // Check if script is already present and ready
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    // Define global callback for script load
    window.onloadTurnstileCallback = () => {
      setScriptLoaded(true);
    };

    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        if (isDevOrigin()) {
          console.warn(
            '[Turnstile] Failed to load Cloudflare Turnstile script in dev environment. Bypassing verification.'
          );
          setDevBypassed(true);
          onVerify('bypassed-script-load-error');
        } else if (onError) {
          onError('Failed to load Cloudflare Turnstile script');
        }
      };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [siteKey, onVerify, onError]);

  useEffect(() => {
    if (
      !scriptLoaded ||
      !siteKey ||
      !siteKey.trim() ||
      !containerRef.current ||
      !window.turnstile
    ) {
      return;
    }

    // Clean up previous widget if exists
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey.trim(),
        theme: theme === 'dark' ? 'dark' : 'light',
        size: 'flexible',
        callback: (token: string) => {
          setDomainError(null);
          setDevBypassed(false);
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': (code?: string) => {
          const codeStr = String(code || '');
          console.warn(`[Cloudflare Turnstile] Widget reported error code: ${codeStr}`);

          if (codeStr === '110200' || codeStr.includes('110200')) {
            const isDev = isDevOrigin();
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            console.warn(
              `[Cloudflare Turnstile] Domain "${host}" is not authorized for sitekey "${siteKey}".` +
                (isDev
                  ? ' Local development origin detected; automatically bypassing security challenge.'
                  : ' Please add this domain to the Cloudflare Turnstile dashboard.')
            );

            if (isDev) {
              setDomainError(null);
              setDevBypassed(true);
              onVerify('bypassed-dev-domain-110200');
              return;
            } else {
              setDomainError(`Domain not authorized for Turnstile (${codeStr})`);
            }
          }

          if (onError) {
            onError(codeStr);
          }
        },
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.warn('[Turnstile] Render error:', err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, theme, onVerify, onExpire, onError]);

  if (!siteKey || !siteKey.trim()) {
    return null;
  }

  return (
    <div className={`turnstile-wrapper flex flex-col items-center justify-center my-2 ${className}`}>
      {devBypassed ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fadeIn">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Security check passed (Dev Mode)</span>
        </div>
      ) : domainError ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span>{domainError}</span>
        </div>
      ) : (
        <div ref={containerRef} className="min-h-[65px] flex items-center justify-center w-full" />
      )}
    </div>
  );
}
