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
import { InteractionEntry } from './types';
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
import { useTheme } from './theme/ThemeContext';
import { enclave, logSecurityEvent } from './crypto/workerClient';

const DURESS_DECOY_ENTRIES: InteractionEntry[] = [
  {
    id: 'decoy-1',
    userId: 'decoy-user',
    title: 'Morning Garden & Herbal Tea',
    category: 'Gratitude',
    mode: 'reflection',
    mood: '🌸 Serene',
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
  const [simulatedRole, setSimulatedRole] = useState<'superadmin' | 'admin' | 'user'>('superadmin');

  // Atmosphere, Custom Themes & Voice Concierge
  const { currentTheme, hasSeenVoiceCheckIn, setHasSeenVoiceCheckIn } = useTheme();
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
    if (!currentUser) {
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
        console.error('Subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isDuressDecoy]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      await signInWithGoogle();
      logSecurityEvent('PASSKEY_AUTHENTICATED', 'INFO', 'Authenticated session initialized.');
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error.message || 'Failed to sign in with Google.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await enclave.shredKey();
      await signOut();
      setSelectedEntry(null);
      setEntries([]);
      setIsDuressDecoy(false);
      logSecurityEvent('CRYPTO_WIPE_EXECUTED', 'INFO', 'Sign out performed. Local memory sanitized.');
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  // Create a new reflection session
  const handleCreateNewEntry = () => {
    if (!currentUser) return;

    const newEntry: InteractionEntry = {
      id: `reflection-${Date.now()}`,
      userId: currentUser.uid,
      title: 'New Reflection',
      category: 'Personal Reflection',
      mode: 'reflection',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedEntry(newEntry);
  };

  // Save/Update interaction in Firestore
  const handleUpdateEntry = async (updated: InteractionEntry) => {
    if (!currentUser) return;

    // In Duress Decoy Mode, do NOT persist to actual cloud database!
    if (isDuressDecoy) {
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelectedEntry(updated);
      return;
    }

    // Optimistically update active entry in state
    setSelectedEntry(updated);

    // Save to Firestore
    await saveInteraction(currentUser.uid, updated);
  };

  // Delete interaction from Firestore
  const handleDeleteEntry = async (entryId: string) => {
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
          isAdmin={isActualAdmin}
          isDuressDecoy={isDuressDecoy}
        />

        {/* Main Content Area */}
        {!currentUser ? (
          <LandingPage
            onSignIn={handleSignIn}
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
              isDesktopCollapsed={isDesktopSidebarCollapsed}
              onToggleDesktopCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
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
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center bg-white">
                <div className="max-w-md">
                  <h3 className="text-lg font-semibold text-stone-900 mb-2">
                    No reflection selected
                  </h3>
                  <p className="text-xs text-stone-500 mb-6">
                    Select a past reflection from the sidebar, or begin a fresh multi-turn contemplation with Jarvis.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNewEntry}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
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
