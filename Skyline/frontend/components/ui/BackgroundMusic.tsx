'use client';

import { useEffect, useRef, useState } from 'react';

// Tracks served from /public/tracks/
const TRACKS = [
  '/tracks/Soft Corners of the Day.mp3',
  '/tracks/Soft Corners of the Day (1).mp3',
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  // Shuffle on mount
  useEffect(() => {
    setPlaylist(shuffleArray(TRACKS));
  }, []);

  // Start playback after first user interaction (browser autoplay policy)
  useEffect(() => {
    const startOnInteraction = () => {
      setStarted(true);
      window.removeEventListener('click', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      window.removeEventListener('pointerdown', startOnInteraction);
    };
    window.addEventListener('click', startOnInteraction);
    window.addEventListener('keydown', startOnInteraction);
    window.addEventListener('pointerdown', startOnInteraction);
    return () => {
      window.removeEventListener('click', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      window.removeEventListener('pointerdown', startOnInteraction);
    };
  }, []);

  // Play current track
  useEffect(() => {
    if (!started || playlist.length === 0) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = playlist[currentIndex];
    audio.volume = 0.35;
    audio.play().catch(() => {});
  }, [started, currentIndex, playlist]);

  // On track end → play next (loop back to start with reshuffle)
  const handleEnded = () => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reshuffle and restart
      setPlaylist(shuffleArray(TRACKS));
      setCurrentIndex(0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <>
      <audio ref={audioRef} onEnded={handleEnded} />
      {/* Mute/unmute button — bottom-right */}
      <button
        onClick={toggleMute}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          transition: 'all 0.2s',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
        title={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? '🔇' : '🎵'}
      </button>
    </>
  );
};
