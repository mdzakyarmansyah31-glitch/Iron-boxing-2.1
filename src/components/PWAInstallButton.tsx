import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            void install();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="whitespace-nowrap">Install Android App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setShowGuide(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#0d111a]/90 border border-emerald-400/35 text-emerald-300 hover:text-white hover:border-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span className="whitespace-nowrap">{isIOS ? 'Install on iOS' : 'Play on Android'}</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-[#0d121c] border border-white/15 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-extrabold text-xl text-white tracking-wide">
                  {isIOS ? 'Install on iPhone / iPad' : 'Install on Android'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Tap the <strong className="text-white">Share</strong> button in Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>Open <strong className="text-white">Iron Ring</strong> from your home screen to play fullscreen.</li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div>
                  <div className="font-bold text-emerald-300 mb-1">
                    Cara Cepat (Main Fullscreen &amp; Offline di Android):
                  </div>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>
                      Buka game ini di <strong className="text-white">Google Chrome Android</strong> (bukan di dalam browser preview).
                    </li>
                    <li>
                      Ketuk tombol <strong className="text-white">⋮ (Menu)</strong> di pojok kanan atas Chrome.
                    </li>
                    <li>
                      Pilih <strong className="text-white">Install App / Tambahkan ke Layar Utama</strong>, lalu jalankan seperti aplikasi Android fullscreen.
                    </li>
                  </ol>
                </div>

                {!isAndroid && (
                  <div className="p-2.5 rounded-lg bg-black/45 border border-white/10 text-[11px] text-slate-400">
                    Project <strong className="text-slate-200">Capacitor Android (Gradle)</strong> juga sudah disiapkan di dalam source code untuk di-compile menjadi file <code className="text-amber-300">.apk</code> via Android Studio atau GitHub Actions.
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-lg bg-amber-500/95 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg pointer-events-none">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <span>Offline Mode — Local saves active</span>
    </div>
  );
};
