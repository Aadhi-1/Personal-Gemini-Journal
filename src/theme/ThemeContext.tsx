import React, { createContext, useContext, useState, useEffect } from 'react';
import { sanitizeTextForAudioDLP } from '../crypto/guardrails';

export type ThemeId =
  | 'amber'
  | 'sage'
  | 'obsidian'
  | 'glacier'
  | 'rose'
  | 'amethyst'
  | 'monochrome'
  | 'terracotta'
  | 'nebula'
  | 'pine';

export type AccentColorId =
  | 'amber'
  | 'emerald'
  | 'indigo'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'orange'
  | 'gold'
  | 'teal';

export type VoicePersonaId =
  | 'calm_mentor'
  | 'analytical_observer'
  | 'empathetic_friend'
  | 'jarvis'
  | 'serene_guide'
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
  geminiPromptTone: string;
  tag: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'amber',
    name: 'Warm Amber',
    description: 'Serene warm stone, golden amber highlights, and calming parchment tones.',
    isDark: false,
    bgMain: '#faf8f5',
    bgSurface: '#f5f0e8',
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
    bgSurface: '#ebf2ec',
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
    bgSurface: '#e5eef7',
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
    bgSurface: '#f7ebe8',
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
    bgSurface: '#f1f3f5',
    borderColor: '#e2e8f0',
    textMain: '#0f172a',
    textMuted: '#64748b',
    defaultAccent: 'orange',
    previewColors: ['#f8f9fa', '#0f172a', '#64748b'],
  },
  {
    id: 'terracotta',
    name: 'Sunset Terracotta',
    description: 'Warm Mediterranean clay, Tuscan brick, and golden dusk sun warmth.',
    isDark: false,
    bgMain: '#fbf4ef',
    bgSurface: '#f5ece4',
    borderColor: '#eddcd2',
    textMain: '#291711',
    textMuted: '#7f5548',
    defaultAccent: 'orange',
    previewColors: ['#fbf4ef', '#ea580c', '#291711'],
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    description: 'Infinite interstellar space dark with celestial violet and stellar cyan.',
    isDark: true,
    bgMain: '#080914',
    bgSurface: '#101326',
    borderColor: '#1e2445',
    textMain: '#e2e8f0',
    textMuted: '#8b9bb4',
    defaultAccent: 'cyan',
    previewColors: ['#080914', '#38bdf8', '#e2e8f0'],
  },
  {
    id: 'pine',
    name: 'Deep Forest Pine',
    description: 'Lush dark midnight woodland canopy, deep evergreen, and soothing moss slate.',
    isDark: true,
    bgMain: '#09130d',
    bgSurface: '#112217',
    borderColor: '#1e3828',
    textMain: '#ecfdf5',
    textMuted: '#6ee7b7',
    defaultAccent: 'emerald',
    previewColors: ['#09130d', '#10b981', '#ecfdf5'],
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
  gold: {
    name: 'Radiant Gold',
    hex: '#eab308',
    ringClass: 'ring-yellow-500',
    bgClass: 'bg-yellow-500 hover:bg-yellow-400 text-stone-950',
    textClass: 'text-yellow-600',
  },
  teal: {
    name: 'Deep Teal',
    hex: '#14b8a6',
    ringClass: 'ring-teal-500',
    bgClass: 'bg-teal-500 hover:bg-teal-400 text-white',
    textClass: 'text-teal-600',
  },
};

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'calm_mentor',
    name: 'Calm Mentor',
    title: 'Mindful, Grounded & Patient Guide',
    description: 'Steady, patient, and deeply grounded cadence ideal for emotional regulation, slowing down, and mindful clarity.',
    gender: 'male',
    pitch: 0.88,
    rate: 0.88,
    greetingSample: "Welcome back. Take a gentle, grounding breath with me. I am your Calm Mentor. There is no rush here—let us explore your thoughts with patience and spaciousness.",
    preferredVoiceNames: ['Google US English Male', 'Alex', 'Oliver', 'Fred', 'Microsoft David', 'en-US'],
    geminiPromptTone: 'You are a Calm Mentor. Speak with patient, grounded wisdom, somatic awareness, and non-judgmental spaciousness. Offer gentle perspective, encourage mindful pauses, validate emotional reality, and help the user slow down and observe the bigger picture without rush.',
    tag: 'Mindfulness & Grounding',
  },
  {
    id: 'empathetic_friend',
    name: 'Empathetic Friend',
    title: 'Warm, Supportive & Compassionate Confidant',
    description: 'Naturally gentle, encouraging, and emotionally resonant cadence for heartfelt personal vulnerability, comfort, and deep validation.',
    gender: 'female',
    pitch: 1.08,
    rate: 0.95,
    greetingSample: "Hello there! I am your Empathetic Friend. Whether your day was joyful, heavy, or somewhere in between, I am right here beside you with an open heart. What's on your mind?",
    preferredVoiceNames: ['Google US English', 'Samantha', 'Karen', 'Victoria', 'Moira', 'Microsoft Zira', 'en-US'],
    geminiPromptTone: 'You are an Empathetic Friend. Speak with genuine warmth, emotional validation, unconditional positive regard, and gentle, heartfelt care. Validate feelings first, avoid being cold or overly clinical, and remind the user that they are not alone and that their human experiences are worthy of tenderness.',
    tag: 'Warmth & Validation',
  },
  {
    id: 'analytical_observer',
    name: 'Analytical Observer',
    title: 'Objective, Socratic & Structured Thinker',
    description: 'Clear, precise, and logically structured rhythm tailored for cognitive pattern analysis, decision making, and strategic clarity.',
    gender: 'neutral',
    pitch: 1.02,
    rate: 0.98,
    greetingSample: "Hello. I am your Analytical Observer. Let us examine your experiences, untangle complex variables, and surface the core insights beneath the noise.",
    preferredVoiceNames: ['Google US English', 'Tom', 'Rishi', 'Fred', 'Microsoft Mark', 'en-US'],
    geminiPromptTone: 'You are an Analytical Observer. Offer razor-sharp clarity, cognitive pattern identification, cognitive reframing, and gentle Socratic inquiry. Break complex feelings into core variables, surface underlying assumptions and cognitive distortions, and help structure strategic decisions with logic and balance.',
    tag: 'Clarity & Socratic Inquiry',
  },
  {
    id: 'jarvis',
    name: 'Articulate Strategist (Jarvis)',
    title: 'Distinguished, Sophisticated & Proactive Companion',
    description: 'Calm, measured, and distinguished British cadence for high-level intellectual contemplation and structured next steps.',
    gender: 'male',
    pitch: 0.95,
    rate: 0.94,
    greetingSample: "Greetings. I am Jarvis, your articulate strategic companion. I stand ready to assist you in distilling your reflections with precision, eloquence, and structure.",
    preferredVoiceNames: ['Google UK English Male', 'Daniel', 'Arthur', 'George', 'Microsoft George', 'en-GB'],
    geminiPromptTone: 'You are an Articulate Strategist and Executive Reflection Companion (Jarvis). Respond with refined eloquence, impeccable structure, high emotional intelligence, and proactive synthesis of actionable next steps.',
    tag: 'Strategic & Eloquent',
  },
  {
    id: 'serene_guide',
    name: 'Serene Guide',
    title: 'Gentle, Meditative & Restorative Presence',
    description: 'Soft, compassionate, and tranquil voice crafted to de-escalate anxiety, soothe mental fatigue, and restore inner equilibrium.',
    gender: 'female',
    pitch: 1.12,
    rate: 0.90,
    greetingSample: "Peace to you today. I am your Serene Guide. Let us create a quiet sanctuary together for your mind to rest, release tension, and reflect.",
    preferredVoiceNames: ['Google UK English Female', 'Serena', 'Fiona', 'Tessa', 'Microsoft Hazel', 'en-AU', 'en-GB'],
    geminiPromptTone: 'You are a Serene Guide. Speak softly and mindfully, with a focus on somatic calming, stress dissipation, loving-kindness, and restorative peace.',
    tag: 'Restorative & Soothing',
  },
];

export const resolveVoicePersona = (id: string): VoicePersona => {
  if (id === 'oliver' || id === 'calm_mentor') return VOICE_PERSONAS.find((v) => v.id === 'calm_mentor') || VOICE_PERSONAS[0];
  if (id === 'samantha' || id === 'empathetic_friend') return VOICE_PERSONAS.find((v) => v.id === 'empathetic_friend') || VOICE_PERSONAS[1];
  if (id === 'orion' || id === 'analytical_observer') return VOICE_PERSONAS.find((v) => v.id === 'analytical_observer') || VOICE_PERSONAS[2];
  if (id === 'elena' || id === 'serene_guide') return VOICE_PERSONAS.find((v) => v.id === 'serene_guide') || VOICE_PERSONAS[4];
  if (id === 'jarvis') return VOICE_PERSONAS.find((v) => v.id === 'jarvis') || VOICE_PERSONAS[3];
  return VOICE_PERSONAS.find((v) => v.id === id) || VOICE_PERSONAS[0];
};

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
  applyVoiceCommand: (transcript: string) => { matched: boolean; feedback: string; actionType?: 'theme' | 'persona' | 'accent' | 'mute' };
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
    return 'amethyst';
  });

  const [accentColorId, setAccentColorIdState] = useState<AccentColorId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCENT_ID);
      if (saved && ACCENT_COLORS[saved as AccentColorId]) {
        return saved as AccentColorId;
      }
    }
    return 'violet';
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
  const activeVoice = resolveVoicePersona(activeVoiceId);

  // Synchronize document & body background to active theme to completely eliminate white gaps
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = currentTheme.bgMain;
      document.body.style.backgroundColor = currentTheme.bgMain;
      if (currentTheme.isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [currentTheme]);

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

  // Voice Command Processor for Hands-Free Theme & Persona Switching
  const applyVoiceCommand = (transcript: string): { matched: boolean; feedback: string; actionType?: 'theme' | 'persona' | 'accent' | 'mute' } => {
    const text = transcript.toLowerCase().trim();

    // 1. Check Voice Persona Switch Commands
    if (text.includes('calm mentor') || text.includes('mentor voice') || text.includes('calm voice') || text.includes('oliver')) {
      setActiveVoiceId('calm_mentor');
      return {
        matched: true,
        actionType: 'persona',
        feedback: 'Voice persona switched to Calm Mentor. Take a gentle breath with me.',
      };
    }
    if (text.includes('empathetic friend') || text.includes('friend voice') || text.includes('empathetic voice') || text.includes('samantha')) {
      setActiveVoiceId('empathetic_friend');
      return {
        matched: true,
        actionType: 'persona',
        feedback: 'Voice persona switched to Empathetic Friend. I am here with you.',
      };
    }
    if (text.includes('analytical observer') || text.includes('analytical voice') || text.includes('observer voice') || text.includes('orion')) {
      setActiveVoiceId('analytical_observer');
      return {
        matched: true,
        actionType: 'persona',
        feedback: 'Voice persona switched to Analytical Observer. Ready to examine insights.',
      };
    }
    if (text.includes('jarvis') || text.includes('strategist voice') || text.includes('british voice')) {
      setActiveVoiceId('jarvis');
      return {
        matched: true,
        actionType: 'persona',
        feedback: 'Voice persona switched to Jarvis. At your service for strategic reflection.',
      };
    }
    if (text.includes('serene guide') || text.includes('meditative voice') || text.includes('peaceful voice') || text.includes('elena')) {
      setActiveVoiceId('serene_guide');
      return {
        matched: true,
        actionType: 'persona',
        feedback: 'Voice persona switched to Serene Guide. Tranquil space restored.',
      };
    }

    // 2. Check Theme Switch Commands
    const themeTriggers: { keywords: string[]; id: ThemeId; name: string }[] = [
      { keywords: ['obsidian', 'dark mode', 'night mode', 'midnight theme', 'dark theme'], id: 'obsidian', name: 'Obsidian Midnight' },
      { keywords: ['sage', 'botanical', 'green theme', 'forest green'], id: 'sage', name: 'Botanical Sage' },
      { keywords: ['amber', 'warm amber', 'stone theme', 'parchment'], id: 'amber', name: 'Warm Amber' },
      { keywords: ['glacier', 'nordic', 'ice theme', 'arctic'], id: 'glacier', name: 'Nordic Glacier' },
      { keywords: ['rose', 'terracotta and rose', 'pink theme', 'blush theme'], id: 'rose', name: 'Rose & Terracotta' },
      { keywords: ['terracotta', 'sunset terracotta', 'tuscan', 'warm clay'], id: 'terracotta', name: 'Sunset Terracotta' },
      { keywords: ['amethyst', 'cyber', 'purple theme', 'neon purple'], id: 'amethyst', name: 'Cyber Amethyst' },
      { keywords: ['nebula', 'cosmic', 'starlight', 'galaxy theme'], id: 'nebula', name: 'Cosmic Nebula' },
      { keywords: ['pine', 'deep forest', 'evergreen', 'woodland'], id: 'pine', name: 'Deep Forest Pine' },
      { keywords: ['monochrome', 'monolith', 'grayscale', 'black and white', 'editorial'], id: 'monochrome', name: 'Minimalist Monolith' },
    ];

    for (const trigger of themeTriggers) {
      if (trigger.keywords.some((kw) => text.includes(kw))) {
        setThemeId(trigger.id);
        return {
          matched: true,
          actionType: 'theme',
          feedback: `Theme switched to ${trigger.name}.`,
        };
      }
    }

    // 3. Check Accent Color Commands
    const accentTriggers: { keywords: string[]; id: AccentColorId; name: string }[] = [
      { keywords: ['emerald accent', 'green accent', 'accent emerald'], id: 'emerald', name: 'Lush Emerald' },
      { keywords: ['indigo accent', 'blue accent', 'accent indigo'], id: 'indigo', name: 'Cosmic Indigo' },
      { keywords: ['amber accent', 'yellow accent', 'accent amber'], id: 'amber', name: 'Warm Amber' },
      { keywords: ['rose accent', 'pink accent', 'accent rose'], id: 'rose', name: 'Velvet Rose' },
      { keywords: ['violet accent', 'purple accent', 'accent violet'], id: 'violet', name: 'Electric Violet' },
      { keywords: ['cyan accent', 'cyan color', 'accent cyan'], id: 'cyan', name: 'Glacier Cyan' },
      { keywords: ['orange accent', 'sunset accent', 'accent orange'], id: 'orange', name: 'Sunset Orange' },
      { keywords: ['gold accent', 'golden accent', 'accent gold'], id: 'gold', name: 'Radiant Gold' },
      { keywords: ['teal accent', 'accent teal'], id: 'teal', name: 'Deep Teal' },
    ];

    for (const trigger of accentTriggers) {
      if (trigger.keywords.some((kw) => text.includes(kw))) {
        setAccentColorId(trigger.id);
        return {
          matched: true,
          actionType: 'accent',
          feedback: `Accent color updated to ${trigger.name}.`,
        };
      }
    }

    // 4. Mute / Unmute
    if (text.includes('mute voice') || text.includes('be quiet') || text.includes('silence voice')) {
      setIsVoiceMuted(true);
      return { matched: true, actionType: 'mute', feedback: 'Voice synthesis muted.' };
    }
    if (text.includes('unmute voice') || text.includes('speak again') || text.includes('enable voice')) {
      setIsVoiceMuted(false);
      return { matched: true, actionType: 'mute', feedback: 'Voice synthesis unmuted.' };
    }

    return { matched: false, feedback: '' };
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
        applyVoiceCommand,
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
