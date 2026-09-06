import React from 'react';
import { Sparkles, Shield, Lock, Brain, MessageSquare, Database, ArrowRight } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface LandingPageProps {
  onSignIn: () => void;
  onExploreGuest?: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onExploreGuest,
  isLoading,
  errorMessage,
}) => {
  const { currentTheme } = useTheme();

  return (
    <div id="landing-page" className="min-h-[calc(100vh-4rem)] flex flex-col justify-between transition-colors" style={{ backgroundColor: currentTheme.bgMain, color: currentTheme.textMain }}>
      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 shadow-xs border"
            style={{
              backgroundColor: currentTheme.bgSurface,
              borderColor: currentTheme.borderColor,
              color: currentTheme.textMain,
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Private AI Reflections with Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mb-6" style={{ color: currentTheme.textMain }}>
            A secure, contemplative journal for your thoughts and ideas.
          </h1>

          {/* Description */}
          <p className="text-lg leading-relaxed mb-8 max-w-2xl mx-auto opacity-80" style={{ color: currentTheme.textMuted }}>
            Engage in thoughtful multi-turn dialogues with Gemini, explore life decisions, unpack creative blocks, and save private insights to your isolated Cloud Firestore vault.
          </p>

          {/* Sign In & Guest Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              id="google-sign-in-button"
              type="button"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
              )}
              <span>{isLoading ? 'Connecting with Google...' : 'Sign In with Google'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 text-stone-300" />}
            </button>

            {onExploreGuest && (
              <button
                id="explore-guest-mode-button"
                type="button"
                onClick={onExploreGuest}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border active:scale-[0.99] transition-all shadow-xs cursor-pointer"
                style={{
                  backgroundColor: currentTheme.bgSurface,
                  borderColor: currentTheme.borderColor,
                  color: currentTheme.textMain,
                }}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Try Instant Guest Mode</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-lg max-w-md mx-auto mb-6">
              {errorMessage}
            </div>
          )}

          <p className="text-xs opacity-70" style={{ color: currentTheme.textMuted }}>
            Federated Google Authentication • No passwords stored • Strict user data isolation
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div
            className="p-6 rounded-2xl border shadow-xs transition-colors"
            style={{
              backgroundColor: currentTheme.bgSurface,
              borderColor: currentTheme.borderColor,
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base mb-2" style={{ color: currentTheme.textMain }}>
              Strict User Isolation
            </h3>
            <p className="text-sm leading-relaxed opacity-80" style={{ color: currentTheme.textMuted }}>
              Every journal entry is saved under your private UID document path (<code className="text-xs font-mono px-1 py-0.5 rounded" style={{ backgroundColor: `${currentTheme.borderColor}80` }}>/users/{'{uid}'}/interactions</code>). Other users cannot read or write your thoughts.
            </p>
          </div>

          <div
            className="p-6 rounded-2xl border shadow-xs transition-colors"
            style={{
              backgroundColor: currentTheme.bgSurface,
              borderColor: currentTheme.borderColor,
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base mb-2" style={{ color: currentTheme.textMain }}>
              Gemini 3.6 Flash Multi-Turn
            </h3>
            <p className="text-sm leading-relaxed opacity-80" style={{ color: currentTheme.textMuted }}>
              Converse naturally with multiple turns. Choose between Deep Reflection, Summary & Takeaways, Creative Brainstorming, or Socratic inquiry modes.
            </p>
          </div>

          <div
            className="p-6 rounded-2xl border shadow-xs transition-colors"
            style={{
              backgroundColor: currentTheme.bgSurface,
              borderColor: currentTheme.borderColor,
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base mb-2" style={{ color: currentTheme.textMain }}>
              Zero-Exposure Secret Architecture
            </h3>
            <p className="text-sm leading-relaxed opacity-80" style={{ color: currentTheme.textMuted }}>
              All Gemini AI requests are securely executed on the backend Express server with automated model fallbacks. API credentials are never bundled into client code.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs opacity-75"
        style={{
          borderColor: currentTheme.borderColor,
          backgroundColor: currentTheme.bgSurface,
          color: currentTheme.textMuted,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gemini Reflections & Journal • Built with Firebase & Gemini API</span>
          <span>Firestore Enterprise Edition Rules Enforced</span>
        </div>
      </footer>
    </div>
  );
};
