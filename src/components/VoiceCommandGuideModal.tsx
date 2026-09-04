import React from 'react';
import {
  X,
  Mic,
  Smile,
  Sparkles,
  Volume2,
  HeartHandshake,
  Type,
  Trash2,
  ShieldCheck,
  Play,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface VoiceCommandGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCommand?: (command: string) => void;
}

interface CommandItem {
  phrase: string;
  action: string;
  example: string;
  category: string;
  icon: React.ReactNode;
}

export function VoiceCommandGuideModal({
  isOpen,
  onClose,
  onTestCommand,
}: VoiceCommandGuideModalProps) {
  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      category: 'Emotional State & Mood Tagging',
      phrase: 'Jarvis, set mood to [Mood]',
      action: 'Automatically sets or updates the mood tag on your active reflection.',
      example: '"Jarvis, set mood to Calm" or "I am feeling joyful"',
      icon: <Smile className="w-4 h-4 text-amber-500" />,
    },
    {
      category: 'Dialogue & Reflective Inquiry',
      phrase: 'Jarvis, reflect on [Topic]',
      action: 'Initiates a deep reflective dialogue with empathetic inquiry.',
      example: '"Jarvis, reflect on why I felt overwhelmed at work today"',
      icon: <Mic className="w-4 h-4 text-emerald-500" />,
    },
    {
      category: 'Session Synthesis',
      phrase: 'Jarvis, summarize session',
      action: 'Synthesizes your dialogue into key takeaways and core insights.',
      example: '"Jarvis, summarize our conversation" or "Summarize session"',
      icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
    },
    {
      category: 'Audio Playback & Audio DLP',
      phrase: 'Jarvis, read aloud',
      action: 'Speaks back the latest response using local audio with Audio DLP scrubbing.',
      example: '"Jarvis, read aloud" or "Read the latest reflection"',
      icon: <Volume2 className="w-4 h-4 text-sky-500" />,
    },
    {
      category: 'Emergency & Crisis Safeguards',
      phrase: 'Jarvis, safe mode / help',
      action: 'Immediately suspends recording and launches the Safe Mode Crisis Lifeline with 988 dialing.',
      example: '"Jarvis, safe mode" or "I need crisis support"',
      icon: <HeartHandshake className="w-4 h-4 text-rose-500" />,
    },
    {
      category: 'Elderly & Low-Vision Accessibility',
      phrase: 'Jarvis, [huge / large / normal] text',
      action: 'Dynamically scales up typography size for effortless reading.',
      example: '"Jarvis, huge text" or "Set text size to normal"',
      icon: <Type className="w-4 h-4 text-purple-500" />,
    },
    {
      category: 'Draft Management',
      phrase: 'Jarvis, clear entry',
      action: 'Resets the active draft messages while keeping the encrypted key safe.',
      example: '"Jarvis, clear this entry"',
      icon: <Trash2 className="w-4 h-4 text-stone-400" />,
    },
  ];

  return (
    <div
      id="voice-command-guide-modal"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
          title="Close guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              Jarvis Voice Command Guide
              <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                Zero-Knowledge VUI
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              Natural Voice Controls • Hands-Free Operation • Low-Literacy Friendly
            </p>
          </div>
        </div>

        {/* Privacy Note Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 mb-6 text-xs text-emerald-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-900">100% Local Speech Recognition: </span>
            Voice input is parsed strictly within your browser's local speech engine. Spoken voice commands never transmit raw audio recordings to third-party tracking services.
          </div>
        </div>

        {/* Command List */}
        <div className="space-y-3 mb-6">
          {commands.map((cmd, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-white border border-stone-200 shadow-2xs">
                    {cmd.icon}
                  </div>
                  <span className="text-xs font-bold text-stone-900 font-mono">
                    {cmd.phrase}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-md">
                  {cmd.category}
                </span>
              </div>

              <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                {cmd.action}
              </p>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200/60 text-[11px]">
                <span className="text-stone-500 italic">
                  Say: <strong className="text-stone-700 not-italic">{cmd.example}</strong>
                </span>

                {onTestCommand && (
                  <button
                    type="button"
                    onClick={() => {
                      onTestCommand(cmd.example.replace(/^"|"$/g, ''));
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
                  >
                    <Play className="w-3 h-3 text-amber-700" />
                    Try Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
          <span className="text-stone-500 text-[11px] flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Works with both live microphone input and typed reflection commands.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
