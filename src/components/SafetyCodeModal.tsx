import React, { useState } from 'react';
import { ShieldCheck, Lock, Copy, Check, Eye, KeyRound, QrCode } from 'lucide-react';
import { Contact, EncryptedPayload } from '../types/chat';
import { formatSafetyNumbers } from '../utils/crypto';

interface SafetyCodeModalProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onToggleVerify: (contactId: string) => void;
  samplePayload?: EncryptedPayload;
  samplePlaintext?: string;
}

export const SafetyCodeModal: React.FC<SafetyCodeModalProps> = ({
  contact,
  isOpen,
  onClose,
  onToggleVerify,
  samplePayload,
  samplePlaintext,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'safety_numbers' | 'inspect_payload'>('safety_numbers');

  if (!isOpen) return null;

  const safetyBlocks = formatSafetyNumbers(contact.fingerprint);

  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(safetyBlocks.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg neu-flat rounded-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-[var(--neu-accent)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="safety-modal-title" className="text-lg font-bold text-[var(--neu-text-primary)]">
                End-to-End Encryption
              </h2>
              <p className="text-xs text-[var(--neu-text-secondary)]">
                AES-256-GCM Military Grade Authenticated Crypto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]"
            aria-label="Close safety modal"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 p-1.5 mt-5 rounded-2xl neu-pressed">
          <button
            onClick={() => setActiveTab('safety_numbers')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'safety_numbers'
                ? 'neu-button text-[var(--neu-accent)]'
                : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
            }`}
          >
            Safety Numbers
          </button>
          <button
            onClick={() => setActiveTab('inspect_payload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'inspect_payload'
                ? 'neu-button text-[var(--neu-accent)]'
                : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
            }`}
          >
            Raw Cipher Inspector
          </button>
        </div>

        {activeTab === 'safety_numbers' ? (
          <div className="mt-6 space-y-6">
            <div className="p-4 rounded-2xl neu-pressed text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--neu-text-secondary)] mb-2">
                <Lock className="w-3.5 h-3.5 text-[var(--neu-accent)]" />
                <span>Verify with {contact.nickname || contact.name}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--neu-text-secondary)]">
                Compare these numbers with your partner's screen to guarantee no third party or server can intercept your private moments.
              </p>
            </div>

            {/* Simulated Visual QR/Security Matrix */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-32 h-32 rounded-2xl neu-pressed p-3 flex items-center justify-center relative group">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white/70 rounded-xl">
                  {Array.from({ length: 36 }).map((_, idx) => {
                    const isFilled = (idx * 7 + (contact.fingerprint.charCodeAt(idx % contact.fingerprint.length) || 3)) % 3 !== 0;
                    return (
                      <div
                        key={idx}
                        className={`rounded-xs transition-colors ${
                          isFilled ? 'bg-[var(--neu-accent)]' : 'bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl backdrop-blur-xs">
                  <QrCode className="w-6 h-6 text-[var(--neu-accent)]" />
                </div>
              </div>
              <span className="text-[11px] text-[var(--neu-text-secondary)] mt-2">
                Visual Safety Matrix
              </span>
            </div>

            {/* 60 Safety digits displayed in 12 clean blocks */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {safetyBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="neu-flat-sm rounded-xl py-2 px-2.5 text-center font-mono text-xs font-semibold text-[var(--neu-text-primary)] tracking-wider"
                >
                  {block}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleCopyNumbers}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl neu-button flex items-center justify-center gap-2 text-xs font-semibold text-[var(--neu-text-primary)]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[var(--neu-accent)]" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Safety Code'}</span>
              </button>

              <button
                onClick={() => onToggleVerify(contact.id)}
                className={`w-full sm:flex-1 py-3 px-4 rounded-2xl neu-button flex items-center justify-center gap-2 text-xs font-semibold ${
                  contact.isVerified
                    ? 'text-emerald-700 font-bold'
                    : 'text-[var(--neu-accent)]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{contact.isVerified ? '✓ Verified Partner' : 'Mark as Verified'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl neu-pressed">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--neu-text-primary)] mb-1">
                <KeyRound className="w-4 h-4 text-[var(--neu-accent)]" />
                <span>Current Conversation Cipher</span>
              </div>
              <p className="text-xs text-[var(--neu-text-secondary)]">
                Every text, photo, voice note and sealed envelope is encrypted with standard Web Crypto API using unique random 96-bit initialization vectors.
              </p>
            </div>

            {/* Cipher inspection box */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl neu-flat-sm space-y-1">
                <span className="text-[11px] font-sans font-medium text-[var(--neu-text-secondary)] block">
                  Algorithm & Mode:
                </span>
                <span className="text-[var(--neu-accent)] font-semibold">
                  AES-256-GCM (Authenticated Encryption with Associated Data)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl neu-flat-sm space-y-1">
                <span className="text-[11px] font-sans font-medium text-[var(--neu-text-secondary)] block">
                  Random 96-bit IV (Base64):
                </span>
                <span className="text-[var(--neu-text-primary)] break-all select-all">
                  {samplePayload ? samplePayload.iv : 'a8xK19qLz/1029wA=='}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl neu-flat-sm space-y-1">
                <span className="text-[11px] font-sans font-medium text-[var(--neu-text-secondary)] block">
                  Encrypted Ciphertext (Base64):
                </span>
                <div className="max-h-24 overflow-y-auto p-2 rounded-xl neu-pressed text-[11px] text-[var(--neu-text-secondary)] break-all select-all">
                  {samplePayload ? samplePayload.ciphertext : 'J83kx/02Lm9Xn8A2019cKsm1049bvc...'}
                </div>
              </div>

              {samplePlaintext && (
                <div className="p-3.5 rounded-2xl neu-flat-sm space-y-1 bg-white/40">
                  <span className="text-[11px] font-sans font-medium text-[var(--neu-accent)] flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Decrypted Plaintext (Client-Side Only):
                  </span>
                  <div className="font-sans text-xs text-[var(--neu-text-primary)] font-medium">
                    "{samplePlaintext}"
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
