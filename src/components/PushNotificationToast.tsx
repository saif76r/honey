import React, { useState } from 'react';
import { Heart, Send, X, ShieldCheck } from 'lucide-react';

interface PushNotificationToastProps {
  senderName: string;
  senderAvatar: string;
  previewText: string;
  onQuickReply: (replyText: string) => void;
  onDismiss: () => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({
  senderName,
  senderAvatar,
  previewText,
  onQuickReply,
  onDismiss,
}) => {
  const [reply, setReply] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSend = () => {
    if (!reply.trim()) return;
    onQuickReply(reply.trim());
    setReply('');
    onDismiss();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md neu-flat rounded-2xl p-3.5 shadow-2xl border border-black/5 animate-slide-down"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={senderAvatar}
              alt={senderName}
              className="w-10 h-10 rounded-full object-cover neu-flat-sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--neu-surface)]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--neu-text-primary)] truncate">
                {senderName}
              </span>
              <ShieldCheck className="w-3 h-3 text-[var(--neu-accent)] shrink-0" />
            </div>
            <p className="text-xs text-[var(--neu-text-secondary)] truncate">
              {previewText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowInput(!showInput)}
            className="px-2.5 py-1 rounded-xl neu-button text-[11px] font-semibold text-[var(--neu-accent)]"
          >
            Reply
          </button>
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)]"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showInput && (
        <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Quick sweet reply..."
            autoFocus
            className="flex-1 px-3 py-1.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-xl neu-button text-[var(--neu-accent)] hover:scale-105"
            aria-label="Send reply"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
