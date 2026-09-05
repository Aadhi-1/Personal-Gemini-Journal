import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Compass,
  CheckCircle2,
  Brain,
  Globe,
  Camera,
  ChevronRight,
  Copy,
  Check,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';
import { MediaAttachment } from '../types';
import ReactMarkdown from 'react-markdown';

interface GeminiToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextText: string;
  activeAttachments?: MediaAttachment[];
  onApplyInsightToChat: (insightText: string) => void;
  enableSearchGrounding: boolean;
  onToggleSearchGrounding: (enabled: boolean) => void;
}

export const GeminiToolsModal: React.FC<GeminiToolsModalProps> = ({
  isOpen,
  onClose,
  contextText,
  activeAttachments = [],
  onApplyInsightToChat,
  enableSearchGrounding,
  onToggleSearchGrounding,
}) => {
  const { currentTheme, accentColorId } = useTheme();
  const [selectedFeature, setSelectedFeature] = useState<'reframe' | 'action_steps' | 'perspective' | 'visual_vibe'>(
    activeAttachments.length > 0 ? 'visual_vibe' : 'reframe'
  );
  const [perspectiveType, setPerspectiveType] = useState<'stoic' | 'future_self' | 'compassionate_coach'>('stoic');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const textToAnalyze = customPrompt.trim() || contextText.trim();
    const photoAttachment = activeAttachments.find((a) => a.type === 'photo' && a.base64);

    if (!textToAnalyze && !photoAttachment) {
      alert('Please provide some reflection text or attach a photo to analyze.');
      return;
    }

    try {
      setIsLoading(true);
      setGeneratedOutput(null);

      const response = await fetch('/api/gemini/quick-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: selectedFeature,
          prompt: textToAnalyze,
          perspectiveType,
          imageAttachment: photoAttachment
            ? {
                mimeType: photoAttachment.mimeType || 'image/jpeg',
                base64: photoAttachment.base64,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate insight.');
      }

      const data = await response.json();
      setGeneratedOutput(data.result);
      setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error('Quick feature error:', err);
      alert(err.message || 'Failed to generate feature insight.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="gemini-tools-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="gemini-tools-modal"
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
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
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Gemini Mindful Tools & Perspectives</h3>
              <p className="text-[11px] opacity-75" style={{ color: currentTheme.textMuted }}>
                Specialized psychology engines powered by Gemini 3.6 Flash & Google Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:bg-stone-100 transition-colors cursor-pointer"
            style={{ borderColor: currentTheme.borderColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Selector Pills */}
        <div
          className="p-4 border-b flex items-center gap-2 overflow-x-auto shrink-0"
          style={{ borderColor: currentTheme.borderColor, backgroundColor: currentTheme.bgMain }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedFeature('reframe');
              setGeneratedOutput(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFeature === 'reframe'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'border-stone-200 opacity-75 hover:opacity-100'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Cognitive Reframe</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFeature('action_steps');
              setGeneratedOutput(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFeature === 'action_steps'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'border-stone-200 opacity-75 hover:opacity-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Action Steps</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFeature('perspective');
              setGeneratedOutput(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFeature === 'perspective'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'border-stone-200 opacity-75 hover:opacity-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Perspective Switch</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFeature('visual_vibe');
              setGeneratedOutput(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFeature === 'visual_vibe'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'border-stone-200 opacity-75 hover:opacity-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Visual Mood Analysis</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Sub-options for Perspective */}
          {selectedFeature === 'perspective' && (
            <div className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs" style={{ borderColor: currentTheme.borderColor }}>
              <span className="font-semibold text-stone-600 dark:text-stone-300">Choose Wisdom Lens:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPerspectiveType('stoic')}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${
                    perspectiveType === 'stoic' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-stone-200 opacity-70'
                  }`}
                >
                  Marcus Aurelius (Stoic)
                </button>
                <button
                  type="button"
                  onClick={() => setPerspectiveType('future_self')}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${
                    perspectiveType === 'future_self' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-stone-200 opacity-70'
                  }`}
                >
                  80-Year-Old Future Self
                </button>
                <button
                  type="button"
                  onClick={() => setPerspectiveType('compassionate_coach')}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${
                    perspectiveType === 'compassionate_coach' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-stone-200 opacity-70'
                  }`}
                >
                  Zen Compassion Coach
                </button>
              </div>
            </div>
          )}

          {/* Google Search Grounding Quick Toggle */}
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors"
            style={{
              borderColor: enableSearchGrounding ? 'rgba(59, 130, 246, 0.4)' : currentTheme.borderColor,
              backgroundColor: enableSearchGrounding ? 'rgba(59, 130, 246, 0.05)' : currentTheme.bgMain,
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${enableSearchGrounding ? 'bg-blue-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Google Search Grounding</span>
                  {enableSearchGrounding && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                      Live Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-75" style={{ color: currentTheme.textMuted }}>
                  Verify psychological concepts, books, and world facts with real-time Google citations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleSearchGrounding(!enableSearchGrounding)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                enableSearchGrounding
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              {enableSearchGrounding ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {/* Input/Context preview */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Reflection Context (or specify custom dilemma)
            </label>
            <textarea
              rows={3}
              placeholder="Enter thoughts to reframe, break into action steps, or analyze..."
              value={customPrompt || contextText}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 resize-none"
              style={{
                backgroundColor: currentTheme.bgMain,
                borderColor: currentTheme.borderColor,
                color: currentTheme.textMain,
              }}
            />
          </div>

          {/* Visual photo attachment alert if visual vibe selected */}
          {selectedFeature === 'visual_vibe' && (
            <div className="p-3 rounded-xl border text-xs" style={{ borderColor: currentTheme.borderColor }}>
              {activeAttachments.length > 0 ? (
                <div className="flex items-center gap-3">
                  <img
                    src={activeAttachments[0].url}
                    alt="Attached"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border"
                  />
                  <div>
                    <span className="font-semibold text-emerald-600">Active Photo Attached:</span>
                    <p className="text-[11px] opacity-80">{activeAttachments[0].title || 'User reflection image'}</p>
                  </div>
                </div>
              ) : (
                <p className="opacity-75">
                  💡 Tip: Attach a photo using the Photo/GIF button to get multimodal visual mood and color psychology analysis.
                </p>
              )}
            </div>
          )}

          {/* Trigger Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGenerate}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini 3.6 Flash Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {selectedFeature === 'reframe' && 'Generate Cognitive Reframe'}
                  {selectedFeature === 'action_steps' && 'Extract Action Steps & Micro-Habits'}
                  {selectedFeature === 'perspective' && 'Shift Perspective Lens'}
                  {selectedFeature === 'visual_vibe' && 'Analyze Visual Mood & Symbolism'}
                </span>
              </>
            )}
          </button>

          {/* Results Display */}
          {generatedOutput && (
            <div
              className="p-4 rounded-2xl border shadow-xs space-y-3 animate-in fade-in duration-200"
              style={{
                backgroundColor: currentTheme.bgMain,
                borderColor: currentTheme.borderColor,
              }}
            >
              <div className="flex items-center justify-between text-2xs border-b pb-2" style={{ borderColor: currentTheme.borderColor }}>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Insight Synthesized ({modelUsed || 'gemini-3.6-flash'})
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-stone-200 text-stone-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onApplyInsightToChat(generatedOutput);
                      onClose();
                    }}
                    className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-semibold flex items-center gap-1 cursor-pointer hover:bg-stone-800"
                  >
                    <span>Insert into Chat</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="text-xs leading-relaxed markdown-body">
                <ReactMarkdown>{generatedOutput}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-2xs opacity-75 shrink-0"
          style={{ borderColor: currentTheme.borderColor, color: currentTheme.textMuted }}
        >
          <span>Grounding & Resilience Fallback Chain Active</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border hover:bg-stone-100 transition-colors cursor-pointer"
            style={{ borderColor: currentTheme.borderColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
