import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Radio,
  Square,
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
    <div className="min-h-screen bg-gray-950 transition-colors">
      <Navbar />

      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 80% 60%, rgba(139,92,246,0.06) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 50% 90%, rgba(34,211,238,0.04) 0%, transparent 40%)",
          }}
        />
        {state.currentChannel && state.isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      <main className="pt-20 px-4 pb-32 max-w-6xl mx-auto relative">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 24px rgba(99,102,241,0.35)",
              }}
            >
              <Radio size={20} className="text-white" />
            </div>
            <h1 className="text-2xl poppins-bold text-white">Study Radio</h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Free, ad-free radio. Pick a vibe and start studying.
          </p>
        </motion.div>

        {/* Now Playing Hero */}
        <AnimatePresence>
          {state.currentChannel && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="mb-10 rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow:
                  "0 0 80px rgba(99,102,241,0.08), inset 0 0 0 1px rgba(255,255,255,0.03)",
              }}
            >
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: Channel info */}
                  <div className="flex flex-col items-center md:items-start gap-5 flex-shrink-0 md:w-[280px]">
                    {/* Icon with glow */}
                    <div className="relative">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${state.currentChannel.color} flex items-center justify-center`}
                        style={{ boxShadow: "0 0 40px rgba(99,102,241,0.3)" }}
                      >
                        <state.currentChannel.Icon className="w-10 h-10 text-white" />
                      </div>
                      {state.isPlaying && (
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${state.currentChannel.color}`}
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </div>

                    <div className="text-center md:text-left">
                      <h2
                        className="text-2xl md:text-3xl poppins-bold"
                        style={{
                          background: "linear-gradient(135deg, #e0e7ff, #ffffff 50%, #c4b5fd)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {state.currentChannel.name}
                      </h2>
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-[11px] poppins-semibold bg-gradient-to-r ${state.currentChannel.color} text-white`}
                      >
                        {state.currentChannel.genre}
                      </span>
                      <p className="mt-3 text-sm text-gray-400 leading-relaxed max-w-xs">
                        {state.currentChannel.description}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => (state.isPlaying ? pause() : resume())}
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                        style={{
                          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                          boxShadow: "0 0 28px rgba(99,102,241,0.4)",
                        }}
                      >
                        {state.isPlaying ? (
                          <Pause size={24} fill="currentColor" />
                        ) : (
                          <Play size={24} fill="currentColor" className="ml-1" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={stop}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <Square size={16} fill="currentColor" />
                      </motion.button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2.5 w-full max-w-[220px]">
                      <button
                        onClick={() => setVolume(state.volume === 0 ? 0.7 : 0)}
                        className="text-gray-500 hover:text-violet-400 transition-colors"
                      >
                        {state.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={state.volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1 rounded-full appearance-none bg-gray-800 accent-violet-500 cursor-pointer"
                      />
                    </div>

                    {/* Mini player toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={toggleMiniPlayer}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          state.isMiniPlayerEnabled ? "bg-violet-500" : "bg-gray-700"
                        }`}
                      >
                        <motion.div
                          animate={{ x: state.isMiniPlayerEnabled ? 18 : 2 }}
                          transition={{ type: "spring", damping: 20, stiffness: 300 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </div>
                      <span className="text-xs text-gray-500">Keep playing in background</span>
                    </label>
                  </div>

                  {/* Right: Visualizer */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <div
                      className="w-full rounded-2xl overflow-hidden p-4"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <RadioVisualizer
                        analyser={analyserRef.current}
                        isPlaying={state.isPlaying}
                        variant="full"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!state.currentChannel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-10"
          >
            <div
              className="rounded-3xl p-8 md:p-10 text-center relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Decorative background rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[120, 200, 280].map((size, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
                    className="absolute rounded-full border border-dashed"
                    style={{
                      width: size,
                      height: size,
                      borderColor: `rgba(139,92,246,${0.08 - i * 0.02})`,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10">
                {/* Icon */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block mb-5"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
                      border: "1px solid rgba(99,102,241,0.2)",
                      boxShadow: "0 0 50px rgba(99,102,241,0.15)",
                    }}
                  >
                    <Headphones size={36} className="text-violet-400" />
                  </div>
                </motion.div>

                {/* Title */}
                <h2
                  className="text-xl poppins-bold mb-2"
                  style={{
                    background: "linear-gradient(135deg, #a5b4fc, #ffffff 60%, #c4b5fd)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Pick a vibe to start studying
                </h2>
                <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
                  Free, ad-free radio. Curated ambient, chill, and focus channels to keep you in the zone.
                </p>

                {/* Feature highlights */}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {[
                    { icon: Radio, label: "8 curated channels" },
                    { icon: Volume2, label: "Background playback" },
                    { icon: Headphones, label: "Ad-free streaming" },
                  ].map((feat, i) => (
                    <motion.div
                      key={feat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <feat.icon size={14} className="text-violet-400" />
                      <span className="text-xs text-gray-400 poppins-medium">{feat.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Scroll hint */}
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-gray-600 text-xs poppins-regular"
                >
                  Scroll down to browse channels
                </motion.div>
              </div>
            </div>
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
            const playing = active && state.isPlaying;
            return (
              <motion.div
                key={channel.id}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChannelClick(channel)}
                className="relative cursor-pointer group"
              >
                {/* Card glow for active channel */}
                {active && (
                  <div
                    className="absolute -inset-[1px] rounded-2xl opacity-60"
                    style={{
                      background: `linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.2))`,
                      filter: "blur(8px)",
                    }}
                  />
                )}

                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))"
                      : "rgba(255,255,255,0.03)",
                    border: active
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {/* Top section: gradient hero strip with icon */}
                  <div
                    className={`relative h-24 bg-gradient-to-br ${channel.color} overflow-hidden`}
                  >
                    {/* Decorative pattern overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), " +
                          "radial-gradient(circle at 20% 80%, rgba(0,0,0,0.15) 0%, transparent 50%)",
                      }}
                    />
                    {/* Floating icon */}
                    <div className="absolute bottom-3 left-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                      >
                        <channel.Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    {/* Playing indicator */}
                    {playing && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      >
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-white"
                        />
                        <span className="text-[10px] poppins-semibold text-white uppercase tracking-wider">
                          Live
                        </span>
                      </motion.div>
                    )}
                    {/* Equalizer bars for playing state */}
                    {playing && (
                      <div className="absolute bottom-3 right-4 flex items-end gap-[3px]">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [6, 16, 8, 14, 6] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                            className="w-[3px] rounded-full bg-white/70"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 pt-3.5">
                    <h3 className="text-[15px] poppins-bold text-white mb-1">
                      {channel.name}
                    </h3>
                    <span className="inline-block text-[10px] poppins-semibold text-gray-400 mb-2.5 uppercase tracking-wider">
                      {channel.genre}
                    </span>
                    <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mb-4">
                      {channel.description}
                    </p>

                    {/* Play button */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: active
                            ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                            : "rgba(255,255,255,0.06)",
                          border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
                          boxShadow: active ? "0 0 16px rgba(99,102,241,0.3)" : "none",
                          color: active ? "#fff" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {playing ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 poppins-medium group-hover:text-gray-300 transition-colors">
                        {playing ? "Now playing" : active ? "Paused" : "Click to play"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[11px] text-gray-600 mt-12"
        >
          Streams provided by SomaFM.com — Listener-supported, commercial-free radio
        </motion.p>
      </main>
    </div>
  );
}
