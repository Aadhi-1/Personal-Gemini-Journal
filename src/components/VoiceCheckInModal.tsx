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
} from 'lucide-react';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';
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

  const recognitionRef = useRef<any>(null);

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

    // Voice Prompt On Opening: Asks if user can write or wants the AI to write
    const askPrompt = `Welcome back! Are you able to write your reflection today, or would you like me to listen and write it for you?`;
    setStatusMessage(askPrompt);

    const timer = setTimeout(() => {
      speakText(
        askPrompt,
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

  // Natural Voice Command Routing in Initial Question Step
  const handleVoiceInputRouting = (text: string) => {
    const lower = text.toLowerCase();

    // Check for distress first
    const distress = analyzeDistressOnDevice(text);
    if (distress.isDistressDetected) {
      stopListening();
      stopSpeaking();
      onTriggerSafeMode(distress.triggerPhrase);
      onClose();
      return;
    }

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
  const transitionToVoiceJournaling = () => {
    stopListening();
    setStep('listening_to_reflection');
    setSpokenTranscript('');
    setInterimText('');

    const listenPrompt = `I am listening closely. Tell me whatever happened today, what you are feeling, or what is on your mind. Take all the time you need, and I will craft and write your complete reflection.`;
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

  return (
    <div
      id="voice-checkin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        id="voice-checkin-card"
        className="w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col transition-all"
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textMain,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Voice Reflection Concierge</h2>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}20`,
                    color: ACCENT_COLORS[accentColorId].hex,
                  }}
                >
                  {activeVoice.name} Companion
                </span>
              </div>
              <p className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                Hands-free conversational check-in before you begin
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

        {/* Content Area */}
        <div className="p-6 space-y-6">
          {/* Wave & Listening Visualizer */}
          <div
            className="rounded-2xl p-6 text-center border relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]"
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
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white mb-3 shadow-md transition-all ${
                isListening ? 'scale-110' : 'scale-100'
              }`}
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Mic className="w-7 h-7" />
            </div>

            {/* Spoken Status Indicator */}
            <p className="text-sm font-semibold max-w-md px-2 leading-relaxed">
              {statusMessage || "Listening for your voice..."}
            </p>

            {isListening && (
              <span
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold px-3 py-1 rounded-full animate-pulse"
                style={{
                  backgroundColor: `${ACCENT_COLORS[accentColorId].hex}25`,
                  color: ACCENT_COLORS[accentColorId].hex,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Listening now... Speak anytime
              </span>
            )}
          </div>

          {/* STEP 1: Ask Preference */}
          {step === 'ask_preference' && (
            <div className="space-y-4">
              <p className="text-center text-xs" style={{ color: currentTheme.textMuted }}>
                You can answer by voice (say <em>"I can't write"</em> or <em>"I can write"</em>), or tap a button below:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option: I Can't Write (Voice writes for them) */}
                <button
                  type="button"
                  onClick={transitionToVoiceJournaling}
                  className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm flex flex-col justify-between group"
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
                      Just speak freely. The AI will polish, structure, title, and write your complete reflection.
                    </p>
                  </div>
                </button>

                {/* Option: I Can Write (User types) */}
                <button
                  type="button"
                  onClick={handleChooseTypeMyself}
                  className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm flex flex-col justify-between group hover:border-stone-400"
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
                      I Can Write — Type In Workspace
                    </h4>
                    <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: currentTheme.textMuted }}>
                      Jump directly to the editor to type your reflection notes and engage in multi-turn contemplation.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Listening to Reflection */}
          {step === 'listening_to_reflection' && (
            <div className="space-y-4">
              {/* Spoken transcript viewer */}
              <div
                className="p-4 rounded-xl border min-h-[110px] max-h-[180px] overflow-y-auto text-xs leading-relaxed space-y-1"
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
                  <p className="font-medium text-stone-800 dark:text-stone-100">{spokenTranscript}</p>
                ) : (
                  <p className="italic opacity-60">Start speaking... Your thoughts will appear here in real time.</p>
                )}
                {interimText && (
                  <p className="italic opacity-75 font-serif" style={{ color: ACCENT_COLORS[accentColorId].hex }}>
                    {interimText}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 hover:bg-stone-100 transition-colors"
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
            </div>
          )}

          {/* STEP 3: Generating */}
          {step === 'generating' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: ACCENT_COLORS[accentColorId].hex }} />
              <p className="text-xs font-semibold">
                Polishing speech disfluencies, structuring themes, and encrypting in military-grade enclave...
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
                    <CheckCircle2 className="w-4 h-4" /> Reflection Written & Secured
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/80 border border-stone-200 shadow-2xs">
                    {generatedEntry.mood}
                  </span>
                </div>

                <h3 className="text-sm font-bold">{generatedEntry.title}</h3>

                <p className="text-xs line-clamp-3 leading-relaxed opacity-90">
                  {generatedEntry.messages[0]?.content}
                </p>

                {generatedEntry.keyInsights && generatedEntry.keyInsights.length > 0 && (
                  <div className="pt-2 border-t border-black/5 text-[11px] space-y-1">
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
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-stone-50 flex items-center gap-1.5"
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
