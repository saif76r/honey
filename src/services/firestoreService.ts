import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AuthUser, Contact, Message } from '../types/chat';

export interface PairingRecord {
  code: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userEmail: string;
  petName?: string;
  keyFingerprint?: string;
  updatedAt: number;
}

// Save or sync user profile to Firestore
export async function syncUserToFirestore(user: AuthUser): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      petName: user.petName || '',
      avatar: user.avatar,
      partnerCode: user.partnerCode,
      keyFingerprint: user.keyFingerprint || '',
      createdAt: user.createdAt || Date.now(),
      lastSeen: Date.now(),
    }, { merge: true });

    // Also register the partner code in pairings collection for instant pairing
    if (user.partnerCode) {
      const pairingRef = doc(db, 'pairings', user.partnerCode.toUpperCase());
      await setDoc(pairingRef, {
        code: user.partnerCode.toUpperCase(),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        userEmail: user.email,
        petName: user.petName || '',
        keyFingerprint: user.keyFingerprint || '',
        updatedAt: Date.now(),
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
  }
}

// Find a partner in Firestore by their pairing code
export async function findPartnerByCode(code: string): Promise<PairingRecord | null> {
  const cleanCode = code.trim().toUpperCase();
  try {
    const pairingRef = doc(db, 'pairings', cleanCode);
    const snap = await getDoc(pairingRef);
    if (snap.exists()) {
      return snap.data() as PairingRecord;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `pairings/${cleanCode}`);
  }
  return null;
}

// Send an encrypted message to Firestore
export async function sendFirestoreMessage(message: Message): Promise<void> {
  try {
    const msgRef = doc(db, 'messages', message.id);
    // Sanitize message object for Firestore (strip undefined)
    const sanitized = JSON.parse(JSON.stringify(message));
    await setDoc(msgRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `messages/${message.id}`);
  }
}

// Update a message (e.g. for reactions or opened status)
export async function updateFirestoreMessage(messageId: string, updates: Partial<Message>): Promise<void> {
  try {
    const msgRef = doc(db, 'messages', messageId);
    const sanitized = JSON.parse(JSON.stringify(updates));
    await updateDoc(msgRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
  }
}

// Subscribe to messages where current user is receiver
export function subscribeToIncomingMessages(
  userId: string,
  onMessageReceived: (message: Message) => void
): () => void {
  try {
    const messagesCol = collection(db, 'messages');
    const q = query(
      messagesCol,
      where('receiverId', '==', userId),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as Message;
            onMessageReceived(data);
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      }
    );

    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'messages');
    return () => {};
  }
}

// Broadcast typing status via Firestore
export async function setFirestoreTyping(userId: string, partnerId: string, isTyping: boolean): Promise<void> {
  try {
    const typingRef = doc(db, 'typing', `${userId}_to_${partnerId}`);
    await setDoc(typingRef, {
      userId,
      partnerId,
      isTyping,
      updatedAt: Date.now(),
    });
  } catch (err) {
    // Non-critical, ignore if fails
  }
}

// Listen to partner typing status
export function subscribeToPartnerTyping(
  partnerId: string,
  userId: string,
  onTypingChange: (isTyping: boolean) => void
): () => void {
  try {
    const typingRef = doc(db, 'typing', `${partnerId}_to_${userId}`);
    return onSnapshot(
      typingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // If updated within 5 seconds
          if (data && Date.now() - data.updatedAt < 5000) {
            onTypingChange(data.isTyping);
          } else {
            onTypingChange(false);
          }
        } else {
          onTypingChange(false);
        }
      },
      () => {
        onTypingChange(false);
      }
    );
  } catch {
    return () => {};
  }
}
