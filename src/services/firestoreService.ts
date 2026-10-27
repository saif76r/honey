import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
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

export interface StoredCloudAccount {
  id: string;
  name: string;
  email: string;
  petName?: string;
  avatar: string;
  partnerCode: string;
  passphraseHash: string;
  keyFingerprint: string;
  createdAt: number;
  contacts?: Contact[];
  updatedAt: number;
}

// Deterministic valid Firestore document ID from user's email
export function emailToUserId(email: string): string {
  const sanitized = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  return `usr_${sanitized}`.slice(0, 100);
}

// Save complete account with credentials to Firestore for seamless cross-device login
export async function saveAccountToCloud(user: AuthUser, passphrase: string): Promise<void> {
  const docId = user.id || emailToUserId(user.email);
  try {
    const userRef = doc(db, 'users', docId);
    const cloudAccount: StoredCloudAccount = {
      id: docId,
      name: user.name,
      email: user.email.toLowerCase(),
      petName: user.petName || '',
      avatar: user.avatar,
      partnerCode: user.partnerCode || `HONEY-${docId.slice(-6).toUpperCase()}`,
      passphraseHash: passphrase,
      keyFingerprint: user.keyFingerprint || '',
      createdAt: user.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(userRef, cloudAccount, { merge: true });

    // Also register the partnerCode in pairings collection
    if (cloudAccount.partnerCode) {
      const pairingRef = doc(db, 'pairings', cloudAccount.partnerCode.toUpperCase());
      await setDoc(pairingRef, {
        code: cloudAccount.partnerCode.toUpperCase(),
        userId: docId,
        userName: user.name,
        userAvatar: user.avatar,
        userEmail: user.email.toLowerCase(),
        petName: user.petName || '',
        keyFingerprint: user.keyFingerprint || '',
        updatedAt: Date.now(),
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${docId}`);
  }
}

// Verify account credentials across devices (PC to Phone)
export async function verifyCloudAccount(
  email: string,
  passphrase: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const docId = emailToUserId(cleanEmail);

  try {
    const userRef = doc(db, 'users', docId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return {
        success: false,
        error: 'No account found with this email. Please create your account first.',
      };
    }

    const data = snap.data() as StoredCloudAccount;
    if (data.passphraseHash !== passphrase.trim()) {
      return {
        success: false,
        error: 'Incorrect master passphrase. Please try again.',
      };
    }

    const authUser: AuthUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      petName: data.petName || 'My Soulmate 💕',
      avatar: data.avatar,
      keyFingerprint: data.keyFingerprint,
      partnerCode: data.partnerCode,
      createdAt: data.createdAt,
    };

    return { success: true, user: authUser };
  } catch (err) {
    console.error('Verify cloud account error:', err);
    return {
      success: false,
      error: 'Network or database error during login. Please try again.',
    };
  }
}

// Fetch user contacts saved in cloud
export async function fetchUserContactsFromCloud(userId: string): Promise<Contact[]> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.contacts)) {
        return data.contacts as Contact[];
      }
    }
  } catch (err) {
    console.warn('Fetch contacts notice:', err);
  }
  return [];
}

// Save user contacts to cloud
export async function saveUserContactsToCloud(userId: string, contacts: Contact[]): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { contacts }, { merge: true });
  } catch (err) {
    console.warn('Save contacts notice:', err);
  }
}

// Link two partners mutually in Firestore
export async function linkPartnersInCloud(currentUser: AuthUser, partnerContact: Contact): Promise<void> {
  try {
    // 1. Update currentUser's contacts in Firestore
    const myRef = doc(db, 'users', currentUser.id);
    const mySnap = await getDoc(myRef);
    const myExistingContacts: Contact[] = (mySnap.exists() && Array.isArray(mySnap.data()?.contacts))
      ? mySnap.data().contacts
      : [];
    const myUpdatedContacts = [
      partnerContact,
      ...myExistingContacts.filter((c) => c.id !== partnerContact.id),
    ];
    await setDoc(myRef, { contacts: myUpdatedContacts }, { merge: true });

    // 2. Also reciprocally add currentUser to partner's contacts in Firestore
    const partnerRef = doc(db, 'users', partnerContact.id);
    const partnerSnap = await getDoc(partnerRef);
    if (partnerSnap.exists()) {
      const partnerExistingContacts: Contact[] = Array.isArray(partnerSnap.data()?.contacts)
        ? partnerSnap.data().contacts
        : [];
      const myContactForPartner: Contact = {
        id: currentUser.id,
        name: currentUser.name,
        nickname: currentUser.petName || currentUser.name,
        avatar: currentUser.avatar,
        isOnline: true,
        lastSeen: 'Active now',
        statusMessage: 'Connected in private sanctuary 💕',
        relationshipStartDate: partnerContact.relationshipStartDate,
        anniversaryMilestone: partnerContact.anniversaryMilestone,
        fingerprint: currentUser.keyFingerprint || '',
        isVerified: true,
        unreadCount: 0,
      };
      const partnerUpdatedContacts = [
        myContactForPartner,
        ...partnerExistingContacts.filter((c) => c.id !== myContactForPartner.id),
      ];
      await setDoc(partnerRef, { contacts: partnerUpdatedContacts }, { merge: true });
    }
  } catch (err) {
    console.warn('Mutual partner link notice:', err);
  }
}

// Find partner by pairing code OR by email
export async function findPartner(queryStr: string): Promise<PairingRecord | null> {
  const trimmed = queryStr.trim();
  if (!trimmed) return null;

  // 1. Try finding by uppercase pairing code (e.g. HONEY-12345)
  try {
    const codeRef = doc(db, 'pairings', trimmed.toUpperCase());
    const snap = await getDoc(codeRef);
    if (snap.exists()) {
      return snap.data() as PairingRecord;
    }
  } catch (e) {
    console.warn('Pairing by code check:', e);
  }

  // 2. Try finding by email
  if (trimmed.includes('@')) {
    const userDocId = emailToUserId(trimmed);
    try {
      const userRef = doc(db, 'users', userDocId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = userSnap.data() as StoredCloudAccount;
        return {
          code: u.partnerCode,
          userId: u.id,
          userName: u.name,
          userAvatar: u.avatar,
          userEmail: u.email,
          petName: u.petName,
          keyFingerprint: u.keyFingerprint,
          updatedAt: Date.now(),
        };
      }
    } catch (e) {
      console.warn('Pairing by email check:', e);
    }
  }

  return null;
}

// Backward-compatible alias
export const findPartnerByCode = findPartner;

// Backward-compatible sync user
export async function syncUserToFirestore(user: AuthUser): Promise<void> {
  const docId = user.id || emailToUserId(user.email);
  try {
    const userRef = doc(db, 'users', docId);
    await setDoc(userRef, {
      id: docId,
      name: user.name,
      email: user.email.toLowerCase(),
      petName: user.petName || '',
      avatar: user.avatar,
      partnerCode: user.partnerCode || `HONEY-${docId.slice(-6).toUpperCase()}`,
      keyFingerprint: user.keyFingerprint || '',
      createdAt: user.createdAt || Date.now(),
      lastSeen: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('syncUserToFirestore notice:', err);
  }
}

// Send an encrypted message to Firestore
export async function sendFirestoreMessage(message: Message): Promise<void> {
  try {
    const msgRef = doc(db, 'messages', message.id);
    const sanitized = JSON.parse(JSON.stringify(message));
    await setDoc(msgRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `messages/${message.id}`);
  }
}

// Update a message (reactions, read status, etc.)
export async function updateFirestoreMessage(messageId: string, updates: Partial<Message>): Promise<void> {
  try {
    const msgRef = doc(db, 'messages', messageId);
    const sanitized = JSON.parse(JSON.stringify(updates));
    await updateDoc(msgRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
  }
}

// Listen to ALL messages involving current user (both received AND sent on other devices)
export function subscribeToUserMessages(
  userId: string,
  onMessage: (message: Message) => void
): () => void {
  try {
    const messagesCol = collection(db, 'messages');

    // Query 1: Messages where current user is receiver (sent by partner)
    const qIn = query(messagesCol, where('receiverId', '==', userId), limit(100));
    const unsubIn = onSnapshot(
      qIn,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            onMessage(change.doc.data() as Message);
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages/receiver');
      }
    );

    // Query 2: Messages where current user is sender (synced from PC to Phone or vice versa)
    const qOut = query(messagesCol, where('senderId', '==', userId), limit(100));
    const unsubOut = onSnapshot(
      qOut,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            onMessage(change.doc.data() as Message);
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages/sender');
      }
    );

    return () => {
      unsubIn();
      unsubOut();
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'messages');
    return () => {};
  }
}

// Backward-compatible alias
export const subscribeToIncomingMessages = subscribeToUserMessages;

// Broadcast typing status via Firestore
export async function setFirestoreTyping(userId: string, partnerId: string, isTyping: boolean): Promise<void> {
  try {
    const typingId = `typ_${userId}_${partnerId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const typingRef = doc(db, 'typing', typingId);
    await setDoc(typingRef, {
      userId,
      partnerId,
      isTyping,
      updatedAt: Date.now(),
    });
  } catch (err) {
    // Non-critical
  }
}

// Listen to partner typing status
export function subscribeToPartnerTyping(
  partnerId: string,
  userId: string,
  onTypingChange: (isTyping: boolean) => void
): () => void {
  try {
    const typingId = `typ_${partnerId}_${userId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const typingRef = doc(db, 'typing', typingId);
    return onSnapshot(
      typingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Date.now() - data.updatedAt < 5000) {
            onTypingChange(Boolean(data.isTyping));
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
