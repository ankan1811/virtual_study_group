import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Radio,
} from "lucide-react";
import Navbar from "../components/Navbar";
import RadioVisualizer from "../components/RadioVisualizer";
import { useRadio } from "../context/RadioContext";
import { radioChannels, type RadioChannel } from "../data/radioChannels";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 220 },
  },
};

export default function RadioPage() {
  const {
    state,
    analyserRef,
    playChannel,
    pause,
    resume,
    stop,
    setVolume,
    toggleMiniPlayer,
  } = useRadio();

  const handleChannelClick = (channel: RadioChannel) => {
    if (state.currentChannel?.id === channel.id) {
      state.isPlaying ? pause() : resume();
    } else {
      playChannel(channel);
    }
  };

  const isActive = (id: string) => state.currentChannel?.id === id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-gray-50 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950 transition-colors">
      <Navbar />

      {/* Floating background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 25, 0],
            y: [0, 25, -35, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] right-[5%] w-[350px] h-[350px] rounded-full bg-violet-400/10 dark:bg-violet-500/5 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 20, -15, 0],
            y: [0, -20, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-purple-400/8 dark:bg-purple-500/5 blur-3xl"
        />
      </div>

      <main className="pt-20 px-4 pb-32 max-w-6xl mx-auto relative">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Radio size={20} className="text-white" />
            </div>
            <h1 className="text-2xl poppins-bold text-gray-900 dark:text-white">
              Study Radio
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
            Free, ad-free radio. Pick a vibe and start studying.
          </p>
        </motion.div>

        {/* Now Playing Hero */}
        {state.currentChannel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="mb-8 rounded-3xl overflow-hidden"
          >
            <div
              className={`relative bg-gradient-to-br ${state.currentChannel.color} p-[1px] rounded-3xl`}
            >
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Left: Channel info + controls */}
                  <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0">
                    {/* Emoji with glow */}
                    <div className="relative">
                      <span className="text-6xl drop-shadow-lg">
                        {state.currentChannel.emoji}
                      </span>
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${state.currentChannel.color} opacity-20 blur-2xl rounded-full`}
                      />
                    </div>

                    <div className="text-center md:text-left">
                      <h2
                        className={`text-2xl md:text-3xl poppins-bold bg-clip-text text-transparent bg-gradient-to-r ${state.currentChannel.color}`}
                      >
                        {state.currentChannel.name}
                      </h2>
                      <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs poppins-semibold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                        {state.currentChannel.genre}
                      </span>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                        {state.currentChannel.description}
                      </p>
                    </div>

                    {/* Play / Pause button with pulse ring */}
                    <div className="relative">
                      {state.isPlaying && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${state.currentChannel.color}`}
                        />
                      )}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() =>
                          state.isPlaying ? pause() : resume()
                        }
                        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-shadow"
                      >
                        {state.isPlaying ? (
                          <Pause size={28} fill="currentColor" />
                        ) : (
                          <Play
                            size={28}
                            fill="currentColor"
                            className="ml-1"
                          />
                        )}
                      </motion.button>
                    </div>

                    {/* Volume control */}
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <button
                        onClick={() =>
                          setVolume(state.volume === 0 ? 0.7 : 0)
                        }
                        className="text-gray-500 dark:text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        {state.volume === 0 ? (
                          <VolumeX size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={state.volume}
                        onChange={(e) =>
                          setVolume(parseFloat(e.target.value))
                        }
                        className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-700 accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Mini player toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={toggleMiniPlayer}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          state.isMiniPlayerEnabled
                            ? "bg-indigo-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <motion.div
                          animate={{
                            x: state.isMiniPlayerEnabled ? 20 : 2,
                          }}
                          transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                          }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Keep playing in background
                      </span>
                    </label>
                  </div>

                  {/* Right: Visualizer */}
                  <div className="flex-1 w-full min-w-0">
                    <RadioVisualizer
                      analyser={analyserRef.current}
                      isPlaying={state.isPlaying}
                      variant="full"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Stop button */}
                <div className="mt-4 flex justify-center md:justify-start">
                  <button
                    onClick={stop}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors poppins-semibold"
                  >
                    Stop & Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!state.currentChannel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
                <Headphones
                  size={40}
                  className="text-indigo-500 dark:text-indigo-400"
                />
              </div>
            </motion.div>
            <h2 className="text-xl poppins-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 mb-2">
              Pick a vibe to start studying
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Free, ad-free radio. Just hit play.
            </p>
          </motion.div>
        )}

        {/* Channel Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {radioChannels.map((channel) => {
            const active = isActive(channel.id);
            return (
              <motion.div
                key={channel.id}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChannelClick(channel)}
                className={`relative cursor-pointer rounded-2xl overflow-hidden transition-shadow ${
                  active
                    ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/15"
                    : "hover:shadow-lg"
                }`}
              >
                {/* Gradient top accent */}
                <div
                  className={`h-[3px] bg-gradient-to-r ${channel.color}`}
                />

                <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-100 dark:border-white/10 p-5 rounded-b-2xl">
                  {/* NOW PLAYING badge */}
                  {active && state.isPlaying && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] poppins-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Playing
                      </span>
                    </div>
                  )}

                  <span className="text-3xl block mb-3">{channel.emoji}</span>
                  <h3 className="text-base poppins-bold text-gray-900 dark:text-white mb-1">
                    {channel.name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] poppins-semibold mb-2 bg-gradient-to-r ${channel.color} text-white`}
                  >
                    {channel.genre}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {channel.description}
                  </p>

                  {/* Play indicator */}
                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        active
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {active && state.isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play
                          size={14}
                          fill="currentColor"
                          className="ml-0.5"
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {active && state.isPlaying
                        ? "Now playing"
                        : active
                          ? "Paused"
                          : "Click to play"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer attribution */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-12"
        >
          Streams provided by SomaFM.com — Listener-supported, commercial-free
          radio
        </motion.p>
      </main>
    </div>
  );
}
