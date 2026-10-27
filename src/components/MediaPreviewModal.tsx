import React, { useState } from 'react';
import { Download, ShieldCheck, Heart, Send } from 'lucide-react';

interface MediaPreviewModalProps {
  mediaUrl: string | null;
  caption?: string;
  isOpen: boolean;
  onClose: () => void;
  // If in upload draft mode
  isDraft?: boolean;
  onSendDraft?: (caption: string) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  mediaUrl,
  caption,
  isOpen,
  onClose,
  isDraft = false,
  onSendDraft,
}) => {
  const [draftCaption, setDraftCaption] = useState('');

  if (!isOpen || !mediaUrl) return null;

  const handleSend = () => {
    if (onSendDraft) {
      onSendDraft(draftCaption);
      setDraftCaption('');
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-2xl neu-flat rounded-3xl p-4 sm:p-6 relative max-h-[95vh] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--neu-accent)] flex items-center gap-1.5 neu-flat-sm px-2.5 py-1 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>E2EE Media Encrypted</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Image viewport */}
        <div className="flex-1 min-h-0 flex items-center justify-center rounded-2xl neu-pressed p-2 overflow-hidden bg-black/5">
          <img
            src={mediaUrl}
            alt={caption || 'Encrypted shared photo'}
            className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Bottom controls / caption */}
        <div className="pt-4">
          {isDraft ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Add a romantic note to this photo..."
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl neu-button text-xs font-semibold text-[var(--neu-text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="px-5 py-2 rounded-xl neu-button-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Encrypted Photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--neu-text-primary)] font-medium">
                {caption || 'Encrypted memory'}
              </p>
              <a
                href={mediaUrl}
                download="love_photo_encrypted.jpg"
                className="px-3 py-1.5 rounded-xl neu-button text-xs font-semibold text-[var(--neu-text-primary)] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[var(--neu-accent)]" />
                <span>Save</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
