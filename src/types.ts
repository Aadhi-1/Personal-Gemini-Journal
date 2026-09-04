export type JournalMode = 'reflection' | 'summary' | 'brainstorm' | 'socratic';

export type JournalCategory =
  | 'Personal Reflection'
  | 'Brainstorming'
  | 'Gratitude'
  | 'Decision Making'
  | 'Goal Setting'
  | 'General';

export interface InteractionMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
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

export interface InteractionEntry {
  id: string;
  userId: string;
  title: string;
  category: JournalCategory;
  mode: JournalMode;
  mood?: string | null;
  location?: JournalLocation | null;
  summary?: string;
  keyInsights?: string[];
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

