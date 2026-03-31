import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { usePodcastPlayer } from "../context/PodcastPlayerContext";
import { Mic2 } from "lucide-react";

function formatTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PodcastMiniPlayer() {
  const { state, pause, resume, stop, setVolume, seekTo } =
    usePodcastPlayer();

  const visible = state.currentTrack !== null;
  const progress =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * state.duration);
  };

  return (
    <AnimatePresence>
      {visible && state.currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          {/* Top gradient line */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent" />

          <div className="bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {state.currentTrack.thumbnail ? (
                  <img
                    src={state.currentTrack.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mic2 size={16} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="min-w-0 flex-shrink-0 max-w-[140px] sm:max-w-[200px]">
                <p className="text-sm poppins-semibold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 truncate">
                  {state.currentTrack.title}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {state.currentTrack.publisher}
                </p>
              </div>

              {/* Progress bar + time */}
              <div className="flex-1 min-w-0 hidden sm:flex items-center gap-2">
                <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right flex-shrink-0">
                  {formatTime(state.currentTime)}
                </span>
                <div
                  className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Hover thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-teal-500 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums w-8 flex-shrink-0">
                  {formatTime(state.duration)}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Play / Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => (state.isPlaying ? pause() : resume())}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 hover:shadow-lg transition-shadow"
                >
                  {state.isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : state.isPlaying ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </motion.button>

                {/* Volume */}
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => setVolume(state.volume === 0 ? 0.7 : 0)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    {state.volume === 0 ? (
                      <VolumeX size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-teal-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Close */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stop}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-500 transition-colors"
                  title="Stop"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
