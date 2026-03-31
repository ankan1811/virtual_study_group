import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  UserPlus,
  Search,
  X,
  ExternalLink,
  MessageCircle,
  DoorOpen,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
  Sparkles,
  Bell,
} from "lucide-react";
import Navbar from "../components/Navbar";
import DmPanel from "../components/DmPanel";
import { AuthState } from "../store/authStore/store";
import {
  setCompanions,
  setOnline,
  setOffline,
  addPendingRequest,
  setPendingRequests,
  removePendingRequest,
  addCompanion,
} from "../store/companionStore/companionSlice";
import { enterRoom } from "../store/RoomStore/roomSlice";
import { removeByTypeAndSender } from "../store/notificationStore/notificationSlice";
import { getSocket } from "../utils/socketInstance";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: "AI" | "Tech" | "Productivity";
  source: string;
  readTime: string;
  url: string;
  imageUrl?: string;
  accentColor: string;
  publishedAt: string;
}

interface SearchUser {
  userId: string;
  name: string;
  email: string;
}

// Dummy companions shown when logged out
const dummyCompanions = [
  { userId: "d1", name: "Aarav Sharma", isOnline: true },
  { userId: "d2", name: "Priya Patel", isOnline: true },
  { userId: "d3", name: "Noah Williams", isOnline: false },
  { userId: "d4", name: "Sakura Tanaka", isOnline: true },
  { userId: "d5", name: "Liam Chen", isOnline: false },
  { userId: "d6", name: "Emma Rodriguez", isOnline: true },
  { userId: "d7", name: "Arjun Mehta", isOnline: false },
  { userId: "d8", name: "Sofia Martinez", isOnline: true },
];

// Dummy companions that should show a green "unread" ring in logged-out preview
// d3 (Noah) is offline + unread = green ring but white/gray online dot
const dummyUnreadIds = new Set(["d2", "d3", "d4", "d8"]);

// Dummy news articles for logged-out preview
const dummyNews: NewsArticle[] = [
  {
    id: "dn1",
    title: "How AI is Transforming Study Habits in 2026",
    summary:
      "New research shows students using AI-powered tools retain 40% more information. From adaptive flashcards to real-time doubt solving, the classroom of the future is here.",
    category: "AI",
    source: "TechCrunch",
    readTime: "4 min",
    url: "#",
    imageUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=300&fit=crop",
    accentColor: "#6366f1",
    publishedAt: "Today",
  },
  {
    id: "dn2",
    title: "The Pomodoro Technique Gets a Digital Upgrade",
    summary:
      "Virtual study rooms are combining timed focus sessions with social accountability. Groups that study together stay consistent 3x longer than solo learners.",
    category: "Productivity",
    source: "Lifehacker",
    readTime: "3 min",
    url: "#",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=300&fit=crop",
    accentColor: "#f59e0b",
    publishedAt: "Yesterday",
  },
  {
    id: "dn3",
    title: "WebRTC & Real-Time Collaboration: What's New",
    summary:
      "Low-latency video calling combined with shared whiteboards is redefining remote education. Here's what developers need to know about the latest APIs.",
    category: "Tech",
    source: "Dev.to",
    readTime: "5 min",
    url: "#",
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=300&fit=crop",
    accentColor: "#10b981",
    publishedAt: "2 days ago",
  },
  {
    id: "dn4",
    title: "Why Peer Learning Outperforms Solo Study",
    summary:
      "A Stanford meta-analysis across 120 studies confirms: explaining concepts to peers is the single most effective revision strategy for long-term retention.",
    category: "Productivity",
    source: "Harvard Ed Review",
    readTime: "6 min",
    url: "#",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=300&fit=crop",
    accentColor: "#f59e0b",
    publishedAt: "3 days ago",
  },
];

// Dummy search preview for logged-out state
const dummySearchPeople = [
  { userId: "sp1", name: "Rohan Gupta", email: "rohan.g@study.com" },
  { userId: "sp2", name: "Chloe Martin", email: "chloe.m@study.com" },
  { userId: "sp3", name: "Kiran Nair", email: "kiran.n@study.com" },
];

export default function RoomPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: AuthState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: AuthState) => state.auth.isAuthenticated
  );
  const companions = useSelector(
    (state: AuthState) => state.companion.companions
  );
  const pendingRequests = useSelector(
    (state: AuthState) => state.companion.pendingRequests
  );

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsFilter, setNewsFilter] = useState<
    "All" | "AI" | "Tech" | "Productivity"
  >("All");
  const [newsLoading, setNewsLoading] = useState(true);

  // DM panel state
  const [dmTarget, setDmTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  // Keep a ref so socket listeners can read current dmTarget without stale closure
  const dmTargetRef = useRef<{ userId: string; name: string } | null>(null);
  dmTargetRef.current = dmTarget;

  // Unread DM tracking — userId set
  const [unreadDmFrom, setUnreadDmFrom] = useState<Set<string>>(new Set());

  // Companion popover
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [openPopoverPos, setOpenPopoverPos] = useState<{ x: number; y: number } | null>(null);

  // Add companion modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global people search (inline on page)
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchUser[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const globalSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [globalSentRequests, setGlobalSentRequests] = useState<Set<string>>(new Set());

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Invite / status toast
  const [enteringRoom, setEnteringRoom] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const playSuccessSound = () => {
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — major chord arpeggio
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    } catch {}
  };

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem("token");

      // Companion list — API returns { companions: [...] }
      axios
        .get(`${import.meta.env.VITE_API_URL}/companion/list`, {
          headers: { Authorization: token || "" },
        })
        .then((res) => {
          dispatch(setCompanions(res.data.companions || res.data));
          // Ask server which companions are currently online AFTER list is loaded
          getSocket()?.emit("companion:getOnlineCompanions");
        })
        .catch(console.error);

      // Pending companion requests
      axios
        .get(`${import.meta.env.VITE_API_URL}/companion/pending`, {
          headers: { Authorization: token || "" },
        })
        .then((res) => {
          const reqs = res.data.requests || res.data;
          if (Array.isArray(reqs)) dispatch(setPendingRequests(reqs));
        })
        .catch(console.error);
    }

    // Restore unread DM badges from DB so the green rings survive a refresh
    if (isAuthenticated) {
      const token = localStorage.getItem("token");
      axios
        .get(`${import.meta.env.VITE_API_URL}/dm/unread-counts`, {
          headers: { Authorization: token || "" },
        })
        .then((res) => {
          const counts: Record<string, number> = res.data.counts || {};
          const withUnread = Object.keys(counts).filter((id) => counts[id] > 0);
          if (withUnread.length > 0) setUnreadDmFrom(new Set(withUnread));
        })
        .catch(() => {});
    }

    // News — only fetch from API when logged in; logged-out uses dummyNews
    if (isAuthenticated) {
      axios
        .get(`${import.meta.env.VITE_API_URL}/news`)
        .then((res) => {
          const data = res.data;
          setNews(Array.isArray(data) ? data : data.articles || []);
        })
        .catch(console.error)
        .finally(() => setNewsLoading(false));
    } else {
      setNewsLoading(false);
    }
  }, [dispatch, isAuthenticated]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const onOnline = ({ userId }: { userId: string }) =>
      dispatch(setOnline(userId));
    const onOffline = ({ userId }: { userId: string }) =>
      dispatch(setOffline(userId));
    const onInviteError = ({ message }: { message: string }) => {
      setInviteStatus({ msg: message, type: "error" });
      setTimeout(() => setInviteStatus(null), 3000);
    };
    const onRequestReceived = (data: {
      requesterId: string;
      requesterName: string;
    }) => dispatch(addPendingRequest(data));

    const onCompanionAccepted = ({
      acceptorId,
      acceptorName,
    }: {
      acceptorId: string;
      acceptorName: string;
    }) => {
      dispatch(addCompanion({ userId: acceptorId, name: acceptorName }));
    };

    // Mark companion as having unread DMs when panel isn't open for them
    const onDmReceive = (msg: { from: string }) => {
      if (!dmTargetRef.current || dmTargetRef.current.userId !== msg.from) {
        setUnreadDmFrom((prev) => new Set(prev).add(msg.from));
      }
    };

    const onOnlineList = ({ onlineIds }: { onlineIds: string[] }) => {
      onlineIds.forEach((id) => dispatch(setOnline(id)));
    };

    const onReconnect = () => {
      socket.emit("companion:getOnlineCompanions");
    };

    socket.on("companion:online", onOnline);
    socket.on("companion:offline", onOffline);
    socket.on("companion:onlineList", onOnlineList);
    socket.on("inviteError", onInviteError);
    socket.on("companion:requestReceived", onRequestReceived);
    socket.on("companion:accepted", onCompanionAccepted);
    socket.on("dm:receive", onDmReceive);
    socket.on("connect", onReconnect);

    return () => {
      socket.off("companion:online", onOnline);
      socket.off("companion:offline", onOffline);
      socket.off("companion:onlineList", onOnlineList);
      socket.off("inviteError", onInviteError);
      socket.off("companion:requestReceived", onRequestReceived);
      socket.off("companion:accepted", onCompanionAccepted);
      socket.off("dm:receive", onDmReceive);
      socket.off("connect", onReconnect);
    };
  }, [dispatch, isAuthenticated]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const enterMyRoom = async () => {
    if (!user?.roomId || enteringRoom) return;
    setEnteringRoom(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/room/session`,
        {},
        { headers: { Authorization: token || "" } }
      );
      dispatch(enterRoom({ roomId: res.data.roomId, isOwner: true }));
      navigate("/room/call");
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setEnteringRoom(false);
    }
  };

  const currentRoomId = useSelector((s: AuthState) => s.room.currentRoomId);

  const inviteCompanion = (companionId: string) => {
    const socket = getSocket();
    if (!socket || !user) return;
    const roomId = currentRoomId || user.roomId;
    socket.emit("sendInvite", {
      targetUserId: companionId,
      roomId,
      inviterName: user.name,
    });
    setOpenPopover(null);
    setInviteStatus({ msg: "Invite sent!", type: "success" });
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const openDm = (companionId: string, companionName: string) => {
    setDmTarget({ userId: companionId, name: companionName });
    setOpenPopover(null);
    // Clear unread badge for this companion
    setUnreadDmFrom((prev) => {
      const next = new Set(prev);
      next.delete(companionId);
      return next;
    });
  };

  // Modal search (debounced)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/search?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: token || "" } }
        );
        setSearchResults(res.data.users || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  // Global page search (debounced)
  const handleGlobalSearch = (q: string) => {
    setGlobalSearchQuery(q);
    if (globalSearchTimeout.current) clearTimeout(globalSearchTimeout.current);
    if (!q.trim()) { setGlobalSearchResults([]); return; }
    if (!isAuthenticated) return;
    setGlobalSearchLoading(true);
    globalSearchTimeout.current = setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/search?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: token || "" } }
        );
        setGlobalSearchResults(res.data.users || []);
      } catch { setGlobalSearchResults([]); }
      finally { setGlobalSearchLoading(false); }
    }, 400);
  };

  const sendCompanionRequest = async (targetUserId: string, fromModal = false) => {
    setSendingId(targetUserId);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/request`,
        { targetUserId },
        { headers: { Authorization: token || "" } }
      );
      if (fromModal) {
        setSentRequests((prev) => new Set(prev).add(targetUserId));
        setShowAddModal(false);
      } else {
        setGlobalSentRequests((prev) => new Set(prev).add(targetUserId));
      }
      playSuccessSound();
      setInviteStatus({ msg: "Companion request sent!", type: "success" });
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (err: any) {
      console.error(err.response?.data?.message || err.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    setAcceptingId(requesterId);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/accept`,
        { requesterId },
        { headers: { Authorization: token || "" } }
      );
      // Refresh companion list
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/companion/list`, {
        headers: { Authorization: token || "" },
      });
      dispatch(setCompanions(res.data.companions || res.data));
      getSocket()?.emit("companion:getOnlineCompanions");
      dispatch(removePendingRequest(requesterId));
      dispatch(removeByTypeAndSender({ type: "companion_request", fromUserId: requesterId }));
      playSuccessSound();
      setInviteStatus({ msg: "Companion request accepted!", type: "success" });
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    setDecliningId(requesterId);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/decline`,
        { requesterId },
        { headers: { Authorization: token || "" } }
      );
      dispatch(removePendingRequest(requesterId));
    } catch (err: any) { console.error(err); }
    finally { setDecliningId(null); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const imagesOnly = import.meta.env.VITE_NEWS_IMAGES_ONLY === "true";
  const baseNews = imagesOnly ? news.filter((a) => a.imageUrl) : news;
  const filteredNews =
    newsFilter === "All" ? baseNews : baseNews.filter((a) => a.category === newsFilter);

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const avatarColors = [
    "bg-violet-500", "bg-indigo-500", "bg-teal-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-fuchsia-500", "bg-sky-500",
  ];
  const getAvatarColor = (userId: string) =>
    avatarColors[userId.charCodeAt(userId.length - 1) % avatarColors.length];

  const displayCompanions = isAuthenticated && companions.length > 0 ? companions : null;
  const showDummy = !isAuthenticated;
  const companionList = displayCompanions || (showDummy ? dummyCompanions : []);

  // Show global results panel when logged in, query is non-empty, and not mid-debounce
  const showGlobalResults =
    isAuthenticated &&
    globalSearchQuery.length > 0 &&
    (globalSearchResults.length > 0 || !globalSearchLoading);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      {/* Status toast */}
      <AnimatePresence>
        {inviteStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-black/20"
          >
            <div
              className={`pointer-events-auto px-6 py-4 rounded-2xl text-white text-sm poppins-semibold shadow-2xl flex items-center gap-3 ${
                inviteStatus.type === "success"
                  ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 ring-1 ring-white/10"
                  : "bg-gradient-to-r from-red-600 to-rose-600 ring-1 ring-white/10"
              }`}
            >
              {inviteStatus.type === "success" ? (
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} />
                </span>
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <X size={18} />
                </span>
              )}
              {inviteStatus.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 pt-16 pb-10 space-y-8">

        {/* ── People Search ─────────────────────────────────────────────────── */}
        <section>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search people to find study partners..."
              value={globalSearchQuery}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 focus:border-transparent shadow-sm transition-shadow"
            />
            {globalSearchLoading && (
              <Loader2
                size={14}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-400"
              />
            )}
          </div>

          {/* Logged-in results dropdown */}
          <AnimatePresence>
            {showGlobalResults && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="mt-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden"
              >
                {globalSearchResults.length === 0 ? (
                  <p className="text-sm text-center py-5 text-gray-400 dark:text-gray-500 poppins-regular">
                    No results for &ldquo;{globalSearchQuery}&rdquo;
                  </p>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                    {globalSearchResults.slice(0, 6).map((u) => {
                      const isCompanion = companions.some((c) => c.userId === u.userId);
                      const isSent =
                        globalSentRequests.has(u.userId) || sentRequests.has(u.userId);
                      return (
                        <div
                          key={u.userId}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold poppins-semibold ${getAvatarColor(u.userId)}`}
                            >
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                                {u.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
                                {u.email}
                              </p>
                            </div>
                          </div>
                          {isCompanion ? (
                            <span className="text-xs text-emerald-600 poppins-semibold flex items-center gap-1">
                              <CheckCircle size={12} /> Companion
                            </span>
                          ) : isSent ? (
                            <span className="text-xs text-gray-400 poppins-regular">Sent</span>
                          ) : (
                            <button
                              onClick={() => sendCompanionRequest(u.userId, false)}
                              disabled={sendingId === u.userId}
                              className="flex items-center gap-1.5 text-xs poppins-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {sendingId === u.userId ? (
                                <><Loader2 size={11} className="animate-spin" /> Sending...</>
                              ) : (
                                <><UserPlus size={11} /> Add</>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logged-out dummy preview */}
          {!isAuthenticated && (
            <div className="relative mt-3">
              <div className="flex gap-3 overflow-x-hidden pb-1 select-none blur-sm pointer-events-none">
                {dummySearchPeople.map((p) => (
                  <div
                    key={p.userId}
                    className="flex-shrink-0 flex items-center gap-2.5 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(p.userId)}`}
                    >
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400">{p.email}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-gray-50/30 via-gray-50/70 to-gray-50/30 dark:from-gray-950/30 dark:via-gray-950/70 dark:to-gray-950/30">
                <button
                  onClick={() => navigate("/login")}
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-indigo-600 dark:text-indigo-400 poppins-semibold shadow-md border border-indigo-100 dark:border-indigo-900/50 hover:shadow-lg transition-shadow"
                >
                  Login to search for study partners
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Companion Requests ────────────────────────────────────────────── */}
        {isAuthenticated && pendingRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
                Companion Requests
              </h2>
              <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center poppins-bold leading-none">
                {pendingRequests.length}
              </span>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {pendingRequests.map((req) => (
                  <motion.div
                    key={req.requesterId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", damping: 24, stiffness: 280 }}
                    className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold poppins-semibold ${getAvatarColor(req.requesterId)}`}
                      >
                        {getInitials(req.requesterName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                          {req.requesterName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
                          Wants to study with you
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req.requesterId)}
                        disabled={acceptingId === req.requesterId}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-xs poppins-semibold transition-colors flex items-center gap-1.5"
                      >
                        {acceptingId === req.requesterId ? (
                          <><Loader2 size={12} className="animate-spin" /> Accepting...</>
                        ) : (
                          "Accept"
                        )}
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.requesterId)}
                        disabled={decliningId === req.requesterId}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs poppins-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {decliningId === req.requesterId ? (
                          <><Loader2 size={12} className="animate-spin" /> Declining...</>
                        ) : (
                          "Decline"
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ── Companion Presence Bar ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
              Study Companions
            </h2>
            {isAuthenticated && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 text-xs poppins-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                <UserPlus size={13} />
                Add Companion
              </button>
            )}
          </div>

          {/* Logged-in empty state */}
          {isAuthenticated && companions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-indigo-950/40 dark:via-gray-900 dark:to-purple-950/30 px-6 py-8"
            >
              {/* Decorative floating circles */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-100/50 dark:bg-indigo-900/20 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-purple-100/50 dark:bg-purple-900/20 blur-xl" />

              <div className="relative flex flex-col items-center text-center space-y-3">
                {/* Animated avatar stack placeholder */}
                <div className="flex -space-x-3 mb-1">
                  {["bg-indigo-300 dark:bg-indigo-700", "bg-purple-300 dark:bg-purple-700", "bg-pink-300 dark:bg-pink-700"].map((color, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 * i, type: "spring", stiffness: 260, damping: 20 }}
                      className={`w-10 h-10 rounded-full ${color} border-2 border-white dark:border-gray-900 flex items-center justify-center`}
                    >
                      <UserPlus size={14} className="text-white/70" />
                    </motion.div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                  Your study circle is empty
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 poppins-regular max-w-xs leading-relaxed">
                  Search for people above and add them as companions to chat, collaborate on whiteboards, and study together in real time.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs poppins-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <UserPlus size={13} />
                  Find Study Companions
                </button>
              </div>
            </motion.div>
          ) : (
            <div className={`relative ${showDummy ? "mt-3" : ""}`}>
              <div className={`flex gap-4 overflow-x-auto px-1 py-1 scrollbar-none ${showDummy ? "blur-[2px] select-none pointer-events-none" : ""}`}>
                {companionList.map((c) => (
                  <div key={c.userId} className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        if (!isAuthenticated) { navigate("/login"); return; }
                        if (showDummy) return;
                        if (openPopover === c.userId) {
                          setOpenPopover(null);
                          setOpenPopoverPos(null);
                        } else {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setOpenPopoverPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                          setOpenPopover(c.userId);
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="relative">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-sm font-bold poppins-semibold ${getAvatarColor(c.userId)} transition-all duration-300 ${
                            (showDummy ? dummyUnreadIds.has(c.userId) : unreadDmFrom.has(c.userId))
                              ? "ring-[3px] ring-indigo-500"
                              : "ring-2 ring-gray-300 dark:ring-gray-700"
                          }`}
                        >
                          {getInitials(c.name)}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-gray-50 dark:border-gray-950 ${
                            c.isOnline ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] text-gray-600 dark:text-gray-400 poppins-regular max-w-[56px] truncate">
                        {c.name.split(" ")[0]}
                      </span>
                    </button>

                  </div>
                ))}
              </div>

              {/* Logged-out overlay hint */}
              {!isAuthenticated && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-white/0 via-white/60 to-white/0 dark:from-gray-950/0 dark:via-gray-950/60 dark:to-gray-950/0 pointer-events-none">
                  <span className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-indigo-600 dark:text-indigo-400 poppins-semibold shadow-md border border-indigo-100 dark:border-indigo-900/50 hover:shadow-lg transition-shadow">
                    Login to connect with study companions
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Close popover on outside click */}
        {openPopover && (
          <div className="fixed inset-0 z-[199]" onClick={() => { setOpenPopover(null); setOpenPopoverPos(null); }} />
        )}

        {/* Companion popover — rendered via portal so it escapes overflow-x-auto clipping */}
        {isAuthenticated && !showDummy && openPopover && openPopoverPos && (() => {
          const pc = companionList.find(comp => comp.userId === openPopover);
          if (!pc) return null;
          return createPortal(
            <AnimatePresence>
              <motion.div
                key={pc.userId}
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                transition={{ type: "spring", damping: 24, stiffness: 300 }}
                style={{ position: "fixed", left: openPopoverPos.x, top: openPopoverPos.y, transform: "translateX(-50%)" }}
                className="z-[200] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 w-44 space-y-1"
              >
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 poppins-semibold px-1 truncate">
                  {pc.name}
                </p>
                <p className="text-[10px] flex items-center gap-1 px-1 mb-2">
                  {pc.isOnline ? (
                    <>
                      <Wifi size={10} className="text-emerald-500" />
                      <span className="text-emerald-600">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={10} className="text-gray-400" />
                      <span className="text-gray-400">Offline</span>
                    </>
                  )}
                </p>
                <button
                  onClick={() => openDm(pc.userId, pc.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors poppins-regular"
                >
                  <MessageCircle size={13} />
                  Message
                  {unreadDmFrom.has(pc.userId) && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>
                <button
                  onClick={() => inviteCompanion(pc.userId)}
                  disabled={!pc.isOnline}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors poppins-regular disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <DoorOpen size={13} />
                  Invite to My Room
                </button>
              </motion.div>
            </AnimatePresence>,
            document.body
          );
        })()}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 text-white flex items-center justify-between shadow-lg"
        >
          <div>
            <h2 className="text-2xl font-bold poppins-bold leading-tight">
              {isAuthenticated ? "Ready to study?" : "Let's study together"}
            </h2>
            <p className="text-indigo-200 text-sm mt-1 poppins-regular">
              {isAuthenticated
                ? "Your personal room is always ready."
                : "Join thousands of students studying smarter, together."}
            </p>
          </div>
          {isAuthenticated ? (
            <motion.button
              onClick={enterMyRoom}
              disabled={enteringRoom}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold poppins-bold shadow-md hover:bg-indigo-50 transition-colors disabled:opacity-60"
            >
              {enteringRoom ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entering...
                </>
              ) : (
                <>
                  Enter My Room
                  <DoorOpen size={16} />
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold poppins-bold shadow-md hover:bg-indigo-50 transition-colors"
            >
              Get Started
              <Sparkles size={16} />
            </motion.button>
          )}
        </motion.section>

        {/* ── News Feed ────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
              Trending Now
            </h2>
            <div className="flex gap-1.5">
              {(["All", "AI", "Tech", "Productivity"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => isAuthenticated && setNewsFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs poppins-semibold transition-all ${
                    newsFilter === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {newsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
            </div>
          ) : !isAuthenticated ? (
            /* ── Logged-out: blurred dummy cards + overlay ── */
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 blur-sm select-none pointer-events-none">
                {dummyNews.map((article) => (
                  <div
                    key={article.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
                  >
                    {article.imageUrl && (
                      <div className="h-36 overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!article.imageUrl && (
                      <div className="h-1.5 w-full" style={{ background: article.accentColor }} />
                    )}
                    <div className="p-5">
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full poppins-semibold"
                        style={{ background: article.accentColor + "18", color: article.accentColor }}
                      >
                        {article.category}
                      </span>
                      <h3 className="text-base font-bold mt-3 text-gray-900 dark:text-gray-100 leading-snug poppins-bold line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed poppins-regular line-clamp-3">
                        {article.summary}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
                          {article.source} · {article.readTime} · {article.publishedAt}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 poppins-semibold">
                          Read <ExternalLink size={11} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50/30 via-gray-50/70 to-gray-50/30 dark:from-gray-950/30 dark:via-gray-950/70 dark:to-gray-950/30 rounded-2xl">
                <button
                  onClick={() => navigate("/login")}
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-xs text-indigo-600 dark:text-indigo-400 poppins-semibold shadow-md border border-indigo-100 dark:border-indigo-900/50 hover:shadow-lg transition-shadow"
                >
                  Login to read trending articles
                </button>
              </div>
            </div>
          ) : (
            /* ── Logged-in: real articles ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNews.map((article, i) => (
                <motion.a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group block"
                >
                  {article.imageUrl && (
                    <div className="h-36 overflow-hidden">
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {!article.imageUrl && (
                    <div className="h-1.5 w-full" style={{ background: article.accentColor }} />
                  )}
                  <div className="p-5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full poppins-semibold"
                      style={{ background: article.accentColor + "18", color: article.accentColor }}
                    >
                      {article.category}
                    </span>
                    <h3 className="text-base font-bold mt-3 text-gray-900 dark:text-gray-100 leading-snug poppins-bold line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed poppins-regular line-clamp-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
                        {article.source} · {article.readTime} · {article.publishedAt}
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:text-indigo-800 transition-colors poppins-semibold">
                        Read <ExternalLink size={11} />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Add Companion Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && isAuthenticated && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[150]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed inset-0 flex items-center justify-center z-[160] pointer-events-none"
            >
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md mx-4 pointer-events-auto overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 poppins-bold">
                      Add Study Companion
                    </h2>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                    {searchLoading && (
                      <Loader2
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400"
                      />
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
                    {searchResults.length === 0 && searchQuery && !searchLoading && (
                      <p className="text-sm text-gray-400 text-center py-4 poppins-regular">
                        No users found
                      </p>
                    )}
                    {searchResults.map((u) => {
                      const isCompanion = companions.some((c) => c.userId === u.userId);
                      const isSent = sentRequests.has(u.userId);
                      return (
                        <div
                          key={u.userId}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(u.userId)}`}
                            >
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                                {u.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
                                {u.email}
                              </p>
                            </div>
                          </div>
                          {isCompanion ? (
                            <span className="text-xs text-emerald-600 poppins-semibold flex items-center gap-1">
                              <CheckCircle size={12} /> Companion
                            </span>
                          ) : isSent ? (
                            <span className="text-xs text-gray-400 poppins-regular">Sent</span>
                          ) : (
                            <button
                              onClick={() => sendCompanionRequest(u.userId, true)}
                              disabled={sendingId === u.userId}
                              className="flex items-center gap-1.5 text-xs poppins-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {sendingId === u.userId ? (
                                <><Loader2 size={11} className="animate-spin" /> Sending...</>
                              ) : (
                                <><UserPlus size={11} /> Add</>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DM Panel ─────────────────────────────────────────────────────────── */}
      {dmTarget && (
        <DmPanel
          companionId={dmTarget.userId}
          companionName={dmTarget.name}
          onClose={() => setDmTarget(null)}
        />
      )}
    </div>
  );
}
