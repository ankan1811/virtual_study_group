import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  X,
} from "lucide-react";
import { useRadio } from "../context/RadioContext";
import RadioVisualizer from "./RadioVisualizer";

export default function MiniPlayer() {
  const { state, analyserRef, pause, resume, stop, setVolume } = useRadio();
  const location = useLocation();
  const navigate = useNavigate();

  const visible =
    state.currentChannel !== null &&
    state.isMiniPlayerEnabled &&
    location.pathname !== "/radio";

  return (
    <AnimatePresence>
      {visible && state.currentChannel && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed bottom-0 left-0 right-0 z-40"
        >
          {/* Top gradient line */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

          <div className="bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3">
              {/* Channel info */}
              <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
                <span className="text-2xl">{state.currentChannel.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm poppins-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 truncate">
                    {state.currentChannel.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {state.currentChannel.genre}
                  </p>
                </div>
              </div>

              {/* Mini visualizer */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <RadioVisualizer
                  analyser={analyserRef.current}
                  isPlaying={state.isPlaying}
                  variant="mini"
                  className="opacity-70"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Play / Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => (state.isPlaying ? pause() : resume())}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 hover:shadow-lg transition-shadow"
                >
                  {state.isPlaying ? (
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
                    className="w-16 h-1 accent-indigo-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Expand */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/radio")}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Open Radio"
                >
                  <Maximize2 size={16} />
                </motion.button>

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
