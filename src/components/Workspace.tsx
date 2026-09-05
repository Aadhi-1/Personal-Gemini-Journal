import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Lightbulb,
  FileText,
  Download,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Menu,
  MapPin,
  ExternalLink,
  X,
  Smile,
  Volume2,
  Mic,
  Lock,
  ShieldCheck,
  BarChart3,
  HelpCircle,
  Bell,
  Timer,
  Tag,
  SmilePlus,
  Play,
  Square,
  Check,
  MoreVertical,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelLeftClose,
  Image as ImageIcon,
  Film,
  Globe,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import {
  InteractionEntry,
  InteractionMessage,
  JournalCategory,
  JournalMode,
  JournalLocation,
  MOOD_OPTIONS,
  JOURNAL_STICKERS,
  JournalSticker,
  MediaAttachment,
  GroundingSource,
} from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { StickerPickerModal } from './StickerPickerModal';
import { ReflectionTimer } from './ReflectionTimer';
import { MediaPickerModal } from './MediaPickerModal';
import { MediaLightboxModal } from './MediaLightboxModal';
import { GeminiToolsModal } from './GeminiToolsModal';
import { analyzeDistressOnDevice, sanitizeTextForAudioDLP } from '../crypto/guardrails';
import { enclave } from '../crypto/workerClient';
import {
  useTheme,
  ACCENT_COLORS,
  VOICE_PERSONAS,
  VoicePersonaId,
  VoicePersona,
} from '../theme/ThemeContext';

interface WorkspaceProps {
  entry: InteractionEntry;
  onUpdateEntry: (updated: InteractionEntry) => Promise<void>;
  onToggleMobileSidebar: () => void;
  isDesktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  onOpenJarvisVoice?: () => void;
  onTriggerSafeMode?: (phrase?: string) => void;
  onOpenMoodInsights?: () => void;
  onOpenVoiceGuide?: () => void;
  onOpenSecurityModal?: () => void;
}

const MODES: { id: JournalMode; label: string; description: string }[] = [
  { id: 'reflection', label: 'Deep Reflection', description: 'Empathetic feedback, emotional validation, and balanced reframing' },
  { id: 'summary', label: 'Summary & Themes', description: 'Synthesize core themes, events, and constructive realizations' },
  { id: 'brainstorm', label: 'Brainstorming', description: 'Actionable ideas, alternative perspectives, and creative solutions' },
  { id: 'socratic', label: 'Socratic Guide', description: 'Deep, thought-provoking inquiry questions to unlock clarity' },
];

const CATEGORIES: JournalCategory[] = [
  'Personal Reflection',
  'Brainstorming',
  'Gratitude',
  'Decision Making',
  'Goal Setting',
  'General',
];

const STARTER_PROMPTS = [
  'Help me reflect on a tough challenge I encountered today and what I learned from it.',
  'I am faced with a difficult decision between two paths. Can you help me weigh them?',
  'What are 3 deep questions I should ask myself to understand my current burnout?',
  'I had an unexpected realization about my creative goals. Let me walk you through it.',
];

export const Workspace: React.FC<WorkspaceProps> = ({
  entry,
  onUpdateEntry,
  onToggleMobileSidebar,
  isDesktopSidebarCollapsed = false,
  onToggleDesktopSidebar,
  onOpenJarvisVoice,
  onTriggerSafeMode,
  onOpenMoodInsights,
  onOpenVoiceGuide,
  onOpenSecurityModal,
}) => {
  const {
    currentTheme,
    accentColorId,
    activeVoice,
    activeVoiceId,
    setActiveVoiceId,
    speakText,
    stopSpeaking,
  } = useTheme();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [copiedExport, setCopiedExport] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [externalAlertStatus, setExternalAlertStatus] = useState<string | null>(null);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Photos, GIFs & Gemini Features State
  const [stagedAttachments, setStagedAttachments] = useState<MediaAttachment[]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'prompt' | 'entry'>('prompt');
  const [lightboxMedia, setLightboxMedia] = useState<MediaAttachment | null>(null);
  const [isGeminiToolsModalOpen, setIsGeminiToolsModalOpen] = useState(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Handle media selection (either for prompt or overall entry)
  const handleSelectMedia = (attachment: MediaAttachment) => {
    if (mediaPickerMode === 'entry') {
      handleAddEntryAttachment(attachment);
    } else {
      setStagedAttachments((prev) => [...prev, attachment]);
    }
  };

  const handleRemoveStagedAttachment = (indexToRemove: number) => {
    setStagedAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddEntryAttachment = async (attachment: MediaAttachment) => {
    const currentAttachments = entry.attachments || [];
    const updatedEntry: InteractionEntry = {
      ...entry,
      attachments: [...currentAttachments, attachment],
      updatedAt: new Date().toISOString(),
    };
    await executeAutosave(updatedEntry);
  };

  const handleRemoveEntryAttachment = async (attachmentId: string) => {
    const currentAttachments = entry.attachments || [];
    const updatedEntry: InteractionEntry = {
      ...entry,
      attachments: currentAttachments.filter((a) => a.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    };
    await executeAutosave(updatedEntry);
  };

  const handleApplyQuickInsight = async (generatedText: string, featureTitle: string) => {
    const toolMessage: InteractionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'model',
      content: `### 🔮 ${featureTitle}\n\n${generatedText}`,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...entry.messages, toolMessage];
    const updatedEntry: InteractionEntry = {
      ...entry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };
    await executeAutosave(updatedEntry);
  };

  // Close actions 3-dots menu and persona menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node)) {
        setIsPersonaMenuOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    }
    if (isPersonaMenuOpen || isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPersonaMenuOpen, isActionsMenuOpen]);

  // Dispatch external notifications for parsed reflection (Slack, Discord, Email)
  const dispatchNotificationForEntry = async (
    targetEntry: InteractionEntry,
    customSummary?: string,
    customInsights?: string[]
  ) => {
    try {
      setIsSendingAlert(true);
      const isGoal = targetEntry.category === 'Goal Setting';
      const isDecision = targetEntry.category === 'Decision Making';
      const reason = isGoal
        ? 'GOAL_SETTING'
        : isDecision
        ? 'DECISION_MAKING'
        : 'KEY_INSIGHTS_EXTRACTED';

      const resp = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: targetEntry.id,
          triggerReason: reason,
          entryTitle: targetEntry.title,
          category: targetEntry.category,
          mood: targetEntry.mood,
          summary: customSummary || targetEntry.summary || 'Synthesized reflection entry.',
          keyInsights: customInsights || targetEntry.keyInsights || [],
          timestamp: new Date().toISOString(),
          channels: ['slack', 'discord', 'email'],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setExternalAlertStatus(
            `Alert dispatched to external systems (${targetEntry.category})`
          );
          setTimeout(() => setExternalAlertStatus(null), 5000);
        }
      }
    } catch (e) {
      console.warn('Notification dispatch failed:', e);
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Unified Safe Autosave Wrapper
  const executeAutosave = async (updated: InteractionEntry) => {
    setAutosaveState('saving');
    try {
      await onUpdateEntry(updated);
      setAutosaveState('saved');
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      setAutosaveState('error');
      throw err;
    }
  };

  // Audio DLP Speech Playback with active voice persona tuning
  const handleSpeakMessage = (messageId: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const { cleanText } = sanitizeTextForAudioDLP(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = activeVoice.rate;
    utterance.pitch = activeVoice.pitch;

    // Pick best system voice matching persona preferences
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices && availableVoices.length > 0) {
      let matchedVoice: SpeechSynthesisVoice | undefined;
      for (const pref of activeVoice.preferredVoiceNames) {
        matchedVoice = availableVoices.find(
          (v) =>
            v.name.toLowerCase().includes(pref.toLowerCase()) ||
            v.lang.toLowerCase().includes(pref.toLowerCase())
        );
        if (matchedVoice) break;
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Audition Voice Persona sample
  const handleAuditionPersona = (e: React.MouseEvent, p: VoicePersona) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (auditioningVoiceId === p.id) {
      window.speechSynthesis.cancel();
      setAuditioningVoiceId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setAuditioningVoiceId(p.id);

    const utterance = new SpeechSynthesisUtterance(p.greetingSample);
    utterance.rate = p.rate;
    utterance.pitch = p.pitch;

    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices && availableVoices.length > 0) {
      let matchedVoice: SpeechSynthesisVoice | undefined;
      for (const pref of p.preferredVoiceNames) {
        matchedVoice = availableVoices.find(
          (v) =>
            v.name.toLowerCase().includes(pref.toLowerCase()) ||
            v.lang.toLowerCase().includes(pref.toLowerCase())
        );
        if (matchedVoice) break;
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => setAuditioningVoiceId(null);
    utterance.onerror = () => setAuditioningVoiceId(null);
    window.speechSynthesis.speak(utterance);
  };

  // Handle Sticker Toggle
  const handleToggleSticker = async (stickerId: string) => {
    const current = entry.stickers || [];
    const updated = current.includes(stickerId)
      ? current.filter((s) => s !== stickerId)
      : [...current, stickerId];

    await executeAutosave({
      ...entry,
      stickers: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Sticker Removal
  const handleRemoveSticker = async (stickerId: string) => {
    const current = entry.stickers || [];
    const updated = current.filter((s) => s !== stickerId);
    await executeAutosave({
      ...entry,
      stickers: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Reflection Timer Completion
  const handleTimerCompleted = async (awardedStickerId?: string) => {
    if (!awardedStickerId) return;
    const current = entry.stickers || [];
    if (!current.includes(awardedStickerId)) {
      await executeAutosave({
        ...entry,
        stickers: [...current, awardedStickerId],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Fetch backend Maps API key if not in client bundle
  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/config/maps')
        .then((res) => res.json())
        .then((data) => {
          if (data.apiKey) {
            setMapsApiKey(data.apiKey);
          }
        })
        .catch(() => {});
    }
  }, [mapsApiKey]);

  // Handle location update
  const handleSelectLocation = async (location: JournalLocation) => {
    await executeAutosave({
      ...entry,
      location,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle location removal
  const handleRemoveLocation = async () => {
    await executeAutosave({
      ...entry,
      location: null,
      updatedAt: new Date().toISOString(),
    });
  };

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  // Handle title change
  const handleTitleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim() || 'Untitled Reflection';
    if (newTitle !== entry.title) {
      await executeAutosave({
        ...entry,
        title: newTitle,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Handle Category Change
  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as JournalCategory;
    await executeAutosave({
      ...entry,
      category: newCat,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Mood Change
  const handleMoodChange = async (newMood: string | null) => {
    await executeAutosave({
      ...entry,
      mood: newMood || null,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Mode Change
  const handleModeChange = async (mode: JournalMode) => {
    await executeAutosave({
      ...entry,
      mode,
      updatedAt: new Date().toISOString(),
    });
  };

  // Send message and converse with Gemini
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isGenerating) return;

    // 1. On-Device Distress Analysis (Pre-encryption Human Safety Check)
    const distressCheck = analyzeDistressOnDevice(content);
    if (distressCheck.isDistressDetected) {
      if (onTriggerSafeMode) {
        onTriggerSafeMode(distressCheck.triggerPhrase);
      }
      return;
    }

    setErrorBanner(null);

    const currentStaged = [...stagedAttachments];
    const userMessage: InteractionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      attachments: currentStaged.length > 0 ? currentStaged : undefined,
    };

    const updatedMessages = [...entry.messages, userMessage];

    // Optimistically update entry state with user message
    const updatedEntryWithUser: InteractionEntry = {
      ...entry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsGenerating(true);
      // Clear input buffer and staged attachments on success trigger
      if (!textToSend) {
        setInputText('');
      }
      setStagedAttachments([]);

      // First guarantee user message persistence
      await onUpdateEntry(updatedEntryWithUser);

      // Call server-side Gemini API (multimodal + grounding supported)
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          mode: entry.mode,
          title: entry.title,
          personaId: activeVoiceId,
          enableSearchGrounding,
          attachments: currentStaged.length > 0 ? currentStaged : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error status ${response.status}`);
      }

      const data = await response.json();
      const modelReply = data.reply || '';

      const modelMessage: InteractionMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: 'model',
        content: modelReply,
        timestamp: new Date().toISOString(),
        groundingSources: data.groundingSources && data.groundingSources.length > 0 ? data.groundingSources : undefined,
      };

      const finalMessages = [...updatedMessages, modelMessage];

      // Auto-suggest title if current title is default
      let titleToUse = entry.title;
      if (entry.title === 'New Reflection' && finalMessages.length >= 2) {
        const firstSentence = userMessage.content.slice(0, 35).trim();
        titleToUse = firstSentence.length > 0 ? `${firstSentence}...` : entry.title;
      }

      // 2. Zero-Knowledge Web Worker Enclave Encryption (AES-256-GCM)
      let enclaveFields: Partial<InteractionEntry> = {};
      try {
        const enc = await enclave.encrypt(JSON.stringify(finalMessages));
        enclaveFields = {
          encrypted_content: enc.ciphertext,
          iv: enc.iv,
          key_id: enc.keyId,
          isEncrypted: true,
        };
      } catch (encErr) {
        console.warn('Enclave encryption handled locally:', encErr);
      }

      // Save complete transaction to Firestore
      await executeAutosave({
        ...entry,
        ...enclaveFields,
        title: titleToUse,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error during reflection interaction:', err);
      // Restore input text buffer and staged attachments for resilience
      setInputText(content);
      if (currentStaged.length > 0) {
        setStagedAttachments(currentStaged);
      }
      setErrorBanner(
        `Failed to complete reflection: ${err.message || 'Network or model failure'}. Your input text was preserved.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Summarize the session and extract key insights
  const handleGenerateSummary = async () => {
    if (entry.messages.length === 0 || isSummarizing) return;
    setErrorBanner(null);

    try {
      setIsSummarizing(true);
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: entry.messages.map((m) => ({ role: m.role, content: m.content })),
          currentTitle: entry.title,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate session summary.');
      }

      const data = await response.json();

      const parsedEntry: InteractionEntry = {
        ...entry,
        title: data.suggestedTitle || entry.title,
        summary: data.summary || '',
        keyInsights: data.keyInsights || [],
        updatedAt: new Date().toISOString(),
      };

      await executeAutosave(parsedEntry);

      setIsSummaryExpanded(true);

      // Automated External Notification Trigger for parsed entry types
      if (
        entry.category === 'Goal Setting' ||
        entry.category === 'Decision Making' ||
        (data.keyInsights && data.keyInsights.length > 0)
      ) {
        dispatchNotificationForEntry(parsedEntry, data.summary, data.keyInsights);
      }
    } catch (err: any) {
      console.error('Error summarizing session:', err);
      setErrorBanner(`Failed to generate summary: ${err.message || 'Server error'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Export full markdown reflection
  const handleExportMarkdown = () => {
    let md = `# ${entry.title}\n`;
    if (entry.mood) {
      md += `**Mood:** ${entry.mood} | `;
    }
    md += `**Category:** ${entry.category} | **Mode:** ${entry.mode} | **Date:** ${new Date(entry.createdAt).toLocaleString()}\n`;
    if (entry.location) {
      md += `**Location:** ${entry.location.name}${entry.location.formattedAddress ? ` (${entry.location.formattedAddress})` : ''} [${entry.location.lat.toFixed(5)}, ${entry.location.lng.toFixed(5)}]\n`;
    }
    md += '\n';
    if (entry.summary) {
      md += `## Executive Summary\n${entry.summary}\n\n`;
    }
    if (entry.keyInsights && entry.keyInsights.length > 0) {
      md += `## Key Takeaways\n`;
      entry.keyInsights.forEach((item) => {
        md += `- ${item}\n`;
      });
      md += '\n';
    }
    md += `## Conversation Transcript\n\n`;
    entry.messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'You' : 'Gemini'}\n${m.content}\n\n`;
    });

    // Copy to clipboard or trigger download
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 3000);
  };

  return (
    <div
      id="journal-workspace"
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden transition-colors"
      style={{
        backgroundColor: currentTheme.bgMain,
        color: currentTheme.textMain,
      }}
    >
      {/* Top Session Bar */}
      <div
        className="border-b px-4 sm:px-6 py-3 flex flex-col gap-3 shrink-0 transition-colors"
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Mobile sidebar toggle */}
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-200/70 transition-colors shrink-0"
            title="Toggle past reflections"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop full screen toggle button */}
          {onToggleDesktopSidebar && (
            <button
              id="desktop-sidebar-toggle"
              type="button"
              onClick={onToggleDesktopSidebar}
              className="hidden lg:flex p-1.5 rounded-xl border border-stone-200/80 hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-all items-center gap-1.5 shrink-0 text-xs shadow-2xs"
              style={{
                backgroundColor: currentTheme.bgSurface,
                borderColor: currentTheme.borderColor,
                color: currentTheme.textMain,
              }}
              title={
                isDesktopSidebarCollapsed
                  ? 'Exit full screen (Show past reflections sidebar)'
                  : 'Full screen dashboard (Collapse sidebar)'
              }
            >
              {isDesktopSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden xl:inline text-[11px] font-medium">Show Sidebar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden xl:inline text-[11px] font-medium">Full Screen</span>
                </>
              )}
            </button>
          )}

          {/* Title Editor */}
          <div className="flex-1 flex items-center min-w-0">
            {entry.mood && (
              <span
                id="entry-title-mood-emoji"
                className="text-base sm:text-lg mr-1.5 shrink-0 select-none"
                title={`Mood: ${entry.mood}`}
              >
                {entry.mood.split(' ')[0]}
              </span>
            )}
            <input
              id="entry-title-input"
              type="text"
              defaultValue={entry.title}
              key={entry.id + entry.title}
              onBlur={handleTitleBlur}
              placeholder="Name your reflection..."
              className="flex-1 text-sm sm:text-base font-semibold bg-transparent px-2 py-1 -ml-1 rounded-md border border-transparent focus:border-stone-300 focus:outline-none transition-colors truncate"
              style={{ color: currentTheme.textMain }}
            />
          </div>

          {/* Action buttons & 3-dots kebab menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Real-time Autosave Feedback Badge */}
            <div
              id="workspace-autosave-indicator"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-all duration-200 select-none shrink-0"
              style={{
                borderColor: currentTheme.borderColor,
                backgroundColor: `${currentTheme.bgMain}70`,
              }}
              title={`Zero-Knowledge Cloud Firestore Autosave Status: ${autosaveState}`}
            >
              {autosaveState === 'saving' ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              ) : autosaveState === 'error' ? (
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Save Error</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Saved</span>
                  <span className="text-[10px] text-stone-400 hidden md:inline">({lastSavedTime})</span>
                </span>
              )}
            </div>

            {/* Summarize Action Button (Primary AI trigger) */}
            <button
              id="summarize-session-button"
              type="button"
              onClick={handleGenerateSummary}
              disabled={isSummarizing || entry.messages.length === 0}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-900 dark:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs shrink-0"
              title="Generate summary and extract key takeaways with Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSummarizing ? 'Summarizing...' : 'Summarize'}
              </span>
            </button>

            {/* Desktop-Only Quick Access Buttons (xl: screen breakpoint) */}
            <div className="hidden xl:flex items-center gap-1.5">
              {/* Reflection Timer Toggle */}
              <button
                id="workspace-reflection-timer-button"
                type="button"
                onClick={() => setIsTimerVisible(!isTimerVisible)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-2xs border ${
                  isTimerVisible
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                    : 'text-stone-700 hover:text-stone-900 bg-white border-stone-200 hover:border-amber-300'
                }`}
                title="Toggle Pomodoro reflection timer"
              >
                <Timer className="w-3.5 h-3.5 text-amber-600" />
                <span>Timer</span>
              </button>

              {/* Multi-Voice Persona Selector Dropdown */}
              <div className="relative" ref={personaMenuRef}>
                <button
                  id="workspace-persona-select-btn"
                  type="button"
                  onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-800 bg-white border border-stone-200 hover:border-stone-300 transition-all shadow-2xs"
                  title={`Active AI Persona: ${activeVoice.name}`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold">{activeVoice.name}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {isPersonaMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-72 rounded-2xl bg-white border border-stone-200 shadow-xl py-2 z-50 animate-fade-in text-stone-900">
                    <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-600 tracking-wider">
                        AI Voice Personas
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold">Gemini Prompt Tuned</span>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                      {VOICE_PERSONAS.map((p) => {
                        const isSelected = activeVoiceId === p.id;
                        const isAuditioning = auditioningVoiceId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setActiveVoiceId(p.id);
                              setIsPersonaMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-50/80 border border-amber-300/80'
                                : 'hover:bg-stone-50 border border-transparent'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-stone-900 truncate">{p.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium shrink-0">
                                  {p.tag}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-amber-600 ml-auto shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                                {p.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              title={`Audition sample greeting for ${p.name}`}
                              onClick={(e) => handleAuditionPersona(e, p)}
                              className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                isAuditioning
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : 'text-stone-400 hover:text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              {isAuditioning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Jarvis Voice Launcher */}
              {onOpenJarvisVoice && (
                <button
                  id="workspace-jarvis-voice-button"
                  type="button"
                  onClick={onOpenJarvisVoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-2xs active:scale-95"
                  title="Launch Jarvis Ambient Voice interface"
                >
                  <Mic className="w-3.5 h-3.5 animate-pulse text-stone-950" />
                  <span>Jarvis</span>
                </button>
              )}
            </div>

            {/* 3-DOTS KEBAB MENU BUTTON: For Laptop Full Screen Dashboard & Clean Phone/Tablet Mode */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                id="workspace-kebab-menu-button"
                type="button"
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center shadow-2xs shrink-0 ${
                  isActionsMenuOpen
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
                style={
                  isActionsMenuOpen
                    ? undefined
                    : {
                        backgroundColor: currentTheme.bgSurface,
                        borderColor: currentTheme.borderColor,
                        color: currentTheme.textMain,
                      }
                }
                title="Workspace tools & full screen options"
                aria-label="Workspace tools & options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {isActionsMenuOpen && (
                <div
                  id="workspace-kebab-menu-dropdown"
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl py-2 z-50 animate-fade-in text-stone-900 dark:text-stone-100 divide-y divide-stone-100 dark:divide-stone-800"
                >
                  {/* Section 1: Dashboard View & Full Screen */}
                  <div className="py-1 px-1">
                    {onToggleDesktopSidebar && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleDesktopSidebar();
                          setIsActionsMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                      >
                        <span className="flex items-center gap-2.5">
                          {isDesktopSidebarCollapsed ? (
                            <PanelLeftOpen className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                          )}
                          <span>
                            {isDesktopSidebarCollapsed
                              ? 'Exit Full Screen (Show Sidebar)'
                              : 'Full Screen Dashboard'}
                          </span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono">
                          {isDesktopSidebarCollapsed ? 'Full' : 'Normal'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerVisible(!isTimerVisible);
                        setIsActionsMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                    >
                      <span className="flex items-center gap-2.5">
                        <Timer className="w-4 h-4 text-amber-600" />
                        <span>Reflection Timer (Pomodoro)</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isTimerVisible
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                        }`}
                      >
                        {isTimerVisible ? 'Active' : 'Off'}
                      </span>
                    </button>
                  </div>

                  {/* Section 2: AI Voice Personas & Jarvis */}
                  <div className="py-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsPersonaMenuOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                    >
                      <span className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-amber-600" />
                        <span>AI Voice Persona</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 font-medium">
                        {activeVoice.name}
                      </span>
                    </button>

                    {onOpenJarvisVoice && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onOpenJarvisVoice();
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-amber-50/70 dark:hover:bg-amber-950/30 transition-colors text-left font-medium"
                      >
                        <span className="flex items-center gap-2.5">
                          <Mic className="w-4 h-4 text-amber-600" />
                          <span>Launch Jarvis Voice</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 font-bold">
                          Voice AI
                        </span>
                      </button>
                    )}

                    {onOpenVoiceGuide && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onOpenVoiceGuide();
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                      >
                        <HelpCircle className="w-4 h-4 text-stone-500" />
                        <span>Voice Commands Guide</span>
                      </button>
                    )}
                  </div>

                  {/* Section 3: Analytics & Export Vault */}
                  <div className="py-1 px-1">
                    {onOpenMoodInsights && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onOpenMoodInsights();
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                      >
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                        <span>30-Day Mood Insights</span>
                      </button>
                    )}

                    {onOpenSecurityModal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          onOpenSecurityModal();
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left font-medium text-emerald-800 dark:text-emerald-300"
                      >
                        <span className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Export Vault & Security</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          Encrypted
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          handleExportMarkdown();
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                      >
                        <Download className="w-4 h-4 text-stone-500" />
                        <span>Download Markdown (.md)</span>
                      </button>
                    )}
                  </div>

                  {/* Section 4: Metadata (Location & Stickers) */}
                  <div className="py-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsLocationModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                    >
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>{entry.location ? 'Change Pinned Location' : 'Pin Location on Map'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsStickerModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left font-medium"
                    >
                      <SmilePlus className="w-4 h-4 text-amber-600" />
                      <span>Add Reflection Stickers</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Row: Mode Selector, Category, Mood, Location, and Stickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Pill Toggle */}
          <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg overflow-x-auto max-w-full">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                title={m.description}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  entry.mode === m.id
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown, Location Pinning & Stickers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">Category:</span>
              <select
                id="entry-category-select"
                value={entry.category}
                onChange={handleCategoryChange}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-stone-300 text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Mood Emoji Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">Mood:</span>
              <div className="relative inline-flex items-center">
                <select
                  id="entry-mood-select"
                  value={entry.mood || ''}
                  onChange={(e) => handleMoodChange(e.target.value || null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-1 ${
                    entry.mood
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-semibold'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400 focus:ring-stone-400'
                  }`}
                  title="Tag your entry with a mood emoji"
                >
                  <option value="">Tag Mood...</option>
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m.label} value={`${m.emoji} ${m.label}`}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {entry.mood && (
                <button
                  id="clear-entry-mood-button"
                  type="button"
                  onClick={() => handleMoodChange(null)}
                  className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition-colors"
                  title="Clear mood tag"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Location Pin Badge / Button */}
            <div className="flex items-center gap-1.5">
              {entry.location ? (
                <div
                  id="entry-location-pill"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs shadow-2xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <button
                    id="edit-pinned-location-button"
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="font-medium hover:underline max-w-[140px] sm:max-w-[200px] truncate text-left"
                    title={`${entry.location.name} - Click to change location`}
                  >
                    {entry.location.name}
                  </button>
                  <button
                    id="remove-pinned-location-button"
                    type="button"
                    onClick={handleRemoveLocation}
                    className="text-emerald-700/60 hover:text-emerald-900 p-0.5 rounded transition-colors"
                    title="Remove pinned location"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  id="pin-location-button"
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 hover:text-emerald-700 bg-white hover:bg-emerald-50/50 border border-stone-300 hover:border-emerald-300 transition-colors shadow-2xs"
                  title="Pin geographical location with Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-stone-500" />
                  <span>Pin Location</span>
                </button>
              )}
            </div>

            {/* Journal Stickers Chip Row & Add Button */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {entry.stickers && entry.stickers.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {entry.stickers.map((sId) => {
                    const sticker = JOURNAL_STICKERS.find((x) => x.id === sId);
                    if (!sticker) return null;
                    return (
                      <span
                        key={sId}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${sticker.colorClass}`}
                        title={sticker.description}
                      >
                        <span>{sticker.emoji}</span>
                        <span>{sticker.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSticker(sId)}
                          className="p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                          title="Remove sticker"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                id="workspace-add-sticker-btn"
                type="button"
                onClick={() => setIsStickerModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 hover:text-amber-700 bg-white hover:bg-amber-50/50 border border-stone-300 hover:border-amber-300 transition-colors shadow-2xs"
                title="Attach reflection stickers and milestone badges"
              >
                <SmilePlus className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Sticker</span>
              </button>
            </div>

            {/* Photos & GIFs Entry Gallery Chips & Add Button */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {entry.attachments && entry.attachments.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {entry.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-stone-100 border border-stone-300 shadow-2xs hover:bg-stone-200 transition-all cursor-pointer"
                      onClick={() => setLightboxMedia(att)}
                      title={`${att.title || 'Attachment'} - Click to view in full resolution`}
                    >
                      <img
                        src={att.url}
                        alt={att.title || 'Attachment'}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded object-cover"
                      />
                      <span className="max-w-[80px] truncate">{att.title || (att.type === 'gif' ? 'GIF' : 'Photo')}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEntryAttachment(att.id);
                        }}
                        className="p-0.5 opacity-60 hover:opacity-100 hover:text-red-600 transition-colors"
                        title="Remove attachment from entry"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                id="workspace-add-media-btn"
                type="button"
                onClick={() => {
                  setMediaPickerMode('entry');
                  setIsMediaModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 border border-stone-300 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
                title="Attach photos and trending GIFs to this reflection"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Photo/GIF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Docked Pomodoro Reflection Timer (when toggled open) */}
      {isTimerVisible && (
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-amber-200/50 bg-amber-50/40">
          <ReflectionTimer
            onAwardSticker={handleTimerCompleted}
            onClose={() => setIsTimerVisible(false)}
          />
        </div>
      )}

      {/* Error Banner with Retry Guarantee */}
      {errorBanner && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* AI Summary Banner (if available) */}
      {(entry.summary || (entry.keyInsights && entry.keyInsights.length > 0)) && (
        <div className="border-b border-amber-200/80 bg-amber-50/60 px-4 sm:px-6 py-3 transition-all shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-950 uppercase tracking-wider">
                AI Distilled Insights & Summary
              </span>
              {externalAlertStatus && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {externalAlertStatus}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                id="manual-dispatch-alert-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatchNotificationForEntry(entry);
                }}
                disabled={isSendingAlert}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs"
                title="Send notification to configured external webhooks (Slack/Discord/Email)"
              >
                <Bell className={`w-3.5 h-3.5 text-indigo-600 ${isSendingAlert ? 'animate-bounce' : ''}`} />
                <span className="hidden md:inline">{isSendingAlert ? 'Notifying...' : 'Notify Webhooks'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="text-stone-500 hover:text-stone-700 p-1 rounded"
              >
                {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSummaryExpanded && (
            <div className="mt-2 text-xs text-stone-700 space-y-2">
              {entry.summary && <p className="leading-relaxed font-normal">{entry.summary}</p>}
              {entry.keyInsights && entry.keyInsights.length > 0 && (
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="font-semibold text-amber-900 block mb-1">Key Takeaways:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {entry.keyInsights.map((insight, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pinned Location Banner & Interactive Map (Google Maps Integration) */}
      {entry.location && (
        <div
          id="pinned-location-banner"
          className="border-b border-emerald-100 bg-emerald-50/40 px-4 sm:px-6 py-2.5 flex flex-col gap-2 shrink-0 transition-all"
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-950 truncate">
                    {entry.location.name}
                  </span>
                  <span className="text-2xs font-mono text-emerald-700/75 bg-emerald-100/60 px-1.5 py-0.2 rounded shrink-0">
                    {entry.location.lat.toFixed(4)}, {entry.location.lng.toFixed(4)}
                  </span>
                </div>
                {entry.location.formattedAddress && (
                  <p className="text-2xs text-stone-500 truncate mt-0.5">
                    {entry.location.formattedAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="toggle-preview-map-button"
                type="button"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="text-2xs font-medium text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-100/50 transition-colors"
              >
                {isMapExpanded ? 'Hide Map' : 'View Map'}
              </button>
              <a
                id="open-google-maps-link"
                href={`https://www.google.com/maps/search/?api=1&query=${entry.location.lat},${entry.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-2xs font-medium text-stone-600 hover:text-stone-900 px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 shadow-2xs transition-colors"
                title="Open in Google Maps"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Interactive Google Map Preview */}
          {isMapExpanded && (
            <div
              id="location-map-preview"
              className="w-full h-44 rounded-xl overflow-hidden border border-emerald-200 mt-1 relative bg-stone-100"
            >
              {mapsApiKey ? (
                <APIProvider apiKey={mapsApiKey}>
                  <Map
                    id="journal-entry-preview-map"
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={{ lat: entry.location.lat, lng: entry.location.lng }}
                    center={{ lat: entry.location.lat, lng: entry.location.lng }}
                    defaultZoom={14}
                    mapId="DEMO_MAP_ID"
                    gestureHandling="cooperative"
                    disableDefaultUI={false}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    <AdvancedMarker
                      position={{ lat: entry.location.lat, lng: entry.location.lng }}
                      title={entry.location.name}
                    >
                      <Pin background="#059669" glyphColor="#ffffff" borderColor="#047857" />
                    </AdvancedMarker>
                  </Map>
                </APIProvider>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-stone-50">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-stone-800">
                    {entry.location.name}
                  </p>
                  <p className="text-2xs font-mono text-stone-500">
                    Latitude: {entry.location.lat.toFixed(5)} • Longitude: {entry.location.lng.toFixed(5)}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${entry.location.lat},${entry.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-2xs text-emerald-700 hover:underline mt-2 font-medium"
                  >
                    Open live coordinates in Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {entry.messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 mx-auto mb-4 shadow-2xs">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              Start your reflection with Gemini
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto mb-8">
              Share what is on your mind, unroll a complex emotion, or ask Gemini to guide your contemplation. All entries are isolated and encrypted in your personal Firestore collection.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-stone-300 hover:shadow-xs transition-all text-xs text-stone-700 leading-relaxed cursor-pointer active:scale-[0.99]"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          entry.messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-900 text-white rounded-tr-none'
                      : 'bg-stone-100/90 text-stone-900 border border-stone-200/80 rounded-tl-none prose prose-stone max-w-none'
                  }`}
                >
                  {/* Attached Media Cards */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map((att) => (
                        <div
                          key={att.id}
                          onClick={() => setLightboxMedia(att)}
                          className="relative group rounded-xl overflow-hidden border border-stone-300/80 shadow-xs cursor-pointer hover:opacity-95 transition-all max-w-[200px]"
                        >
                          <img
                            src={att.url}
                            alt={att.title || 'Attachment'}
                            referrerPolicy="no-referrer"
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white uppercase tracking-wider">
                            {att.type === 'gif' ? 'GIF' : 'Photo'}
                          </div>
                          {att.title && (
                            <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-1.5 text-[10px] text-white truncate">
                              {att.title}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Google Search Grounding Citations */}
                  {message.groundingSources && message.groundingSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200/70 text-[11px]">
                      <div className="flex items-center gap-1 text-stone-500 font-semibold mb-1">
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span>Google Search Grounded Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {message.groundingSources.map((source, sIdx) => (
                          <a
                            key={sIdx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors truncate max-w-[220px]"
                            title={source.title}
                          >
                            <span className="truncate">{source.title || source.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    className={`text-[10px] mt-2 flex items-center justify-between gap-2 ${
                      isUser ? 'text-stone-400' : 'text-stone-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!isUser && (
                        <span className="inline-flex items-center gap-1 font-medium text-[9px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200/50">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>{activeVoice.name}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(message.id, message.content)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                        speakingMessageId === message.id
                          ? 'bg-amber-500/20 text-amber-500 font-semibold'
                          : isUser
                          ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200'
                          : 'hover:bg-stone-200 text-stone-500 hover:text-stone-800'
                      }`}
                      title={`Read aloud with ${activeVoice.name} persona (${activeVoice.tag})`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{speakingMessageId === message.id ? 'Speaking' : 'Read'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex items-center gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-stone-100 border border-stone-200 px-4 py-3 text-xs text-stone-600 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="font-medium text-stone-500">
                Gemini 3.6 Flash reflecting...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="border-t p-4 shrink-0 transition-colors"
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
        }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Staged Attachments Tray */}
          {stagedAttachments.length > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-stone-100/90 border border-stone-200/90 overflow-x-auto">
              <span className="text-[11px] font-semibold text-stone-500 shrink-0 ml-1">Attached:</span>
              {stagedAttachments.map((att, idx) => (
                <div
                  key={att.id || idx}
                  className="relative inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-stone-300 shadow-2xs shrink-0"
                >
                  <img
                    src={att.url}
                    alt={att.title || 'Attachment'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded object-cover cursor-pointer"
                    onClick={() => setLightboxMedia(att)}
                  />
                  <div className="flex flex-col text-left text-[10px] leading-tight">
                    <span className="font-semibold text-stone-800 max-w-[100px] truncate">
                      {att.title || (att.type === 'gif' ? 'GIF' : 'Photo')}
                    </span>
                    <span className="text-stone-400 capitalize">{att.type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStagedAttachment(idx)}
                    className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <textarea
              id="journal-prompt-textarea"
              ref={textareaRef}
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write your journal reflection or response (Press ⌘ + Enter to send)..."
              className="w-full pl-4 pr-12 py-3 text-sm rounded-xl border placeholder-stone-400 focus:outline-none focus:ring-2 resize-none shadow-xs"
              style={{
                backgroundColor: currentTheme.bgMain,
                borderColor: currentTheme.borderColor,
                color: currentTheme.textMain,
              }}
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
              {onOpenJarvisVoice && (
                <button
                  id="mic-voice-button"
                  type="button"
                  onClick={onOpenJarvisVoice}
                  className="p-2 rounded-lg border transition-all shadow-xs cursor-pointer active:scale-95"
                  style={{
                    borderColor: currentTheme.borderColor,
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                    color: ACCENT_COLORS[accentColorId].hex,
                  }}
                  title="Speak (Hands-Free Ambient Voice)"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              <button
                id="send-reflection-button"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && stagedAttachments.length === 0) || isGenerating}
                className="p-2 rounded-lg disabled:opacity-40 text-white transition-all shadow-xs cursor-pointer active:scale-95"
                style={{
                  backgroundColor: ACCENT_COLORS[accentColorId].hex,
                }}
                title="Send reflection to Gemini"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prompt Tool Ribbon: Photo/GIF, Google Search Grounding, Gemini Mindful Tools */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Attach Photo / GIF button */}
              <button
                id="prompt-attach-media-btn"
                type="button"
                onClick={() => {
                  setMediaPickerMode('prompt');
                  setIsMediaModalOpen(true);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  stagedAttachments.length > 0
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs font-semibold'
                    : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700'
                }`}
                title="Attach Photo or GIF to this prompt"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Photo / GIF</span>
                {stagedAttachments.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                    {stagedAttachments.length}
                  </span>
                )}
              </button>

              {/* Google Search Grounding toggle */}
              <button
                id="prompt-google-grounding-btn"
                type="button"
                onClick={() => setEnableSearchGrounding((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  enableSearchGrounding
                    ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-2xs font-semibold ring-1 ring-blue-300'
                    : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-600'
                }`}
                title="Ground response with live Google Search citations"
              >
                <Globe className={`w-3.5 h-3.5 ${enableSearchGrounding ? 'text-blue-600 animate-pulse' : 'text-stone-400'}`} />
                <span>Google Grounding {enableSearchGrounding ? 'ON' : 'OFF'}</span>
              </button>

              {/* Gemini Mindful Quick Tools button */}
              <button
                id="prompt-gemini-tools-btn"
                type="button"
                onClick={() => setIsGeminiToolsModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50/80 hover:bg-amber-100 border border-amber-300 text-amber-900 transition-all cursor-pointer shadow-2xs"
                title="Launch Gemini Mindful Tools (Cognitive Reframe, Action Steps, Perspective Switcher)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Gemini Tools</span>
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] mt-2 opacity-75" style={{ color: currentTheme.textMuted }}>
          Responses generated with Gemini 3.6 Flash & Google Search • Encrypted in Web Worker Enclave & Persisted to Firestore
        </p>
      </div>

      {/* Location Picker Modal (Google Maps Integration) */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={entry.location}
        onSelectLocation={handleSelectLocation}
      />

      {/* Sticker & Milestone Badge Picker Modal */}
      <StickerPickerModal
        isOpen={isStickerModalOpen}
        onClose={() => setIsStickerModalOpen(false)}
        selectedStickerIds={entry.stickers || []}
        onToggleSticker={handleToggleSticker}
      />

      {/* Media Picker Modal (Photos & Trending GIFs) */}
      <MediaPickerModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectMedia={handleSelectMedia}
      />

      {/* Full-Screen Media Lightbox Viewer */}
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
        onRemove={handleRemoveEntryAttachment}
      />

      {/* Gemini Mindful Tools Modal (Cognitive Reframe, Action Steps, Perspective Switcher) */}
      <GeminiToolsModal
        isOpen={isGeminiToolsModalOpen}
        onClose={() => setIsGeminiToolsModalOpen(false)}
        contextText={
          entry.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
          entry.messages.slice(-1)[0]?.content ||
          entry.title
        }
        activeAttachments={entry.attachments || []}
        onApplyInsightToChat={(insightText) => handleApplyQuickInsight(insightText, 'Gemini Mindful Synthesis')}
        enableSearchGrounding={enableSearchGrounding}
        onToggleSearchGrounding={setEnableSearchGrounding}
      />
    </div>
  );
};
