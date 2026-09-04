import React, { useState, useEffect } from 'react';
import { EyeOff, ShieldCheck, Lock } from 'lucide-react';
import { logSecurityEvent } from '../crypto/workerClient';

interface ScreenPrivacyGuardProps {
  children: React.ReactNode;
}

export function ScreenPrivacyGuard({ children }: ScreenPrivacyGuardProps) {
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [isEnvironmentTrusted, setIsEnvironmentTrusted] = useState(true);

  useEffect(() => {
    // 1. Page Visibility API: Auto-blur & mute when window loses focus or user switches tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBackgrounded(true);
        // Instant audio mute
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        logSecurityEvent('CRYPTO_WIPE_EXECUTED', 'INFO', 'App backgrounded. Audio muted and DOM veiled.');
      } else {
        setIsBackgrounded(false);
      }
    };

    const handleWindowBlur = () => {
      setIsBackgrounded(true);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    const handleWindowFocus = () => {
      setIsBackgrounded(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // 2. Environment Attestation: Verify secure execution context
    if (typeof window !== 'undefined') {
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsEnvironmentTrusted(isSecure);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none">
      {/* Underlying Application Content */}
      <div
        className={`transition-all duration-300 ${
          isBackgrounded ? 'filter blur-2xl opacity-10 pointer-events-none' : ''
        }`}
      >
        {children}
      </div>

      {/* Screen Privacy Veil (Displayed when tab or window is backgrounded) */}
      {isBackgrounded && (
        <div className="fixed inset-0 z-[9999] bg-stone-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center text-stone-100 select-none">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <EyeOff className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Screen Privacy Shield Active
          </h2>
          <p className="text-xs text-stone-400 max-w-sm mb-4">
            The journal has automatically concealed your reflections and muted audio output because this window lost focus.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5" />
            Click or focus this window to restore
          </div>
        </div>
      )}
    </div>
  );
}
