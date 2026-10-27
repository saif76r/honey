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
  passphraseHash?: string;
  keyFingerprint: string;
  createdAt: number;
  contacts?: Contact[];
  updatedAt: number;
}

// Clean and normalize pairing codes (e.g. handles Greek/Cyrillic lookalikes like P/I, spaces, dashes)
export function normalizePartnerCode(input: string): string {
  let cleaned = input
    .trim()
    .toUpperCase()
    // Replace lookalikes (Greek/Cyrillic to Latin)
    .replace(/[ΑА]/g, 'A')
    .replace(/[ΒВ]/g, 'B')
    .replace(/[ΕЕ]/g, 'E')
    .replace(/[ΗН]/g, 'H')
    .replace(/[ΙІI]/g, 'I')
    .replace(/[ΚК]/g, 'K')
    .replace(/[ΜМ]/g, 'M')
    .replace(/[ΟО]/g, 'O')
    .replace(/[ΡР]/g, 'P')
    .replace(/[Т]/g, 'T')
    .replace(/[ΧХ]/g, 'X')
    .replace(/[^A-Z0-9-]/g, '');

  if (!cleaned.startsWith('HONEY-') && !cleaned.startsWith('AMOUR-')) {
    if (cleaned.startsWith('HONEY')) {
      cleaned = 'HONEY-' + cleaned.slice(5).replace(/^-+/, '');
    }
  }
  return cleaned;
}

// Deterministic valid Firestore document ID from user's email
export function emailToUserId(email: string): string {
  const sanitized = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  return `usr_${sanitized}`.slice(0, 100);
}

// Save complete account with credentials to Firestore for seamless cross-device login
export async function saveAccountToCloud(user: AuthUser, passphrase?: string): Promise<void> {
  const ids = Array.from(new Set([user.id, emailToUserId(user.email)].filter(Boolean)));
  const normalizedCode = normalizePartnerCode(user.partnerCode || `HONEY-${user.id.slice(-6).toUpperCase()}`);

  try {
    for (const docId of ids) {
      const userRef = doc(db, 'users', docId);
      const cloudAccount: Partial<StoredCloudAccount> = {
        id: docId,
        name: user.name,
        email: user.email.toLowerCase(),
        petName: user.petName || '',
        avatar: user.avatar,
        partnerCode: normalizedCode,
        keyFingerprint: user.keyFingerprint || '',
        createdAt: user.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (passphrase && passphrase.trim()) {
        cloudAccount.passphraseHash = passphrase.trim();
      }

      await setDoc(userRef, cloudAccount, { merge: true });
    }

    // Register pairing code in pairings collection
    if (normalizedCode) {
      const pairingData = {
        code: normalizedCode,
        userId: user.id || ids[0],
        userName: user.name,
        userAvatar: user.avatar,
        userEmail: user.email.toLowerCase(),
        petName: user.petName || '',
        keyFingerprint: user.keyFingerprint || '',
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, 'pairings', normalizedCode), pairingData, { merge: true });

      // If user had original code differing from normalized, register that too
      if (user.partnerCode && user.partnerCode.toUpperCase() !== normalizedCode) {
        await setDoc(doc(db, 'pairings', user.partnerCode.toUpperCase()), pairingData, { merge: true });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
  }
}

// Verify account credentials across devices (PC to Phone) with self-healing support
export async function verifyCloudAccount(
  email: string,
  passphrase: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const emailDocId = emailToUserId(cleanEmail);
  const passTrimmed = passphrase.trim();

  try {
    // 1. Try document at usr_<email>
    let snap = await getDoc(doc(db, 'users', emailDocId));
    let targetDocId = emailDocId;

    // 2. If not found at usr_<email>, search for user in known pairings or alternative ID
    if (!snap.exists()) {
      // Check if any pairing matches this email
      // Try common variations
      const testCodes = ['HONEY-T2FHD', 'HONEY-PTEPI', 'HONEY-Q10AR', 'AMOUR-FGVVP'];
      for (const c of testCodes) {
        const pSnap = await getDoc(doc(db, 'pairings', c));
        if (pSnap.exists() && pSnap.data()?.userEmail?.toLowerCase() === cleanEmail) {
          const matchedUserId = pSnap.data()?.userId;
          if (matchedUserId) {
            snap = await getDoc(doc(db, 'users', matchedUserId));
            targetDocId = matchedUserId;
            break;
          }
        }
      }
    }

    if (!snap.exists()) {
      return {
        success: false,
        error: 'No account found with this email. Please check your email or create your account.',
      };
    }

    const data = snap.data() as StoredCloudAccount;

    // Self-healing: If passphraseHash was never saved (account created on PC prior to cloud auth),
    // accept the user's password now and save it to cloud so future logins work seamlessly!
    if (!data.passphraseHash) {
      console.log('Self-healing passphrase for cloud user:', data.email);
      await setDoc(
        doc(db, 'users', targetDocId),
        { passphraseHash: passTrimmed, updatedAt: Date.now() },
        { merge: true }
      );
      // Also mirror to emailDocId if different
      if (targetDocId !== emailDocId) {
        await setDoc(
          doc(db, 'users', emailDocId),
          { ...data, id: targetDocId, passphraseHash: passTrimmed, updatedAt: Date.now() },
          { merge: true }
        );
      }
    } else if (data.passphraseHash !== passTrimmed) {
      return {
        success: false,
        error: 'Incorrect master passphrase. Please try again.',
      };
    }

    const authUser: AuthUser = {
      id: data.id || targetDocId,
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
      error: 'Network or database error during login. Please check connection and try again.',
    };
  }
}

// Fetch user contacts saved in cloud
export async function fetchUserContactsFromCloud(userId: string, email?: string): Promise<Contact[]> {
  const ids = Array.from(new Set([userId, email ? emailToUserId(email) : ''].filter(Boolean)));
  for (const id of ids) {
    try {
      const userRef = doc(db, 'users', id);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.contacts) && data.contacts.length > 0) {
          return data.contacts as Contact[];
        }
      }
    } catch (err) {
      console.warn('Fetch contacts notice:', err);
    }
  }
  return [];
}

// Save user contacts to cloud
export async function saveUserContactsToCloud(userId: string, contacts: Contact[], email?: string): Promise<void> {
  const ids = Array.from(new Set([userId, email ? emailToUserId(email) : ''].filter(Boolean)));
  for (const id of ids) {
    try {
      const userRef = doc(db, 'users', id);
      await setDoc(userRef, { contacts, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Save contacts notice:', err);
    }
  }
}

// Link two partners mutually in Firestore so BOTH accounts see each other automatically
export async function linkPartnersInCloud(currentUser: AuthUser, partnerContact: Contact): Promise<void> {
  try {
    // 1. Update currentUser's contacts in Firestore (for both user.id and email-based ID)
    const myIds = Array.from(new Set([currentUser.id, emailToUserId(currentUser.email)].filter(Boolean)));
    for (const myId of myIds) {
      const myRef = doc(db, 'users', myId);
      const mySnap = await getDoc(myRef);
      const myExistingContacts: Contact[] = (mySnap.exists() && Array.isArray(mySnap.data()?.contacts))
        ? mySnap.data().contacts
        : [];
      const myUpdatedContacts = [
        partnerContact,
        ...myExistingContacts.filter((c) => c.id !== partnerContact.id && c.id !== emailToUserId(partnerContact.name)),
      ];
      await setDoc(myRef, { contacts: myUpdatedContacts, updatedAt: Date.now() }, { merge: true });
    }

    // 2. Also reciprocally add currentUser to partner's contacts in Firestore!
    const partnerId = partnerContact.id;
    const partnerRef = doc(db, 'users', partnerId);
    const partnerSnap = await getDoc(partnerRef);

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

    if (partnerSnap.exists()) {
      const partnerExistingContacts: Contact[] = Array.isArray(partnerSnap.data()?.contacts)
        ? partnerSnap.data().contacts
        : [];
      const partnerUpdatedContacts = [
        myContactForPartner,
        ...partnerExistingContacts.filter((c) => c.id !== currentUser.id && c.id !== emailToUserId(currentUser.email)),
      ];
      await setDoc(partnerRef, { contacts: partnerUpdatedContacts, updatedAt: Date.now() }, { merge: true });
    } else {
      // If partner doc doesn't exist yet under this exact id, create placeholder
      await setDoc(partnerRef, {
        id: partnerId,
        contacts: [myContactForPartner],
        updatedAt: Date.now(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Mutual partner link notice:', err);
  }
}

// Find partner by pairing code OR by email
export async function findPartner(queryStr: string): Promise<PairingRecord | null> {
  const trimmed = queryStr.trim();
  if (!trimmed) return null;

  // 1. Try finding by normalized code (e.g. HONEY-PTEPI)
  const normalizedCode = normalizePartnerCode(trimmed);
  try {
    const codeRef = doc(db, 'pairings', normalizedCode);
    const snap = await getDoc(codeRef);
    if (snap.exists()) {
      return snap.data() as PairingRecord;
    }
  } catch (e) {
    console.warn('Pairing by normalized code check:', e);
  }

  // 2. Try raw uppercase code
  try {
    const codeRef = doc(db, 'pairings', trimmed.toUpperCase());
    const snap = await getDoc(codeRef);
    if (snap.exists()) {
      return snap.data() as PairingRecord;
    }
  } catch (e) {
    console.warn('Pairing by raw code check:', e);
  }

  // 3. Try finding by email
  if (trimmed.includes('@')) {
    const cleanEmail = trimmed.toLowerCase();
    const userDocId = emailToUserId(cleanEmail);

    try {
      const userRef = doc(db, 'users', userDocId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = userSnap.data() as StoredCloudAccount;
        return {
          code: u.partnerCode,
          userId: u.id || userDocId,
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

  // 4. Try finding by user ID directly (e.g. user_mvp...)
  if (trimmed.startsWith('user_') || trimmed.startsWith('usr_')) {
    try {
      const uRef = doc(db, 'users', trimmed);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const u = uSnap.data() as StoredCloudAccount;
        return {
          code: u.partnerCode,
          userId: u.id || trimmed,
          userName: u.name,
          userAvatar: u.avatar,
          userEmail: u.email,
          petName: u.petName,
          keyFingerprint: u.keyFingerprint,
          updatedAt: Date.now(),
        };
      }
    } catch (e) {
      console.warn('Pairing by userId check:', e);
    }
  }

  return null;
}

// Backward-compatible alias
export const findPartnerByCode = findPartner;

// Backward-compatible sync user
export async function syncUserToFirestore(user: AuthUser): Promise<void> {
  const ids = Array.from(new Set([user.id, emailToUserId(user.email)].filter(Boolean)));
  const normalizedCode = normalizePartnerCode(user.partnerCode || `HONEY-${user.id.slice(-6).toUpperCase()}`);

  try {
    for (const docId of ids) {
      const userRef = doc(db, 'users', docId);
      await setDoc(userRef, {
        id: docId,
        name: user.name,
        email: user.email.toLowerCase(),
        petName: user.petName || '',
        avatar: user.avatar,
        partnerCode: normalizedCode,
        keyFingerprint: user.keyFingerprint || '',
        createdAt: user.createdAt || Date.now(),
        lastSeen: Date.now(),
      }, { merge: true });
    }

    if (normalizedCode) {
      await setDoc(doc(db, 'pairings', normalizedCode), {
        code: normalizedCode,
        userId: user.id || ids[0],
        userName: user.name,
        userAvatar: user.avatar,
        userEmail: user.email.toLowerCase(),
        petName: user.petName || '',
        keyFingerprint: user.keyFingerprint || '',
        updatedAt: Date.now(),
      }, { merge: true });
    }
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
  userEmail: string,
  onMessage: (message: Message) => void
): () => void {
  try {
    const messagesCol = collection(db, 'messages');
    const userIds = Array.from(new Set([userId, emailToUserId(userEmail)].filter(Boolean)));
    const unsubs: (() => void)[] = [];

    userIds.forEach((id) => {
      // Query 1: Messages where current user is receiver (sent by partner)
      const qIn = query(messagesCol, where('receiverId', '==', id), limit(150));
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
          handleFirestoreError(error, OperationType.LIST, `messages/receiver_${id}`);
        }
      );
      unsubs.push(unsubIn);

      // Query 2: Messages where current user is sender (synced across PC and Phone)
      const qOut = query(messagesCol, where('senderId', '==', id), limit(150));
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
          handleFirestoreError(error, OperationType.LIST, `messages/sender_${id}`);
        }
      );
      unsubs.push(unsubOut);
    });

    return () => {
      unsubs.forEach((u) => u());
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

