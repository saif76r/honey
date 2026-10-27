import React, { useState } from 'react';
import { Mail, Heart, Sparkles, Feather, Lock } from 'lucide-react';
import { Message } from '../types/chat';
import { playWaxSealCrack, playHeartReactionSound } from '../utils/sound';

interface SealedLetterModalProps {
  message?: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onSendNewLetter?: (letterTitle: string, letterText: string, waxColor: string) => void;
  mode: 'view' | 'create';
}

export const SealedLetterModal: React.FC<SealedLetterModalProps> = ({
  message,
  isOpen,
  onClose,
  onSendNewLetter,
  mode,
}) => {
  const [isBroken, setIsBroken] = useState(message?.letterMeta?.isOpened || false);
  const [newTitle, setNewTitle] = useState('To My Beloved');
  const [newBody, setNewBody] = useState('');
  const [selectedWax, setSelectedWax] = useState('#D94B68');

  if (!isOpen) return null;

  const waxOptions = [
    { label: 'Rose Carmine', color: '#D94B68' },
    { label: 'Antique Gold', color: '#D4A359' },
    { label: 'Lavender Mist', color: '#9B7EC9' },
    { label: 'Deep Wine', color: '#882D3D' },
  ];

  const handleBreakSeal = () => {
    playWaxSealCrack(true);
    setIsBroken(true);
    if (message?.letterMeta) {
      message.letterMeta.isOpened = true;
    }
    setTimeout(() => {
      playHeartReactionSound(true);
    }, 400);
  };

  const handleSend = () => {
    if (!newBody.trim() || !onSendNewLetter) return;
    onSendNewLetter(newTitle.trim() || 'A Sealed Letter', newBody.trim(), selectedWax);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="letter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg neu-flat rounded-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]"
          aria-label="Close letter modal"
        >
          ✕
        </button>

        {mode === 'create' ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-[var(--neu-accent)]">
                <Feather className="w-5 h-5" />
              </div>
              <div>
                <h2 id="letter-modal-title" className="text-lg font-bold text-[var(--neu-text-primary)]">
                  Seal a Secret Love Letter
                </h2>
                <p className="text-xs text-[var(--neu-text-secondary)]">
                  Encrypted with AES-256 and sealed with a romantic wax stamp
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] block mb-1">
                  Envelope Heading
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] font-medium outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                  placeholder="e.g. For Your Eyes Only"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] block mb-1">
                  Wax Seal Color
                </label>
                <div className="flex items-center gap-3">
                  {waxOptions.map((w) => (
                    <button
                      key={w.color}
                      type="button"
                      onClick={() => setSelectedWax(w.color)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-button text-xs transition-all ${
                        selectedWax === w.color ? 'ring-2 ring-offset-1' : ''
                      }`}
                      style={{ outlineColor: w.color }}
                    >
                      <div
                        className="w-4 h-4 rounded-full shadow-inner"
                        style={{ backgroundColor: w.color }}
                      />
                      <span className="text-[11px] text-[var(--neu-text-primary)]">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--neu-text-secondary)] block mb-1">
                  Love Letter Confession
                </label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your deepest feelings here... It will remain strictly confidential and sealed until opened."
                  className="w-full p-4 rounded-2xl neu-pressed text-sm text-[var(--neu-text-primary)] font-serif leading-relaxed outline-none resize-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[var(--neu-text-secondary)] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[var(--neu-accent)]" />
                  End-to-End Encrypted
                </span>
                <button
                  onClick={handleSend}
                  disabled={!newBody.trim()}
                  className="px-5 py-2.5 rounded-2xl neu-button-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Stamp & Seal Letter 💌
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="text-center py-4">
            {!isBroken ? (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto rounded-3xl neu-flat flex items-center justify-center text-[var(--neu-accent)] relative">
                  <Mail className="w-9 h-9" />
                  <div
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: message?.letterMeta?.waxColor || '#D94B68' }}
                  >
                    ❤
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-[var(--neu-text-primary)]">
                    {message?.letterMeta?.title || 'A Secret Sealed Letter'}
                  </h3>
                  <p className="text-xs text-[var(--neu-text-secondary)] mt-1">
                    Sent with love and sealed exclusively for you
                  </p>
                </div>

                <div className="p-4 rounded-2xl neu-pressed text-xs text-[var(--neu-text-secondary)] max-w-sm mx-auto">
                  <p>
                    Tap the royal wax seal below to break the seal and unfold the handwritten letter.
                  </p>
                </div>

                <button
                  onClick={handleBreakSeal}
                  className="px-6 py-3.5 rounded-3xl neu-button text-sm font-bold text-white transition-transform active:scale-95 inline-flex items-center gap-2"
                  style={{ backgroundColor: message?.letterMeta?.waxColor || 'var(--neu-accent)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Break Wax Seal</span>
                </button>
              </div>
            ) : (
              /* Unfolded Letter */
              <div className="space-y-4 animate-scale-up text-left">
                <div className="p-6 rounded-3xl bg-[#FFFDF7] shadow-inner border border-amber-100/60 relative">
                  {/* Decorative corner flourishes */}
                  <div className="text-[10px] uppercase tracking-widest text-amber-800/60 font-mono mb-2 flex items-center justify-between">
                    <span>SEALED CORRESPONDENCE</span>
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-300" />
                  </div>

                  <h3 className="text-xl font-bold font-serif text-amber-950 mb-3 border-b border-amber-200/50 pb-2">
                    {message?.letterMeta?.title || 'To My Beloved'}
                  </h3>

                  <div className="font-serif text-base sm:text-lg leading-relaxed text-amber-900/90 whitespace-pre-wrap py-2">
                    {message?.content}
                  </div>

                  <div className="pt-4 border-t border-amber-200/50 flex items-center justify-between text-xs font-serif italic text-amber-800">
                    <span>Forever yours</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md"
                      style={{ backgroundColor: message?.letterMeta?.waxColor || '#D94B68' }}
                    >
                      ❤
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl neu-button text-xs font-semibold text-[var(--neu-text-primary)]"
                  >
                    Keep in Memory Box
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
