import React, { createContext, useContext, useState, useEffect } from 'react';
import { sanitizeTextForAudioDLP } from '../crypto/guardrails';

export type ThemeId =
  | 'amber'
  | 'sage'
  | 'obsidian'
  | 'glacier'
  | 'rose'
  | 'amethyst'
  | 'monochrome';

export type AccentColorId =
  | 'amber'
  | 'emerald'
  | 'indigo'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'orange';

export type VoicePersonaId =
  | 'jarvis'
  | 'samantha'
  | 'oliver'
  | 'elena'
  | 'orion';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  bgMain: string;
  bgSurface: string;
  borderColor: string;
  textMain: string;
  textMuted: string;
  defaultAccent: AccentColorId;
  previewColors: [string, string, string];
}

export interface VoicePersona {
  id: VoicePersonaId;
  name: string;
  title: string;
  description: string;
  gender: 'neutral' | 'female' | 'male';
  pitch: number;
  rate: number;
  greetingSample: string;
  preferredVoiceNames: string[];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'amber',
    name: 'Warm Amber',
    description: 'Serene warm stone, golden amber highlights, and calming parchment tones.',
    isDark: false,
    bgMain: '#faf8f5',
    bgSurface: '#ffffff',
    borderColor: '#e7e5e4',
    textMain: '#1c1917',
    textMuted: '#78716c',
    defaultAccent: 'amber',
    previewColors: ['#faf8f5', '#f59e0b', '#1c1917'],
  },
  {
    id: 'sage',
    name: 'Botanical Sage',
    description: 'Earthy moss, soothing eucalyptus greens, and mindful grounding tones.',
    isDark: false,
    bgMain: '#f4f7f4',
    bgSurface: '#ffffff',
    borderColor: '#d6e2d8',
    textMain: '#142318',
    textMuted: '#586b5c',
    defaultAccent: 'emerald',
    previewColors: ['#f4f7f4', '#10b981', '#142318'],
  },
  {
    id: 'obsidian',
    name: 'Obsidian Midnight',
    description: 'True deep dark OLED nightscape with cosmic indigo and vivid neon accents.',
    isDark: true,
    bgMain: '#0b0d14',
    bgSurface: '#121624',
    borderColor: '#22283e',
    textMain: '#f1f5f9',
    textMuted: '#94a3b8',
    defaultAccent: 'indigo',
    previewColors: ['#0b0d14', '#6366f1', '#f1f5f9'],
  },
  {
    id: 'glacier',
    name: 'Nordic Glacier',
    description: 'Cool crisp arctic slate, ice cyan reflections, and deep ocean navy tones.',
    isDark: false,
    bgMain: '#f0f5fa',
    bgSurface: '#ffffff',
    borderColor: '#d2dfec',
    textMain: '#0c1b2a',
    textMuted: '#53687e',
    defaultAccent: 'cyan',
    previewColors: ['#f0f5fa', '#06b6d4', '#0c1b2a'],
  },
  {
    id: 'rose',
    name: 'Rose & Terracotta',
    description: 'Dusty blush, terracotta earth, and sunset hues for gentle, tender contemplation.',
    isDark: false,
    bgMain: '#fdf6f7',
    bgSurface: '#ffffff',
    borderColor: '#fadbe0',
    textMain: '#2d1419',
    textMuted: '#7d5961',
    defaultAccent: 'rose',
    previewColors: ['#fdf6f7', '#f43f5e', '#2d1419'],
  },
  {
    id: 'amethyst',
    name: 'Cyber Amethyst',
    description: 'Deep violet twilight with electric purple and vibrant lavender glow.',
    isDark: true,
    bgMain: '#0e091a',
    bgSurface: '#18122c',
    borderColor: '#2e2050',
    textMain: '#f5f0ff',
    textMuted: '#a79cb8',
    defaultAccent: 'violet',
    previewColors: ['#0e091a', '#a855f7', '#f5f0ff'],
  },
  {
    id: 'monochrome',
    name: 'Minimalist Monolith',
    description: 'High-contrast editorial typography, pure grayscale, and architectural precision.',
    isDark: false,
    bgMain: '#f8f9fa',
    bgSurface: '#ffffff',
    borderColor: '#e2e8f0',
    textMain: '#0f172a',
    textMuted: '#64748b',
    defaultAccent: 'orange',
    previewColors: ['#f8f9fa', '#0f172a', '#64748b'],
  },
];

export const ACCENT_COLORS: Record<AccentColorId, { name: string; hex: string; ringClass: string; bgClass: string; textClass: string }> = {
  amber: {
    name: 'Warm Amber',
    hex: '#f59e0b',
    ringClass: 'ring-amber-500',
    bgClass: 'bg-amber-400 hover:bg-amber-300 text-stone-950',
    textClass: 'text-amber-600',
  },
  emerald: {
    name: 'Lush Emerald',
    hex: '#10b981',
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500 hover:bg-emerald-400 text-white',
    textClass: 'text-emerald-600',
  },
  indigo: {
    name: 'Cosmic Indigo',
    hex: '#6366f1',
    ringClass: 'ring-indigo-500',
    bgClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    textClass: 'text-indigo-600',
  },
  rose: {
    name: 'Velvet Rose',
    hex: '#f43f5e',
    ringClass: 'ring-rose-500',
    bgClass: 'bg-rose-500 hover:bg-rose-400 text-white',
    textClass: 'text-rose-600',
  },
  violet: {
    name: 'Electric Violet',
    hex: '#8b5cf6',
    ringClass: 'ring-violet-500',
    bgClass: 'bg-violet-600 hover:bg-violet-500 text-white',
    textClass: 'text-violet-600',
  },
  cyan: {
    name: 'Glacier Cyan',
    hex: '#06b6d4',
    ringClass: 'ring-cyan-500',
    bgClass: 'bg-cyan-500 hover:bg-cyan-400 text-stone-950',
    textClass: 'text-cyan-600',
  },
  orange: {
    name: 'Sunset Orange',
    hex: '#f97316',
    ringClass: 'ring-orange-500',
    bgClass: 'bg-orange-500 hover:bg-orange-400 text-white',
    textClass: 'text-orange-600',
  },
};

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'jarvis',
    name: 'Jarvis',
    title: 'Articulate & Sophisticated Companion',
    description: 'Calm, measured, and distinguished cadence for structured intellectual contemplation.',
    gender: 'male',
    pitch: 0.95,
    rate: 0.94,
    greetingSample: "Greetings. I am Jarvis, your private reflection companion. I am ready whenever you wish to contemplate.",
    preferredVoiceNames: ['Google UK English Male', 'Daniel', 'Arthur', 'Oliver', 'George', 'Microsoft George', 'en-GB'],
  },
  {
    id: 'samantha',
    name: 'Samantha',
    title: 'Warm & Empathetic Guide',
    description: 'Naturally gentle, encouraging, and supportive rhythm for heartfelt personal reflections.',
    gender: 'female',
    pitch: 1.08,
    rate: 0.95,
    greetingSample: "Hello there! I'm Samantha. Whether your day was joyful or heavy, I'm here to listen and support you.",
    preferredVoiceNames: ['Google US English', 'Samantha', 'Karen', 'Victoria', 'Moira', 'Microsoft Zira', 'en-US'],
  },
  {
    id: 'oliver',
    name: 'Oliver',
    title: 'Mindful & Grounded Mentor',
    description: 'Steady, patient, and deeply grounded tone ideal for stress reduction and clarity.',
    gender: 'male',
    pitch: 0.88,
    rate: 0.92,
    greetingSample: "Welcome back. Take a quiet breath. I'm Oliver, and we can take all the time you need today.",
    preferredVoiceNames: ['Google US English Male', 'Alex', 'Fred', 'Microsoft David', 'en-US'],
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'Serene & Meditative Voice',
    description: 'Soft, compassionate, and soothing voice crafted to de-escalate anxiety and fatigue.',
    gender: 'female',
    pitch: 1.12,
    rate: 0.90,
    greetingSample: "Peace to you today. I am Elena. Let's create a calm space together for your mind to rest and reflect.",
    preferredVoiceNames: ['Google UK English Female', 'Serena', 'Fiona', 'Tessa', 'Microsoft Hazel', 'en-AU', 'en-GB'],
  },
  {
    id: 'orion',
    name: 'Orion',
    title: 'Crisp & Analytical Strategist',
    description: 'Clear, modern, and direct rhythm tailored for decision making and goal setting.',
    gender: 'neutral',
    pitch: 1.02,
    rate: 1.00,
    greetingSample: "Hello! I'm Orion. Let's analyze your thoughts, distill your priorities, and turn ambiguity into clear action.",
    preferredVoiceNames: ['Google US English', 'Tom', 'Rishi', 'en-US'],
  },
];

interface ThemeContextType {
  currentTheme: ThemePreset;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  accentColorId: AccentColorId;
  setAccentColorId: (id: AccentColorId) => void;
  accent: typeof ACCENT_COLORS[AccentColorId];
  activeVoiceId: VoicePersonaId;
  setActiveVoiceId: (id: VoicePersonaId) => void;
  activeVoice: VoicePersona;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  voicePitch: number;
  setVoicePitch: (pitch: number) => void;
  isVoiceMuted: boolean;
  setIsVoiceMuted: (muted: boolean) => void;
  speakText: (text: string, onStart?: () => void, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  hasSeenVoiceCheckIn: boolean;
  setHasSeenVoiceCheckIn: (seen: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME_ID: 'reflections_user_theme_id_v2',
  ACCENT_ID: 'reflections_user_accent_id_v2',
  VOICE_ID: 'reflections_user_voice_id_v2',
  VOICE_SPEED: 'reflections_user_voice_speed_v2',
  VOICE_PITCH: 'reflections_user_voice_pitch_v2',
  VOICE_MUTED: 'reflections_user_voice_muted_v2',
  CHECKIN_SEEN: 'reflections_voice_checkin_completed_v2',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME_ID);
      if (saved && THEME_PRESETS.some((t) => t.id === saved)) {
        return saved as ThemeId;
      }
    }
    return 'amber';
  });

  const [accentColorId, setAccentColorIdState] = useState<AccentColorId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCENT_ID);
      if (saved && ACCENT_COLORS[saved as AccentColorId]) {
        return saved as AccentColorId;
      }
    }
    return 'amber';
  });

  const [activeVoiceId, setActiveVoiceIdState] = useState<VoicePersonaId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.VOICE_ID);
      if (saved && VOICE_PERSONAS.some((v) => v.id === saved)) {
        return saved as VoicePersonaId;
      }
    }
    return 'jarvis';
  });

  const [voiceSpeed, setVoiceSpeedState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.VOICE_SPEED);
      if (saved) return parseFloat(saved) || 0.95;
    }
    return 0.95;
  });

  const [voicePitch, setVoicePitchState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.VOICE_PITCH);
      if (saved) return parseFloat(saved) || 1.0;
    }
    return 1.0;
  });

  const [isVoiceMuted, setIsVoiceMutedState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.VOICE_MUTED) === 'true';
    }
    return false;
  });

  const [hasSeenVoiceCheckIn, setHasSeenVoiceCheckInState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEYS.CHECKIN_SEEN) === 'true';
    }
    return false;
  });

  const currentTheme = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
  const accent = ACCENT_COLORS[accentColorId] || ACCENT_COLORS.amber;
  const activeVoice = VOICE_PERSONAS.find((v) => v.id === activeVoiceId) || VOICE_PERSONAS[0];

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(STORAGE_KEYS.THEME_ID, id);
    const targetPreset = THEME_PRESETS.find((t) => t.id === id);
    if (targetPreset) {
      setAccentColorIdState(targetPreset.defaultAccent);
      localStorage.setItem(STORAGE_KEYS.ACCENT_ID, targetPreset.defaultAccent);
    }
  };

  const setAccentColorId = (id: AccentColorId) => {
    setAccentColorIdState(id);
    localStorage.setItem(STORAGE_KEYS.ACCENT_ID, id);
  };

  const setActiveVoiceId = (id: VoicePersonaId) => {
    setActiveVoiceIdState(id);
    localStorage.setItem(STORAGE_KEYS.VOICE_ID, id);
  };

  const setVoiceSpeed = (speed: number) => {
    setVoiceSpeedState(speed);
    localStorage.setItem(STORAGE_KEYS.VOICE_SPEED, speed.toString());
  };

  const setVoicePitch = (pitch: number) => {
    setVoicePitchState(pitch);
    localStorage.setItem(STORAGE_KEYS.VOICE_PITCH, pitch.toString());
  };

  const setIsVoiceMuted = (muted: boolean) => {
    setIsVoiceMutedState(muted);
    localStorage.setItem(STORAGE_KEYS.VOICE_MUTED, String(muted));
    if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const setHasSeenVoiceCheckIn = (seen: boolean) => {
    setHasSeenVoiceCheckInState(seen);
    sessionStorage.setItem(STORAGE_KEYS.CHECKIN_SEEN, String(seen));
  };

  // Sync theme variables and classes to document body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--theme-bg-main', currentTheme.bgMain);
    root.style.setProperty('--theme-bg-surface', currentTheme.bgSurface);
    root.style.setProperty('--theme-border', currentTheme.borderColor);
    root.style.setProperty('--theme-text-main', currentTheme.textMain);
    root.style.setProperty('--theme-text-muted', currentTheme.textMuted);
    root.style.setProperty('--theme-accent', accent.hex);

    if (currentTheme.isDark) {
      root.classList.add('dark');
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    } else {
      root.classList.remove('dark');
      root.classList.remove('theme-dark');
      root.classList.add('theme-light');
    }
  }, [currentTheme, accent]);

  // Speech Synthesis helper
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // DLP Sanitization before audio synthesis
    const { cleanText } = sanitizeTextForAudioDLP(text);
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = voiceSpeed * activeVoice.rate;
    utterance.pitch = voicePitch * activeVoice.pitch;

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

    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      onEnd?.();
    };
    utterance.onerror = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeId,
        setThemeId,
        accentColorId,
        setAccentColorId,
        accent,
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
        hasSeenVoiceCheckIn,
        setHasSeenVoiceCheckIn,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
