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
  ExternalLink,
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
  {
    key: "trending",
    label: "Trending",
    icon: TrendingUp,
    gradient: "from-orange-500 to-pink-500",
    accentColor: "#f97316",
  },
  {
    key: "ai",
    label: "AI",
    icon: Bot,
    gradient: "from-indigo-500 to-violet-600",
    accentColor: "#6366f1",
  },
  {
    key: "tech",
    label: "Tech",
    icon: Cpu,
    gradient: "from-sky-500 to-cyan-500",
    accentColor: "#0ea5e9",
  },
  {
    key: "business",
    label: "Business",
    icon: Briefcase,
    gradient: "from-emerald-500 to-teal-500",
    accentColor: "#10b981",
  },
  {
    key: "productivity",
    label: "Productivity & Tools",
    icon: Zap,
    gradient: "from-amber-500 to-yellow-400",
    accentColor: "#f59e0b",
  },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 220 },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden bg-white dark:bg-white/5
                     border border-gray-100 dark:border-white/10 p-4"
        >
          <div className="h-[3px] bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
          <div className="flex gap-3 mb-3">
            <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-4/5 animate-pulse" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-3/5 animate-pulse" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <AlertCircle size={26} className="text-red-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                   bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400
                   hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </motion.div>
  );
}

function PodcastCard({
  podcast,
  accentColor,
  isCurrentlyPlaying,
  onPlay,
}: {
  podcast: PodcastItem;
  accentColor: string;
  isCurrentlyPlaying: boolean;
  onPlay: (podcast: PodcastItem) => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="rounded-2xl overflow-hidden bg-white dark:bg-white/5
                 backdrop-blur-xl border border-gray-100 dark:border-white/10
                 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30
                 transition-shadow flex flex-col"
    >
      {/* Top accent strip */}
      <div className="h-[3px]" style={{ background: accentColor }} />

      {/* Thumbnail + metadata */}
      <div className="p-4 flex gap-3">
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {podcast.thumbnail ? (
            <img
              src={podcast.thumbnail}
              alt={podcast.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.classList.add(
                  "flex",
                  "items-center",
                  "justify-center"
                );
                const icon = document.createElement("span");
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
                (e.target as HTMLImageElement).parentElement!.appendChild(icon);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Mic2 size={22} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1">
            {podcast.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {podcast.publisher}
          </p>
          {podcast.listenScore !== null && (
            <span
              className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full
                           text-[10px] font-semibold
                           bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
            >
              <Star size={8} fill="currentColor" />
              {podcast.listenScore}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
          {podcast.description}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {podcast.totalEpisodes > 0
            ? `${podcast.totalEpisodes.toLocaleString()} eps`
            : ""}
        </span>
        {podcast.audio ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(podcast);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isCurrentlyPlaying
                ? "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300"
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            }`}
          >
            {isCurrentlyPlaying ? (
              <Pause size={11} fill="currentColor" />
            ) : (
              <Play size={11} fill="currentColor" />
            )}
            {isCurrentlyPlaying ? "Playing" : "Play"}
          </button>
        ) : (
          <a
            href={podcast.website || podcast.listenNotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400
                       hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={11} />
            Listen Now
          </a>
        )}
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
      const res = await axios.get<PodcastsResponse>(
        `${API}/podcasts/${topic}`
      );
      setTopicCache((prev) => ({ ...prev, [topic]: res.data }));
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
    // trigger re-fetch via useEffect by clearing cache entry
    setTimeout(() => fetchTopic(activeTab), 0);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50
                    dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950 transition-colors"
    >
      <Navbar />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-400/8 dark:bg-indigo-600/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-400/6 dark:bg-violet-600/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-400/4 dark:bg-sky-600/4 blur-3xl" />
      </div>

      <main className="relative pt-20 px-4 pb-16 max-w-7xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 200 }}
          className="mb-5"
        >
          <div className="flex items-center gap-3 mb-1.5">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                           flex items-center justify-center shadow-lg shadow-indigo-500/25"
            >
              <Mic2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Podcasts
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
            Discover top podcasts across AI, tech, business, and productivity.
          </p>
        </motion.div>

        {/* Refresh banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 26, stiffness: 200 }}
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl
                     bg-gradient-to-r from-indigo-500/10 via-violet-500/8 to-purple-500/10
                     dark:from-indigo-500/15 dark:via-violet-500/10 dark:to-purple-500/15
                     border border-indigo-200/50 dark:border-indigo-700/30"
        >
          <span className="flex h-2 w-2 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            Fresh drops every Tue &amp; Sat — stay ahead of the curve.
          </p>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:block whitespace-nowrap">
            Curated for the curious learner
          </span>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", damping: 26, stiffness: 200 }}
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
                           ${
                             isActive
                               ? "text-white"
                               : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                           }`}
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

            {!loading && error && (
              <ErrorState message={error} onRetry={handleRetry} />
            )}

            {!loading && !error && currentData && (
              <>
                {/* Source badge for stale cache */}
                {currentData.source === "stale-cache" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                               text-xs font-medium bg-amber-50 dark:bg-amber-950/30
                               text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30"
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
                      accentColor={activeTabConfig.accentColor}
                      isCurrentlyPlaying={
                        podcastState.currentTrack?.id === podcast.id &&
                        podcastState.isPlaying
                      }
                      onPlay={handlePlay}
                    />
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer attribution */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-14"
        >
          Podcast data provided by{" "}
          <a
            href="https://www.listennotes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-500 transition-colors"
          >
            Listen Notes
          </a>
        </motion.p>
      </main>
    </div>
  );
}
