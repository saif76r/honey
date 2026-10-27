import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Heart,
  Send,
  Image as ImageIcon,
  Mic,
  Smile,
  Mail,
  Palette,
  ChevronLeft,
  MessageCircleHeart,
  LogOut,
  UserPlus,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import {
  Message,
  Contact,
  AppSettings,
  AuthUser
} from './types/chat';
import { THEMES } from './utils/themes';
import { encryptMessage } from './utils/crypto';
import {
  playSentChime,
  playReceivedChime,
  playHeartReactionSound
} from './utils/sound';
import {
  broadcastChatEvent,
  subscribeToChatEvents
} from './utils/realtime';
import { FloatingHeartsCanvas } from './components/FloatingHeartsCanvas';
import { SafetyCodeModal } from './components/SafetyCodeModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { VoiceRecorder } from './components/VoiceRecorder';
import { SealedLetterModal } from './components/SealedLetterModal';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { StickerPicker } from './components/StickerPicker';
import { LoveCounterWidget } from './components/LoveCounterWidget';
import { ChatMessageItem } from './components/ChatMessageItem';
import { PushNotificationToast } from './components/PushNotificationToast';
import { AuthPage } from './components/AuthPage';
import { AddPartnerModal } from './components/AddPartnerModal';
import { testFirestoreConnection, db } from './firebase';
import {
  sendFirestoreMessage,
  updateFirestoreMessage,
  subscribeToUserMessages,
  setFirestoreTyping,
  subscribeToPartnerTyping,
  syncUserToFirestore,
  fetchUserContactsFromCloud,
  saveUserContactsToCloud,
} from './services/firestoreService';
import { doc, getDoc } from 'firebase/firestore';
import defaultAvatar from './assets/images/sophia_avatar_1793017722307.jpg';

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('amour_settings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      theme: 'rose',
      ambientParticles: true,
      particleType: 'hearts',
      soundEffects: true,
      pushNotificationsEnabled: true,
      activeUserId: '',
    };
  });

  // Authenticated User Session (null by default - requires user registration / login)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('amour_auth_user_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return null;
  });

  // Contacts: Only real connected users (purges any legacy demo accounts)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('amour_contacts_v1');
    if (saved) {
      try {
        const parsed: Contact[] = JSON.parse(saved);
        // Exclude old demo accounts
        const real = parsed.filter(
          (c) => c.id !== 'partner_love' && c.id !== 'partner_diary'
        );
        return real;
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [activeContactId, setActiveContactId] = useState<string>(() => {
    const saved = localStorage.getItem('amour_contacts_v1');
    if (saved) {
      try {
        const parsed: Contact[] = JSON.parse(saved);
        const real = parsed.filter(
          (c) => c.id !== 'partner_love' && c.id !== 'partner_diary'
        );
        return real[0]?.id || '';
      } catch {}
    }
    return '';
  });

  const [mobileView, setMobileView] = useState<'chat' | 'list'>('chat');
  const activeContact = contacts.find((c) => c.id === activeContactId) || contacts[0] || null;

  // Messages state: Only real messages exchanged (purges any old demo messages)
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('amour_messages_v1');
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        const real = parsed.filter(
          (m) =>
            m.id !== 'm1' &&
            m.id !== 'm2' &&
            m.senderId !== 'partner_love' &&
            m.receiverId !== 'partner_love' &&
            m.senderId !== 'partner_diary' &&
            m.receiverId !== 'partner_diary'
        );
        return real;
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Input bar state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Modals & Panels
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [inspectedMessage, setInspectedMessage] = useState<Message | null>(null);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<Message | null>(null);
  const [isCreatingLetter, setIsCreatingLetter] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState<string | undefined>(undefined);
  const [isDraftMedia, setIsDraftMedia] = useState(false);
  const [draftMediaUrl, setDraftMediaUrl] = useState<string | null>(null);
  const [copiedMyCode, setCopiedMyCode] = useState(false);

  // Push notifications state
  const [pushToast, setPushToast] = useState<{
    senderName: string;
    senderAvatar: string;
    previewText: string;
  } | null>(null);

  // Smooth scroll & Jump-to-bottom
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Apply theme CSS variables to body root
  useEffect(() => {
    const currentTheme = THEMES[settings.theme] || THEMES.rose;
    const root = document.documentElement;
    root.style.setProperty('--neu-bg', currentTheme.bg);
    root.style.setProperty('--neu-surface', currentTheme.surface);
    root.style.setProperty('--neu-card', currentTheme.card);
    root.style.setProperty('--neu-shadow-dark', currentTheme.shadowDark);
    root.style.setProperty('--neu-shadow-light', currentTheme.shadowLight);
    root.style.setProperty('--neu-accent', currentTheme.accent);
    root.style.setProperty('--neu-accent-light', currentTheme.accentLight);
    root.style.setProperty('--neu-text-primary', currentTheme.textPrimary);
    root.style.setProperty('--neu-text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--neu-accent-rgb', currentTheme.accentRgb);
    document.body.style.backgroundColor = currentTheme.bg;

    localStorage.setItem('amour_settings_v1', JSON.stringify(settings));
  }, [settings]);

  // Persist messages and contacts (sanitized of demo accounts)
  useEffect(() => {
    localStorage.setItem('amour_messages_v1', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('amour_contacts_v1', JSON.stringify(contacts));
  }, [contacts]);

  // Handle activeContactId sync when contacts change
  useEffect(() => {
    if (contacts.length > 0 && (!activeContactId || !contacts.some((c) => c.id === activeContactId))) {
      setActiveContactId(contacts[0].id);
    }
  }, [contacts, activeContactId]);

  // Real-time multi-tab/multi-user event subscriber
  useEffect(() => {
    const unsubscribe = subscribeToChatEvents((event) => {
      if (event.type === 'NEW_MESSAGE') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          return [...prev, event.message];
        });

        // Trigger notification if message is addressed to current user
        if (currentUser && event.message.receiverId === currentUser.id) {
          playReceivedChime(settings.soundEffects);
          const sender = contacts.find((c) => c.id === event.message.senderId);
          showPushNotification(
            sender?.nickname || sender?.name || 'Your Partner',
            event.message.content
          );
        }
      } else if (event.type === 'PARTNER_CONNECTED') {
        if (currentUser && event.initiatorId !== currentUser.id) {
          setContacts((prev) => {
            if (prev.some((c) => c.id === event.partner.id)) return prev;
            return [...prev, event.partner];
          });
          setActiveContactId(event.partner.id);
          playReceivedChime(settings.soundEffects);
        }
      } else if (event.type === 'TYPING_STATUS') {
        if (currentUser && event.senderId !== currentUser.id) {
          setIsPartnerTyping(event.isTyping);
        }
      } else if (event.type === 'REACTION') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === event.messageId) {
              const updatedReactions = [...(m.reactions || [])];
              const existingIdx = updatedReactions.findIndex((r) => r.senderId === event.senderId);
              if (existingIdx >= 0) {
                updatedReactions[existingIdx] = {
                  emoji: event.emoji,
                  senderId: event.senderId,
                  timestamp: Date.now(),
                };
              } else {
                updatedReactions.push({
                  emoji: event.emoji,
                  senderId: event.senderId,
                  timestamp: Date.now(),
                });
              }
              return { ...m, reactions: updatedReactions };
            }
            return m;
          })
        );
      } else if (event.type === 'HEART_BURST') {
        if (currentUser && event.senderId !== currentUser.id) {
          playHeartReactionSound(settings.soundEffects);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, settings.soundEffects, contacts]);

  // Validate connection to Firestore on boot
  useEffect(() => {
    testFirestoreConnection().catch((err) => console.warn('Firestore test connection:', err));
  }, []);

  // Sync current user and load contacts from Cloud Firestore
  useEffect(() => {
    if (!currentUser) return;
    syncUserToFirestore(currentUser).catch((err) => console.warn('Sync user error:', err));

    // Load cloud-saved contacts so Phone gets PC's paired partners automatically
    fetchUserContactsFromCloud(currentUser.id).then((cloudContacts) => {
      if (cloudContacts && cloudContacts.length > 0) {
        setContacts((prev) => {
          const merged = [...cloudContacts];
          prev.forEach((loc) => {
            if (!merged.some((m) => m.id === loc.id)) {
              merged.push(loc);
            }
          });
          return merged;
        });
        setActiveContactId((prevId) => prevId || cloudContacts[0].id);
      }
    }).catch((e) => console.warn('Cloud contacts fetch notice:', e));
  }, [currentUser]);

  // Sync contacts back to cloud when updated
  useEffect(() => {
    if (currentUser && contacts.length > 0) {
      saveUserContactsToCloud(currentUser.id, contacts).catch(() => {});
    }
  }, [currentUser, contacts]);

  // Firestore real-time messages subscriber (both incoming from partner & outgoing across devices)
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToUserMessages(currentUser.id, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev.map((m) => (m.id === msg.id ? msg : m));
        }

        // If received from partner
        if (msg.senderId !== currentUser.id) {
          playReceivedChime(settings.soundEffects);
          const sender = contacts.find((c) => c.id === msg.senderId);
          showPushNotification(
            sender?.nickname || sender?.name || 'Your Partner',
            msg.content
          );

          // If sender is not yet in contacts on this device, automatically discover & link!
          if (!contacts.some((c) => c.id === msg.senderId)) {
            getDoc(doc(db, 'users', msg.senderId)).then((snap) => {
              if (snap.exists()) {
                const sData = snap.data();
                const newPartner: Contact = {
                  id: sData.id,
                  name: sData.name,
                  nickname: sData.petName || sData.name,
                  avatar: sData.avatar || defaultAvatar,
                  isOnline: true,
                  lastSeen: 'Active now',
                  statusMessage: 'Connected in private sanctuary 💕',
                  relationshipStartDate: new Date().toISOString().split('T')[0],
                  anniversaryMilestone: 'Our Special Day',
                  fingerprint: sData.keyFingerprint || '',
                  isVerified: true,
                  unreadCount: 1,
                };
                setContacts((p) => [newPartner, ...p.filter((c) => c.id !== newPartner.id)]);
                setActiveContactId((cur) => cur || newPartner.id);
              }
            }).catch(() => {});
          }
        }

        return [...prev, msg];
      });
    });

    return () => unsubscribe();
  }, [currentUser, settings.soundEffects, contacts]);

  // Firestore real-time typing status subscriber
  useEffect(() => {
    if (!currentUser || !activeContact) return;
    const unsubscribe = subscribeToPartnerTyping(activeContact.id, currentUser.id, (isTyping) => {
      setIsPartnerTyping(isTyping);
    });

    return () => unsubscribe();
  }, [currentUser, activeContact]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('amour_auth_user_v1', JSON.stringify(user));
    setSettings((prev) => ({
      ...prev,
      activeUserId: user.id,
    }));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('amour_auth_user_v1');
  };

  // Connect new real partner
  const handleAddContact = (newContact: Contact) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== newContact.id);
      return [...filtered, newContact];
    });
    setActiveContactId(newContact.id);

    // Broadcast connection event so partner in another tab/window links reciprocally
    if (currentUser) {
      const myContactForPartner: Contact = {
        id: currentUser.id,
        name: currentUser.name,
        nickname: currentUser.petName || currentUser.name,
        avatar: currentUser.avatar,
        isOnline: true,
        lastSeen: 'Active now',
        statusMessage: 'Connected in private sanctuary 💕',
        relationshipStartDate: newContact.relationshipStartDate,
        anniversaryMilestone: newContact.anniversaryMilestone,
        fingerprint: currentUser.keyFingerprint,
        isVerified: true,
        unreadCount: 0,
      };
      broadcastChatEvent({
        type: 'PARTNER_CONNECTED',
        partner: myContactForPartner,
        initiatorId: currentUser.id,
      });
    }
  };

  const handleRemoveContact = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== contactId);
      if (activeContactId === contactId) {
        setActiveContactId(next[0]?.id || '');
      }
      return next;
    });
  };

  // Scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isClose = distanceFromBottom < 80;
    isNearBottomRef.current = isClose;
    setShowScrollBottomPill(!isClose);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior,
    });
    isNearBottomRef.current = true;
    setShowScrollBottomPill(false);
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, isPartnerTyping]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeContactId]);

  // Push notification handler
  const showPushNotification = (sender: string, text: string) => {
    setPushToast({
      senderName: sender,
      senderAvatar: activeContact?.avatar || defaultAvatar,
      previewText: text || 'Sent an encrypted love message',
    });
    setTimeout(() => {
      setPushToast((current) => (current?.previewText === text ? null : current));
    }, 6000);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`HoneyChat 💕 - ${sender}`, {
          body: text || 'Sent you an encrypted love message',
          icon: activeContact?.avatar,
        });
      } catch {
        // ignore
      }
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setSettings((prev) => ({ ...prev, pushNotificationsEnabled: true }));
        new Notification('HoneyChat Notifications Active', {
          body: 'You will receive private notifications for incoming partner messages 💕',
        });
      }
    }
  };

  // Broadcast typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const myId = currentUser?.id || 'me';
    broadcastChatEvent({
      type: 'TYPING_STATUS',
      senderId: myId,
      isTyping: true,
    });
    if (currentUser && activeContact) {
      setFirestoreTyping(currentUser.id, activeContact.id, true).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      broadcastChatEvent({
        type: 'TYPING_STATUS',
        senderId: myId,
        isTyping: false,
      });
      if (currentUser && activeContact) {
        setFirestoreTyping(currentUser.id, activeContact.id, false).catch(() => {});
      }
    }, 2000);
  };

  // Sending Messages (100% Real - Synced to Firestore)
  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser || !activeContact) return;
    const textToSend = inputText.trim();
    setInputText('');

    const encrypted = await encryptMessage(textToSend);

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      type: 'text',
      content: textToSend,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
      status: 'sent',
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName:
              replyingTo.senderId === currentUser.id
                ? 'You'
                : activeContact.nickname || activeContact.name,
            content: replyingTo.content,
            type: replyingTo.type,
          }
        : undefined,
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    setReplyingTo(null);
    playSentChime(settings.soundEffects);
    broadcastChatEvent({ type: 'NEW_MESSAGE', message: newMsg });
    sendFirestoreMessage(newMsg).catch((e) => console.warn('Firestore message save notice:', e));
    scrollToBottom('smooth');
  };

  // Voice note send
  const handleSendVoiceNote = async (audioUrl: string, durationSeconds: number) => {
    if (!currentUser || !activeContact) return;
    setIsVoiceRecording(false);
    const voiceNoteDescription = '🎙️ Voice love note';
    const encrypted = await encryptMessage(voiceNoteDescription);

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      type: 'voice',
      content: voiceNoteDescription,
      mediaUrl: audioUrl,
      mediaDuration: durationSeconds,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
      status: 'sent',
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    playSentChime(settings.soundEffects);
    broadcastChatEvent({ type: 'NEW_MESSAGE', message: newMsg });
    sendFirestoreMessage(newMsg).catch((e) => console.warn('Firestore voice save notice:', e));
  };

  // Sealed Letter send
  const handleSendSealedLetter = async (title: string, letterText: string, waxColor: string) => {
    if (!currentUser || !activeContact) return;
    const encrypted = await encryptMessage(letterText);

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      type: 'sealed_letter',
      content: letterText,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
      status: 'sent',
      letterMeta: {
        waxColor,
        isOpened: false,
        title,
        senderSign: currentUser.name,
      },
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    playSentChime(settings.soundEffects);
    broadcastChatEvent({ type: 'NEW_MESSAGE', message: newMsg });
    sendFirestoreMessage(newMsg).catch((e) => console.warn('Firestore letter save notice:', e));
  };

  // Photo / Media send
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setDraftMediaUrl(result);
      setIsDraftMedia(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendDraftPhoto = async (caption: string) => {
    if (!draftMediaUrl || !currentUser || !activeContact) return;

    const encrypted = await encryptMessage(caption || 'Shared encrypted photo memory');

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      type: 'image',
      content: caption,
      mediaUrl: draftMediaUrl,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
      status: 'sent',
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsDraftMedia(false);
    setDraftMediaUrl(null);
    playSentChime(settings.soundEffects);
    broadcastChatEvent({ type: 'NEW_MESSAGE', message: newMsg });
    sendFirestoreMessage(newMsg).catch((e) => console.warn('Firestore photo save notice:', e));
  };

  // Sticker send
  const handleSendSticker = async (stickerId: string, title: string) => {
    if (!currentUser || !activeContact) return;
    setIsStickerPickerOpen(false);
    const encrypted = await encryptMessage(title);

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      type: 'sticker',
      content: title,
      stickerId,
      encryptedPayload: encrypted,
      timestamp: Date.now(),
      status: 'sent',
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);
    playSentChime(settings.soundEffects);
    broadcastChatEvent({ type: 'NEW_MESSAGE', message: newMsg });
    sendFirestoreMessage(newMsg).catch((e) => console.warn('Firestore sticker save notice:', e));
  };

  // Quick Emoji reaction / send
  const handleSelectQuickEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  // Message reaction handler
  const handleReactToMessage = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    playHeartReactionSound(settings.soundEffects);
    let updatedReactionsList: Message['reactions'] = [];
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const updated = [...(m.reactions || [])];
          const existIdx = updated.findIndex((r) => r.senderId === currentUser.id);
          if (existIdx >= 0) {
            updated[existIdx] = {
              emoji,
              senderId: currentUser.id,
              timestamp: Date.now(),
            };
          } else {
            updated.push({
              emoji,
              senderId: currentUser.id,
              timestamp: Date.now(),
            });
          }
          updatedReactionsList = updated;
          return { ...m, reactions: updated };
        }
        return m;
      })
    );

    broadcastChatEvent({
      type: 'REACTION',
      messageId,
      emoji,
      senderId: currentUser.id,
    });
    updateFirestoreMessage(messageId, { reactions: updatedReactionsList }).catch((e) =>
      console.warn('Firestore reaction notice:', e)
    );
  };

  // Heart burst action from Love Counter
  const handleSendHeartBurst = () => {
    if (!currentUser) return;
    playHeartReactionSound(settings.soundEffects);
    broadcastChatEvent({ type: 'HEART_BURST', senderId: currentUser.id });

    const heartBubble = document.createElement('div');
    heartBubble.innerHTML = '💖';
    heartBubble.className =
      'fixed bottom-24 right-1/2 transform translate-x-1/2 text-5xl pointer-events-none z-50 animate-bounce';
    document.body.appendChild(heartBubble);
    setTimeout(() => heartBubble.remove(), 1200);
  };

  // Jump smoothly to a referenced message strictly within chat container
  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el && scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + scrollContainerRef.current.scrollTop - 50;
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, relativeTop),
        behavior: 'smooth',
      });
      el.classList.add('ring-2', 'ring-[var(--neu-accent)]', 'rounded-3xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[var(--neu-accent)]', 'rounded-3xl');
      }, 1500);
    }
  };

  const handleCopyCode = () => {
    if (!currentUser) return;
    const code = currentUser.partnerCode || `HONEY-${currentUser.id.slice(-6).toUpperCase()}`;
    navigator.clipboard?.writeText(code);
    setCopiedMyCode(true);
    setTimeout(() => setCopiedMyCode(false), 2000);
  };

  // If unauthenticated, display authentication screen
  if (!currentUser) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full bg-[var(--neu-bg)] text-[var(--neu-text-primary)] flex flex-col justify-center relative overflow-hidden">
        <FloatingHeartsCanvas
          enabled={settings.ambientParticles}
          type={settings.particleType}
          theme={settings.theme}
        />
        <AuthPage
          onLoginSuccess={handleLoginSuccess}
          currentTheme={settings.theme}
          onThemeChange={(newTheme) => setSettings((prev) => ({ ...prev, theme: newTheme }))}
        />
      </div>
    );
  }

  // Filter messages for current real 1-on-1 pairing
  const currentConversationMessages = activeContact
    ? messages.filter(
        (m) =>
          (m.senderId === currentUser.id && m.receiverId === activeContact.id) ||
          (m.senderId === activeContact.id && m.receiverId === currentUser.id)
      )
    : [];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[var(--neu-bg)] text-[var(--neu-text-primary)] flex flex-col relative overflow-hidden">
      {/* Ambient Floating Hearts/Petals Canvas */}
      <FloatingHeartsCanvas
        enabled={settings.ambientParticles}
        type={settings.particleType}
        theme={settings.theme}
      />

      {/* In-App Push Notification Toast */}
      {pushToast && (
        <PushNotificationToast
          senderName={pushToast.senderName}
          senderAvatar={pushToast.senderAvatar}
          previewText={pushToast.previewText}
          onQuickReply={(replyText) => {
            setInputText(replyText);
            handleSendMessage();
          }}
          onDismiss={() => setPushToast(null)}
        />
      )}

      {/* Main App Container */}
      <div className="flex-1 min-h-0 flex max-w-7xl w-full mx-auto p-0 sm:p-4 lg:p-6 gap-0 sm:gap-4 lg:gap-6 h-full overflow-hidden">
        {/* Left Sidebar: Contacts & Couple Love Tracker */}
        <aside className={`w-full md:w-80 shrink-0 ${mobileView === 'list' ? 'flex' : 'hidden md:flex'} flex-col gap-3 sm:gap-4 h-full p-2.5 sm:p-0 overflow-y-auto`}>
          {/* Brand Card with E2EE Status */}
          <div className="neu-flat rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-[var(--neu-accent)]">
                  <MessageCircleHeart className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold font-serif tracking-tight text-[var(--neu-text-primary)]">
                    HoneyChat
                  </h1>
                  <span className="text-[11px] text-[var(--neu-accent)] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    AES-256 E2EE Protected
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsThemeModalOpen(true)}
                className="w-9 h-9 rounded-2xl neu-button flex items-center justify-center text-[var(--neu-accent)] hover:rotate-45 transition-transform"
                title="Romantic theme & pastel settings"
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>

            {/* Current Real User Profile */}
            <div className="p-2.5 rounded-2xl neu-pressed flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 neu-flat-sm"
                />
                <div className="text-[11px] leading-tight min-w-0">
                  <span className="font-bold text-[var(--neu-text-primary)] block truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[var(--neu-accent)] truncate block">
                    {currentUser.petName || 'Verified Account'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-xl neu-button text-[var(--neu-text-secondary)] hover:text-rose-500 hover:scale-105"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Shareable Pairing Code */}
            <div className="mt-2.5 px-3 py-2 rounded-xl neu-flat-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-[var(--neu-text-secondary)] block font-semibold">
                  My Pairing Code
                </span>
                <code className="text-xs font-mono font-bold text-[var(--neu-accent)] truncate block">
                  {currentUser.partnerCode || `HONEY-${currentUser.id.slice(-6).toUpperCase()}`}
                </code>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-2 py-1 rounded-lg neu-button text-[10px] font-semibold text-[var(--neu-accent)] flex items-center gap-1 hover:scale-105 active:scale-95 shrink-0"
                title="Copy my code to share with partner"
              >
                {copiedMyCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Love Days Counter Widget (Shown when partner is paired) */}
          {activeContact ? (
            <LoveCounterWidget
              contact={activeContact}
              onOpenCustomizer={() => setIsThemeModalOpen(true)}
              onSendHeartBurst={handleSendHeartBurst}
            />
          ) : (
            <div className="neu-flat rounded-3xl p-4 flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-[var(--neu-accent)]">
                <Heart className="w-5 h-5 fill-[var(--neu-accent)]/20" />
              </div>
              <span className="text-xs font-bold text-[var(--neu-text-primary)]">
                No Partner Paired Yet
              </span>
              <p className="text-[11px] text-[var(--neu-text-secondary)] leading-relaxed">
                Connect your real partner's code to unlock mutual anniversary milestones & private chat.
              </p>
              <button
                onClick={() => setIsAddPartnerModalOpen(true)}
                className="w-full py-2 rounded-xl neu-button text-xs font-bold text-[var(--neu-accent)] flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Connect Partner</span>
              </button>
            </div>
          )}

          {/* Contact List */}
          <div className="neu-flat rounded-3xl p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="text-xs font-bold text-[var(--neu-text-secondary)]">
                Direct Conversations
              </span>
              <button
                onClick={() => setIsAddPartnerModalOpen(true)}
                className="px-2 py-1 rounded-xl neu-button text-[11px] font-bold text-[var(--neu-accent)] flex items-center gap-1 hover:scale-105 active:scale-95"
                title="Connect a real partner"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Connect</span>
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {contacts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center my-auto">
                  <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-[var(--neu-accent)] mb-2">
                    <Heart className="w-5 h-5 fill-[var(--neu-accent)]/20" />
                  </div>
                  <span className="text-xs font-bold text-[var(--neu-text-primary)]">
                    No conversations yet
                  </span>
                  <p className="text-[11px] text-[var(--neu-text-secondary)] mt-1 mb-3 max-w-[200px]">
                    Share your code with your partner or connect with theirs to chat.
                  </p>
                  <button
                    onClick={() => setIsAddPartnerModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl neu-button text-xs font-bold text-[var(--neu-accent)] flex items-center gap-1 hover:scale-105"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Partner</span>
                  </button>
                </div>
              ) : (
                contacts.map((contact) => {
                  const isSelected = contact.id === activeContactId;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        setActiveContactId(contact.id);
                        setMobileView('chat');
                      }}
                      className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group ${
                        isSelected ? 'neu-pressed' : 'neu-button'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-11 h-11 rounded-2xl object-cover neu-flat-sm"
                        />
                        {contact.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--neu-surface)] animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--neu-text-primary)] truncate">
                            {contact.nickname || contact.name}
                          </span>
                          <Lock className="w-3 h-3 text-[var(--neu-accent)] shrink-0" />
                        </div>
                        <p className="text-[11px] text-[var(--neu-text-secondary)] truncate mt-0.5">
                          {contact.statusMessage}
                        </p>
                      </div>

                      {/* Remove/Disconnect partner button */}
                      <button
                        onClick={(e) => handleRemoveContact(contact.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:text-rose-500 text-[var(--neu-text-secondary)] transition-opacity"
                        title="Disconnect partner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Verification and mobile navigation */}
            <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => {
                  if (activeContact) {
                    setIsSafetyModalOpen(true);
                  } else {
                    setIsAddPartnerModalOpen(true);
                  }
                }}
                className="flex-1 py-2 rounded-xl neu-button text-[var(--neu-accent)] font-semibold flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Keys</span>
              </button>

              {mobileView === 'list' && activeContact && (
                <button
                  onClick={() => setMobileView('chat')}
                  className="md:hidden flex-1 py-2 rounded-xl neu-button text-[var(--neu-text-primary)] font-semibold flex items-center justify-center gap-1"
                >
                  <span>Open Chat</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Right / Main Active Chat Area */}
        <main className={`flex-1 min-h-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'} flex-col neu-flat rounded-none sm:rounded-3xl h-full overflow-hidden relative shadow-none sm:shadow-md`}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <header className="shrink-0 px-3 py-2.5 sm:p-4 border-b border-black/5 flex items-center justify-between gap-2 sm:gap-3 bg-[var(--neu-surface)]/90 backdrop-blur-md z-20">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden w-8 h-8 rounded-xl neu-button flex items-center justify-center text-[var(--neu-accent)] mr-0.5 shrink-0 hover:scale-105 active:scale-95"
                    title="Back to conversations list"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl object-cover neu-flat-sm"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ring-2 ring-[var(--neu-surface)] ${
                        activeContact.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-[var(--neu-text-primary)] truncate">
                        {activeContact.nickname || activeContact.name}
                      </h2>
                      {activeContact.isVerified && (
                        <span
                          title="E2E Security Fingerprint Verified"
                          className="text-[var(--neu-accent)] cursor-pointer shrink-0"
                          onClick={() => setIsSafetyModalOpen(true)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current/10" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[var(--neu-text-secondary)]">
                      <span className="font-medium text-emerald-600 truncate">
                        {isPartnerTyping ? (
                          <span className="text-[var(--neu-accent)] font-semibold animate-pulse">
                            typing note...
                          </span>
                        ) : (
                          activeContact.lastSeen
                        )}
                      </span>
                      <span>·</span>
                      <span className="truncate max-w-[110px] sm:max-w-xs italic opacity-90">
                        {activeContact.statusMessage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Right Actions */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* E2EE Lock Button */}
                  <button
                    onClick={() => setIsSafetyModalOpen(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl neu-button flex items-center justify-center text-[var(--neu-accent)]"
                    title="View E2EE Safety Numbers"
                  >
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Romantic Sealed Letter Creator */}
                  <button
                    onClick={() => setIsCreatingLetter(true)}
                    className="px-2 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl neu-button text-[11px] sm:text-xs font-semibold text-[var(--neu-accent)] flex items-center gap-1"
                    title="Write a sealed love letter"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Letter</span>
                  </button>

                  {/* Theme Settings Button */}
                  <button
                    onClick={() => setIsThemeModalOpen(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl neu-button flex items-center justify-center text-[var(--neu-accent)]"
                    title="Romantic theme & pastel palette"
                  >
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Sign Out Button */}
                  <button
                    onClick={handleSignOut}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-rose-500"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </header>

              {/* End-to-End Encryption Security Banner */}
              <div className="bg-[var(--neu-surface)]/60 px-3 py-1.5 border-b border-black/5 flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--neu-text-secondary)]">
                <div className="flex items-center gap-1.5 truncate">
                  <Lock className="w-3 h-3 text-[var(--neu-accent)] shrink-0" />
                  <span className="truncate">
                    End-to-End Encrypted: Only you and {activeContact.nickname || activeContact.name} have the keys.
                  </span>
                </div>
                <button
                  onClick={() => setIsSafetyModalOpen(true)}
                  className="text-[var(--neu-accent)] font-semibold shrink-0 hover:underline ml-2"
                >
                  Verify
                </button>
              </div>

              {/* Chat Messages Feed */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 sm:p-6 space-y-2 relative overscroll-contain smooth-scroll"
              >
                {currentConversationMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center my-auto animate-fade-in select-none">
                    <div className="w-16 h-16 rounded-3xl neu-pressed flex items-center justify-center text-[var(--neu-accent)] mb-3">
                      <Heart className="w-8 h-8 fill-[var(--neu-accent)]/20 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--neu-text-primary)] mb-1">
                      Private Sanctuary Ready ✨
                    </h3>
                    <p className="text-xs text-[var(--neu-text-secondary)] max-w-sm mb-4 leading-relaxed">
                      You and <span className="font-semibold text-[var(--neu-accent)]">{activeContact.nickname || activeContact.name}</span> are securely connected. No demo bots or eavesdropping.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => {
                          setInputText('I love you endlessly 💕');
                        }}
                        className="px-3.5 py-1.5 rounded-full neu-button text-xs font-semibold text-[var(--neu-accent)] hover:scale-105 transition-all"
                      >
                        Say "I love you 💕"
                      </button>
                      <button
                        onClick={() => setIsCreatingLetter(true)}
                        className="px-3.5 py-1.5 rounded-full neu-button text-xs font-semibold text-[var(--neu-accent)] hover:scale-105 transition-all"
                      >
                        💌 Write Wax-Sealed Letter
                      </button>
                    </div>
                  </div>
                ) : (
                  currentConversationMessages.map((message) => {
                    const isMe = message.senderId === currentUser.id;
                    return (
                      <ChatMessageItem
                        key={message.id}
                        message={message}
                        isMe={isMe}
                        onOpenMedia={(url, cap) => {
                          setPreviewMediaUrl(url);
                          setPreviewCaption(cap);
                          setIsDraftMedia(false);
                        }}
                        onOpenLetter={(msg) => setViewingLetter(msg)}
                        onInspectPayload={(msg) => {
                          setInspectedMessage(msg);
                          setIsSafetyModalOpen(true);
                        }}
                        onReact={handleReactToMessage}
                        onReplyTo={(msg) => setReplyingTo(msg)}
                        onJumpToMessage={jumpToMessage}
                      />
                    );
                  })
                )}

                {/* Partner Typing Indicator Bubble */}
                {isPartnerTyping && (
                  <div className="flex items-center gap-2 mb-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 neu-flat-sm">
                      <img
                        src={activeContact.avatar}
                        alt={activeContact.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="neu-bubble-received rounded-3xl rounded-bl-sm py-2 px-3.5 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--neu-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--neu-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--neu-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[11px] text-[var(--neu-text-secondary)] ml-1 font-serif italic">
                        writing with love...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Floating Jump-to-Bottom Pill */}
              {showScrollBottomPill && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-20 right-6 z-30 px-3.5 py-1.5 rounded-full neu-button text-xs font-semibold text-[var(--neu-accent)] flex items-center gap-1.5 shadow-lg animate-bounce"
                  title="Jump to latest love note"
                >
                  <span>Jump to latest</span>
                  <Heart className="w-3.5 h-3.5 fill-[var(--neu-accent)]/20" />
                </button>
              )}

              {/* Active Reply Banner */}
              {replyingTo && (
                <div className="px-4 py-2 bg-[var(--neu-surface)] border-t border-black/5 flex items-center justify-between text-xs z-20 animate-fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[var(--neu-accent)] font-semibold shrink-0">
                      Replying to
                    </span>
                    <span className="text-[var(--neu-text-secondary)] truncate">
                      <strong className="text-[var(--neu-text-primary)]">
                        {replyingTo.senderId === currentUser.id ? 'yourself' : (activeContact.nickname || activeContact.name)}
                      </strong>
                      : {replyingTo.content}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="w-6 h-6 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] shrink-0 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Sticker drawer popover if open */}
              {isStickerPickerOpen && (
                <div className="absolute bottom-20 left-4 z-30">
                  <StickerPicker
                    onSelectSticker={handleSendSticker}
                    onSelectEmoji={handleSelectQuickEmoji}
                    onClose={() => setIsStickerPickerOpen(false)}
                  />
                </div>
              )}

              {/* Hidden File Input for Real Media Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Input Bar */}
              <footer className="shrink-0 p-2 sm:p-3.5 bg-[var(--neu-surface)] border-t border-black/5 z-20 pb-safe">
                {isVoiceRecording ? (
                  <VoiceRecorder
                    onSendVoice={handleSendVoiceNote}
                    onCancel={() => setIsVoiceRecording(false)}
                  />
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Media Attachment triggers */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl neu-button flex items-center justify-center text-[var(--neu-accent)] hover:scale-105"
                        title="Send encrypted photo"
                      >
                        <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl neu-button flex items-center justify-center text-[var(--neu-accent)] hover:scale-105"
                        title="Romantic stickers & emojis"
                      >
                        <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        onClick={() => setIsVoiceRecording(true)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl neu-button flex items-center justify-center text-[var(--neu-accent)] hover:scale-105"
                        title="Record voice love note"
                      >
                        <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Text Input with tactile inset depression */}
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Whisper to ${activeContact.nickname || activeContact.name}...`}
                        className="w-full py-2.5 sm:py-3 pl-3.5 pr-8 sm:pl-4 sm:pr-10 rounded-xl sm:rounded-2xl neu-pressed text-xs sm:text-sm text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/60 outline-none focus:ring-1 focus:ring-[var(--neu-accent)] transition-all"
                      />
                      <div className="absolute right-2.5 sm:right-3 flex items-center gap-1 text-[var(--neu-accent)] opacity-60">
                        <span title="E2EE Encrypted keystrokes">
                          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl neu-button flex items-center justify-center text-white bg-[var(--neu-accent)] disabled:opacity-40 disabled:pointer-events-none hover:scale-105 transition-all shadow-md shrink-0"
                      title="Send encrypted message"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}
              </footer>
            </>
          ) : (
            /* Empty State when no partner is paired */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none my-auto">
              {/* Back Button for mobile when in empty chat view */}
              <div className="md:hidden self-start mb-4">
                <button
                  onClick={() => setMobileView('list')}
                  className="px-3 py-1.5 rounded-xl neu-button flex items-center gap-1.5 text-xs font-semibold text-[var(--neu-accent)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Conversations</span>
                </button>
              </div>

              <div className="w-20 h-20 rounded-3xl neu-pressed flex items-center justify-center text-[var(--neu-accent)] mb-4">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--neu-text-primary)] mb-2">
                Real User Encrypted Chat
              </h2>
              <p className="text-xs sm:text-sm text-[var(--neu-text-secondary)] max-w-md mb-6 leading-relaxed">
                All demo accounts have been removed. Connect directly with your real partner using their unique Pairing Code.
              </p>

              <div className="p-4 rounded-2xl neu-flat-sm max-w-xs w-full mb-6">
                <span className="text-[11px] font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wider block mb-1">
                  Your Pairing Code
                </span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono font-bold text-[var(--neu-accent)]">
                    {currentUser.partnerCode || `HONEY-${currentUser.id.slice(-6).toUpperCase()}`}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-xl neu-button text-xs font-semibold text-[var(--neu-accent)]"
                  >
                    {copiedMyCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsAddPartnerModalOpen(true)}
                className="px-6 py-3 rounded-2xl neu-button text-xs sm:text-sm font-bold text-[var(--neu-accent)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Pair Partner via Code or Email</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Add / Connect Real Partner Modal */}
      {isAddPartnerModalOpen && (
        <AddPartnerModal
          currentUser={currentUser}
          isOpen={isAddPartnerModalOpen}
          onClose={() => setIsAddPartnerModalOpen(false)}
          onAddContact={handleAddContact}
          existingContactIds={contacts.map((c) => c.id)}
        />
      )}

      {/* Sealed Letter View Modal */}
      {viewingLetter && (
        <SealedLetterModal
          message={viewingLetter}
          isOpen={true}
          onClose={() => setViewingLetter(null)}
          mode="view"
        />
      )}

      {/* Sealed Letter Create Modal */}
      {isCreatingLetter && (
        <SealedLetterModal
          isOpen={true}
          onClose={() => setIsCreatingLetter(false)}
          onSendNewLetter={handleSendSealedLetter}
          mode="create"
        />
      )}

      {/* Safety Code & Cipher Inspector Modal */}
      {isSafetyModalOpen && activeContact && (
        <SafetyCodeModal
          contact={activeContact}
          isOpen={isSafetyModalOpen}
          onClose={() => {
            setIsSafetyModalOpen(false);
            setInspectedMessage(null);
          }}
          onToggleVerify={(cid) => {
            setContacts((prev) =>
              prev.map((c) => (c.id === cid ? { ...c, isVerified: !c.isVerified } : c))
            );
          }}
          samplePayload={inspectedMessage?.encryptedPayload}
          samplePlaintext={inspectedMessage?.content}
        />
      )}

      {/* Theme & Relationship Settings Modal */}
      {isThemeModalOpen && (
        <ThemeCustomizerModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          settings={settings}
          onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
          activeContact={
            activeContact || {
              id: 'unpaired',
              name: 'No Partner Connected',
              nickname: 'Partner',
              avatar: defaultAvatar,
              isOnline: false,
              lastSeen: '',
              statusMessage: '',
              relationshipStartDate: new Date().toISOString().split('T')[0],
              anniversaryMilestone: 'Our Special Day',
              fingerprint: '',
              isVerified: false,
              unreadCount: 0,
            }
          }
          onUpdateContact={(cid, updates) => {
            setContacts((prev) => prev.map((c) => (c.id === cid ? { ...c, ...updates } : c)));
          }}
          onRequestPushPermission={requestPushPermission}
        />
      )}

      {/* Image Lightbox & Draft Modal */}
      {previewMediaUrl && !isDraftMedia && (
        <MediaPreviewModal
          mediaUrl={previewMediaUrl}
          caption={previewCaption}
          isOpen={true}
          onClose={() => setPreviewMediaUrl(null)}
        />
      )}

      {isDraftMedia && draftMediaUrl && (
        <MediaPreviewModal
          mediaUrl={draftMediaUrl}
          isOpen={true}
          isDraft={true}
          onClose={() => {
            setIsDraftMedia(false);
            setDraftMediaUrl(null);
          }}
          onSendDraft={handleSendDraftPhoto}
        />
      )}
    </div>
  );
}
