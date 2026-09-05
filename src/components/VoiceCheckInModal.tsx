import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PenTool,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  X,
  Loader2,
  HeartHandshake,
  Play,
  Sun,
  Sunset,
  Moon,
  Command,
} from 'lucide-react';
import {
  useTheme,
  ACCENT_COLORS,
  VOICE_PERSONAS,
  VoicePersonaId,
  VoicePersona,
} from '../theme/ThemeContext';
import { InteractionEntry, InteractionMessage, JournalCategory, JournalMode } from '../types';
import { analyzeDistressOnDevice, sanitizeTextForAudioDLP } from '../crypto/guardrails';
import { enclave } from '../crypto/workerClient';
import { saveInteraction } from '../firebase';

interface VoiceCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onReflectionCreated: (entry: InteractionEntry) => void;
  onSelectWriteMyself: () => void;
  onTriggerSafeMode: (phrase?: string) => void;
}

type CheckInStep = 'ask_preference' | 'listening_to_reflection' | 'generating' | 'completed';

// Dynamic contextual greeting based on local time of day
function getContextualGreeting(personaName: string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      period: 'Morning Intention',
      icon: Sun,
      greeting: `Good morning! I am ${personaName}. Are you able to write your reflection today, or would you like me to listen and write it for you?`,
      chips: [
        '☀️ My primary intention for today',
        '🌿 How I woke up feeling emotionally',
        '⚡ One boundary I want to protect today',
      ],
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      period: 'Midday Mindful Pause',
      icon: Sunset,
      greeting: `Good afternoon! I am ${personaName}. How is your day flowing? Would you like to write your reflection, or shall I listen and capture it for you?`,
      chips: [
        '💡 What drained or energized me this morning',
        '🤔 A friction or challenge I faced today',
        '🧘 Taking a mindful breath to reset focus',
      ],
    };
  }
  return {
    period: 'Evening Unwind & Debrief',
    icon: Moon,
    greeting: `Good evening. I am ${personaName}. Let's unburden your mind from today. Would you like to write yourself, or shall I listen and write it for you?`,
    chips: [
      '🌙 What went surprisingly well today',
      '🌸 Something or someone I am grateful for',
      '💭 A thought keeping my mind busy',
      '🕊️ Releasing today’s tension before resting',
    ],
  };
}

export const VoiceCheckInModal: React.FC<VoiceCheckInModalProps> = ({
  isOpen,
  onClose,
  userId,
  onReflectionCreated,
  onSelectWriteMyself,
  onTriggerSafeMode,
}) => {
  const {
    currentTheme,
    accentColorId,
    activeVoice,
    activeVoiceId,
    setActiveVoiceId,
    applyVoiceCommand,
    speakText,
    stopSpeaking,
    setHasSeenVoiceCheckIn,
  } = useTheme();

  const [step, setStep] = useState<CheckInStep>('ask_preference');
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedEntry, setGeneratedEntry] = useState<InteractionEntry | null>(null);
  const [spokenConfirmation, setSpokenConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const contextual = getContextualGreeting(activeVoice.name);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    setStep('ask_preference');
    setSpokenTranscript('');
    setInterimText('');
    setGeneratedEntry(null);

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
        let finalPiece = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalPiece += piece;
          } else {
            currentInterim += piece;
          }
        }

        if (currentInterim) {
          setInterimText(currentInterim);
        }

        if (finalPiece) {
          setSpokenTranscript((prev) => (prev ? `${prev} ${finalPiece}` : finalPiece));
          setInterimText('');
          handleVoiceInputRouting(finalPiece.trim());
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Voice check-in recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Dynamic Voice Prompt On Opening
    const dynamicGreetingText = contextual.greeting;
    setStatusMessage(dynamicGreetingText);

    const timer = setTimeout(() => {
      speakText(
        dynamicGreetingText,
        () => {},
        () => {
          // Once question completes, activate listening for their answer
          startListening();
        }
      );
    }, 400);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // already started
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {}
  };

  // Natural Voice Command Routing: checks for distress, voice commands (theme/persona/mute), and preference
  const handleVoiceInputRouting = (text: string) => {
    const lower = text.toLowerCase();

    // 1. Check for distress first
    const distress = analyzeDistressOnDevice(text);
    if (distress.isDistressDetected) {
      stopListening();
      stopSpeaking();
      onTriggerSafeMode(distress.triggerPhrase);
      onClose();
      return;
    }

    // 2. Voice-Activated Theme & Persona Switching
    const cmdResult = applyVoiceCommand(text);
    if (cmdResult.matched) {
      setStatusMessage(cmdResult.feedback);
      speakText(cmdResult.feedback);
      return;
    }

    // 3. Hands-free "Finish & Save" trigger while dictating
    if (
      step === 'listening_to_reflection' &&
      (lower.includes('finish reflection') ||
        lower.includes('save reflection') ||
        lower.includes('done speaking') ||
        lower.includes("i'm done") ||
        lower.includes('im done') ||
        lower.includes('write my reflection'))
    ) {
      handleFinishAndCraftReflection();
      return;
    }

    // 4. Initial preference answering
    if (step === 'ask_preference') {
      // User indicates they cannot write or want voice assistance
      if (
        lower.includes("can't write") ||
        lower.includes('cannot write') ||
        lower.includes('unable to write') ||
        lower.includes('write for me') ||
        lower.includes('speak') ||
        lower.includes('talk') ||
        lower.includes('dictate') ||
        lower.includes('listen') ||
        lower.includes('hands free') ||
        lower === 'no' ||
        lower === 'nope' ||
        lower.includes('not really') ||
        lower.includes("i'm tired")
      ) {
        transitionToVoiceJournaling();
        return;
      }

      // User indicates they can write themselves
      if (
        lower.includes('can write') ||
        lower.includes('i will write') ||
        lower.includes("i'll write") ||
        lower.includes('type') ||
        lower.includes('write myself') ||
        lower === 'yes' ||
        lower === 'yeah' ||
        lower === 'sure' ||
        lower === 'i can'
      ) {
        handleChooseTypeMyself();
        return;
      }
    }
  };

  // User chooses "I can't write — listen & write for me"
  const transitionToVoiceJournaling = (customStarterPrompt?: string) => {
    stopListening();
    setStep('listening_to_reflection');
    setSpokenTranscript('');
    setInterimText('');

    const listenPrompt = customStarterPrompt
      ? `I'm listening. Tell me more about: "${customStarterPrompt}". Take all the time you need.`
      : `I am listening closely. Tell me whatever happened today, what you are feeling, or what is on your mind. Take all the time you need, and I will craft and write your complete reflection.`;
    setStatusMessage(listenPrompt);

    speakText(
      listenPrompt,
      () => {},
      () => {
        // Automatically start recording their reflection thoughts
        startListening();
      }
    );
  };

  // User chooses "I can write myself"
  const handleChooseTypeMyself = () => {
    stopListening();
    stopSpeaking();
    setHasSeenVoiceCheckIn(true);

    const reply = `Wonderful! Your workspace is ready. Take your time writing, and let me know if you need any insights.`;
    speakText(reply, () => {}, () => {
      onSelectWriteMyself();
      onClose();
    });

    // Close quickly so user can start typing
    setTimeout(() => {
      onSelectWriteMyself();
      onClose();
    }, 1500);
  };

  // Switch persona manually with immediate auditory confirmation
  const handleSelectPersona = (p: VoicePersona) => {
    setActiveVoiceId(p.id);
    stopSpeaking();
    speakText(`I am ${p.name}. I'll adopt this tone for your reflection.`);
  };

  // Audition a persona's sample voice
  const handleAuditionVoice = (e: React.MouseEvent, p: VoicePersona) => {
    e.stopPropagation();
    stopSpeaking();
    setAuditioningVoiceId(p.id);
    speakText(
      `Hello, I am ${p.name}. ${p.greetingSample}`,
      () => setAuditioningVoiceId(p.id),
      () => setAuditioningVoiceId(null)
    );
  };

  // Submit Spoken Words to AI Endpoint to generate reflection
  const handleFinishAndCraftReflection = async () => {
    stopListening();
    stopSpeaking();

    const fullSpoken = `${spokenTranscript} ${interimText}`.trim();
    if (!fullSpoken || fullSpoken.length < 5) {
      setStatusMessage("I didn't catch much. Please share a little more about your thoughts or day!");
      startListening();
      return;
    }

    // On-device safety check
    const distress = analyzeDistressOnDevice(fullSpoken);
    if (distress.isDistressDetected) {
      onTriggerSafeMode(distress.triggerPhrase);
      onClose();
      return;
    }

    setStep('generating');
    setIsSaving(true);
    setStatusMessage(`Crafting your reflection with ${activeVoice.name} & Gemini 3.6 Flash...`);

    try {
      const response = await fetch('/api/gemini/voice-to-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spokenText: fullSpoken,
          mode: 'reflection',
          personaId: activeVoiceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to craft reflection from spoken stream.');
      }

      const data = await response.json();

      if (data.crisisDetected) {
        onTriggerSafeMode('Distress signals caught in voice synthesis');
        onClose();
        return;
      }

      // Build the structured Interaction Entry
      const userMessage: InteractionMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: data.cleanedUserText || fullSpoken,
        timestamp: new Date().toISOString(),
      };

      const aiMessage: InteractionMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: data.aiReply,
        timestamp: new Date().toISOString(),
      };

      const messages = [userMessage, aiMessage];

      // Zero-Knowledge Web Worker Enclave Encryption (AES-256-GCM)
      const serialized = JSON.stringify(messages);
      const encrypted = await enclave.encrypt(serialized);

      const newEntry: InteractionEntry = {
        id: `reflection-${Date.now()}`,
        userId,
        title: data.title || 'Spoken Reflection',
        category: (data.category as JournalCategory) || 'Personal Reflection',
        mode: 'reflection',
        mood: data.mood || '🤔 Reflective',
        summary: data.aiReply.slice(0, 180),
        keyInsights: data.keyInsights || [],
        messages,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        key_id: encrypted.keyId,
        isEncrypted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Cloud Firestore
      await saveInteraction(userId, newEntry);

      setGeneratedEntry(newEntry);
      setSpokenConfirmation(data.spokenConfirmation);
      setStep('completed');
      setHasSeenVoiceCheckIn(true);

      // Assistant speaks the confirmation
      const confirmAudio = data.spokenConfirmation || `I've written your reflection titled ${newEntry.title}. Your thoughts have been secured in your private journal.`;
      speakText(confirmAudio);
    } catch (err: any) {
      console.error('Voice reflection error:', err);
      setStatusMessage('Sorry, there was an issue processing your voice reflection. You can try speaking again or write manually.');
      setStep('listening_to_reflection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWorkspaceWithEntry = () => {
    stopSpeaking();
    if (generatedEntry) {
      onReflectionCreated(generatedEntry);
    }
    onClose();
  };

  if (!isOpen) return null;

  const PeriodIcon = contextual.icon;

  return (
    <div
      id="voice-checkin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        id="voice-checkin-card"
        className="w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col transition-all"
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textMain,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Voice Reflection Concierge</h2>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}20`,
                    color: ACCENT_COLORS[accentColorId].hex,
                  }}
                >
                  <PeriodIcon className="w-3 h-3" />
                  {contextual.period}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                Speaking with {activeVoice.name} • Hands-free journal check-in
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              stopListening();
              onClose();
            }}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: currentTheme.textMuted }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Persona Selector Carousel / Pill Bar */}
        <div
          className="px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto no-scrollbar"
          style={{
            borderColor: currentTheme.borderColor,
            backgroundColor: `${ACCENT_COLORS[accentColorId].hex}05`,
          }}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider shrink-0" style={{ color: currentTheme.textMuted }}>
            Persona:
          </span>
          {VOICE_PERSONAS.map((p) => {
            const isSelected = activeVoiceId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPersona(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-transparent text-white shadow-xs'
                    : 'hover:border-stone-400 opacity-80'
                }`}
                style={{
                  backgroundColor: isSelected ? ACCENT_COLORS[accentColorId].hex : currentTheme.bgMain,
                  borderColor: isSelected ? 'transparent' : currentTheme.borderColor,
                }}
              >
                <span>{p.name}</span>
                <span
                  className="text-[9px] px-1 rounded font-normal opacity-90"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${ACCENT_COLORS[accentColorId].hex}20`,
                  }}
                >
                  {p.tag || 'AI'}
                </span>
                <button
                  type="button"
                  title={`Preview ${p.name} voice`}
                  onClick={(e) => handleAuditionVoice(e, p)}
                  className="p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5"
                >
                  <Play className={`w-3 h-3 ${auditioningVoiceId === p.id ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Wave & Listening Visualizer */}
          <div
            className="rounded-2xl p-5 text-center border relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]"
            style={{
              borderColor: currentTheme.borderColor,
              backgroundColor: `${ACCENT_COLORS[accentColorId].hex}08`,
            }}
          >
            {/* Animated Sound Wave Rings */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div
                  className="w-32 h-32 rounded-full animate-ping"
                  style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                />
              </div>
            )}

            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white mb-2.5 shadow-md transition-all ${
                isListening ? 'scale-110' : 'scale-100'
              }`}
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Mic className="w-6 h-6" />
            </div>

            {/* Spoken Status Indicator */}
            <p className="text-xs sm:text-sm font-semibold max-w-md px-2 leading-relaxed">
              {statusMessage || 'Listening for your voice...'}
            </p>

            {isListening && (
              <span
                className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold px-3 py-0.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}25`,
                  color: ACCENT_COLORS[accentColorId].hex,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Listening now... Speak freely
              </span>
            )}
          </div>

          {/* STEP 1: Ask Preference with Dynamic Reflection Starters */}
          {step === 'ask_preference' && (
            <div className="space-y-4">
              <p className="text-center text-xs" style={{ color: currentTheme.textMuted }}>
                Answer with voice (say <em>"I can't write"</em> or <em>"I'll write myself"</em>), or tap an option:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option: I Can't Write (Voice writes for them) */}
                <button
                  type="button"
                  onClick={() => transitionToVoiceJournaling()}
                  className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs flex flex-col justify-between group"
                  style={{
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                    borderColor: ACCENT_COLORS[accentColorId].hex,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                    >
                      <Mic className="w-4 h-4" />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${ACCENT_COLORS[accentColorId].hex}30`,
                        color: ACCENT_COLORS[accentColorId].hex,
                      }}
                    >
                      Hands-Free
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1">
                      I Can't Write — Listen & Write For Me
                    </h4>
                    <p className="text-[11px] opacity-80 leading-relaxed">
                      Just speak your stream of consciousness. {activeVoice.name} will polish, structure, and save your reflection.
                    </p>
                  </div>
                </button>

                {/* Option: I Can Write (User types) */}
                <button
                  type="button"
                  onClick={handleChooseTypeMyself}
                  className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs flex flex-col justify-between group hover:border-stone-400"
                  style={{
                    backgroundColor: currentTheme.bgSurface,
                    borderColor: currentTheme.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-stone-200">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full opacity-70"
                      style={{ color: currentTheme.textMuted }}
                    >
                      Keyboard
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1">
                      I Can Write — Open Workspace
                    </h4>
                    <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: currentTheme.textMuted }}>
                      Jump directly to the editor to type your reflection notes and engage in multi-turn contemplation.
                    </p>
                  </div>
                </button>
              </div>

              {/* Dynamic Reflection Prompt Starters */}
              <div className="pt-2 border-t" style={{ borderColor: currentTheme.borderColor }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
                  <Sparkles className="w-3 h-3" />
                  <span>{contextual.period} Inspiration Prompts:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contextual.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => transitionToVoiceJournaling(chip)}
                      className="px-2.5 py-1 rounded-full text-[11px] border text-left transition-all hover:border-stone-400 hover:scale-[1.01]"
                      style={{
                        backgroundColor: currentTheme.bgMain,
                        borderColor: currentTheme.borderColor,
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Command Hint */}
              <div
                className="p-2.5 rounded-xl border text-[10px] flex items-center gap-2"
                style={{
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}08`,
                  borderColor: currentTheme.borderColor,
                  color: currentTheme.textMuted,
                }}
              >
                <Command className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Voice command tip:</strong> You can say <em>"Switch to Terracotta theme"</em>, <em>"Activate Empathetic Friend"</em>, or <em>"Mute voice"</em> at any time!
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Listening to Reflection */}
          {step === 'listening_to_reflection' && (
            <div className="space-y-4">
              {/* Spoken transcript viewer */}
              <div
                className="p-4 rounded-xl border min-h-[110px] max-h-[170px] overflow-y-auto text-xs leading-relaxed space-y-1"
                style={{
                  borderColor: currentTheme.borderColor,
                  backgroundColor: currentTheme.bgMain,
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between" style={{ color: currentTheme.textMuted }}>
                  <span>Live Spoken Words</span>
                  <span>{spokenTranscript.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                {spokenTranscript ? (
                  <p className="font-medium">{spokenTranscript}</p>
                ) : (
                  <p className="italic opacity-60">Start speaking... Your thoughts will appear here in real time.</p>
                )}
                {interimText && (
                  <p className="italic opacity-75 font-serif" style={{ color: ACCENT_COLORS[accentColorId].hex }}>
                    {interimText}
                  </p>
                )}
              </div>

              {/* Prompt chips while dictating */}
              <div className="flex flex-wrap gap-1.5">
                {contextual.chips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSpokenTranscript((prev) => (prev ? `${prev} ${chip}` : chip));
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] border opacity-80 hover:opacity-100 transition-opacity"
                    style={{
                      backgroundColor: currentTheme.bgSurface,
                      borderColor: currentTheme.borderColor,
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  style={{ borderColor: currentTheme.borderColor }}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 text-rose-500" /> Pause Mic
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-emerald-500" /> Resume Mic
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFinishAndCraftReflection}
                  disabled={!spokenTranscript && !interimText}
                  className="flex-1 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                >
                  <Sparkles className="w-4 h-4" /> Finish & Write My Reflection
                </button>
              </div>

              <p className="text-center text-[10px]" style={{ color: currentTheme.textMuted }}>
                Tip: Say <em>"Finish reflection"</em> or tap the button when you're done speaking.
              </p>
            </div>
          )}

          {/* STEP 3: Generating */}
          {step === 'generating' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
              <p className="text-xs font-semibold">
                Synthesizing speech with {activeVoice.name}, structuring themes, and securing in Web Worker enclave...
              </p>
            </div>
          )}

          {/* STEP 4: Completed Reflection */}
          {step === 'completed' && generatedEntry && (
            <div className="space-y-4 animate-fade-in">
              <div
                className="p-4 rounded-xl border space-y-2.5"
                style={{
                  borderColor: currentTheme.borderColor,
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}10`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Reflection Written & Secured by {activeVoice.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/80 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs">
                    {generatedEntry.mood}
                  </span>
                </div>

                <h3 className="text-sm font-bold">{generatedEntry.title}</h3>

                <p className="text-xs line-clamp-3 leading-relaxed opacity-90">
                  {generatedEntry.messages[0]?.content}
                </p>

                {generatedEntry.keyInsights && generatedEntry.keyInsights.length > 0 && (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: currentTheme.textMuted }}>
                      Key Takeaways:
                    </span>
                    {generatedEntry.keyInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 opacity-80">
                        <span>•</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('listening_to_reflection');
                    setSpokenTranscript('');
                    startListening();
                  }}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-1.5"
                  style={{ borderColor: currentTheme.borderColor }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Record Another
                </button>

                <button
                  type="button"
                  onClick={handleOpenWorkspaceWithEntry}
                  className="flex-1 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                >
                  View in Workspace <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

