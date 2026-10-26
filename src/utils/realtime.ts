import { Message, Contact, AuthUser } from '../types/chat';

// BroadcastChannel for instant multi-tab communication between real user sessions
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('amour_chat_sync_v1');
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }
}

export type BroadcastEvent =
  | { type: 'NEW_MESSAGE'; message: Message }
  | { type: 'TYPING_STATUS'; senderId: string; isTyping: boolean }
  | { type: 'REACTION'; messageId: string; emoji: string; senderId: string }
  | { type: 'HEART_BURST'; senderId: string }
  | { type: 'PARTNER_CONNECTED'; partner: Contact; initiatorId: string };

export function broadcastChatEvent(event: BroadcastEvent) {
  if (broadcastChannel) {
    broadcastChannel.postMessage(event);
  }
}

export function subscribeToChatEvents(callback: (event: BroadcastEvent) => void): () => void {
  if (!broadcastChannel) return () => {};
  const handler = (e: MessageEvent) => {
    callback(e.data);
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

// Zero demo accounts - only real registered users communicate
export const INITIAL_CONTACTS: Contact[] = [];

// Zero demo messages - conversations start completely clean for real partners
export const INITIAL_MESSAGES: Message[] = [];
