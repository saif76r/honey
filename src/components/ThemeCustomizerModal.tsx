import React from 'react';
import { Palette, Heart, Bell, Volume2, Sparkles, Calendar, Check } from 'lucide-react';
import { AppSettings, Contact, ThemePreset } from '../types/chat';
import { THEMES } from '../utils/themes';
import { playReceivedChime } from '../utils/sound';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  activeContact: Contact;
  onUpdateContact: (contactId: string, updates: Partial<Contact>) => void;
  onRequestPushPermission: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  activeContact,
  onUpdateContact,
  onRequestPushPermission,
}) => {
  if (!isOpen) return null;

  const themeList = Object.values(THEMES);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl neu-flat rounded-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-[var(--neu-accent)]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="customizer-modal-title" className="text-lg font-bold text-[var(--neu-text-primary)]">
                Romantic Customization
              </h2>
              <p className="text-xs text-[var(--neu-text-secondary)]">
                Soft pastel palettes, ambient atmosphere & love settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]"
            aria-label="Close customization modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Section 1: Pastel Palettes */}
          <div>
            <label className="text-xs font-bold text-[var(--neu-text-primary)] flex items-center gap-1.5 mb-3">
              <Palette className="w-3.5 h-3.5 text-[var(--neu-accent)]" />
              <span>Pastel Color Theme</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themeList.map((theme) => {
                const isSelected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onUpdateSettings({ theme: theme.id as ThemePreset })}
                    className={`p-3 rounded-2xl text-left transition-all ${
                      isSelected ? 'neu-pressed ring-2 ring-[var(--neu-accent)]' : 'neu-button'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-6 h-6 rounded-full shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: theme.accent }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.accentLight }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[var(--neu-text-primary)] block">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Ambient Romantic Effects */}
          <div className="p-4 rounded-2xl neu-flat-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--neu-accent)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--neu-text-primary)] block">
                    Ambient Floating Particles
                  </span>
                  <span className="text-[11px] text-[var(--neu-text-secondary)]">
                    Gentle floating hearts and petals over the chat
                  </span>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ ambientParticles: !settings.ambientParticles })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.ambientParticles ? 'bg-[var(--neu-accent)]' : 'neu-pressed'
                }`}
                aria-label="Toggle ambient particles"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                    settings.ambientParticles ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {settings.ambientParticles && (
              <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                {(['hearts', 'petals', 'sparkles'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onUpdateSettings({ particleType: type })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${
                      settings.particleType === type
                        ? 'neu-button text-[var(--neu-accent)] font-bold'
                        : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Couple Anniversary & Pet Names */}
          <div className="p-4 rounded-2xl neu-flat-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--neu-accent)]" />
              <span className="text-xs font-bold text-[var(--neu-text-primary)]">
                Love Days & Relationship Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--neu-text-secondary)] block mb-1">
                  Partner Pet Name
                </label>
                <input
                  type="text"
                  value={activeContact.nickname}
                  onChange={(e) => onUpdateContact(activeContact.id, { nickname: e.target.value })}
                  placeholder="e.g. My Soulmate 💕"
                  className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--neu-text-secondary)] block mb-1">
                  Relationship Start Date
                </label>
                <input
                  type="date"
                  value={activeContact.relationshipStartDate}
                  onChange={(e) => onUpdateContact(activeContact.id, { relationshipStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--neu-text-secondary)] block mb-1">
                Anniversary Milestone Note
              </label>
              <input
                type="text"
                value={activeContact.anniversaryMilestone}
                onChange={(e) => onUpdateContact(activeContact.id, { anniversaryMilestone: e.target.value })}
                placeholder="e.g. Our 1st Anniversary Dinner & Trip"
                className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
              />
            </div>
          </div>

          {/* Section 4: Audio & Push Notifications */}
          <div className="p-4 rounded-2xl neu-flat-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[var(--neu-accent)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--neu-text-primary)] block">
                    Romantic Sound Chimes
                  </span>
                  <span className="text-[11px] text-[var(--neu-text-secondary)]">
                    Soft harp chords and crystal bells for messages
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playReceivedChime(true)}
                  className="px-2.5 py-1 text-[11px] font-medium neu-button rounded-lg text-[var(--neu-accent)]"
                  title="Test chime sound"
                >
                  Preview
                </button>
                <button
                  onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.soundEffects ? 'bg-[var(--neu-accent)]' : 'neu-pressed'
                  }`}
                  aria-label="Toggle sound effects"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                      settings.soundEffects ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-black/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--neu-accent)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--neu-text-primary)] block">
                    Push Notifications
                  </span>
                  <span className="text-[11px] text-[var(--neu-text-secondary)]">
                    Instant alerts for incoming partner messages
                  </span>
                </div>
              </div>
              <button
                onClick={onRequestPushPermission}
                className="px-3 py-1.5 text-xs font-semibold neu-button rounded-xl text-[var(--neu-accent)]"
              >
                {settings.pushNotificationsEnabled ? 'Enabled ✓' : 'Enable Push'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
