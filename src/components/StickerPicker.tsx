import React, { useState } from 'react';
import { Heart, Sparkles, Smile } from 'lucide-react';

interface StickerPickerProps {
  onSelectSticker: (stickerId: string, stickerTitle: string, emoji: string) => void;
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const STICKERS = [
  { id: 'stk_moon', emoji: '🌙', title: 'To the Moon & Back', subtitle: 'Love without limits' },
  { id: 'stk_hug', emoji: '🧸', title: 'Warmest Bear Hug', subtitle: 'Always here for you' },
  { id: 'stk_coffee', emoji: '☕', title: 'Morning Coffee & You', subtitle: 'My favorite ritual' },
  { id: 'stk_ring', emoji: '💍', title: 'Forever Yours', subtitle: 'Promise of eternity' },
  { id: 'stk_rose', emoji: '🌹', title: 'Fresh Crimson Rose', subtitle: 'Just for you' },
  { id: 'stk_stars', emoji: '✨', title: 'You Are My Constellation', subtitle: 'Guiding my path' },
  { id: 'stk_letter', emoji: '💌', title: 'Secret Little Note', subtitle: 'Thinking of you' },
  { id: 'stk_heartbeat', emoji: '💓', title: 'Racing Heartbeat', subtitle: 'Every time I see you' },
];

export const QUICK_EMOJIS = ['💕', '💖', '💘', '❤️', '🌹', '💌', '✨', '🕊️', '🍓', '🥂', '🧸', '🌸', '☕', '💋'];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onSelectSticker,
  onSelectEmoji,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'emojis'>('stickers');

  return (
    <div className="w-full sm:w-80 neu-flat rounded-3xl p-4 shadow-xl border border-black/5 animate-scale-up">
      <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl neu-pressed">
          <button
            onClick={() => setActiveTab('stickers')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'stickers'
                ? 'neu-button text-[var(--neu-accent)]'
                : 'text-[var(--neu-text-secondary)]'
            }`}
          >
            Romantic Stickers
          </button>
          <button
            onClick={() => setActiveTab('emojis')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'emojis'
                ? 'neu-button text-[var(--neu-accent)]'
                : 'text-[var(--neu-text-secondary)]'
            }`}
          >
            Love Emojis
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full neu-button flex items-center justify-center text-xs text-[var(--neu-text-secondary)]"
        >
          ✕
        </button>
      </div>

      {activeTab === 'stickers' ? (
        <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {STICKERS.map((stk) => (
            <button
              key={stk.id}
              onClick={() => onSelectSticker(stk.id, stk.title, stk.emoji)}
              className="p-2.5 rounded-2xl neu-button text-left group hover:scale-[1.02] transition-transform"
            >
              <div className="text-3xl mb-1.5 transform group-hover:scale-110 transition-transform">
                {stk.emoji}
              </div>
              <div className="text-xs font-bold text-[var(--neu-text-primary)] leading-tight">
                {stk.title}
              </div>
              <div className="text-[10px] text-[var(--neu-text-secondary)] mt-0.5 line-clamp-1">
                {stk.subtitle}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
          {QUICK_EMOJIS.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onSelectEmoji(emoji)}
              className="w-11 h-11 rounded-2xl neu-button flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
