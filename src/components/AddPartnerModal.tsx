import React, { useState } from 'react';
import {
  X,
  Heart,
  UserPlus,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Search,
  Calendar,
  Users
} from 'lucide-react';
import { AuthUser, Contact } from '../types/chat';
import { playSentChime } from '../utils/sound';
import { findPartner, linkPartnersInCloud, emailToUserId } from '../services/firestoreService';
import defaultAvatar from '../assets/images/sophia_avatar_1793017722307.jpg';

interface AddPartnerModalProps {
  currentUser: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (contact: Contact) => void;
  existingContactIds: string[];
}

interface StoredAccount {
  user: AuthUser;
  passphraseHash: string;
}

function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem('amour_registered_accounts_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const AddPartnerModal: React.FC<AddPartnerModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onAddContact,
  existingContactIds,
}) => {
  const [partnerQuery, setPartnerQuery] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipDate, setRelationshipDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [anniversaryTitle, setAnniversaryTitle] = useState('Our First Day 💕');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const allAccounts = getRegisteredAccounts();
  // Accounts available to connect (registered users except myself and already added contacts)
  const availableAccounts = allAccounts
    .map((a) => a.user)
    .filter(
      (u) =>
        u.id !== currentUser.id &&
        !existingContactIds.includes(u.id) &&
        u.email.toLowerCase() !== currentUser.email.toLowerCase()
    );

  const handleCopyMyCode = () => {
    const code = currentUser.partnerCode || `HONEY-${currentUser.id.slice(-6).toUpperCase()}`;
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleConnectByAccount = (partnerUser: AuthUser) => {
    setErrorMsg('');
    const newContact: Contact = {
      id: partnerUser.id,
      name: partnerUser.name,
      nickname: nickname.trim() || partnerUser.petName || partnerUser.name,
      avatar: partnerUser.avatar || defaultAvatar,
      isOnline: true,
      lastSeen: 'Active now',
      statusMessage: 'Connected in private sanctuary 💕',
      relationshipStartDate: relationshipDate,
      anniversaryMilestone: anniversaryTitle.trim() || 'Our Special Day',
      fingerprint:
        partnerUser.keyFingerprint ||
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      isVerified: true,
      unreadCount: 0,
    };

    // Save mutual link in Firestore so partner automatically sees me
    linkPartnersInCloud(currentUser, newContact).catch((e) =>
      console.warn('Mutual link notice:', e)
    );

    playSentChime(true);
    setSuccessMsg(`Successfully paired with ${partnerUser.name}!`);
    setTimeout(() => {
      onAddContact(newContact);
      onClose();
    }, 700);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const query = partnerQuery.trim();
    if (!query) {
      setErrorMsg('Please enter your partner\'s code, email, or name.');
      return;
    }

    // Check if entered user's own details
    if (
      query.toUpperCase() === currentUser.partnerCode?.toUpperCase() ||
      query.toLowerCase() === currentUser.email.toLowerCase() ||
      query === currentUser.id
    ) {
      setErrorMsg('You cannot pair with your own account. Share your code with your partner!');
      return;
    }

    // 1. Search in local accounts
    const matchedAccount = allAccounts.find(
      (a) =>
        a.user.partnerCode?.toUpperCase() === query.toUpperCase() ||
        a.user.email.toLowerCase() === query.toLowerCase() ||
        a.user.name.toLowerCase() === query.toLowerCase()
    );

    if (matchedAccount) {
      if (existingContactIds.includes(matchedAccount.user.id)) {
        setErrorMsg('You are already connected to this partner.');
        return;
      }
      handleConnectByAccount(matchedAccount.user);
      return;
    }

    // 2. Query Firestore pairings & users (cross-device discovery by code or email)
    try {
      const firestorePair = await findPartner(query);
      if (firestorePair) {
        if (
          firestorePair.userId === currentUser.id ||
          firestorePair.userEmail.toLowerCase() === currentUser.email.toLowerCase()
        ) {
          setErrorMsg('You cannot pair with your own account.');
          return;
        }
        if (existingContactIds.includes(firestorePair.userId)) {
          setErrorMsg('You are already connected to this partner.');
          return;
        }

        const onlineContact: Contact = {
          id: firestorePair.userId,
          name: firestorePair.userName,
          nickname: nickname.trim() || firestorePair.petName || firestorePair.userName,
          avatar: firestorePair.userAvatar || defaultAvatar,
          isOnline: true,
          lastSeen: 'Active on HoneyChat',
          statusMessage: 'Connected in private sanctuary 💕',
          relationshipStartDate: relationshipDate,
          anniversaryMilestone: anniversaryTitle.trim() || 'Our Special Day',
          fingerprint: firestorePair.keyFingerprint || Math.random().toString(36).slice(2),
          isVerified: true,
          unreadCount: 0,
        };

        // Reciprocally save in cloud so partner immediately sees current user
        linkPartnersInCloud(currentUser, onlineContact).catch((e) =>
          console.warn('Mutual link notice:', e)
        );

        playSentChime(true);
        setSuccessMsg(`Paired successfully with ${onlineContact.nickname}!`);
        setTimeout(() => {
          onAddContact(onlineContact);
          onClose();
        }, 700);
        return;
      }
    } catch (err) {
      console.warn('Partner search notice:', err);
    }

    // 3. If query has '@', allow connecting with partner's email directly via deterministic ID
    if (query.includes('@')) {
      const resolvedId = emailToUserId(query);
      if (existingContactIds.includes(resolvedId)) {
        setErrorMsg('You are already connected to this partner.');
        return;
      }
      const emailContact: Contact = {
        id: resolvedId,
        name: query.split('@')[0],
        nickname: nickname.trim() || query.split('@')[0],
        avatar: defaultAvatar,
        isOnline: true,
        lastSeen: 'Connected via Email',
        statusMessage: 'Private couple chat connected 💕',
        relationshipStartDate: relationshipDate,
        anniversaryMilestone: anniversaryTitle.trim() || 'Our Special Day',
        fingerprint: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        isVerified: true,
        unreadCount: 0,
      };

      linkPartnersInCloud(currentUser, emailContact).catch(() => {});
      playSentChime(true);
      setSuccessMsg(`Paired successfully with ${emailContact.nickname}!`);
      setTimeout(() => {
        onAddContact(emailContact);
        onClose();
      }, 700);
      return;
    }

    // If code was not found and query is not an email, do NOT create a fake unrouteable partner ID
    setErrorMsg('Partner code not found. Please double-check your partner\'s code (e.g. HONEY-PTEPI) or enter their registered email address.');
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md neu-flat rounded-3xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl neu-pressed flex items-center justify-center text-[var(--neu-accent)]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--neu-text-primary)]">
                Connect Real Partner
              </h3>
              <p className="text-[11px] text-[var(--neu-text-secondary)]">
                Exclusively pair two real accounts with E2EE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-rose-500"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* My Partner Code Share Card */}
        <div className="mt-4 p-3.5 rounded-2xl neu-pressed space-y-2">
          <span className="text-[11px] font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wider block">
            Your Personal Pairing Code
          </span>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-[var(--neu-accent)] tracking-wider">
              {currentUser.partnerCode || `HONEY-${currentUser.id.slice(-6).toUpperCase()}`}
            </code>
            <button
              onClick={handleCopyMyCode}
              className="px-3 py-1.5 rounded-xl neu-button text-xs font-semibold text-[var(--neu-accent)] flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--neu-text-secondary)]">
            Send this code to your partner so they can connect with you instantly.
          </p>
        </div>

        {/* Form to connect by partner code/email */}
        <form onSubmit={handleConnectSubmit} className="mt-4 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs text-center font-medium">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--neu-text-primary)] mb-1">
              Partner's Pairing Code or Email
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. HONEY-7K9ZP or partner@love.com"
                value={partnerQuery}
                onChange={(e) => setPartnerQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--neu-accent)]"
              />
              <Search className="w-4 h-4 text-[var(--neu-text-secondary)] absolute right-3 top-2.5 opacity-60" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--neu-text-primary)] mb-1">
              Sweet Nickname (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. My Soulmate 💕, My Beloved"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--neu-accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--neu-text-primary)] mb-1">
                Anniversary Date
              </label>
              <input
                type="date"
                value={relationshipDate}
                onChange={(e) => setRelationshipDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--neu-text-primary)] mb-1">
                Milestone Name
              </label>
              <input
                type="text"
                value={anniversaryTitle}
                onChange={(e) => setAnniversaryTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl neu-button-primary text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Heart className="w-4 h-4 fill-[var(--neu-accent)]/20" />
            <span>Connect & Begin Private Chat</span>
          </button>
        </form>

        {/* Registered real accounts ready to connect on this device */}
        {availableAccounts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-black/5">
            <span className="text-[11px] font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wider block mb-2">
              Registered Accounts Ready to Pair
            </span>
            <div className="space-y-2">
              {availableAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-2xl neu-flat-sm flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 neu-flat-sm"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--neu-text-primary)] block truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-[var(--neu-text-secondary)] truncate block font-mono">
                        {acc.partnerCode} · {acc.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectByAccount(acc)}
                    className="px-2.5 py-1.5 rounded-xl neu-button text-[11px] font-bold text-[var(--neu-accent)] flex items-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Connect</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
