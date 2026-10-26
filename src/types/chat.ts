export type MessageType = 'text' | 'image' | 'voice' | 'sealed_letter' | 'sticker';

export interface Reaction {
  emoji: string;
  senderId: string;
  timestamp: number;
}

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded AES-GCM ciphertext
  iv: string;         // Base64 encoded 12-byte IV
  authTag?: string;   // Authentication verification info
  algorithm: 'AES-256-GCM';
  keyFingerprint: string;
  encryptedAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  // Plaintext (decrypted locally in client)
  content: string;
  // Encrypted representation proving real E2EE Web Crypto operation
  encryptedPayload: EncryptedPayload;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaDuration?: number; // For audio messages (seconds)
  mediaMimeType?: string;
  mediaName?: string;
  letterMeta?: {
    waxColor: string;
    isOpened: boolean;
    openedAt?: number;
    title?: string;
    senderSign?: string;
  };
  stickerId?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  reactions: Reaction[];
}

export interface Contact {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  statusMessage: string;
  relationshipStartDate: string; // ISO date string e.g. "2024-02-14"
  anniversaryMilestone: string;
  fingerprint: string;
  isVerified: boolean;
  unreadCount: number;
}

export type ThemePreset = 'rose' | 'lavender' | 'peach' | 'mint' | 'twilight';

export interface ThemeColors {
  name: string;
  id: ThemePreset;
  bg: string;
  surface: string;
  card: string;
  shadowDark: string;
  shadowLight: string;
  accent: string;
  accentLight: string;
  accentHover: string;
  textPrimary: string;
  textSecondary: string;
  bubbleMe: string;
  bubbleThem: string;
  accentRgb: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  petName: string;
  avatar: string;
  keyFingerprint: string;
  partnerCode?: string;
  createdAt: number;
}

export interface AppSettings {
  theme: ThemePreset;
  ambientParticles: boolean;
  particleType: 'hearts' | 'petals' | 'sparkles';
  soundEffects: boolean;
  pushNotificationsEnabled: boolean;
  activeUserId: string;
}
