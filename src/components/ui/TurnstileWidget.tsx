'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDesktopStore } from '@/stores/desktop-store';

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

  useEffect(() => {
    // If no site key is configured, bypass Turnstile
    if (!siteKey || !siteKey.trim()) {
      onVerify('bypassed-no-key');
      return;
    }

    // Check if script is already present
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        if (onError) onError('Failed to load Cloudflare Turnstile script');
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
    if (!scriptLoaded || !siteKey || !siteKey.trim() || !containerRef.current || !window.turnstile) {
      return;
    }

    // Clean up previous widget if exists
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey.trim(),
        theme: theme === 'dark' ? 'dark' : 'light',
        size: 'flexible',
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': (code?: string) => {
          if (onError) onError(code);
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
    <div className={`turnstile-wrapper flex justify-center my-2 ${className}`}>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
    </div>
  );
}
