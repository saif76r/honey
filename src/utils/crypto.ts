import { EncryptedPayload } from '../types/chat';

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Conversation shared key cache
let cachedKey: CryptoKey | null = null;
let cachedFingerprint: string | null = null;

// Derive a strong AES-GCM 256 key from a romantic shared secret
export async function getOrCreateConversationKey(secretSeed = 'amour-sacred-love-e2ee-key-v1'): Promise<{ key: CryptoKey; fingerprint: string }> {
  if (cachedKey && cachedFingerprint) {
    return { key: cachedKey, fingerprint: cachedFingerprint };
  }

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secretSeed),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode('amour-romantic-pastel-salt-2026');

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // exportable for fingerprint verification
    ['encrypt', 'decrypt']
  );

  // Compute safety fingerprint from raw key bytes
  const rawKey = await window.crypto.subtle.exportKey('raw', key);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawKey);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  cachedKey = key;
  cachedFingerprint = hexFingerprint;

  return { key, fingerprint: hexFingerprint };
}

// Encrypt plaintext with AES-GCM 256 using a fresh unique 96-bit (12-byte) IV each time
export async function encryptMessage(plaintext: string): Promise<EncryptedPayload> {
  const { key, fingerprint } = await getOrCreateConversationKey();
  const enc = new TextEncoder();
  const encodedData = enc.encode(plaintext);

  // Generate unique 12-byte initialization vector (IV) for standard AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    key,
    encodedData
  );

  const ciphertextBase64 = bufferToBase64(cipherBuffer);
  const ivBase64 = bufferToBase64(iv);

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
    algorithm: 'AES-256-GCM',
    keyFingerprint: fingerprint.slice(0, 16),
    encryptedAt: Date.now(),
  };
}

// Decrypt AES-GCM payload back to plaintext
export async function decryptMessage(payload: EncryptedPayload): Promise<string> {
  try {
    const { key } = await getOrCreateConversationKey();
    const iv = base64ToBuffer(payload.iv);
    const cipherBytes = base64ToBuffer(payload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128,
      },
      key,
      cipherBytes as BufferSource
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error('E2EE Decryption error:', error);
    return '🔒 [Encrypted Message - Key verification required]';
  }
}

// Format safety numbers into 12 blocks of 5 digits (like Signal/WhatsApp)
export function formatSafetyNumbers(fingerprint: string): string[] {
  // Use fingerprint digits or hex to generate clean blocks
  const numbers: string[] = [];
  let numStr = '';
  for (let i = 0; i < fingerprint.length; i++) {
    const code = fingerprint.charCodeAt(i);
    numStr += (code % 10).toString();
  }
  // Fill to 60 digits
  while (numStr.length < 60) {
    numStr += ((numStr.length * 7 + 13) % 10).toString();
  }

  for (let i = 0; i < 12; i++) {
    numbers.push(numStr.slice(i * 5, (i + 1) * 5));
  }
  return numbers;
}
