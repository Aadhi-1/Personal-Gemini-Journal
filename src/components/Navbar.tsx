import React, { useState } from 'react';
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
  MoreVertical,
  X,
  ChevronRight,
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
  isAdmin,
  isDuressDecoy,
}) => {
  const { currentTheme, accentColorId, activeVoice } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs transition-colors shrink-0"
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
                className="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                style={{
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}20`,
                  borderColor: `${ACCENT_COLORS[accentColorId].hex}40`,
                  color: ACCENT_COLORS[accentColorId].hex,
                }}
              >
                Zero-Knowledge
              </span>
            </div>
            <p className="text-[11px] hidden md:block opacity-75" style={{ color: currentTheme.textMuted }}>
              Ambient Voice Interface • FIDO2 Passkeys • Military-Grade Enclave
            </p>
          </div>
        </div>

        {/* Desktop Buttons (Visible on XL screens) */}
        <div className="hidden xl:flex items-center gap-2">
          {/* Voice Check-in Concierge Quick Button */}
          {user && onOpenVoiceCheckIn && (
            <button
              id="open-voice-checkin-button"
              type="button"
              onClick={onOpenVoiceCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
              title="Voice Check-in: Ask by voice whether to type or dictate your reflection"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Voice Check-in</span>
            </button>
          )}

          {/* Theme & Companion Voice Personalizer Button */}
          {onOpenThemeCustomizer && (
            <button
              id="open-theme-customizer-button"
              type="button"
              onClick={onOpenThemeCustomizer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Personalize Themes, Colors & Multiple AI Companion Voices"
            >
              <Palette className="w-4 h-4" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
              <span>{currentTheme.name}</span>
            </button>
          )}

          {/* Jarvis Ambient Voice Button */}
          {user && onOpenJarvisVoice && (
            <button
              id="open-jarvis-voice-button"
              type="button"
              onClick={onOpenJarvisVoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs transition-all active:scale-95 cursor-pointer"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                color: currentTheme.textMain,
              }}
              title={`Launch ${activeVoice.name} Voice Mode (Low-Literacy & Hands-Free)`}
            >
              <MessageSquareQuote className="w-4 h-4 text-amber-500" />
              <span>{activeVoice.name} Mode</span>
            </button>
          )}

          {/* Mood Insights (D3.js) Button */}
          {user && onOpenMoodInsights && (
            <button
              id="open-mood-insights-button"
              type="button"
              onClick={onOpenMoodInsights}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-2xs cursor-pointer"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Mood Insights: Local Enclave D3.js Visualization (Last 30 Days)"
            >
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Insights</span>
            </button>
          )}

          {/* Voice Command Guide Button */}
          {user && onOpenVoiceGuide && (
            <button
              id="open-voice-guide-button"
              type="button"
              onClick={onOpenVoiceGuide}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Voice Command Guide & Natural Language Reference"
            >
              <HelpCircle className="w-4 h-4 text-stone-400" />
              <span className="ml-1 text-xs">Voice Guide</span>
            </button>
          )}

          {/* FIDO2 Passkeys Vault */}
          {user && onOpenPasskeyModal && (
            <button
              id="open-passkey-vault-button"
              type="button"
              onClick={onOpenPasskeyModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shadow-2xs"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="FIDO2 Passkeys & Plausible Deniability Vault"
            >
              <Fingerprint className="w-4 h-4 text-amber-500" />
              <span>Passkey Vault</span>
            </button>
          )}

          {/* Safe Mode / Crisis Button */}
          {user && onTriggerSafeMode && (
            <button
              id="navbar-safe-mode-button"
              type="button"
              onClick={onTriggerSafeMode}
              className="p-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
              title="Admin Dashboard: Role-Based Access Control, Webhooks & Telemetry"
            >
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Admin</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Zero-Knowledge Security Architecture"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-Trust</span>
          </button>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: currentTheme.borderColor }}>
              <button
                id="sign-out-button"
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer"
                style={{
                  borderColor: currentTheme.borderColor,
                  backgroundColor: currentTheme.bgSurface,
                  color: currentTheme.textMain,
                }}
                title="Lock session & sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile & Tablet Quick Actions (Visible below XL screens) */}
        <div className="flex xl:hidden items-center gap-2">
          {/* Quick Voice Check-in on phone/tablet */}
          {user && onOpenVoiceCheckIn && (
            <button
              id="mobile-voice-checkin-quick"
              type="button"
              onClick={onOpenVoiceCheckIn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
              title="Voice Check-in"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}

          {/* Quick Theme Switcher */}
          {onOpenThemeCustomizer && (
            <button
              type="button"
              onClick={onOpenThemeCustomizer}
              className="p-2 rounded-xl border shadow-2xs active:scale-95 transition-all cursor-pointer"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: currentTheme.bgSurface,
                color: currentTheme.textMain,
              }}
              title="Change Theme & AI Voice"
            >
              <Palette className="w-4 h-4" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
            </button>
          )}

          {/* The 3-Dots Consolidated Kebab Menu Button for Mobile & Tablet */}
          <button
            id="navbar-mobile-kebab-menu"
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl border shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            style={{
              borderColor: currentTheme.borderColor,
              backgroundColor: currentTheme.bgSurface,
              color: currentTheme.textMain,
            }}
            title="Open Full Features Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Slide-Over Menu Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className="fixed inset-y-0 right-0 max-w-sm w-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10 transition-transform animate-slide-left"
            style={{
              backgroundColor: currentTheme.bgSurface,
              color: currentTheme.textMain,
              borderColor: currentTheme.borderColor,
            }}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: currentTheme.borderColor }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Reflections Menu</h3>
                    <p className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                      {user ? user.email || 'Authenticated User' : 'Guest'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl border hover:opacity-80 transition-opacity"
                  style={{ borderColor: currentTheme.borderColor }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Sections */}
              <div className="mt-4 space-y-4">
                {/* Section 1: AI & Voice Assistants */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: currentTheme.textMuted }}>
                    AI & Voice Assistants
                  </div>
                  <div className="space-y-1">
                    {onOpenVoiceCheckIn && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenVoiceCheckIn();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{
                          backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                          borderColor: `${ACCENT_COLORS[accentColorId].hex}35`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Mic className="w-5 h-5 animate-pulse" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
                          <div>
                            <div className="text-xs font-bold">Voice Check-in Concierge</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Hands-free voice prompt setup
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}

                    {onOpenJarvisVoice && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenJarvisVoice();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquareQuote className="w-5 h-5 text-amber-500" />
                          <div>
                            <div className="text-xs font-bold">{activeVoice.name} Voice HUD</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Ambient spoken dialogues
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}

                    {onOpenVoiceGuide && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenVoiceGuide();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="text-xs font-bold">Voice Commands Guide</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Explore speech triggers & syntax
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 2: Atmosphere & Insights */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: currentTheme.textMuted }}>
                    Atmosphere & Insights
                  </div>
                  <div className="space-y-1">
                    {onOpenThemeCustomizer && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenThemeCustomizer();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <Palette className="w-5 h-5 text-purple-500" />
                          <div>
                            <div className="text-xs font-bold">Theme & Companion Voice</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Active: {currentTheme.name}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border" style={{ borderColor: currentTheme.borderColor }}>
                          Switch
                        </span>
                      </button>
                    )}

                    {onOpenMoodInsights && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenMoodInsights();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-5 h-5 text-amber-500" />
                          <div>
                            <div className="text-xs font-bold">30-Day Mood Insights</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Local Enclave D3.js visualization
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 3: Security & Enclave */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: currentTheme.textMuted }}>
                    Security & Enclave
                  </div>
                  <div className="space-y-1">
                    {onOpenPasskeyModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenPasskeyModal();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <Fingerprint className="w-5 h-5 text-amber-600" />
                          <div>
                            <div className="text-xs font-bold">FIDO2 Passkeys Vault</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Biometric plausible deniability
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenSecurityModal();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                      style={{ borderColor: currentTheme.borderColor }}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="text-xs font-bold">Zero-Trust Transparency</div>
                          <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                            AES-256-GCM enclave proof
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>

                    {onOpenAdminDashboard && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenAdminDashboard();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border hover:opacity-90 transition-all text-left"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-indigo-600" />
                          <div>
                            <div className="text-xs font-bold">Admin RBAC Dashboard</div>
                            <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                              Audit logs, webhooks & telemetry
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold font-mono">
                          RBAC
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 4: Safety & Crisis */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: currentTheme.textMuted }}>
                    Emergency & Lifeline
                  </div>
                  <div className="space-y-1">
                    {onTriggerSafeMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onTriggerSafeMode();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <HeartHandshake className="w-5 h-5 text-rose-600" />
                          <div>
                            <div className="text-xs font-bold">Safe Mode Assistance</div>
                            <div className="text-[11px] text-rose-600/80">
                              Immediate distress lifeline & calming resources
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-rose-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Sign Out */}
            {user && (
              <div className="pt-4 mt-6 border-t" style={{ borderColor: currentTheme.borderColor }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
                  style={{ borderColor: currentTheme.borderColor }}
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Lock Session & Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
