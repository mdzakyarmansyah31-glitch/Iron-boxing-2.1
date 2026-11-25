import React from 'react';
import { BeardStyle, HairStyle } from '../types/game';

interface FighterPortraitProps {
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  beardStyle: BeardStyle;
  trunksColor?: string;
  className?: string;
}

function renderHairPath(style: HairStyle, color: string) {
  switch (style) {
    case 'bald':
      return null;
    case 'buzz':
      return (
        <path
          d="M 27 37 C 27 21, 73 21, 73 37 C 70 30, 30 30, 27 37 Z"
          fill={color}
          opacity="0.92"
        />
      );
    case 'fade':
      return (
        <path
          d="M 26 39 C 26 18, 74 18, 74 39 L 70 32 C 60 27, 40 27, 30 32 Z"
          fill={color}
        />
      );
    case 'slick':
      return (
        <path
          d="M 26 40 C 24 15, 76 15, 74 40 L 70 31 C 58 24, 42 24, 30 31 Z"
          fill={color}
        />
      );
    case 'mohawk':
      return (
        <path
          d="M 43 31 L 41 11 L 50 7 L 59 11 L 57 31 Z"
          fill={color}
        />
      );
    case 'high_top':
      return (
        <path
          d="M 31 35 L 30 10 L 70 10 L 69 35 C 60 30, 40 30, 31 35 Z"
          fill={color}
        />
      );
    case 'dreadlocks':
      return (
        <g fill={color}>
          <path d="M 24 38 C 24 17, 76 17, 76 38 L 72 32 C 58 26, 42 26, 28 32 Z" />
          <rect x="20" y="34" width="6" height="36" rx="3" />
          <rect x="26" y="32" width="5" height="34" rx="2.5" />
          <rect x="69" y="32" width="5" height="34" rx="2.5" />
          <rect x="74" y="34" width="6" height="36" rx="3" />
        </g>
      );
    case 'cornrows':
      return (
        <g fill={color}>
          <path d="M 27 37 C 27 19, 73 19, 73 37 L 69 32 C 58 28, 42 28, 31 32 Z" />
          <line x1="36" y1="22" x2="34" y2="33" stroke="#000000" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="45" y1="20" x2="45" y2="31" stroke="#000000" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="55" y1="20" x2="55" y2="31" stroke="#000000" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="64" y1="22" x2="66" y2="33" stroke="#000000" strokeOpacity="0.45" strokeWidth="2" />
        </g>
      );
    case 'afro':
      return (
        <circle cx="50" cy="31" r="29" fill={color} />
      );
    case 'pompadour':
      return (
        <path
          d="M 27 39 C 24 18, 42 8, 63 14 C 75 18, 76 30, 72 38 C 61 29, 39 29, 27 39 Z"
          fill={color}
        />
      );
    case 'curly_top':
      return (
        <g fill={color}>
          <circle cx="35" cy="24" r="9" />
          <circle cx="46" cy="20" r="10" />
          <circle cx="57" cy="21" r="10" />
          <circle cx="66" cy="26" r="8" />
          <circle cx="31" cy="32" r="6" />
          <circle cx="69" cy="32" r="6" />
        </g>
      );
    case 'spiky':
      return (
        <path
          d="M 27 38 L 26 23 L 36 27 L 40 12 L 49 23 L 54 9 L 61 23 L 71 14 L 70 28 L 75 24 L 73 38 C 60 31, 40 31, 27 38 Z"
          fill={color}
        />
      );
    case 'side_part':
      return (
        <path
          d="M 26 40 C 26 17, 74 16, 74 39 L 70 33 C 62 29, 46 31, 34 36 Z"
          fill={color}
        />
      );
    case 'undercut':
      return (
        <path
          d="M 31 35 C 29 14, 71 14, 69 35 C 59 27, 41 27, 31 35 Z"
          fill={color}
        />
      );
    case 'mullet':
      return (
        <g fill={color}>
          <path d="M 23 36 L 20 68 L 33 66 L 33 38 Z" />
          <path d="M 67 38 L 67 66 L 80 68 L 77 36 Z" />
          <path d="M 26 39 C 26 18, 74 18, 74 39 L 70 31 C 59 26, 41 26, 30 31 Z" />
        </g>
      );
    case 'man_bun':
      return (
        <g fill={color}>
          <circle cx="50" cy="14" r="9" />
          <path d="M 26 40 C 27 19, 73 19, 74 40 L 70 32 C 58 26, 42 26, 30 32 Z" />
        </g>
      );
    case 'long_wavy':
      return (
        <g fill={color}>
          <path d="M 23 32 C 18 48, 19 66, 25 74 L 34 72 L 32 36 Z" />
          <path d="M 77 32 C 82 48, 81 66, 75 74 L 66 72 L 68 36 Z" />
          <path d="M 24 38 C 24 16, 76 16, 76 38 L 70 31 C 58 26, 42 26, 30 31 Z" />
        </g>
      );
    case 'faux_hawk':
      return (
        <path
          d="M 28 38 C 28 24, 38 22, 42 22 L 45 12 L 50 10 L 55 12 L 58 22 C 62 22, 72 24, 72 38 C 60 31, 40 31, 28 38 Z"
          fill={color}
        />
      );
    case 'flattop':
      return (
        <path
          d="M 28 36 L 28 14 L 72 14 L 72 36 C 60 30, 40 30, 28 36 Z"
          fill={color}
        />
      );
    case 'shaggy':
      return (
        <path
          d="M 22 46 C 21 16, 79 16, 78 46 L 73 38 L 67 41 L 60 32 L 51 39 L 44 31 L 34 40 L 28 37 Z"
          fill={color}
        />
      );
    case 'wolf_cut':
      return (
        <g fill={color}>
          {/* Layered wolf-cut back wings flaring slightly past neck/jaw */}
          <path d="M 25 36 C 19 48, 17 62, 22 70 L 32 65 L 32 39 Z" />
          <path d="M 75 36 C 81 48, 83 62, 78 70 L 68 65 L 68 39 Z" />
          {/* Textured choppy crown + parted curtain bangs */}
          <path d="M 22 45 C 21 15, 79 15, 78 45 L 72 37 L 66 43 L 57 32 L 50 38 L 43 32 L 34 43 L 28 37 Z" />
        </g>
      );
  }
}

export const FighterPortrait: React.FC<FighterPortraitProps> = ({
  skinColor,
  hairStyle,
  hairColor,
  beardStyle,
  trunksColor = '#1e293b',
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="portraitBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d14" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#portraitBg)" />

      {/* Back Hair Layer for Afro / Long Wavy / Mullet / Dreadlocks / Wolf Cut */}
      {(hairStyle === 'afro' ||
        hairStyle === 'long_wavy' ||
        hairStyle === 'mullet' ||
        hairStyle === 'dreadlocks' ||
        hairStyle === 'wolf_cut') &&
        renderHairPath(hairStyle, hairColor)}

      {/* Shoulders & Traps */}
      <path
        d="M 10 100 C 12 78, 28 73, 40 71 L 60 71 C 72 73, 88 78, 90 100 Z"
        fill={skinColor}
      />
      {/* Subtle Collar / Trunks Accent */}
      <path d="M 32 94 L 68 94 L 72 100 L 28 100 Z" fill={trunksColor} opacity="0.65" />

      {/* Neck */}
      <rect x="41" y="59" width="18" height="16" rx="4" fill={skinColor} />
      <path d="M 41 64 Q 50 70 59 64" fill="#000000" opacity="0.16" />

      {/* Ears */}
      <ellipse cx="27.5" cy="48" rx="4" ry="7" fill={skinColor} />
      <ellipse cx="72.5" cy="48" rx="4" ry="7" fill={skinColor} />

      {/* Cranium & Jaw */}
      <path
        d="M 28 42 C 28 24, 72 24, 72 42 L 70 55 C 69 65, 58 70, 50 70 C 42 70, 31 65, 30 55 Z"
        fill={skinColor}
      />

      {/* Beard / Facial Hair */}
      {beardStyle === 'stubble' && (
        <path
          d="M 31 53 C 32 65, 42 70, 50 70 C 58 70, 68 65, 69 53 L 64 56 C 58 63, 42 63, 36 56 Z"
          fill={hairColor}
          opacity="0.28"
        />
      )}
      {beardStyle === 'goatee' && (
        <path
          d="M 42 56 L 58 56 L 56 68 C 52 70, 48 70, 44 68 Z"
          fill={hairColor}
          opacity="0.88"
        />
      )}
      {beardStyle === 'full' && (
        <path
          d="M 29 50 C 30 66, 41 72, 50 72 C 59 72, 70 66, 71 50 L 66 52 C 60 61, 40 61, 34 52 Z"
          fill={hairColor}
          opacity="0.9"
        />
      )}

      {/* Brows & Eyes */}
      <path d="M 35 42 L 45 43.5" stroke={hairStyle === 'bald' ? '#1e293b' : hairColor} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 55 43.5 L 65 42" stroke={hairStyle === 'bald' ? '#1e293b' : hairColor} strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="40" cy="46.5" rx="3.2" ry="1.8" fill="#f8fafc" />
      <ellipse cx="60" cy="46.5" rx="3.2" ry="1.8" fill="#f8fafc" />
      <circle cx="40" cy="46.5" r="1.4" fill="#0f172a" />
      <circle cx="60" cy="46.5" r="1.4" fill="#0f172a" />

      {/* Nose & Mouth */}
      <path d="M 50 45 L 48.5 54 L 51.5 54" stroke="#000000" strokeOpacity="0.24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 44 60 Q 50 61.5 56 60" stroke="#000000" strokeOpacity="0.34" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Front Hair Layer */}
      {hairStyle !== 'afro' &&
        hairStyle !== 'long_wavy' &&
        hairStyle !== 'mullet' &&
        hairStyle !== 'dreadlocks' &&
        hairStyle !== 'wolf_cut' &&
        renderHairPath(hairStyle, hairColor)}
    </svg>
  );
};
