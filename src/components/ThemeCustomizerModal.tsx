import React, { useState } from 'react';
import {
  Palette,
  X,
  Check,
  Volume2,
  Play,
  Square,
  Sparkles,
  Sun,
  Moon,
  Mic,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import {
  useTheme,
  THEME_PRESETS,
  ACCENT_COLORS,
  VOICE_PERSONAS,
  ThemeId,
  AccentColorId,
  VoicePersonaId,
} from '../theme/ThemeContext';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceCheckIn?: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  onOpenVoiceCheckIn,
}) => {
  const {
    currentTheme,
    themeId,
    setThemeId,
    accentColorId,
    setAccentColorId,
    activeVoiceId,
    setActiveVoiceId,
    activeVoice,
    voiceSpeed,
    setVoiceSpeed,
    voicePitch,
    setVoicePitch,
    isVoiceMuted,
    setIsVoiceMuted,
    speakText,
    stopSpeaking,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'themes' | 'voices'>('themes');
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  if (!isOpen) return null;

  const handleTestVoice = (personaId?: VoicePersonaId) => {
    stopSpeaking();
    const targetPersona = personaId
      ? VOICE_PERSONAS.find((v) => v.id === personaId) || activeVoice
      : activeVoice;

    setIsPlayingSample(true);
    speakText(
      targetPersona.greetingSample,
      () => setIsPlayingSample(true),
      () => setIsPlayingSample(false)
    );
  };

  return (
    <div
      id="theme-customizer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopSpeaking();
          onClose();
        }
      }}
    >
      <div
        id="theme-customizer-dialog"
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] transition-colors"
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
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Personalize Atmosphere & Companion Voices
              </h2>
              <p className="text-xs" style={{ color: currentTheme.textMuted }}>
                Choose aesthetic color palettes, dark/light tones, and your AI voice guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: currentTheme.textMuted }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex border-b px-6 pt-3 gap-3"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'themes'
                ? 'border-amber-500 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'themes' ? ACCENT_COLORS[accentColorId].hex : 'transparent',
              color: activeTab === 'themes' ? currentTheme.textMain : currentTheme.textMuted,
            }}
          >
            <Palette className="w-4 h-4" />
            Themes & Color Palettes ({THEME_PRESETS.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voices')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'voices'
                ? 'border-amber-500 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'voices' ? ACCENT_COLORS[accentColorId].hex : 'transparent',
              color: activeTab === 'voices' ? currentTheme.textMain : currentTheme.textMuted,
            }}
          >
            <Mic className="w-4 h-4" />
            AI Voice Personas ({VOICE_PERSONAS.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'themes' ? (
            <>
              {/* Theme Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.textMuted }}>
                  Atmospheric Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = preset.id === themeId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setThemeId(preset.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'ring-2 ring-offset-2'
                            : 'hover:border-stone-400 opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: preset.bgSurface,
                          borderColor: isSelected ? ACCENT_COLORS[accentColorId].hex : preset.borderColor,
                          color: preset.textMain,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{preset.name}</span>
                            {preset.isDark ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 flex items-center gap-1">
                                <Moon className="w-2.5 h-2.5" /> Dark
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 flex items-center gap-1">
                                <Sun className="w-2.5 h-2.5" /> Light
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] mb-3 line-clamp-2" style={{ color: preset.textMuted }}>
                          {preset.description}
                        </p>

                        {/* Visual Color Swatches */}
                        <div className="flex items-center gap-1.5 mt-auto">
                          {preset.previewColors.map((hex, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Colors */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.textMuted }}>
                  Accent Color Tint
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((cId) => {
                    const color = ACCENT_COLORS[cId];
                    const isSelected = cId === accentColorId;
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => setAccentColorId(cId)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected ? 'ring-2 ring-offset-2' : 'hover:opacity-100 opacity-80'
                        }`}
                        style={{
                          borderColor: isSelected ? color.hex : currentTheme.borderColor,
                          backgroundColor: isSelected ? `${color.hex}15` : 'transparent',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white shadow-2xs"
                          style={{ backgroundColor: color.hex }}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="truncate">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Voice Personas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.textMuted }}>
                    AI Voice Guide Persona
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTestVoice()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    {isPlayingSample ? (
                      <>
                        <Square className="w-3.5 h-3.5" /> Stop Sample
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Test Selected Voice
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {VOICE_PERSONAS.map((persona) => {
                    const isSelected = persona.id === activeVoiceId;
                    return (
                      <div
                        key={persona.id}
                        onClick={() => {
                          setActiveVoiceId(persona.id);
                          handleTestVoice(persona.id);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                          isSelected ? 'ring-2 ring-offset-1' : 'hover:border-stone-400 opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          borderColor: isSelected ? ACCENT_COLORS[accentColorId].hex : currentTheme.borderColor,
                          backgroundColor: isSelected ? `${ACCENT_COLORS[accentColorId].hex}10` : 'transparent',
                        }}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{persona.name}</span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: `${ACCENT_COLORS[accentColorId].hex}25`,
                                color: ACCENT_COLORS[accentColorId].hex,
                              }}
                            >
                              {persona.title}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: currentTheme.textMuted }}>
                            {persona.description}
                          </p>
                          <p className="text-[11px] italic pt-1 line-clamp-1 opacity-80">
                            "{persona.greetingSample}"
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVoiceId(persona.id);
                              handleTestVoice(persona.id);
                            }}
                            className="p-2 rounded-lg border hover:scale-105 transition-transform shadow-2xs"
                            style={{ borderColor: currentTheme.borderColor }}
                            title={`Hear sample of ${persona.name}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Speed & Pitch Controls */}
              <div
                className="p-4 rounded-xl border space-y-4"
                style={{ borderColor: currentTheme.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
                    <Sliders className="w-3.5 h-3.5" /> Voice Cadence & Pitch
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceSpeed(0.95);
                      setVoicePitch(1.0);
                    }}
                    className="text-[11px] flex items-center gap-1 opacity-70 hover:opacity-100"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Speaking Speed</span>
                      <span className="font-mono">{voiceSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.3"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px]" style={{ color: currentTheme.textMuted }}>
                      <span>Slower (Gentle)</span>
                      <span>Faster (Quick)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Tone & Pitch</span>
                      <span className="font-mono">{voicePitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.25"
                      step="0.05"
                      value={voicePitch}
                      onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px]" style={{ color: currentTheme.textMuted }}>
                      <span>Deeper Tone</span>
                      <span>Higher Tone</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: currentTheme.borderColor }}>
                  <span className="text-xs">Mute Voice Narration</span>
                  <button
                    type="button"
                    onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isVoiceMuted ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {isVoiceMuted ? 'Voice Muted' : 'Voice Enabled'}
                  </button>
                </div>
              </div>

              {/* Launch Voice Check-in Prompt */}
              {onOpenVoiceCheckIn && (
                <div
                  className="p-4 rounded-xl border flex items-center justify-between gap-4"
                  style={{
                    borderColor: currentTheme.borderColor,
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}10`,
                  }}
                >
                  <div>
                    <h4 className="text-xs font-bold">Hands-Free Voice Reflection Concierge</h4>
                    <p className="text-[11px]" style={{ color: currentTheme.textMuted }}>
                      Speak your day aloud naturally without typing. The AI will write and format your complete reflection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      onClose();
                      onOpenVoiceCheckIn();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    <Mic className="w-3.5 h-3.5" /> Launch Check-in
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <span className="text-[11px]" style={{ color: currentTheme.textMuted }}>
            All aesthetic choices and companion voice preferences are securely saved locally.
          </span>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
