import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl?: string;
  durationSeconds?: number;
  isMe: boolean;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  durationSeconds = 6,
  isMe,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Play real audio if valid source
      if (audioRef.current && audioUrl && audioUrl.startsWith('blob:')) {
        audioRef.current.play().catch(() => {});
      }

      // Smooth progress animation
      const totalSteps = durationSeconds * 20;
      let currentStep = progress * totalSteps;

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        currentStep++;
        const nextProgress = currentStep / totalSteps;
        if (nextProgress >= 1) {
          setProgress(0);
          setIsPlaying(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setProgress(nextProgress);
        }
      }, 50);
    }
  };

  const formatSeconds = (sec: number) => {
    const s = Math.round(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const currentSeconds = progress * durationSeconds;

  // Waveform bars height variation
  const waveformBars = [30, 60, 45, 90, 75, 40, 85, 95, 60, 40, 80, 50, 70, 40, 60];

  return (
    <div className="flex items-center gap-3 py-1 px-1">
      {audioUrl && audioUrl.startsWith('blob:') && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }}
        />
      )}

      {/* Play/Pause round button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isMe
            ? 'bg-white/80 shadow-md text-[var(--neu-accent)]'
            : 'neu-button text-[var(--neu-accent)]'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Duration */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-1 h-6">
          {waveformBars.map((height, idx) => {
            const barFraction = idx / waveformBars.length;
            const isPlayed = progress >= barFraction;
            return (
              <div
                key={idx}
                className="w-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${height}%`,
                  backgroundColor: isPlayed
                    ? 'var(--neu-accent)'
                    : isMe
                    ? 'rgba(0,0,0,0.15)'
                    : 'var(--neu-shadow-dark)',
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
          <span>{formatSeconds(currentSeconds)}</span>
          <span>{formatSeconds(durationSeconds)}</span>
        </div>
      </div>
    </div>
  );
};
