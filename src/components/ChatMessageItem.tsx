import React, { useState } from 'react';
import { Lock, Heart, Check, CheckCheck, Mail, Sparkles, CornerDownLeft, Eye } from 'lucide-react';
import { Message } from '../types/chat';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { STICKERS } from './StickerPicker';

interface ChatMessageItemProps {
  message: Message;
  isMe: boolean;
  onOpenMedia: (url: string, caption?: string) => void;
  onOpenLetter: (message: Message) => void;
  onInspectPayload: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onReplyTo: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isMe,
  onOpenMedia,
  onOpenLetter,
  onInspectPayload,
  onReact,
  onReplyTo,
  onJumpToMessage,
}) => {
  const [showReactionMenu, setShowReactionMenu] = useState(false);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const reactionEmojis = ['❤️', '💕', '✨', '🌹', '🥰'];

  return (
    <div
      id={`msg-${message.id}`}
      className={`group flex flex-col mb-2 sm:mb-3 transition-all ${
        isMe ? 'items-end' : 'items-start'
      }`}
    >
      <div className={`relative max-w-[88%] sm:max-w-md ${isMe ? 'order-1' : 'order-1'}`}>
        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div
            onClick={() => onJumpToMessage?.(message.replyTo!.id)}
            className={`mb-1 p-1.5 sm:p-2 rounded-xl text-[10px] sm:text-[11px] cursor-pointer opacity-80 hover:opacity-100 transition-opacity flex flex-col gap-0.5 border-l-2 border-[var(--neu-accent)] ${
              isMe ? 'neu-pressed bg-white/20' : 'neu-pressed'
            }`}
          >
            <span className="font-bold text-[var(--neu-accent)]">
              {message.replyTo.senderName}
            </span>
            <span className="truncate text-[var(--neu-text-secondary)]">
              {message.replyTo.type === 'image'
                ? '📷 Photo'
                : message.replyTo.type === 'voice'
                ? '🎙️ Voice Love Note'
                : message.replyTo.type === 'sealed_letter'
                ? '💌 Sealed Letter'
                : message.replyTo.content}
            </span>
          </div>
        )}

        {/* Bubble Surface */}
        <div
          className={`py-2 px-3 sm:py-3 sm:px-3.5 rounded-2xl sm:rounded-3xl relative transition-all ${
            isMe ? 'neu-bubble-sent rounded-br-md sm:rounded-br-lg' : 'neu-bubble-received rounded-bl-md sm:rounded-bl-lg'
          }`}
        >
          {/* Content renderer according to MessageType */}
          {message.type === 'text' && (
            <div className="text-xs sm:text-sm leading-relaxed text-[var(--neu-text-primary)] font-normal whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {message.type === 'image' && (
            <div className="space-y-2">
              <div
                onClick={() => onOpenMedia(message.mediaUrl!, message.content)}
                className="overflow-hidden rounded-2xl cursor-pointer neu-pressed group/img relative"
              >
                <img
                  src={message.mediaUrl}
                  alt="Shared media"
                  className="w-full max-h-64 object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    View Fullscreen
                  </span>
                </div>
              </div>
              {message.content && (
                <p className="text-xs text-[var(--neu-text-primary)] font-medium px-1">
                  {message.content}
                </p>
              )}
            </div>
          )}

          {message.type === 'voice' && (
            <div className="w-64 sm:w-72">
              <AudioMessagePlayer
                audioUrl={message.mediaUrl}
                durationSeconds={message.mediaDuration || 6}
                isMe={isMe}
              />
            </div>
          )}

          {message.type === 'sealed_letter' && (
            <div
              onClick={() => onOpenLetter(message)}
              className="w-56 sm:w-64 p-3.5 rounded-2xl neu-flat-sm cursor-pointer hover:scale-[1.02] transition-transform flex items-center gap-3 bg-white/40"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0"
                style={{ backgroundColor: message.letterMeta?.waxColor || '#D94B68' }}
              >
                💌
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-serif font-bold text-[var(--neu-text-primary)] block truncate">
                  {message.letterMeta?.title || 'A Sealed Letter'}
                </span>
                <span className="text-[10px] text-[var(--neu-accent)] font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {message.letterMeta?.isOpened ? 'Letter Opened' : 'Tap to Break Seal'}
                </span>
              </div>
            </div>
          )}

          {message.type === 'sticker' && (
            <div className="flex flex-col items-center py-1">
              <div className="text-5xl animate-bounce-short select-none">
                {STICKERS.find((s) => s.id === message.stickerId)?.emoji || '💕'}
              </div>
              <span className="text-xs font-bold text-[var(--neu-text-primary)] mt-1">
                {message.content}
              </span>
            </div>
          )}

          {/* Footer: Timestamp, Encryption Lock, Status ticks */}
          <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-black/5 text-[10px] text-[var(--neu-text-secondary)]">
            <span>{formatTime(message.timestamp)}</span>

            <button
              onClick={() => onInspectPayload(message)}
              className="p-0.5 hover:text-[var(--neu-accent)] transition-colors"
              title="Inspect AES-256 E2EE Ciphertext"
            >
              <Lock className="w-2.5 h-2.5 text-[var(--neu-accent)]" />
            </button>

            {isMe && (
              <span className="ml-0.5">
                {message.status === 'read' ? (
                  <CheckCheck className="w-3 h-3 text-[var(--neu-accent)] font-bold" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3 h-3 text-[var(--neu-text-secondary)]" />
                ) : (
                  <Check className="w-3 h-3 text-[var(--neu-text-secondary)]" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions Display Pill */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-2.5 ${
              isMe ? 'right-2' : 'left-2'
            } flex items-center gap-1 px-2 py-0.5 rounded-full neu-flat-sm text-[11px] bg-[var(--neu-surface)] z-10`}
          >
            {message.reactions.map((r, i) => (
              <span key={i} className="hover:scale-125 transition-transform cursor-pointer">
                {r.emoji}
              </span>
            ))}
            {message.reactions.length > 1 && (
              <span className="text-[10px] font-bold text-[var(--neu-text-secondary)] ml-0.5">
                {message.reactions.length}
              </span>
            )}
          </div>
        )}

        {/* Hover Quick Action Buttons (Reply & React) */}
        <div
          className={`absolute -top-3 ${
            isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
          } hidden group-hover:flex items-center gap-1 z-20`}
        >
          <div className="relative">
            <button
              onClick={() => setShowReactionMenu(!showReactionMenu)}
              className="w-7 h-7 rounded-full neu-button flex items-center justify-center text-[var(--neu-accent)] hover:scale-110"
              title="React with love"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Reaction picker popover */}
            {showReactionMenu && (
              <div className="absolute bottom-8 left-0 flex items-center gap-1 p-1.5 rounded-2xl neu-flat bg-[var(--neu-surface)] shadow-lg animate-scale-up z-30">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowReactionMenu(false);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onReplyTo(message)}
            className="w-7 h-7 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)] hover:scale-110"
            title="Reply"
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
