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
} from 'lucide-react';

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
  isAdmin = true,
  isDuressDecoy,
}) => {
  return (
    <header
      id="app-header"
      className="border-b border-stone-200 bg-stone-50/90 backdrop-blur-md sticky top-0 z-40 select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center text-amber-300 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 tracking-tight text-base sm:text-lg">
                Reflections
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                Zero-Knowledge VUI
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Ambient Voice Interface • FIDO2 Passkeys • Military-Grade Enclave
            </p>
          </div>
        </div>

        {/* Right Section: Jarvis Voice, Passkey, Insights, Security Badge & User Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Jarvis Ambient Voice Button */}
          {user && onOpenJarvisVoice && (
            <button
              id="open-jarvis-voice-button"
              type="button"
              onClick={onOpenJarvisVoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 transition-all shadow-xs active:scale-95"
              title="Launch Jarvis Ambient Voice Mode (Low-Literacy & Hands-Free)"
            >
              <Mic className="w-4 h-4 animate-pulse text-stone-950" />
              <span className="hidden sm:inline">Jarvis Voice</span>
            </button>
          )}

          {/* Mood Insights (D3.js) Button */}
          {user && onOpenMoodInsights && (
            <button
              id="open-mood-insights-button"
              type="button"
              onClick={onOpenMoodInsights}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:border-amber-400 hover:bg-amber-50/50 transition-colors shadow-2xs"
              title="Mood Insights: Local Enclave D3.js Visualization (Last 30 Days)"
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">Mood Insights</span>
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
