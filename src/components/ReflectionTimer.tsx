import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Minimize2,
  Maximize2,
  X,
  Award,
} from 'lucide-react';
import { playGentleChime } from '../utils/audioChime';
import { useTheme } from '../theme/ThemeContext';

export interface ReflectionTimerProps {
  onAwardSticker?: (stickerId: string) => void;
  onSessionComplete?: (durationMinutes: number) => void;
  onClose?: () => void;
  className?: string;
}

const PRESET_DURATIONS = [
  { minutes: 5, label: '5m', name: 'Quick Reset', description: 'Brief grounding & breath check-in' },
  { minutes: 10, label: '10m', name: 'Mindful Pause', description: 'Centering and emotional check-in' },
  { minutes: 15, label: '15m', name: 'Deep Journaling', description: 'Unpacking challenges and realizations' },
  { minutes: 25, label: '25m', name: 'Pomodoro Focus', description: 'Full uninterrupted contemplative flow' },
];

export const ReflectionTimer: React.FC<ReflectionTimerProps> = ({
  onAwardSticker,
  onSessionComplete,
  onClose,
  className = '',
}) => {
  const { accent } = useTheme();

  // Timer State
  const [targetMinutes, setTargetMinutes] = useState<number>(10);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('10');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [hasAwardedSticker, setHasAwardedSticker] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Calculate percentage elapsed
  const totalSeconds = targetMinutes * 60;
  const progressFraction = Math.max(0, Math.min(1, (totalSeconds - secondsRemaining) / (totalSeconds || 1)));
  const progressPercent = Math.round(progressFraction * 100);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsCompleted(true);
            if (chimeEnabled) {
              playGentleChime({ volume: 0.65 });
            }
            if (onSessionComplete) {
              onSessionComplete(targetMinutes);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, secondsRemaining, chimeEnabled, targetMinutes, onSessionComplete]);

  // Handler: Select Preset
  const handleSelectPreset = (mins: number) => {
    setIsRunning(false);
    setIsCompleted(false);
    setHasAwardedSticker(false);
    setTargetMinutes(mins);
    setSecondsRemaining(mins * 60);
    setShowCustomPicker(false);
  };

  // Handler: Apply Custom Duration
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinutesInput, 10);
    if (!isNaN(val) && val >= 1 && val <= 120) {
      handleSelectPreset(val);
    }
  };

  // Handler: Reset Timer
  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setHasAwardedSticker(false);
    setSecondsRemaining(targetMinutes * 60);
  };

  // Handler: Add 1 Minute
  const handleAddMinute = () => {
    setSecondsRemaining((prev) => prev + 60);
    setTargetMinutes((prev) => prev + 1);
    if (isCompleted) {
      setIsCompleted(false);
      setIsRunning(true);
    }
  };

  // Handler: Award Sticker
  const handleAwardSticker = (stickerId: string) => {
    if (onAwardSticker) {
      onAwardSticker(stickerId);
      setHasAwardedSticker(true);
    }
  };

  return (
    <div
      id="workspace-reflection-timer"
      className={`rounded-2xl border transition-all duration-200 bg-white/95 shadow-2xs backdrop-blur-xs ${
        isCompleted
          ? 'border-emerald-300 ring-2 ring-emerald-400/30'
          : isRunning
          ? 'border-amber-300 ring-1 ring-amber-400/20'
          : 'border-stone-200 hover:border-stone-300'
      } ${className}`}
    >
      {/* Minimized Docked Bar */}
      <div className="flex items-center justify-between p-2 sm:px-3 gap-2">
        {/* Left: Indicator & Time */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 font-medium text-xs rounded-lg p-1 hover:bg-stone-100 transition-colors"
            title={isExpanded ? 'Collapse timer panel' : 'Expand session settings'}
          >
            <Clock
              className={`w-3.5 h-3.5 ${
                isRunning ? 'text-amber-600 animate-pulse' : isCompleted ? 'text-emerald-600' : 'text-stone-500'
              }`}
            />
            <span className="font-mono font-bold text-stone-900 text-xs">
              {formatTime(secondsRemaining)}
            </span>
            <span className="text-[10px] text-stone-400 hidden xs:inline">
              ({targetMinutes}m goal)
            </span>
          </button>

          {/* Mini progress bar on compact bar */}
          <div className="w-12 sm:w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden hidden sm:block border border-stone-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompleted ? 'bg-emerald-500' : accent.bgClass.split(' ')[0]
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Center / Right: Quick Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Play/Pause */}
          <button
            type="button"
            id="timer-play-pause-btn"
            onClick={() => {
              if (isCompleted) {
                handleReset();
                setIsRunning(true);
              } else {
                setIsRunning(!isRunning);
              }
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              isRunning
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : isCompleted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
            title={isRunning ? 'Pause reflection timer' : 'Start reflection timer'}
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="text-[11px] pr-0.5 hidden xs:inline">
              {isRunning ? 'Pause' : isCompleted ? 'Restart' : 'Focus'}
            </span>
          </button>

          {/* Reset */}
          <button
            type="button"
            id="timer-reset-btn"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Reset timer to beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* +1 Minute quick button */}
          <button
            type="button"
            onClick={handleAddMinute}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-[10px] font-mono font-semibold transition-colors flex items-center"
            title="Add 1 minute to current reflection"
          >
            +1m
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !chimeEnabled;
              setChimeEnabled(next);
              if (next) playGentleChime({ volume: 0.3 });
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              chimeEnabled ? 'text-amber-600 hover:bg-amber-50' : 'text-stone-400 hover:bg-stone-100'
            }`}
            title={chimeEnabled ? 'Chime sound is active (click to mute)' : 'Chime is muted (click to enable)'}
          >
            {chimeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title={isExpanded ? 'Collapse options' : 'Customize session length & presets'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Optional Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Close Reflection Timer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Detailed Settings & Presets Panel */}
      {isExpanded && (
        <div className="p-3 pt-1 border-t border-stone-100 space-y-3 text-xs animate-fade-in">
          {/* Completion Celebration Banner */}
          {isCompleted && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Uninterrupted Session Completed!</span>
                  <p className="text-[11px] text-emerald-800">
                    You dedicated {targetMinutes} minutes to deep contemplation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                {onAwardSticker && !hasAwardedSticker && (
                  <button
                    type="button"
                    onClick={() => handleAwardSticker('pomodoro_focus')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                  >
                    <Award className="w-3 h-3" />
                    <span>Attach Focus Sticker</span>
                  </button>
                )}
                {hasAwardedSticker && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Sticker Attached!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Presets Row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-stone-600">
                Choose Session Length:
              </span>
              <button
                type="button"
                onClick={() => playGentleChime({ volume: 0.5 })}
                className="text-[10px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1 hover:underline"
                title="Preview the gentle Tibetan singing bowl chime"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Test Chime</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = targetMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => handleSelectPreset(preset.minutes)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400 text-stone-900'
                        : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{preset.label}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-stone-600 truncate mt-0.5">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration Toggle */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500 border-t border-stone-100">
            {showCustomPicker ? (
              <form onSubmit={handleApplyCustom} className="flex items-center gap-2 w-full">
                <span className="shrink-0 text-stone-700 font-medium">Custom duration:</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  className="w-16 px-2 py-0.5 rounded-lg border border-stone-300 text-xs font-mono text-center focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-stone-500">mins</span>
                <button
                  type="submit"
                  className="px-2.5 py-0.5 rounded-lg bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800"
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="text-stone-400 hover:text-stone-600 text-[11px]"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="italic">
                  Zen advice: Turn off notifications and let your mind speak openly.
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(true)}
                  className="text-amber-700 hover:underline font-medium shrink-0 ml-2"
                >
                  Custom time...
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
