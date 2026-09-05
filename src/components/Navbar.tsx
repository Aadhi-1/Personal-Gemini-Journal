import React from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  ShieldCheck,
  Shield,
  LogOut,
  Mic,
  Fingerprint,
  HeartHandshake,
  BarChart3,
  HelpCircle,
  Palette,
  MessageSquareQuote,
} from 'lucide-react';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';

interface NavbarProps {
  user: User | null;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
  onOpenJarvisVoice?: () => void;
  onOpenPasskeyModal?: () => void;
  onTriggerSafeMode?: () => void;
  onOpenMoodInsights?: () => void;
  onOpenVoiceGuide?: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenThemeCustomizer?: () => void;
  onOpenVoiceCheckIn?: () => void;
  isAdmin?: boolean;
  isDuressDecoy?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onOpenSecurityModal,
  onOpenJarvisVoice,
  onOpenPasskeyModal,
  onTriggerSafeMode,
  onOpenMoodInsights,
  onOpenVoiceGuide,
  onOpenAdminDashboard,
  onOpenThemeCustomizer,
  onOpenVoiceCheckIn,
  isAdmin = true,
  isDuressDecoy,
}) => {
  const { currentTheme, accentColorId, activeVoice } = useTheme();

  return (
    <header
      id="app-header"
      className="border-b sticky top-0 z-40 select-none backdrop-blur-md transition-colors"
      style={{
        backgroundColor: `${currentTheme.bgSurface}ee`,
        borderColor: currentTheme.borderColor,
        color: currentTheme.textMain,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs transition-colors"
            style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base sm:text-lg">
                Reflections
              </span>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold border"
                style={{
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}20`,
                  borderColor: `${ACCENT_COLORS[accentColorId].hex}40`,
                  color: ACCENT_COLORS[accentColorId].hex,
                }}
              >
                Zero-Knowledge VUI
              </span>
            </div>
            <p className="text-[11px] hidden sm:block opacity-75" style={{ color: currentTheme.textMuted }}>
              Ambient Voice Interface • FIDO2 Passkeys • Military-Grade Enclave
            </p>
          </div>
        </div>

        {/* Right Section: Theme Customizer, Voice Concierge, Jarvis, Passkey, Insights, Admin */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Voice Check-in Concierge Quick Button */}
          {user && onOpenVoiceCheckIn && (
            <button
              id="open-voice-checkin-button"
              type="button"
              onClick={onOpenVoiceCheckIn}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
              title="Voice Check-in: Ask by voice whether to type or dictate your reflection"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Voice Check-in</span>
            </button>
          )}

          {/* Theme & Companion Voice Personalizer Button */}
          {onOpenThemeCustomizer && (
            <button
              id="open-theme-customizer-button"
              type="button"
              onClick={onOpenThemeCustomizer}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs hover:scale-105 active:scale-95 transition-all"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Personalize Themes, Colors & Multiple AI Companion Voices"
            >
              <Palette className="w-4 h-4" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
              <span className="hidden md:inline">{currentTheme.name}</span>
            </button>
          )}

          {/* Jarvis Ambient Voice Button */}
          {user && onOpenJarvisVoice && (
            <button
              id="open-jarvis-voice-button"
              type="button"
              onClick={onOpenJarvisVoice}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs transition-all active:scale-95"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                color: currentTheme.textMain,
              }}
              title={`Launch ${activeVoice.name} Voice Mode (Low-Literacy & Hands-Free)`}
            >
              <MessageSquareQuote className="w-4 h-4 text-amber-500" />
              <span className="hidden lg:inline">{activeVoice.name} Mode</span>
            </button>
          )}

          {/* Mood Insights (D3.js) Button */}
          {user && onOpenMoodInsights && (
            <button
              id="open-mood-insights-button"
              type="button"
              onClick={onOpenMoodInsights}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-2xs"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Mood Insights: Local Enclave D3.js Visualization (Last 30 Days)"
            >
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className="hidden xl:inline">Insights</span>
            </button>
          )}

          {/* Voice Command Guide Button */}
          {user && onOpenVoiceGuide && (
            <button
              id="open-voice-guide-button"
              type="button"
              onClick={onOpenVoiceGuide}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 transition-colors"
              title="Voice Command Guide & Natural Language Reference"
            >
              <HelpCircle className="w-4 h-4 text-stone-500" />
              <span className="hidden xl:inline ml-1 text-xs">Voice Guide</span>
            </button>
          )}

          {/* FIDO2 Passkeys Vault */}
          {user && onOpenPasskeyModal && (
            <button
              id="open-passkey-vault-button"
              type="button"
              onClick={onOpenPasskeyModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-colors"
              title="FIDO2 Passkeys & Plausible Deniability Vault"
            >
              <Fingerprint className="w-4 h-4 text-amber-600" />
              <span className="hidden lg:inline">Passkey Vault</span>
            </button>
          )}

          {/* Safe Mode / Crisis Button */}
          {user && onTriggerSafeMode && (
            <button
              id="navbar-safe-mode-button"
              type="button"
              onClick={onTriggerSafeMode}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
              title="Safe Mode Assistance & Crisis Lifeline"
            >
              <HeartHandshake className="w-4 h-4" />
            </button>
          )}

          {/* Admin Dashboard (RBAC & Notifications) */}
          {onOpenAdminDashboard && (
            <button
              id="navbar-admin-dashboard-button"
              type="button"
              onClick={onOpenAdminDashboard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs"
              title="Admin Dashboard: Role-Based Access Control, Webhooks & Telemetry"
            >
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Admin</span>
              {isAdmin && (
                <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1 py-0.5 rounded font-mono font-bold leading-none">
                  RBAC
                </span>
              )}
            </button>
          )}

          {/* Security Architecture Transparency */}
          <button
            id="security-info-button"
            type="button"
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            title="Zero-Knowledge Security Architecture"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden xl:inline">Zero-Trust</span>
          </button>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <button
                id="sign-out-button"
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-300"
                title="Lock session & sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
