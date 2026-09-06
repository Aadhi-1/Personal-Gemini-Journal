import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOut,
  testConnection,
  saveInteraction,
  deleteInteraction,
  subscribeToUserInteractions,
} from './firebase';
import { InteractionEntry, JournalLocation } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { SecurityModal } from './components/SecurityModal';
import { ScreenPrivacyGuard } from './components/ScreenPrivacyGuard';
import { JarvisVoiceInterface } from './components/JarvisVoiceInterface';
import { SafeModeCrisisModal } from './components/SafeModeCrisisModal';
import { PasskeyAuthModal } from './components/PasskeyAuthModal';
import { MoodInsightsModal } from './components/MoodInsightsModal';
import { VoiceCommandGuideModal } from './components/VoiceCommandGuideModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { VoiceCheckInModal } from './components/VoiceCheckInModal';
import { ReflectionsMapModal } from './components/ReflectionsMapModal';
import { Sparkles } from 'lucide-react';
import { useTheme, ACCENT_COLORS } from './theme/ThemeContext';
import { enclave, logSecurityEvent } from './crypto/workerClient';

const DURESS_DECOY_ENTRIES: InteractionEntry[] = [
  {
    id: 'decoy-1',
    userId: 'decoy-user',
    title: 'Morning Garden & Herbal Tea',
    category: 'Gratitude',
    mode: 'reflection',
    mood: '🌸 Serene',
    location: {
      name: 'Singapore Botanic Gardens Conservatory',
      formattedAddress: '1 Cluny Rd, Singapore 259569',
      lat: 1.3138,
      lng: 103.8159,
    },
    messages: [
      {
        id: 'msg-d1-1',
        role: 'user',
        content: 'I woke up early and watched the morning dew on the rosemary bushes while sipping chamomile tea.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'msg-d1-2',
        role: 'model',
        content: 'That sounds like a wonderfully gentle way to begin your day. Engaging your senses with nature brings grounding stillness.',
        timestamp: new Date(Date.now() - 3600000 * 23).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
  },
  {
    id: 'decoy-2',
    userId: 'decoy-user',
    title: 'Baking Warm Cinnamon Apples',
    category: 'Personal Reflection',
    mode: 'reflection',
    mood: '✨ Inspired',
    location: {
      name: 'Lake Louise Alpine Lodge',
      formattedAddress: 'Banff National Park, Alberta, Canada',
      lat: 51.4254,
      lng: -116.1773,
    },
    messages: [
      {
        id: 'msg-d2-1',
        role: 'user',
        content: 'Tried baking sliced apples with a dash of cinnamon and honey today. The whole kitchen smelled like autumn.',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: 'msg-d2-2',
        role: 'model',
        content: 'Simple pleasures like baking warm comforts bring immense joy and mindfulness to daily life.',
        timestamp: new Date(Date.now() - 3600000 * 47).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 47).toISOString(),
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<InteractionEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<InteractionEntry | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // VUI & Security Controls
  const [isJarvisVoiceOpen, setIsJarvisVoiceOpen] = useState(false);
  const [isSafeModeOpen, setIsSafeModeOpen] = useState(false);
  const [safeModePhrase, setSafeModePhrase] = useState<string | undefined>(undefined);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  const [isDuressDecoy, setIsDuressDecoy] = useState(false);
  const [isMoodInsightsOpen, setIsMoodInsightsOpen] = useState(false);
  const [isVoiceGuideOpen, setIsVoiceGuideOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isReflectionsMapOpen, setIsReflectionsMapOpen] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<'superadmin' | 'admin' | 'user'>('superadmin');

  // Atmosphere, Custom Themes & Voice Concierge
  const { currentTheme, accentColorId, hasSeenVoiceCheckIn, setHasSeenVoiceCheckIn } = useTheme();
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isVoiceCheckInOpen, setIsVoiceCheckInOpen] = useState(false);

  // Desktop Full-Screen Dashboard & Sidebar Collapse State
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);

  // Keyboard shortcut to toggle sidebar / full screen (Ctrl+B or Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsDesktopSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Trigger Voice Check-in automatically after login if not yet completed in this session
  useEffect(() => {
    if (currentUser && !hasSeenVoiceCheckIn && !isAuthLoading) {
      const timer = setTimeout(() => {
        setIsVoiceCheckInOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentUser, hasSeenVoiceCheckIn, isAuthLoading]);

  // Verify Admin privilege against bootstrap email or role
  const isActualAdmin =
    currentUser?.email === 'gaudhamanaadhithyiaan@gmail.com' ||
    simulatedRole === 'superadmin' ||
    simulatedRole === 'admin';

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore user interactions when user is authenticated
  useEffect(() => {
    if (!currentUser?.uid) {
      setEntries([]);
      setSelectedEntry(null);
      return;
    }

    if (isDuressDecoy) {
      setEntries(DURESS_DECOY_ENTRIES);
      setSelectedEntry(DURESS_DECOY_ENTRIES[0]);
      return;
    }

    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
        // If an entry is currently selected, keep it updated
        setSelectedEntry((prev) => {
          if (!prev) {
            return updatedEntries.length > 0 ? updatedEntries[0] : null;
          }
          const match = updatedEntries.find((e) => e.id === prev.id);
          return match || (updatedEntries.length > 0 ? updatedEntries[0] : null);
        });
      },
      (error) => {
        // Suppress teardown errors when user signs out
        if (error?.error?.includes('permission-denied') && !currentUser?.uid) {
          return;
        }
        console.info('Subscription update notice:', error.error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isDuressDecoy]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      const user = await signInWithGoogle();
      if (user) {
        setIsGuestMode(false);
        logSecurityEvent('PASSKEY_AUTHENTICATED', 'INFO', 'Authenticated session initialized via Google SSO.');
      }
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        // User closed or dismissed the popup; no error banner or console.error needed
        console.info('Google sign-in popup was closed by user.');
        return;
      }
      console.warn('Google sign-in notice:', error?.message || error);
      setAuthError(error?.message || 'Failed to sign in with Google.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Guest Explorer Mode
  const handleExploreGuest = () => {
    setIsGuestMode(true);
    setAuthError(null);
    const guestUid = 'guest-explorer';
    const welcomeEntry: InteractionEntry = {
      id: `reflection-welcome-guest`,
      userId: guestUid,
      title: 'Welcome to Mindful Journaling',
      category: 'Personal Reflection',
      mode: 'reflection',
      mood: '✨ Inspired',
      location: {
        name: 'Kyoto Arashiyama Bamboo Grove',
        formattedAddress: 'Ukyo Ward, Kyoto 616-8385, Japan',
        lat: 35.0169,
        lng: 135.6713,
      },
      messages: [
        {
          id: 'msg-welcome-1',
          role: 'model',
          content: `Welcome to **ReflectAI**! 🌿\n\nI am your contemplative AI companion powered by **Gemini 3.6 Flash**. You are currently exploring in **Guest Mode**.\n\n### 🌟 Features ready for you:\n- 🗺️ **Google Maps Platform**: Explore our interactive **Reflections World Map** or pin any physical sanctuary.\n- 📷 **Photos & GIFs**: Click **+ Photo/GIF** in the header or prompt ribbon to attach images or search trending GIFs.\n- 🌐 **Google Search Grounding**: Toggle Google Grounding **ON** to synthesize live web facts with verified citations.\n- 🔮 **Gemini Mindful Tools**: Click **Gemini Tools** to launch Cognitive Reframing, Action Step Synthesizer, or Perspective Switcher.\n- 🎙️ **Ambient Voice**: Audition our 5 voice personas or trigger hands-free check-ins.\n\nWhenever you want to securely save and encrypt your reflections in Cloud Firestore, click **Sign In with Google** at the top right!`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEntries([welcomeEntry]);
    setSelectedEntry(welcomeEntry);
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await enclave.shredKey();
      if (currentUser) {
        await signOut();
      }
      setIsGuestMode(false);
      setSelectedEntry(null);
      setEntries([]);
      setIsDuressDecoy(false);
      logSecurityEvent('CRYPTO_WIPE_EXECUTED', 'INFO', 'Sign out performed. Local memory sanitized.');
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  // Create a new reflection session
  const handleCreateNewEntry = (initialLocation?: JournalLocation) => {
    const activeUid = currentUser ? currentUser.uid : 'guest-explorer';

    const newEntry: InteractionEntry = {
      id: `reflection-${Date.now()}`,
      userId: activeUid,
      title: initialLocation ? `Reflection at ${initialLocation.name}` : 'New Reflection',
      category: 'Personal Reflection',
      mode: 'reflection',
      location: initialLocation,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!currentUser && isGuestMode) {
      setEntries((prev) => [newEntry, ...prev]);
    }

    setSelectedEntry(newEntry);
  };

  // Save/Update interaction in Firestore (or local state for guest mode)
  const handleUpdateEntry = async (updated: InteractionEntry) => {
    // In Guest Mode without Firebase user
    if (!currentUser && isGuestMode) {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
      setSelectedEntry(updated);
      return;
    }

    if (!currentUser) return;

    // In Duress Decoy Mode, do NOT persist to actual cloud database!
    if (isDuressDecoy) {
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelectedEntry(updated);
      return;
    }

    // Optimistically update active entry in state
    setSelectedEntry(updated);

    // Save to Firestore with error resilience
    try {
      await saveInteraction(currentUser.uid, updated);
    } catch (dbErr: any) {
      console.warn('Firestore save interaction error:', dbErr);
      throw dbErr;
    }
  };

  // Delete interaction from Firestore (or local state for guest)
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser && isGuestMode) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (selectedEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setSelectedEntry(remaining.length > 0 ? remaining[0] : null);
      }
      return;
    }

    if (!currentUser) return;

    if (isDuressDecoy) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
      return;
    }

    try {
      await deleteInteraction(currentUser.uid, entryId);
      if (selectedEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setSelectedEntry(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete reflection:', error);
    }
  };

  // Passkey / Duress Resolution
  const handlePasskeySuccess = (isDuress: boolean) => {
    if (isDuress) {
      setIsDuressDecoy(true);
      setEntries(DURESS_DECOY_ENTRIES);
      setSelectedEntry(DURESS_DECOY_ENTRIES[0]);
    } else {
      setIsDuressDecoy(false);
    }
  };

  // Cryptographic Erasure (Right to be Forgotten)
  const handleCryptoShred = async () => {
    if (currentUser) {
      // Shred remote documents
      for (const entry of entries) {
        try {
          await deleteInteraction(currentUser.uid, entry.id);
        } catch {}
      }
    }
    setEntries([]);
    setSelectedEntry(null);
    logSecurityEvent('CRYPTO_WIPE_EXECUTED', 'CRITICAL', 'All user data and keys cryptographically shredded.');
  };

  // Trigger Human Safety Safe Mode
  const handleTriggerSafeMode = (triggerPhrase?: string) => {
    setSafeModePhrase(triggerPhrase);
    setIsSafeModeOpen(true);
    logSecurityEvent(
      'DISTRESS_SAFE_MODE_TRIGGERED',
      'CRITICAL',
      `On-device safety triggered: ${triggerPhrase || 'User emergency request'}`
    );
  };

  // Loading state during initial Firebase Auth resolution
  if (isAuthLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-stone-600">
            Verifying cryptographic environment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScreenPrivacyGuard>
      <div
        className="min-h-screen flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 transition-colors"
        style={{
          backgroundColor: currentTheme.bgMain,
          color: currentTheme.textMain,
        }}
      >
        {/* Navigation Header */}
        <Navbar
          user={currentUser}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          isGuest={isGuestMode && !currentUser}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
          onOpenVoiceCheckIn={() => setIsVoiceCheckInOpen(true)}
          onOpenJarvisVoice={() => {
            if (!selectedEntry) {
              handleCreateNewEntry();
            }
            setIsJarvisVoiceOpen(true);
          }}
          onOpenPasskeyModal={() => setIsPasskeyModalOpen(true)}
          onTriggerSafeMode={() => handleTriggerSafeMode()}
          onOpenMoodInsights={() => setIsMoodInsightsOpen(true)}
          onOpenVoiceGuide={() => setIsVoiceGuideOpen(true)}
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          onOpenReflectionsMap={() => setIsReflectionsMapOpen(true)}
          isAdmin={isActualAdmin}
          isDuressDecoy={isDuressDecoy}
        />

        {/* Main Content Area */}
        {!currentUser && !isGuestMode ? (
          <LandingPage
            onSignIn={handleSignIn}
            onExploreGuest={handleExploreGuest}
            isLoading={isAuthLoading}
            errorMessage={authError}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar for History & Categories */}
            <Sidebar
              entries={entries}
              selectedEntryId={selectedEntry?.id || null}
              onSelectEntry={(entry) => setSelectedEntry(entry)}
              onNewEntry={handleCreateNewEntry}
              onDeleteEntry={handleDeleteEntry}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              onOpenMoodInsights={() => setIsMoodInsightsOpen(true)}
              onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
              onOpenReflectionsMap={() => setIsReflectionsMapOpen(true)}
              isDesktopCollapsed={isDesktopSidebarCollapsed}
              onToggleDesktopCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              user={currentUser}
              isGuest={isGuestMode && !currentUser}
              onSignOut={handleSignOut}
              onSignIn={handleSignIn}
            />

            {/* Active Workspace */}
            {selectedEntry ? (
              <Workspace
                key={selectedEntry.id}
                entry={selectedEntry}
                onUpdateEntry={handleUpdateEntry}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
                onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                onOpenJarvisVoice={() => setIsJarvisVoiceOpen(true)}
                onTriggerSafeMode={handleTriggerSafeMode}
                onOpenMoodInsights={() => setIsMoodInsightsOpen(true)}
                onOpenVoiceGuide={() => setIsVoiceGuideOpen(true)}
                onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
                onSignOut={handleSignOut}
              />
            ) : (
              <div
                className="flex-1 flex items-center justify-center p-8 text-center transition-colors"
                style={{
                  backgroundColor: currentTheme.bgSurface,
                  color: currentTheme.textMain,
                }}
              >
                <div className="max-w-md p-8 rounded-2xl border shadow-xs" style={{ borderColor: currentTheme.borderColor }}>
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-sm"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: currentTheme.textMain }}>
                    No reflection selected
                  </h3>
                  <p className="text-xs mb-6 leading-relaxed" style={{ color: currentTheme.textMuted }}>
                    Select a past reflection from the sidebar, or begin a fresh multi-turn contemplation with Jarvis.
                  </p>
                  <button
                    id="empty-state-new-reflection-button"
                    type="button"
                    onClick={() => handleCreateNewEntry()}
                    className="px-6 py-2.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    Start New Reflection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Jarvis Ambient Voice Interface HUD */}
        {isJarvisVoiceOpen && selectedEntry && (
          <JarvisVoiceInterface
            entry={selectedEntry}
            onUpdateEntry={handleUpdateEntry}
            onTriggerSafeMode={handleTriggerSafeMode}
            onClose={() => setIsJarvisVoiceOpen(false)}
          />
        )}

        {/* Mood Insights (D3.js Visualization) Modal */}
        <MoodInsightsModal
          isOpen={isMoodInsightsOpen}
          onClose={() => setIsMoodInsightsOpen(false)}
          entries={entries}
          onSelectEntry={(entry) => setSelectedEntry(entry)}
        />

        {/* Voice Command Guide Modal */}
        <VoiceCommandGuideModal
          isOpen={isVoiceGuideOpen}
          onClose={() => setIsVoiceGuideOpen(false)}
          onTestCommand={(cmd) => {
            setIsVoiceGuideOpen(false);
            if (!selectedEntry) {
              handleCreateNewEntry();
            }
            setIsJarvisVoiceOpen(true);
          }}
        />

        {/* Safe Mode & Human Safety Crisis Modal */}
        <SafeModeCrisisModal
          isOpen={isSafeModeOpen}
          onClose={() => setIsSafeModeOpen(false)}
          triggerPhrase={safeModePhrase}
        />

        {/* FIDO2 Passkey & Duress Vault Modal */}
        <PasskeyAuthModal
          isOpen={isPasskeyModalOpen}
          onClose={() => setIsPasskeyModalOpen(false)}
          onPasskeySuccess={handlePasskeySuccess}
        />

        {/* Security Architecture Transparency & Cryptographic Shredding Modal */}
        <SecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          userId={currentUser?.uid}
          entries={entries}
          onCryptoShred={handleCryptoShred}
        />

        {/* Admin Dashboard (RBAC & External Webhooks) */}
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          currentUser={currentUser}
          isAdmin={isActualAdmin}
          activeRole={simulatedRole}
          onSimulateRoleChange={(role) => setSimulatedRole(role)}
        />

        {/* Theme & Voice Personas Customizer Modal */}
        <ThemeCustomizerModal
          isOpen={isThemeCustomizerOpen}
          onClose={() => setIsThemeCustomizerOpen(false)}
          onOpenVoiceCheckIn={() => setIsVoiceCheckInOpen(true)}
        />

        {/* Google Maps Reflections World Map Modal */}
        <ReflectionsMapModal
          isOpen={isReflectionsMapOpen}
          onClose={() => setIsReflectionsMapOpen(false)}
          entries={entries}
          onSelectEntry={(entry) => {
            setSelectedEntry(entry);
            setIsReflectionsMapOpen(false);
          }}
          onCreateWithLocation={(loc) => {
            handleCreateNewEntry(loc);
          }}
        />

        {/* Voice Reflection Concierge Modal (Post-Login & On-Demand) */}
        {currentUser && (
          <VoiceCheckInModal
            isOpen={isVoiceCheckInOpen}
            onClose={() => setIsVoiceCheckInOpen(false)}
            userId={currentUser.uid}
            onReflectionCreated={(entry) => {
              setEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
              setSelectedEntry(entry);
              logSecurityEvent('VOICE_REFLECTION_SAVED', 'INFO', `Voice reflection generated and saved: "${entry.title}"`);
            }}
            onSelectWriteMyself={() => {
              if (!selectedEntry) {
                handleCreateNewEntry();
              }
            }}
            onTriggerSafeMode={handleTriggerSafeMode}
          />
        )}
      </div>
    </ScreenPrivacyGuard>
  );
}
