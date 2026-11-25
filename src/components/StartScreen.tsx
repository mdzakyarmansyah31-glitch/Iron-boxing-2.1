import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../engine/audio';

interface StartScreenProps {
  muted: boolean;
  onToggleMute: () => void;
  onEnterMenu: () => void;
  blockInput?: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  muted,
  onToggleMute,
  onEnterMenu,
  blockInput = false,
}) => {
  useEffect(() => {
    if (blockInput) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (
        e.key === 'Shift' ||
        e.key === 'Control' ||
        e.key === 'Alt' ||
        e.key === 'Meta'
      ) {
        return;
      }
      e.preventDefault();
      soundEngine.unlock();
      soundEngine.playBell(1);
      onEnterMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnterMenu, blockInput]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Press any button to enter menu"
      onClick={() => {
        if (blockInput) return;
        soundEngine.unlock();
        soundEngine.playBell(1);
        onEnterMenu();
      }}
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 lg:p-10 cursor-pointer select-none overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at center, rgba(9, 11, 16, 0.14) 0%, rgba(9, 11, 16, 0.45) 48%, rgba(5, 6, 10, 0.92) 100%)',
      }}
    >
      {/* Concentric Golden Championship Ring Crest (Framed openly over live 3D boxing match) */}
      <svg
        viewBox="0 0 1000 1000"
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[115vmin] h-[115vmin] opacity-50"
      >
        <defs>
          <radialGradient id="goldRingGrad" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#d49b35" stopOpacity="0.12" />
            <stop offset="82%" stopColor="#f0b84b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7a5113" stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* Outer geometric championship dial */}
        <circle
          cx="500"
          cy="500"
          r="465"
          fill="none"
          stroke="url(#goldRingGrad)"
          strokeWidth="3"
        />
        <circle
          cx="500"
          cy="500"
          r="418"
          fill="none"
          stroke="#c98e2c"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeDasharray="18 12"
        />
        <circle
          cx="500"
          cy="500"
          r="352"
          fill="none"
          stroke="#e5a93c"
          strokeOpacity="0.5"
          strokeWidth="2.5"
        />
        <circle
          cx="500"
          cy="500"
          r="286"
          fill="none"
          stroke="#b87e22"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <circle
          cx="500"
          cy="500"
          r="224"
          fill="none"
          stroke="#e5a93c"
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeDasharray="6 10"
        />

        {/* 16 radial championship notch markers */}
        {Array.from({ length: 16 }).map((_, idx) => {
          const deg = idx * 22.5;
          return (
            <g key={idx} transform={`rotate(${deg} 500 500)`}>
              <rect
                x="491"
                y="46"
                width="18"
                height="26"
                rx="2"
                fill="none"
                stroke="#e5a93c"
                strokeOpacity="0.55"
                strokeWidth="2"
              />
              <line
                x1="500"
                y1="148"
                x2="500"
                y2="212"
                stroke="#d49b35"
                strokeOpacity="0.38"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>

      {/* Top Subtle Mute Control */}
      <div className="relative z-10 flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.unlock();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/55 border border-white/15 text-slate-200 hover:text-white hover:border-white/30 text-xs font-medium transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Center Championship Emblem & Title Lockup (Inspired by UFC 5 Start Screen) */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Left Circular Medallion */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full bg-slate-100 text-slate-950 flex flex-col items-center justify-center shadow-[0_10px_38px_rgba(0,0,0,0.85)] border-2 border-amber-400/75 shrink-0">
            <span className="font-display italic font-black text-xl sm:text-2xl lg:text-4xl leading-none tracking-tight">
              IRON
            </span>
            <span className="font-display font-extrabold text-[9px] sm:text-[11px] lg:text-xs tracking-[0.22em] text-slate-800 mt-0.5">
              RING
            </span>
          </div>

          {/* Right Heavyweight Italic Title + Distressed Gold Crest Lockup */}
          <div className="flex flex-col items-start">
            <div className="flex items-baseline gap-2 sm:gap-3">
              <h1 className="font-display italic font-black text-4xl sm:text-6xl lg:text-8xl tracking-tight text-white leading-none drop-shadow-[0_6px_26px_rgba(0,0,0,0.95)]">
                IRON RING
              </h1>
              <svg
                viewBox="0 0 88 70"
                aria-hidden="true"
                className="w-11 h-10 sm:w-16 sm:h-14 lg:w-22 lg:h-18 shrink-0 drop-shadow-[0_6px_20px_rgba(0,0,0,0.95)]"
              >
                <defs>
                  <mask id="distressedCrest">
                    <rect width="88" height="70" fill="white" />
                    <polygon points="0,18 36,22 14,27" fill="black" />
                    <polygon points="48,42 88,34 62,48" fill="black" />
                    <polygon points="18,56 58,60 32,64" fill="black" />
                  </mask>
                </defs>
                <text
                  x="4"
                  y="59"
                  fill="#e5a93c"
                  fontFamily="Barlow Condensed, sans-serif"
                  fontStyle="italic"
                  fontWeight="900"
                  fontSize="58"
                  mask="url(#distressedCrest)"
                >
                  3D
                </text>
              </svg>
            </div>

            <div className="mt-1.5 sm:mt-3 w-full flex items-center justify-center sm:justify-start">
              <span className="text-[11px] sm:text-sm font-semibold tracking-[0.34em] text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                PRESS ANY BUTTON
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Quiet Copyright & Live Ring Attribution */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 tracking-wide">
        <span>IRON RING CHAMPIONSHIP BOXING</span>
        <span className="hidden sm:inline text-slate-500">Tap or press any key to enter</span>
      </div>
    </div>
  );
};
