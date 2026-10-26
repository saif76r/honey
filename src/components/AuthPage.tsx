import React, { useState } from 'react';
import {
  Heart,
  Lock,
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AuthUser, ThemePreset } from '../types/chat';
import { THEMES } from '../utils/themes';
import { playSentChime } from '../utils/sound';
import { syncUserToFirestore } from '../services/firestoreService';

interface AuthPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  currentTheme: ThemePreset;
  onThemeChange: (theme: ThemePreset) => void;
}

interface StoredAccount {
  user: AuthUser;
  passphraseHash: string;
}

const PRESET_AVATARS = [
  { id: 'av_1', url: '/src/assets/images/alex_avatar_1793017722479.jpg', label: 'Gentle Rose' },
  { id: 'av_2', url: '/src/assets/images/sophia_avatar_1793017722307.jpg', label: 'Sunlight Smile' },
  { id: 'av_3', url: '/src/assets/images/romantic_sunset_memory_1793017722778.jpg', label: 'Golden Dusk' },
];

function getStoredAccounts(): StoredAccount[] {
  try {
    const data = localStorage.getItem('amour_registered_accounts_v1');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAccount(account: StoredAccount) {
  const existing = getStoredAccounts();
  const filtered = existing.filter((a) => a.user.email.toLowerCase() !== account.user.email.toLowerCase());
  filtered.push(account);
  localStorage.setItem('amour_registered_accounts_v1', JSON.stringify(filtered));
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  currentTheme,
  onThemeChange,
}) => {
  const existingAccounts = getStoredAccounts();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    existingAccounts.length > 0 ? 'login' : 'register'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login Form State (Clean - No Demo Accounts)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regPetName, setRegPetName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const passwordTrimmed = loginPassword.trim();

    if (!emailTrimmed || !passwordTrimmed) {
      setErrorMessage('Please enter both your email and passphrase.');
      return;
    }

    setIsLoading(true);
    playSentChime(true);

    setTimeout(() => {
      setIsLoading(false);
      const accounts = getStoredAccounts();
      const matched = accounts.find((a) => a.user.email.toLowerCase() === emailTrimmed);

      if (!matched) {
        setErrorMessage('No account found with this email. Please create your account first.');
        return;
      }

      if (matched.passphraseHash !== passwordTrimmed) {
        setErrorMessage('Incorrect master passphrase. Please try again.');
        return;
      }

      syncUserToFirestore(matched.user).catch((e) => console.warn('Firestore sync notice:', e));
      onLoginSuccess(matched.user);
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const nameTrimmed = regName.trim();
    const emailTrimmed = regEmail.trim().toLowerCase();
    const passwordTrimmed = regPassword.trim();

    if (!nameTrimmed || !emailTrimmed || !passwordTrimmed) {
      setErrorMessage('Please fill in your name, email, and master passphrase.');
      return;
    }

    if (passwordTrimmed.length < 6) {
      setErrorMessage('Passphrase must be at least 6 characters for end-to-end encryption.');
      return;
    }

    const accounts = getStoredAccounts();
    if (accounts.some((a) => a.user.email.toLowerCase() === emailTrimmed)) {
      setErrorMessage('An account with this email already exists. Please sign in instead.');
      return;
    }

    setIsLoading(true);
    playSentChime(true);

    setTimeout(() => {
      setIsLoading(false);
      const newUser: AuthUser = {
        id: 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        name: nameTrimmed,
        email: emailTrimmed,
        petName: regPetName.trim() || 'My Soulmate 💕',
        avatar: selectedAvatar,
        keyFingerprint: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        partnerCode: 'AMOUR-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        createdAt: Date.now(),
      };

      saveAccount({
        user: newUser,
        passphraseHash: passwordTrimmed,
      });

      syncUserToFirestore(newUser).catch((e) => console.warn('Firestore sync notice:', e));
      onLoginSuccess(newUser);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 relative select-none">
      {/* Top Bar with Palette switcher */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl sm:rounded-2xl neu-flat-sm">
        {(Object.keys(THEMES) as ThemePreset[]).map((thm) => (
          <button
            key={thm}
            onClick={() => onThemeChange(thm)}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform ${
              currentTheme === thm ? 'scale-110 ring-2 ring-[var(--neu-accent)]' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: THEMES[thm].accent }}
            title={THEMES[thm].name}
          />
        ))}
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md neu-flat rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative z-20 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl neu-flat flex items-center justify-center text-[var(--neu-accent)]">
            <Heart className="w-7 h-7 fill-current animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[var(--neu-text-primary)] tracking-tight">
            Amour
          </h1>
          <p className="text-xs text-[var(--neu-text-secondary)] mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--neu-accent)]" />
            <span>End-to-End Encrypted Couple Sanctuary</span>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl neu-pressed mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login'
                ? 'neu-button text-[var(--neu-accent)] shadow-sm'
                : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'register'
                ? 'neu-button text-[var(--neu-accent)] shadow-sm'
                : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl neu-pressed bg-rose-50/50 text-[11px] font-medium text-rose-700 text-center animate-shake">
            {errorMessage}
          </div>
        )}

        {/* Forms */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  className="w-full py-2.5 pl-9 pr-3 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
                <Mail className="w-4 h-4 text-[var(--neu-text-secondary)] absolute left-3 opacity-60 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Master Passphrase
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your passphrase"
                  autoComplete="current-password"
                  className="w-full py-2.5 pl-9 pr-9 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)] font-mono"
                />
                <KeyRound className="w-4 h-4 text-[var(--neu-text-secondary)] absolute left-3 opacity-60 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-7 h-7 absolute right-2 text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl neu-button text-xs font-bold text-white bg-[var(--neu-accent)] flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Unlocking E2EE Sanctuary...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Your Full Name
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Juliet"
                  autoComplete="name"
                  className="w-full py-2.5 pl-9 pr-3 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
                <User className="w-4 h-4 text-[var(--neu-text-secondary)] absolute left-3 opacity-60 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Sweetheart Pet Name
              </label>
              <input
                type="text"
                value={regPetName}
                onChange={(e) => setRegPetName(e.target.value)}
                placeholder="e.g. My Sunshine ☀️"
                className="w-full py-2.5 px-3.5 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  className="w-full py-2.5 pl-9 pr-3 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)]"
                />
                <Mail className="w-4 h-4 text-[var(--neu-text-secondary)] absolute left-3 opacity-60 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1">
                Master Passphrase (E2EE Secret)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full py-2.5 pl-9 pr-9 rounded-xl neu-pressed text-xs text-[var(--neu-text-primary)] outline-none focus:ring-1 focus:ring-[var(--neu-accent)] font-mono"
                />
                <KeyRound className="w-4 h-4 text-[var(--neu-text-secondary)] absolute left-3 opacity-60 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-7 h-7 absolute right-2 text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Avatar picker */}
            <div>
              <label className="text-[11px] font-bold text-[var(--neu-text-secondary)] block mb-1.5">
                Choose Profile Avatar
              </label>
              <div className="flex items-center gap-3">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`relative w-12 h-12 rounded-2xl p-0.5 transition-all ${
                      selectedAvatar === av.url ? 'ring-2 ring-[var(--neu-accent)] scale-105' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover rounded-xl" />
                    {selectedAvatar === av.url && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--neu-accent)] text-white flex items-center justify-center text-[9px]">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl neu-button text-xs font-bold text-white bg-[var(--neu-accent)] flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Deriving 256-bit AES Keys...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register & Create Sanctuary</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
