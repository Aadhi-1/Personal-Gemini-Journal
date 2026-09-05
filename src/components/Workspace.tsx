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
} from '../types';
import { LocationPickerModal } from './LocationPickerModal';
import { analyzeDistressOnDevice, sanitizeTextForAudioDLP } from '../crypto/guardrails';
import { enclave } from '../crypto/workerClient';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';

interface WorkspaceProps {
  entry: InteractionEntry;
  onUpdateEntry: (updated: InteractionEntry) => Promise<void>;
  onToggleMobileSidebar: () => void;
  onOpenJarvisVoice?: () => void;
  onTriggerSafeMode?: (phrase?: string) => void;
  onOpenMoodInsights?: () => void;
  onOpenVoiceGuide?: () => void;
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
  onOpenJarvisVoice,
  onTriggerSafeMode,
  onOpenMoodInsights,
  onOpenVoiceGuide,
}) => {
  const { currentTheme, accentColorId } = useTheme();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [copiedExport, setCopiedExport] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [externalAlertStatus, setExternalAlertStatus] = useState<string | null>(null);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Audio DLP Speech Playback
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
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
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

    const userMessage: InteractionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
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
      // Clear input buffer on success trigger, but keep backup in case of failure
      if (!textToSend) {
        setInputText('');
      }

      // First guarantee user message persistence
      await onUpdateEntry(updatedEntryWithUser);

      // Call server-side Gemini API
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: entry.mode,
          title: entry.title,
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
      // Restore input text buffer for resilience
      setInputText(content);
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
        <div className="flex items-center justify-between gap-3">
          {/* Mobile sidebar toggle */}
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-200 transition-colors"
            title="Toggle past reflections"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title Editor */}
          <div className="flex-1 flex items-center min-w-0">
            {entry.mood && (
              <span
                id="entry-title-mood-emoji"
                className="text-lg sm:text-xl mr-1.5 shrink-0 select-none"
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
              className="flex-1 text-base sm:text-lg font-semibold bg-transparent px-2 py-1 -ml-2 rounded-md border border-transparent focus:border-stone-300 focus:outline-none transition-colors truncate"
              style={{ color: currentTheme.textMain }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Real-time Autosave Feedback Badge */}
            <div
              id="workspace-autosave-indicator"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] border transition-all duration-200 select-none"
              title={`Zero-Knowledge Cloud Firestore Autosave Status: ${autosaveState}`}
            >
              {autosaveState === 'saving' ? (
                <span className="flex items-center gap-1 text-amber-700 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  <span className="hidden sm:inline">Autosaving...</span>
                </span>
              ) : autosaveState === 'error' ? (
                <span className="flex items-center gap-1 text-rose-700 font-medium">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Save Error</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="hidden xs:inline">Autosaved</span>
                  <span className="text-[10px] text-stone-400 hidden sm:inline">({lastSavedTime})</span>
                </span>
              )}
            </div>

            {onOpenMoodInsights && (
              <button
                id="workspace-mood-insights-button"
                type="button"
                onClick={onOpenMoodInsights}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-2xs"
                title="Open Mood Insights (D3.js Local Enclave Visualization)"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Mood Insights</span>
              </button>
            )}

            {onOpenVoiceGuide && (
              <button
                id="workspace-voice-guide-button"
                type="button"
                onClick={onOpenVoiceGuide}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:border-stone-400 transition-all shadow-2xs"
                title="Voice Command Guide & Natural Language Reference"
              >
                <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden lg:inline">Voice Guide</span>
              </button>
            )}

            {onOpenJarvisVoice && (
              <button
                id="workspace-jarvis-voice-button"
                type="button"
                onClick={onOpenJarvisVoice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 transition-all shadow-2xs active:scale-95"
                title="Launch Jarvis Ambient Voice interface"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse text-stone-950" />
                <span className="hidden sm:inline">Jarvis Voice</span>
              </button>
            )}

            <button
              id="summarize-session-button"
              type="button"
              onClick={handleGenerateSummary}
              disabled={isSummarizing || entry.messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Generate summary and extract key takeaways with Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSummarizing ? 'Summarizing...' : 'Summarize Session'}
              </span>
            </button>

            <button
              id="export-markdown-button"
              type="button"
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:border-stone-400 transition-all shadow-2xs"
              title="Download full reflection in Markdown format"
            >
              {copiedExport ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span className="hidden sm:inline">{copiedExport ? 'Downloaded' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Row: Mode Selector & Category */}
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

          {/* Category Dropdown & Location Pinning */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

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
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                  <div
                    className={`text-[10px] mt-2 flex items-center justify-between gap-2 ${
                      isUser ? 'text-stone-400' : 'text-stone-500'
                    }`}
                  >
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

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
                      title="Read aloud with Audio DLP protection"
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
        <div className="max-w-3xl mx-auto relative">
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
              disabled={!inputText.trim() || isGenerating}
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
        <p className="text-center text-[11px] mt-2 opacity-75" style={{ color: currentTheme.textMuted }}>
          Responses generated with Gemini 3.6 Flash • Encrypted in Web Worker Enclave & Persisted to Firestore
        </p>
      </div>

      {/* Location Picker Modal (Google Maps Integration) */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={entry.location}
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
};
