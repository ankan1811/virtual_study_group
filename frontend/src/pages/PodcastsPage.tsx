import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2,
  TrendingUp,
  Bot,
  Cpu,
  Briefcase,
  Zap,
  Play,
  Pause,
  Star,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { usePodcastPlayer } from "../context/PodcastPlayerContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PodcastItem {
  id: string;
  title: string;
  publisher: string;
  description: string;
  thumbnail: string;
  totalEpisodes: number;
  listenScore: number | null;
  website: string | null;
  listenNotesUrl: string;
  audio: string | null;
  audioLengthSec: number | null;
  latestEpisodeTitle: string | null;
}

interface PodcastsResponse {
  data: PodcastItem[];
  fetchedAt: string;
  source: "cache" | "api" | "stale-cache";
}

type TopicKey = "trending" | "ai" | "tech" | "business" | "productivity";

// ─── Tab config ───────────────────────────────────────────────────────────────

interface TabConfig {
  key: TopicKey;
  label: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
}

const TABS: TabConfig[] = [
  { key: "trending", label: "Trending", icon: TrendingUp, gradient: "from-orange-500 to-pink-500", accentColor: "#f97316" },
  { key: "ai", label: "AI", icon: Bot, gradient: "from-indigo-500 to-violet-600", accentColor: "#6366f1" },
  { key: "tech", label: "Tech", icon: Cpu, gradient: "from-sky-500 to-cyan-500", accentColor: "#0ea5e9" },
  { key: "business", label: "Business", icon: Briefcase, gradient: "from-emerald-500 to-teal-500", accentColor: "#10b981" },
  { key: "productivity", label: "Productivity & Tools", icon: Zap, gradient: "from-amber-500 to-yellow-400", accentColor: "#f59e0b" },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1, y: 0,
    transition: { type: "spring", damping: 28, stiffness: 220 },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="h-28 bg-gray-800/50 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-800/50 rounded animate-pulse" />
            <div className="h-3 bg-gray-800/30 rounded w-3/4 animate-pulse" />
            <div className="h-2.5 bg-gray-800/20 rounded w-full animate-pulse" />
            <div className="h-2.5 bg-gray-800/20 rounded w-4/5 animate-pulse" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-3 w-16 bg-gray-800/20 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-800/30 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-4"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}
      >
        <AlertCircle size={26} className="text-red-400" />
      </div>
      <p className="text-sm text-gray-400">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-400 transition-colors hover:text-violet-300"
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </motion.div>
  );
}

function PodcastCard({
  podcast,
  gradient,
  isCurrentlyPlaying,
  onPlay,
}: {
  podcast: PodcastItem;
  gradient: string;
  isCurrentlyPlaying: boolean;
  onPlay: (podcast: PodcastItem) => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onPlay(podcast)}
      className="relative cursor-pointer group"
    >
      {/* Glow for active */}
      {isCurrentlyPlaying && (
        <div
          className="absolute -inset-[1px] rounded-2xl opacity-60"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.2))",
            filter: "blur(8px)",
          }}
        />
      )}

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: isCurrentlyPlaying
            ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))"
            : "rgba(255,255,255,0.03)",
          border: isCurrentlyPlaying
            ? "1px solid rgba(99,102,241,0.3)"
            : "1px solid rgba(255,255,255,0.06)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Gradient hero with thumbnail */}
        <div className={`relative h-28 bg-gradient-to-br ${gradient} overflow-hidden`}>
          {/* Decorative overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), " +
                "radial-gradient(circle at 20% 80%, rgba(0,0,0,0.15) 0%, transparent 50%)",
            }}
          />
          {/* Thumbnail */}
          <div className="absolute bottom-3 left-4">
            <div
              className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {podcast.thumbnail ? (
                <img
                  src={podcast.thumbnail}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Mic2 size={20} className="text-white/70" />
                </div>
              )}
            </div>
          </div>

          {/* Score badge */}
          {podcast.listenScore !== null && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Star size={9} fill="currentColor" className="text-amber-400" />
              <span className="text-[10px] poppins-semibold text-white">
                {podcast.listenScore}
              </span>
            </div>
          )}

          {/* Playing indicator */}
          {isCurrentlyPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
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
                Playing
              </span>
            </motion.div>
          )}

          {/* Equalizer bars */}
          {isCurrentlyPlaying && (
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
          <h3 className="text-[14px] poppins-bold text-white mb-0.5 line-clamp-2 leading-snug">
            {podcast.title}
          </h3>
          <p className="text-[11px] text-gray-500 poppins-medium mb-2.5 truncate">
            {podcast.publisher}
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mb-4">
            {podcast.description}
          </p>

          {/* Footer: episodes + play button */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-600">
              {podcast.totalEpisodes > 0 ? `${podcast.totalEpisodes.toLocaleString()} eps` : ""}
            </span>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isCurrentlyPlaying
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "rgba(255,255,255,0.06)",
                  border: isCurrentlyPlaying ? "none" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isCurrentlyPlaying ? "0 0 16px rgba(99,102,241,0.3)" : "none",
                  color: isCurrentlyPlaying ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {isCurrentlyPlaying ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                )}
              </div>
              <span className="text-xs text-gray-500 poppins-medium group-hover:text-gray-300 transition-colors">
                {isCurrentlyPlaying ? "Playing" : "Play"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PodcastsPage() {
  const [activeTab, setActiveTab] = useState<TopicKey>("trending");
  const [topicCache, setTopicCache] = useState<
    Partial<Record<TopicKey, PodcastsResponse>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state: podcastState, playTrack, pause, resume } = usePodcastPlayer();

  const API = import.meta.env.VITE_API_URL;

  const handlePlay = (podcast: PodcastItem) => {
    if (podcastState.currentTrack?.id === podcast.id) {
      podcastState.isPlaying ? pause() : resume();
    } else if (podcast.audio) {
      playTrack({
        id: podcast.id,
        title: podcast.latestEpisodeTitle || podcast.title,
        publisher: podcast.publisher,
        thumbnail: podcast.thumbnail,
        audioUrl: podcast.audio,
        durationSec: podcast.audioLengthSec || 0,
      });
    }
  };

  const fetchTopic = async (topic: TopicKey) => {
    if (topicCache[topic]) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<PodcastsResponse>(`${API}/podcasts/${topic}`);
      const filtered = { ...res.data, data: res.data.data.filter((p) => p.audio) };
      setTopicCache((prev) => ({ ...prev, [topic]: filtered }));
    } catch {
      setError("Could not load podcasts. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopic(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentData = topicCache[activeTab];
  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  const handleRetry = () => {
    setTopicCache((prev) => {
      const next = { ...prev };
      delete next[activeTab];
      return next;
    });
    setTimeout(() => fetchTopic(activeTab), 0);
  };

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
      </div>

      <main className="relative pt-20 px-4 pb-16 max-w-7xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 24px rgba(99,102,241,0.35)",
              }}
            >
              <Mic2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl poppins-bold text-white">Podcasts</h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Discover top podcasts across AI, tech, business, and productivity.
          </p>
        </motion.div>

        {/* Refresh banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.12)",
          }}
        >
          <span className="flex h-2 w-2 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          <p className="text-sm poppins-semibold text-violet-300">
            Fresh drops every Tue &amp; Sat — stay ahead of the curve.
          </p>
          <span className="ml-auto text-xs text-gray-600 hidden sm:block whitespace-nowrap">
            Curated for the curious learner
          </span>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-1.5 overflow-x-auto pb-1 mb-8 scrollbar-hide"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                           whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer
                           ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="podcast-tab-bg"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.gradient}`}
                    transition={{ type: "spring", damping: 26, stiffness: 300 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={15} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            {loading && <SkeletonGrid />}

            {!loading && error && <ErrorState message={error} onRetry={handleRetry} />}

            {!loading && !error && currentData && (
              <>
                {currentData.source === "stale-cache" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-amber-400"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.15)",
                    }}
                  >
                    <AlertCircle size={11} />
                    Showing cached data — live refresh coming next Tue or Sat
                  </motion.div>
                )}

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                >
                  {currentData.data.map((podcast) => (
                    <PodcastCard
                      key={podcast.id}
                      podcast={podcast}
                      gradient={activeTabConfig.gradient}
                      isCurrentlyPlaying={
                        podcastState.currentTrack?.id === podcast.id && podcastState.isPlaying
                      }
                      onPlay={handlePlay}
                    />
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-gray-600 mt-14"
        >
          Podcast data provided by{" "}
          <a
            href="https://www.listennotes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-400 transition-colors"
          >
            Listen Notes
          </a>
        </motion.p>
      </main>
    </div>
  );
}
