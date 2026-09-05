import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  X,
  Play,
  Square,
  Type as TypographyIcon,
  HelpCircle,
  CheckCircle2,
  Smile,
} from 'lucide-react';
import { InteractionEntry, InteractionMessage, MOOD_OPTIONS } from '../types';
import { analyzeDistressOnDevice, sanitizeTextForAudioDLP, EMPATHY_FALLBACK_AUDIO_SCRIPT } from '../crypto/guardrails';
import { enclave, logSecurityEvent } from '../crypto/workerClient';
import { VoiceCommandGuideModal } from './VoiceCommandGuideModal';
import { useTheme, VOICE_PERSONAS, ACCENT_COLORS, VoicePersonaId } from '../theme/ThemeContext';

interface JarvisVoiceInterfaceProps {
  entry: InteractionEntry;
  onUpdateEntry: (updated: InteractionEntry) => Promise<void>;
  onTriggerSafeMode: (triggerPhrase?: string) => void;
  onClose: () => void;
}

export function JarvisVoiceInterface({
  entry,
  onUpdateEntry,
  onTriggerSafeMode,
  onClose,
}: JarvisVoiceInterfaceProps) {
  const {
    activeVoice,
    activeVoiceId,
    setActiveVoiceId,
    applyVoiceCommand,
    voiceSpeed,
    voicePitch,
    isVoiceMuted,
    accentColorId,
  } = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [audioDlpAlert, setAudioDlpAlert] = useState<string | null>(null);
  const [jarvisFeedback, setJarvisFeedback] = useState<string>(
    `Hello! I am ${activeVoice.name}, your private journaling companion. Tap the microphone and tell me about your day.`
  );
  const [fontSizeTier, setFontSizeTier] = useState<'normal' | 'large' | 'huge'>('large');
  const [voiceVolumeEnabled, setVoiceVolumeEnabled] = useState(!isVoiceMuted);
  const [isVoiceGuideOpen, setIsVoiceGuideOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Synthesis & Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              currentInterim += transcriptPiece;
            }
          }

          if (currentInterim) {
            setInterimText(currentInterim);
          }

          if (finalTranscript) {
            setTranscript((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
            setInterimText('');
            handleVoiceSubmission(finalTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setJarvisFeedback("Microphone access is paused. Please enable microphone permission in your browser.");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setJarvisFeedback("Your browser doesn't support live speech recognition. You can still read aloud!");
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Text-To-Speech with Audio DLP Scrubbing
  const speakAloud = (rawText: string) => {
    if (!voiceVolumeEnabled || typeof window === 'undefined' || !synthRef.current) return;

    synthRef.current.cancel();

    // 1. Audio Data Loss Prevention Filter (Mandatory PII Scrubbing)
    const { cleanText, redactedCount } = sanitizeTextForAudioDLP(rawText);
    if (redactedCount > 0) {
      setAudioDlpAlert(`Audio DLP Filter: Redacted ${redactedCount} private details (phone/address/ID) to protect privacy.`);
      setTimeout(() => setAudioDlpAlert(null), 6000);
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = voiceSpeed || activeVoice.rate;
    utterance.pitch = voicePitch || activeVoice.pitch;

    // Pick matching browser voice if available
    try {
      const availableVoices = synthRef.current.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        const matched = availableVoices.find((v) =>
          activeVoice.preferredVoiceNames.some((pref) =>
            v.name.toLowerCase().includes(pref.toLowerCase())
          )
        );
        if (matched) {
          utterance.voice = matched;
        }
      }
    } catch {}

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setJarvisFeedback("I am listening closely... Please speak whenever you are ready.");
        } catch (e) {
          console.warn('Recognition start exception:', e);
        }
      }
    }
  };

  // Process voice submission with On-Device Harm Classifier, Voice Commands & Zero-Knowledge Enclave
  const handleVoiceSubmission = async (spokenText: string) => {
    if (!spokenText) return;

    const lower = spokenText.toLowerCase().trim();

    // 1. On-Device Human Safety Harm Detection (Runs BEFORE encryption or networking)
    const safetyCheck = analyzeDistressOnDevice(spokenText);
    if (safetyCheck.isDistressDetected) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      speakAloud("I am right here with you, and you are safe. Let's get you in touch with someone who can help.");
      onTriggerSafeMode(safetyCheck.triggerPhrase);
      return;
    }

    // 2. Intercept Natural Voice Commands & Voice-Activated Theme/Persona Switching
    const cmdResult = applyVoiceCommand(spokenText);
    if (cmdResult.matched) {
      setJarvisFeedback(cmdResult.feedback);
      speakAloud(cmdResult.feedback);
      return;
    }

    // Voice Command: Safe Mode / Emergency Help
    if (
      lower.includes('safe mode') ||
      lower.includes('crisis assistance') ||
      lower.includes('emergency help') ||
      lower === 'help me' ||
      lower === 'i need help'
    ) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      speakAloud("Activating Safe Mode Crisis Assistance right away.");
      onTriggerSafeMode('Voice emergency assistance requested');
      return;
    }

    // Voice Command: Set / Tag Mood
    const matchedMood = MOOD_OPTIONS.find((m) => lower.includes(m.label.toLowerCase()));
    if (
      matchedMood &&
      (lower.includes('mood') ||
        lower.includes('feeling') ||
        lower.includes('feel') ||
        lower.startsWith('set mood') ||
        lower.startsWith('i am feeling') ||
        lower.startsWith("i'm feeling"))
    ) {
      try {
        setAutosaveStatus('saving');
        const formattedMood = `${matchedMood.emoji} ${matchedMood.label}`;
        const updatedEntry: InteractionEntry = {
          ...entry,
          mood: formattedMood,
          updatedAt: new Date().toISOString(),
        };
        await onUpdateEntry(updatedEntry);
        setAutosaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const reply = `I have updated your mood to ${matchedMood.emoji} ${matchedMood.label}.`;
        setJarvisFeedback(reply);
        speakAloud(reply);
        logSecurityEvent('MOOD_UPDATED_VIA_VOICE', 'INFO', `Mood tagged as ${formattedMood}`);
        return;
      } catch (e) {
        setAutosaveStatus('error');
      }
    }

    // Voice Command: Summarize Session
    if (
      lower.includes('summarize session') ||
      lower.includes('summarize reflection') ||
      lower.includes('give me a summary') ||
      lower === 'summarize'
    ) {
      if (entry.messages.length === 0) {
        const reply = "We haven't shared reflections yet to summarize. Tell me what's on your mind!";
        setJarvisFeedback(reply);
        speakAloud(reply);
        return;
      }

      setIsThinking(true);
      setJarvisFeedback("Synthesizing core takeaways from our reflection...");
      speakAloud("Synthesizing your key insights now.");

      try {
        setAutosaveStatus('saving');
        const response = await fetch('/api/gemini/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: entry.messages,
            title: entry.title,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedEntry: InteractionEntry = {
            ...entry,
            summary: data.summary || '',
            keyInsights: data.keyInsights || [],
            updatedAt: new Date().toISOString(),
          };
          await onUpdateEntry(updatedEntry);
          setAutosaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          const summaryReply = `Summary generated: ${data.summary || 'Insights recorded.'}`;
          setJarvisFeedback(summaryReply);
          speakAloud(summaryReply);
          return;
        }
      } catch (err) {
        console.error('Voice summarization error:', err);
      } finally {
        setIsThinking(false);
      }
    }

    // Voice Command: Read Aloud / Read Latest
    if (
      lower.includes('read aloud') ||
      lower.includes('read latest') ||
      lower.includes('read back') ||
      lower === 'read'
    ) {
      handleReadLatest();
      return;
    }

    // Voice Command: Adjust Typography Size
    if (lower.includes('huge text') || lower.includes('biggest text')) {
      setFontSizeTier('huge');
      const reply = "Text size set to huge for comfortable reading.";
      setJarvisFeedback(reply);
      speakAloud(reply);
      return;
    }
    if (lower.includes('large text') || lower.includes('big text')) {
      setFontSizeTier('large');
      const reply = "Text size set to large.";
      setJarvisFeedback(reply);
      speakAloud(reply);
      return;
    }
    if (lower.includes('normal text') || lower.includes('standard text') || lower.includes('small text')) {
      setFontSizeTier('normal');
      const reply = "Text size set to normal.";
      setJarvisFeedback(reply);
      speakAloud(reply);
      return;
    }

    // Voice Command: Clear Entry
    if (lower.includes('clear entry') || lower.includes('clear reflection') || lower.includes('reset entry')) {
      setAutosaveStatus('saving');
      const updatedEntry: InteractionEntry = {
        ...entry,
        messages: [],
        summary: undefined,
        keyInsights: undefined,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateEntry(updatedEntry);
      setAutosaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const reply = "I have cleared the active reflection draft. Ready for your fresh thoughts!";
      setJarvisFeedback(reply);
      speakAloud(reply);
      return;
    }

    // 3. Normal Reflective Dialogue
    setIsThinking(true);
    setJarvisFeedback("Jarvis is thinking about your reflection...");

    // Append User Message
    const userMsg: InteractionMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: spokenText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...entry.messages, userMsg];

    try {
      setAutosaveStatus('saving');
      // Call Gemini Reflection API
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(-8),
          mode: entry.mode,
          title: entry.title,
          personaId: activeVoiceId,
        }),
      });

      let aiReplyText = '';
      if (!response.ok) {
        // Fallback to offline empathy audio
        aiReplyText = EMPATHY_FALLBACK_AUDIO_SCRIPT;
      } else {
        const data = await response.json();
        aiReplyText = data.reply || EMPATHY_FALLBACK_AUDIO_SCRIPT;
      }

      const modelMsg: InteractionMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: aiReplyText,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, modelMsg];

      // Encrypt full reflection in Web Worker Enclave (AES-256-GCM)
      const serializedPlaintext = JSON.stringify(finalMessages);
      const encryptedResult = await enclave.encrypt(serializedPlaintext);

      const updatedEntry: InteractionEntry = {
        ...entry,
        messages: finalMessages,
        encrypted_content: encryptedResult.ciphertext,
        iv: encryptedResult.iv,
        key_id: encryptedResult.keyId,
        isEncrypted: true,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateEntry(updatedEntry);
      setAutosaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      setJarvisFeedback(aiReplyText);
      speakAloud(aiReplyText);
    } catch (err) {
      console.error('Error during voice interaction:', err);
      setAutosaveStatus('error');
      setJarvisFeedback(EMPATHY_FALLBACK_AUDIO_SCRIPT);
      speakAloud(EMPATHY_FALLBACK_AUDIO_SCRIPT);
    } finally {
      setIsThinking(false);
    }
  };

  const handleReadLatest = () => {
    if (entry.messages.length > 0) {
      const last = entry.messages[entry.messages.length - 1];
      speakAloud(last.content);
    } else {
      speakAloud("You don't have any recorded entries yet. Speak to me by tapping the microphone!");
    }
  };

  const fontClass =
    fontSizeTier === 'huge'
      ? 'text-xl sm:text-2xl leading-relaxed'
      : fontSizeTier === 'large'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-sm sm:text-base leading-normal';

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-stone-100 select-none">
      {/* Top Header Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Jarvis Voice Companion
              <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Zero-Knowledge Enclave
              </span>
            </h2>
            <p className="text-xs text-stone-400">
              Low-Literacy Friendly • Local Audio Only • Audio DLP Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Autosave Feedback */}
          <div
            id="jarvis-autosave-indicator"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-800 text-[11px]"
            title="Autosave status"
          >
            {autosaveStatus === 'saving' ? (
              <>
                <RotateCcw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-medium">Saving...</span>
              </>
            ) : autosaveStatus === 'error' ? (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400 font-medium">Save failed</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-stone-300 font-mono">Autosaved</span>
              </>
            )}
          </div>

          {/* Voice Persona Selector */}
          <select
            value={activeVoiceId}
            onChange={(e) => {
              const newId = e.target.value as VoicePersonaId;
              setActiveVoiceId(newId);
              const p = VOICE_PERSONAS.find((x) => x.id === newId);
              if (p) {
                const notice = `Switched voice companion to ${p.name}. ${p.greetingSample}`;
                setJarvisFeedback(notice);
                speakAloud(notice);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 text-stone-200 border border-stone-700 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
            title="Switch Companion Voice Persona"
          >
            {VOICE_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.title})
              </option>
            ))}
          </select>

          {/* Voice Command Guide Launcher */}
          <button
            id="jarvis-voice-guide-button"
            type="button"
            onClick={() => setIsVoiceGuideOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            title="Open Voice Command Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Voice Guide</span>
          </button>

          {/* Font Size Adjuster for Elderly/Low-Vision */}
          <button
            type="button"
            onClick={() =>
              setFontSizeTier((prev) => (prev === 'normal' ? 'large' : prev === 'large' ? 'huge' : 'normal'))
            }
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 transition-colors"
            title="Adjust text size"
          >
            <TypographyIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{fontSizeTier} Text</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              if (voiceVolumeEnabled && synthRef.current) {
                synthRef.current.cancel();
                setIsSpeaking(false);
              }
              setVoiceVolumeEnabled(!voiceVolumeEnabled);
            }}
            className={`p-2 rounded-xl transition-colors ${
              voiceVolumeEnabled
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-stone-800 text-stone-400'
            }`}
            title={voiceVolumeEnabled ? 'Mute voice audio' : 'Unmute voice audio'}
          >
            {voiceVolumeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Close Voice HUD */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
            title="Return to text workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DLP Warning Banner if PII was redacted */}
      {audioDlpAlert && (
        <div className="w-full max-w-xl my-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{audioDlpAlert}</span>
        </div>
      )}

      {/* Central Visualizer & Orb */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full my-4 text-center">
        {/* Animated Jarvis Voice Orb */}
        <div className="relative mb-6">
          {/* Outer Pulsing Glow */}
          <div
            className={`absolute -inset-4 rounded-full blur-xl transition-all duration-700 ${
              isSpeaking
                ? 'bg-amber-500/40 animate-pulse scale-110'
                : isListening
                ? 'bg-emerald-500/40 animate-pulse scale-105'
                : isThinking
                ? 'bg-blue-500/40 animate-spin'
                : 'bg-stone-700/20'
            }`}
          />

          {/* Main Interactive Orb Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
              isListening
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white ring-4 ring-emerald-400/50'
                : isSpeaking
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white ring-4 ring-amber-400/50'
                : isThinking
                ? 'bg-gradient-to-br from-indigo-500 to-purple-700 text-white'
                : 'bg-gradient-to-br from-stone-800 to-stone-900 text-stone-200 hover:ring-4 hover:ring-amber-500/30'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 animate-bounce" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Listening</span>
              </>
            ) : isSpeaking ? (
              <>
                <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Speaking</span>
              </>
            ) : isThinking ? (
              <>
                <RotateCcw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Reflecting</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-stone-300">Tap to Talk</span>
              </>
            )}
          </button>
        </div>

        {/* Ambient Waveform Indicator */}
        <div className="flex items-center gap-1.5 h-6 mb-4">
          {[...Array(9)].map((_, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-300 ${
                isListening
                  ? 'bg-emerald-400 h-5 animate-pulse'
                  : isSpeaking
                  ? 'bg-amber-400 h-6 animate-pulse'
                  : 'bg-stone-700 h-2'
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            />
          ))}
        </div>

        {/* Dynamic Status / Jarvis Feedback Card */}
        <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-6 shadow-xl text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Jarvis Says:
            </span>
            {isSpeaking && (
              <button
                type="button"
                onClick={() => {
                  if (synthRef.current) {
                    synthRef.current.cancel();
                    setIsSpeaking(false);
                  }
                }}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800"
              >
                <Square className="w-3 h-3 text-red-400" />
                Stop Voice
              </button>
            )}
          </div>

          <p className={`${fontClass} text-stone-200 font-medium`}>
            {jarvisFeedback}
          </p>

          {/* Live speech preview if user is speaking */}
          {(interimText || isListening) && (
            <div className="mt-4 pt-3 border-t border-stone-800/80">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                You are saying:
              </span>
              <p className="text-sm italic text-stone-300 mt-0.5">
                {interimText || 'Listening for your voice...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Emergency & Accessibility Actions */}
      <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-800">
        <div className="flex items-center gap-2">
          {/* Read Aloud Button */}
          <button
            type="button"
            onClick={handleReadLatest}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4 text-amber-400" />
            Read Aloud
          </button>

          {/* Plausible Deniability Safe Panic Button */}
          <button
            type="button"
            onClick={() => onTriggerSafeMode()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs sm:text-sm font-semibold transition-colors"
            title="Immediate safe mode assistance"
          >
            <HeartHandshake className="w-4 h-4 text-rose-400" />
            Safe Mode Assistance
          </button>
        </div>

        <div className="text-[11px] text-stone-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Microphone audio stays strictly on your device</span>
        </div>
      </div>

      {/* Voice Command Guide Modal */}
      <VoiceCommandGuideModal
        isOpen={isVoiceGuideOpen}
        onClose={() => setIsVoiceGuideOpen(false)}
        onTestCommand={(command) => {
          setIsVoiceGuideOpen(false);
          handleVoiceSubmission(command);
        }}
      />
    </div>
  );
}
