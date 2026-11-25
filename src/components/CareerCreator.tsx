import React, { useEffect, useState } from 'react';
import { ArrowLeft, Dices, Music, Trophy } from 'lucide-react';
import {
  BEARD_STYLE_OPTIONS,
  BOOT_COLOR_SWATCHES,
  CAREER_ARCHETYPES,
  EYE_COLOR_SWATCHES,
  FACE_SHAPE_OPTIONS,
  GLOVE_COLOR_SWATCHES,
  HAIR_COLOR_SWATCHES,
  HAIR_STYLE_OPTIONS,
  PLAYABLE_FIGHTERS,
  SKIN_TONE_SWATCHES,
  TRUNKS_COLOR_SWATCHES,
  TRUNKS_TRIM_SWATCHES,
} from '../data/fighters';
import { soundEngine } from '../engine/audio';
import { BoxerAppearance, BoxerStats, SongTrackMode } from '../types/game';

interface CareerCreatorProps {
  onPreviewAppearance: (appearance: BoxerAppearance, stance: 'Orthodox' | 'Southpaw') => void;
  onCreateCareer: (data: {
    customName: string;
    customNickname: string;
    stance: 'Orthodox' | 'Southpaw';
    appearance: BoxerAppearance;
    baseStats: BoxerStats;
    entranceTrack: SongTrackMode;
  }) => void;
  onBack: () => void;
}

const ENTRANCE_TRACK_OPTIONS: { id: SongTrackMode; label: string }[] = [
  { id: 'sucker_for_pain', label: 'Sucker for Pain' },
  { id: 'body_pata_pata', label: 'Body Pata Pata' },
  { id: 'vendetta_rap', label: 'Vendetta Rap' },
  { id: 'auto', label: 'Auto Mix' },
  { id: 'track1', label: 'Rap 1 · Cypher' },
  { id: 'track2', label: 'Rap 2 · Trap' },
];

type CreatorTab = 'identity' | 'hair' | 'gear';

const DEFAULT_APPEARANCE: BoxerAppearance = {
  ...PLAYABLE_FIGHTERS[0].appearance,
};

export const CareerCreator: React.FC<CareerCreatorProps> = ({
  onPreviewAppearance,
  onCreateCareer,
  onBack,
}) => {
  const [tab, setTab] = useState<CreatorTab>('identity');
  const [customName, setCustomName] = useState('Jordan Vance');
  const [customNickname, setCustomNickname] = useState('The Contender');
  const [stance, setStance] = useState<'Orthodox' | 'Southpaw'>('Orthodox');
  const [archetypeId, setArchetypeId] = useState(CAREER_ARCHETYPES[0].id);
  const [entranceTrack, setEntranceTrack] = useState<SongTrackMode>('sucker_for_pain');
  const [appearance, setAppearance] = useState<BoxerAppearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    onPreviewAppearance(appearance, stance);
  }, [appearance, stance, onPreviewAppearance]);

  const updateAppearance = (partial: Partial<BoxerAppearance>) => {
    setAppearance((prev) => ({ ...prev, ...partial }));
  };

  const handleRandomize = () => {
    soundEngine.playUiClick();
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    setStance(Math.random() > 0.35 ? 'Orthodox' : 'Southpaw');
    setAppearance({
      skinColor: pick(SKIN_TONE_SWATCHES).hex,
      hairStyle: pick(HAIR_STYLE_OPTIONS).id,
      hairColor: pick(HAIR_COLOR_SWATCHES).hex,
      beardStyle: pick(BEARD_STYLE_OPTIONS).id,
      faceShape: pick(FACE_SHAPE_OPTIONS).id,
      eyeColor: pick(EYE_COLOR_SWATCHES).hex,
      trunksColor: pick(TRUNKS_COLOR_SWATCHES).hex,
      trunksTrimColor: pick(TRUNKS_TRIM_SWATCHES).hex,
      gloveColor: pick(GLOVE_COLOR_SWATCHES).hex,
      gloveTrimColor: '#f8fafc',
      bootColor: pick(BOOT_COLOR_SWATCHES).hex,
      heightScale: Number((0.95 + Math.random() * 0.11).toFixed(2)),
      bulkScale: Number((0.94 + Math.random() * 0.16).toFixed(2)),
    });
  };

  const selectedArchetype =
    CAREER_ARCHETYPES.find((a) => a.id === archetypeId) ?? CAREER_ARCHETYPES[0];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-start p-2.5 sm:p-5 pointer-events-none overflow-hidden">
      <div className="pointer-events-auto w-[54%] min-w-[235px] sm:w-[345px] md:w-[400px] lg:w-[435px] max-h-[calc(100vh-20px)] sm:max-h-[calc(100vh-40px)] flex flex-col bg-[#0b0f18]/94 border border-white/14 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 border-b border-white/10 bg-[#0f1522]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onBack();
            }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <h2 className="font-display font-extrabold text-base sm:text-xl lg:text-2xl text-white tracking-wide truncate">
            CREATE YOUR BOXER
          </h2>

          <button
            type="button"
            onClick={handleRandomize}
            aria-label="Randomize appearance"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Dices className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Random</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="shrink-0 grid grid-cols-3 gap-1 p-1.5 sm:p-2 bg-black/35 border-b border-white/10">
          {(
            [
              ['identity', 'Identity'],
              ['hair', 'Hair & Face'],
              ['gear', 'Gear'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab(id);
              }}
              className={`py-1.5 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap truncate ${
                tab === id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto career-scroll p-3 sm:p-4 space-y-3.5">
          {tab === 'identity' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="creator-name"
                    className="block text-[11px] font-semibold text-slate-400 mb-1"
                  >
                    Boxer Name
                  </label>
                  <input
                    id="creator-name"
                    type="text"
                    maxLength={22}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    placeholder="Enter ring name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="creator-nick"
                    className="block text-[11px] font-semibold text-slate-400 mb-1"
                  >
                    Ring Nickname
                  </label>
                  <input
                    id="creator-nick"
                    type="text"
                    maxLength={20}
                    value={customNickname}
                    onChange={(e) => setCustomNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    placeholder="e.g. The Hammer"
                  />
                </div>
              </div>

              {/* Stance */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Fighting Stance</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Orthodox', 'Southpaw'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setStance(s);
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                        stance === s
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      {s} ({s === 'Orthodox' ? 'Left Lead' : 'Right Lead'})
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Archetype */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Fighting Style & Base Attributes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CAREER_ARCHETYPES.map((arch) => {
                    const active = arch.id === archetypeId;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setArchetypeId(arch.id);
                        }}
                        className={`text-left p-2.5 rounded-lg border cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="text-xs font-bold">{arch.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {arch.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Height & Bulk Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-black/35 border border-white/10 rounded-lg p-2.5">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-semibold">Height</span>
                    <span className="font-mono-tabular text-white font-bold">
                      {Math.round(appearance.heightScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.93}
                    max={1.08}
                    step={0.01}
                    value={appearance.heightScale}
                    onChange={(e) => updateAppearance({ heightScale: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="bg-black/35 border border-white/10 rounded-lg p-2.5">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-semibold">Muscle Bulk</span>
                    <span className="font-mono-tabular text-white font-bold">
                      {Math.round(appearance.bulkScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.9}
                    max={1.14}
                    step={0.01}
                    value={appearance.bulkScale}
                    onChange={(e) => updateAppearance({ bulkScale: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Walkout Entrance Song (Career Only) */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Walkout Entrance Song</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ENTRANCE_TRACK_OPTIONS.map((t) => {
                    const active = entranceTrack === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setEntranceTrack(t.id);
                        }}
                        className={`py-1.5 px-2 rounded-md border text-[11px] font-semibold truncate cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'hair' && (
            <>
              {/* 20 Hairstyles Grid */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                  <span>Hairstyle (20 Styles)</span>
                  <span className="text-amber-300">
                    {HAIR_STYLE_OPTIONS.find((h) => h.id === appearance.hairStyle)?.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {HAIR_STYLE_OPTIONS.map((opt, idx) => {
                    const active = appearance.hairStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ hairStyle: opt.id });
                        }}
                        className={`px-2 py-1.5 rounded-md border text-[11px] font-semibold truncate cursor-pointer ${
                          active
                            ? 'bg-amber-500 border-amber-300 text-slate-950 font-bold'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white'
                        }`}
                      >
                        {idx + 1}. {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hair Color */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Hair Color</div>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLOR_SWATCHES.map((sw) => {
                    const active = appearance.hairColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ hairColor: sw.hex });
                        }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Facial Hair */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Facial Hair</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {BEARD_STYLE_OPTIONS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        updateAppearance({ beardStyle: b.id });
                      }}
                      className={`py-1.5 px-2 rounded-md border text-xs font-semibold cursor-pointer ${
                        appearance.beardStyle === b.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Face Bone Structure */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Face Structure</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {FACE_SHAPE_OPTIONS.map((fs) => {
                    const active = (appearance.faceShape ?? 'square_jaw') === fs.id;
                    return (
                      <button
                        key={fs.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ faceShape: fs.id });
                        }}
                        className={`py-1.5 px-1.5 rounded-md border text-[11px] font-semibold truncate cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        {fs.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Eye Color */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Eye Color</div>
                <div className="flex flex-wrap gap-2">
                  {EYE_COLOR_SWATCHES.map((sw) => {
                    const active = (appearance.eyeColor ?? '#2c1b12') === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ eyeColor: sw.hex });
                        }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Skin Tone */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Skin Tone</div>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONE_SWATCHES.map((sw) => {
                    const active = appearance.skinColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ skinColor: sw.hex });
                        }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'gear' && (
            <>
              {/* Boxer Shorts Color */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Boxer Shorts Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRUNKS_COLOR_SWATCHES.map((sw) => {
                    const active = appearance.trunksColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ trunksColor: sw.hex });
                        }}
                        className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Shorts Trim / Waistband */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Shorts Waistband &amp; Trim
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRUNKS_TRIM_SWATCHES.map((sw) => {
                    const active = appearance.trunksTrimColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ trunksTrimColor: sw.hex });
                        }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Gloves Color */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Boxing Gloves Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {GLOVE_COLOR_SWATCHES.map((sw) => {
                    const active = appearance.gloveColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ gloveColor: sw.hex });
                        }}
                        className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Ring Boots Color */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Ring Boots Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {BOOT_COLOR_SWATCHES.map((sw) => {
                    const active = appearance.bootColor === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => {
                          soundEngine.playUiClick();
                          updateAppearance({ bootColor: sw.hex });
                        }}
                        className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform ${
                          active ? 'border-amber-400 scale-110' : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 p-3.5 border-t border-white/10 bg-[#0f1522]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onCreateCareer({
                customName: customName.trim() || 'Jordan Vance',
                customNickname: customNickname.trim() || 'The Contender',
                stance,
                appearance,
                baseStats: selectedArchetype.baseStats,
                entranceTrack,
              });
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg tracking-wide transition-colors cursor-pointer"
          >
            <Trophy className="w-5 h-5" />
            <span>BEGIN CAREER ({customName.trim() || 'Boxer'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
