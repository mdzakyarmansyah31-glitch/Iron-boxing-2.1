import React from 'react';
import { Camera, Disc3, Megaphone, Monitor, Music, Volume2, VolumeX } from 'lucide-react';
import { CameraMode, GameSettings, GraphicsQuality, SongTrackMode } from '../types/game';
import { soundEngine } from '../engine/audio';

interface SettingsPanelProps {
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  compact?: boolean;
}

const QUALITY_OPTIONS: {
  id: GraphicsQuality;
  label: string;
  hint: string;
}[] = [
  { id: 'low', label: 'Low', hint: '1x scale, shadows off, fastest FPS' },
  { id: 'medium', label: 'Medium', hint: 'Balanced shadows, medium crowd' },
  { id: 'high', label: 'High', hint: 'Full HD scale, full crowd & arena lights' },
];

const TRACK_OPTIONS: { id: SongTrackMode; label: string }[] = [
  { id: 'sucker_for_pain', label: 'Sucker for Pain' },
  { id: 'body_pata_pata', label: 'Body Pata Pata' },
  { id: 'vendetta_rap', label: 'Vendetta Rap' },
  { id: 'auto', label: 'Auto Mix' },
  { id: 'track1', label: 'Rap 1 · Cypher' },
  { id: 'track2', label: 'Rap 2 · Trap' },
];

const CAMERA_OPTIONS: { id: CameraMode; label: string }[] = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'closeup', label: 'Close-Up' },
  { id: 'shoulder', label: 'Over Shoulder' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  compact = false,
}) => {
  const activeQualityHint =
    QUALITY_OPTIONS.find((q) => q.id === settings.graphicsQuality)?.hint ?? '';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Master Mute Row */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center gap-2.5">
          {settings.muted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-xs sm:text-sm font-semibold text-white">Master Audio</span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.unlock();
            onUpdateSettings({ muted: !settings.muted });
          }}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
            settings.muted
              ? 'bg-red-500/20 border border-red-400/50 text-red-200'
              : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
          }`}
        >
          {settings.muted ? 'Muted' : 'Enabled'}
        </button>
      </div>

      {/* Song Volume & Rap Track Selector */}
      <div className="px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="song-volume-slider"
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white"
            >
              <Music className="w-4 h-4 text-amber-400" />
              <span>Song Volume</span>
            </label>
            <span className="font-mono-tabular text-xs font-bold text-amber-300">
              {settings.songVolume}%
            </span>
          </div>
          <input
            id="song-volume-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={settings.songVolume}
            onChange={(e) => {
              soundEngine.unlock();
              onUpdateSettings({ songVolume: Number(e.target.value) });
            }}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Automatically softens during battles so punches and the bell stay clear.
          </p>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Disc3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Arena Soundtrack</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TRACK_OPTIONS.map((t) => {
              const active = settings.songTrack === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    onUpdateSettings({ songTrack: t.id });
                  }}
                  className={`py-1.5 px-1.5 rounded-md border text-[11px] font-bold transition-colors cursor-pointer truncate ${
                    active
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-white/[0.04] border-white/12 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sound Effects Volume */}
      <div className="px-3 py-2.5 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="sfx-volume-slider"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white"
          >
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span>Sound Effects</span>
          </label>
          <span className="font-mono-tabular text-xs font-bold text-sky-300">
            {settings.sfxVolume}%
          </span>
        </div>
        <input
          id="sfx-volume-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.sfxVolume}
          onChange={(e) => {
            soundEngine.unlock();
            onUpdateSettings({ sfxVolume: Number(e.target.value) });
          }}
          className="w-full accent-sky-400 cursor-pointer"
        />
      </div>

      {/* Game Graphics Quality */}
      <div className="px-3 py-2.5 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="w-4 h-4 text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-white">Game Graphics</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_OPTIONS.map((opt) => {
            const active = settings.graphicsQuality === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playUiClick();
                  onUpdateSettings({ graphicsQuality: opt.id });
                }}
                className={`py-2 px-2 rounded-md border text-xs font-display font-bold tracking-wide transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                    : 'bg-white/[0.04] border-white/12 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">{activeQualityHint}</p>
      </div>

      {/* Ring Camera Mode & Announcer Voice */}
      <div className="px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2.5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">Fight Camera · [V]</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {CAMERA_OPTIONS.map((cam) => {
              const active = settings.cameraMode === cam.id;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    onUpdateSettings({ cameraMode: cam.id });
                  }}
                  className={`py-1.5 px-1.5 rounded-md border text-[11px] font-bold transition-colors cursor-pointer truncate ${
                    active
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-white/[0.04] border-white/12 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-sky-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">Ring Announcer</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick();
              onUpdateSettings({ announcerVoice: !settings.announcerVoice });
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              settings.announcerVoice
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                : 'bg-white/8 border border-white/15 text-slate-300'
            }`}
          >
            {settings.announcerVoice ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
};
