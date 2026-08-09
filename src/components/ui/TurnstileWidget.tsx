'use client';

import React, { useEffect, useRef, useState } from 'react';
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

    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      window.onloadTurnstileCallback = () => {
        setScriptLoaded(true);
      };

      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn('[Cloudflare Turnstile] Script failed to load.');
        const isDev = isDevOrigin();
        if (isDev) {
          console.warn('[Cloudflare Turnstile] Local development origin detected; bypassing Turnstile verification.');
          setDomainError(null);
          setDevBypassed(true);
          onVerify('bypassed-dev-domain-script-error');
        } else {
          setDomainError('Turnstile script failed to load. Please check your network or ad-blocker.');
          if (onError) onError('script-failed-to-load');
        }
      };
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        setScriptLoaded(true);
      } else {
        const prevOnload = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = () => {
          if (prevOnload) prevOnload();
          setScriptLoaded(true);
        };
      }
    }
  }, [siteKey, onVerify, onError]);

  // Render or re-render widget
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile || !siteKey || !siteKey.trim()) {
      return;
    }

    // If already bypassed or errored in dev, do not attempt to render
    if (devBypassed) {
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
        theme: 'dark',
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
  }, [scriptLoaded, siteKey, onVerify, onExpire, onError, devBypassed]);

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
