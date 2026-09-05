export type JournalMode = 'reflection' | 'summary' | 'brainstorm' | 'socratic';

export type JournalCategory =
  | 'Personal Reflection'
  | 'Brainstorming'
  | 'Gratitude'
  | 'Decision Making'
  | 'Goal Setting'
  | 'General';

export interface MediaAttachment {
  id: string;
  type: 'photo' | 'gif';
  url: string;
  title?: string;
  caption?: string;
  source?: 'upload' | 'camera' | 'giphy' | 'url';
  mimeType?: string;
  base64?: string;
  dimensions?: { width: number; height: number };
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface InteractionMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachments?: MediaAttachment[];
  groundingSources?: GroundingSource[];
}

export interface JournalLocation {
  name: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface MoodOption {
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { emoji: '😊', label: 'Joyful' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤔', label: 'Reflective' },
  { emoji: '💡', label: 'Inspired' },
  { emoji: '🌿', label: 'Grounded' },
  { emoji: '🌸', label: 'Grateful' },
  { emoji: '⚡', label: 'Energized' },
  { emoji: '😔', label: 'Melancholy' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😤', label: 'Frustrated' },
];

export interface JournalSticker {
  id: string;
  emoji: string;
  label: string;
  category: 'mindfulness' | 'insight' | 'emotion' | 'achievement' | 'milestone';
  description: string;
  colorClass: string;
}

export const JOURNAL_STICKERS: JournalSticker[] = [
  { id: 'zen_flow', emoji: '🧘', label: 'Zen Flow', category: 'mindfulness', description: 'Deep mindful immersion and peaceful presence', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'grounded', emoji: '🌿', label: 'Grounded', category: 'mindfulness', description: 'Rooted, stabilized, and centered in the moment', colorClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'mindful_pause', emoji: '🍵', label: 'Mindful Pause', category: 'mindfulness', description: 'Slowing down to breathe, savor, and observe', colorClass: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'inner_peace', emoji: '🕊️', label: 'Inner Peace', category: 'mindfulness', description: 'Acceptance, tranquility, and harmony', colorClass: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'deep_flow', emoji: '🌊', label: 'Deep Flow', category: 'mindfulness', description: 'Rhythmic flow state without interruption', colorClass: 'bg-cyan-50 text-cyan-800 border-cyan-200' },

  { id: 'eureka', emoji: '💡', label: 'Eureka Insight', category: 'insight', description: 'A sudden clarity or profound creative realization', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'breakthrough', emoji: '🔥', label: 'Breakthrough', category: 'insight', description: 'Overcoming mental blocks or unlocking solutions', colorClass: 'bg-orange-50 text-orange-800 border-orange-200' },
  { id: 'mental_clarity', emoji: '🧠', label: 'Clarity', category: 'insight', description: 'Untangling complex problems with structured thought', colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },

  { id: 'gratitude', emoji: '🌸', label: 'Grateful Heart', category: 'emotion', description: 'Appreciating life, nature, or people who matter', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'high_energy', emoji: '⚡', label: 'High Energy', category: 'emotion', description: 'Vibrant vitality, passion, and enthusiasm', colorClass: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { id: 'processing', emoji: '🌧️', label: 'Processing', category: 'emotion', description: 'Sitting with tender feelings, grief, or fatigue', colorClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'radiance', emoji: '☀️', label: 'Radiance', category: 'emotion', description: 'Warmth, optimism, and contagious positivity', colorClass: 'bg-amber-50 text-amber-900 border-amber-300' },
  { id: 'self_compassion', emoji: '💖', label: 'Self-Compassion', category: 'emotion', description: 'Kindness, patience, and tenderness towards self', colorClass: 'bg-pink-50 text-pink-800 border-pink-200' },

  { id: 'resilient', emoji: '🛡️', label: 'Resilient', category: 'achievement', description: 'Facing adversity with fortitude and grit', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'goal_locked', emoji: '🎯', label: 'Goal Locked', category: 'achievement', description: 'Clear focus, execution commitment, and intent', colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  { id: 'milestone', emoji: '🏆', label: 'Milestone', category: 'milestone', description: 'Significant personal achievement or life event', colorClass: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'next_chapter', emoji: '🚀', label: 'Next Chapter', category: 'milestone', description: 'Embarking on a major new phase or adventure', colorClass: 'bg-violet-50 text-violet-800 border-violet-200' },
  { id: 'pomodoro_focus', emoji: '⏱️', label: 'Deep Focus', category: 'milestone', description: 'Completed timed uninterrupted journaling session', colorClass: 'bg-amber-50 text-amber-900 border-amber-300' },
];

export interface InteractionEntry {
  id: string;
  userId: string;
  title: string;
  category: JournalCategory;
  mode: JournalMode;
  mood?: string | null;
  stickers?: string[];
  location?: JournalLocation | null;
  summary?: string;
  keyInsights?: string[];
  attachments?: MediaAttachment[];
  messages: InteractionMessage[];
  createdAt: string;
  updatedAt: string;
  // Zero-Knowledge Encrypted Attributes (AES-256-GCM in Web Worker Enclave)
  encrypted_content?: string;
  iv?: string;
  auth_tag?: string;
  key_id?: string;
  isEncrypted?: boolean;
  isDuressDecoy?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// ==========================================
// RBAC & Administrative Types
// ==========================================
export type UserRole = 'superadmin' | 'admin' | 'user';

export interface AdminProfile {
  uid: string;
  email: string;
  role: UserRole;
  grantedAt: string;
}

export interface AdminAuditLog {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actorUid: string;
  actorEmail?: string;
  details: string;
  timestamp: string;
}

// ==========================================
// External Notification Types
// ==========================================
export type NotificationTriggerReason =
  | 'GOAL_SETTING'
  | 'DECISION_MAKING'
  | 'CRISIS_SAFE_MODE'
  | 'KEY_INSIGHTS_EXTRACTED'
  | 'MANUAL_TEST';

export interface NotificationConfig {
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  discordEnabled: boolean;
  discordWebhookUrl?: string;
  emailEnabled: boolean;
  emailEndpoint?: string;
  triggerCategories: JournalCategory[];
  notifyOnCrisis: boolean;
  notifyOnKeyInsights: boolean;
  updatedAt: string;
}

export interface NotificationDispatchPayload {
  entryId: string;
  triggerReason: NotificationTriggerReason;
  entryTitle: string;
  category: JournalCategory;
  mood?: string | null;
  summary?: string;
  keyInsights?: string[];
  timestamp: string;
  channels?: ('slack' | 'discord' | 'email')[];
}

export interface NotificationDispatchResult {
  success: boolean;
  dispatchedAt: string;
  triggerReason: NotificationTriggerReason;
  channels: {
    slack?: { success: boolean; status?: number; error?: string };
    discord?: { success: boolean; status?: number; error?: string };
    email?: { success: boolean; status?: number; error?: string };
  };
  dlpSanitized: boolean;
}

