// Web Audio API romantic sound synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSentChime(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
  osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

export function playReceivedChime(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Sweet soft dual chime
  [659.25, 880.0].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = i * 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + delay);

    gain.gain.setValueAtTime(0.09, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.4);
  });
}

export function playHeartReactionSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now); // A4
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

export function playWaxSealCrack(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Paper / wax crack sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.18);
}
