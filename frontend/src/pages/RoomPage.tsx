import React, { useEffect, useRef, useState } from "react";
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
  BookOpen,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import DmPanel from "../components/DmPanel";
import { AuthState } from "../store/authStore/store";
import {
  setCompanions,
  setOnline,
  setOffline,
  addPendingRequest,
} from "../store/companionStore/companionSlice";
import { enterRoom } from "../store/RoomStore/roomSlice";
import { getSocket } from "../utils/socketInstance";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: "AI" | "Tech" | "Productivity";
  source: string;
  readTime: string;
  url: string;
  accentColor: string;
  publishedAt: string;
}

interface SearchUser {
  userId: string;
  name: string;
  email: string;
}

export default function RoomPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: AuthState) => state.auth.user);
  const companions = useSelector(
    (state: AuthState) => state.companion.companions
  );

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsFilter, setNewsFilter] = useState<"All" | "AI" | "Tech" | "Productivity">("All");
  const [newsLoading, setNewsLoading] = useState(true);

  // DM panel state
  const [dmTarget, setDmTarget] = useState<{ userId: string; name: string } | null>(null);

  // Companion popover
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // Add companion modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite feedback
  const [inviteStatus, setInviteStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch companions + news on mount
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${import.meta.env.VITE_API_URL}/companion/list`, {
        headers: { Authorization: token || "" },
      })
      .then((res) => {
        dispatch(setCompanions(res.data));
      })
      .catch(console.error);

    axios
      .get(`${import.meta.env.VITE_API_URL}/news`)
      .then((res) => {
        setNews(res.data);
      })
      .catch(console.error)
      .finally(() => setNewsLoading(false));
  }, [dispatch]);

  // Socket presence listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onOnline = ({ userId }: { userId: string }) => dispatch(setOnline(userId));
    const onOffline = ({ userId }: { userId: string }) => dispatch(setOffline(userId));
    const onInviteError = ({ message }: { message: string }) => {
      setInviteStatus({ msg: message, type: "error" });
      setTimeout(() => setInviteStatus(null), 3000);
    };
    const onRequestReceived = (data: { requesterId: string; requesterName: string }) => {
      dispatch(addPendingRequest(data));
    };

    socket.on("companion:online", onOnline);
    socket.on("companion:offline", onOffline);
    socket.on("inviteError", onInviteError);
    socket.on("companion:requestReceived", onRequestReceived);

    return () => {
      socket.off("companion:online", onOnline);
      socket.off("companion:offline", onOffline);
      socket.off("inviteError", onInviteError);
      socket.off("companion:requestReceived", onRequestReceived);
    };
  }, [dispatch]);

  const enterMyRoom = () => {
    if (!user?.roomId) return;
    dispatch(enterRoom({ roomId: user.roomId, isOwner: true }));
    navigate("/room/call");
  };

  const inviteCompanion = (companionId: string) => {
    const socket = getSocket();
    if (!socket || !user) return;
    socket.emit("sendInvite", {
      targetUserId: companionId,
      roomId: user.roomId,
      inviterName: user.name,
    });
    setOpenPopover(null);
    setInviteStatus({ msg: "Invite sent!", type: "success" });
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const openDm = (companionId: string, companionName: string) => {
    setDmTarget({ userId: companionId, name: companionName });
    setOpenPopover(null);
  };

  // Search users (debounced)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/search?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: token || "" } }
        );
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const sendCompanionRequest = async (targetUserId: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/request`,
        { targetUserId },
        { headers: { Authorization: token || "" } }
      );
      setSentRequests((prev) => new Set(prev).add(targetUserId));
      // Also emit via socket for real-time notification
      const socket = getSocket();
      socket?.emit("companion:sendRequest", { targetUserId });
    } catch (err: any) {
      console.error("Request error:", err.response?.data?.message || err.message);
    }
  };

  const filteredNews =
    newsFilter === "All" ? news : news.filter((a) => a.category === newsFilter);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const avatarColors = [
    "bg-violet-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-cyan-500",
  ];
  const getAvatarColor = (userId: string) =>
    avatarColors[userId.charCodeAt(userId.length - 1) % avatarColors.length];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Invite status toast */}
      <AnimatePresence>
        {inviteStatus && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: "50%" }}
            animate={{ opacity: 1, y: 0, x: "50%" }}
            exit={{ opacity: 0, y: -60, x: "50%" }}
            className={`fixed top-4 right-1/2 z-[200] px-4 py-2.5 rounded-xl text-white text-sm poppins-semibold shadow-lg ${
              inviteStatus.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {inviteStatus.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 pt-16 pb-10 space-y-8">
        {/* ── Companion Presence Bar ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest poppins-semibold">
              Study Companions
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs poppins-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <UserPlus size={13} />
              Add Companion
            </button>
          </div>

          {companions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 poppins-regular">
                No companions yet.{" "}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-indigo-500 hover:underline font-medium"
                >
                  Find study companions →
                </button>
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
              {companions.map((c) => (
                <div key={c.userId} className="relative flex-shrink-0">
                  <button
                    onClick={() =>
                      setOpenPopover(openPopover === c.userId ? null : c.userId)
                    }
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="relative">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-sm font-bold poppins-semibold ${getAvatarColor(
                          c.userId
                        )} ring-2 ring-offset-2 transition-all ${
                          c.isOnline ? "ring-emerald-400" : "ring-gray-200"
                        }`}
                      >
                        {getInitials(c.name)}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          c.isOnline ? "bg-emerald-400" : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-gray-600 poppins-regular max-w-[56px] truncate">
                      {c.name.split(" ")[0]}
                    </span>
                  </button>

                  {/* Popover */}
                  <AnimatePresence>
                    {openPopover === c.userId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 8 }}
                        transition={{ type: "spring", damping: 24, stiffness: 300 }}
                        className="absolute top-[76px] left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-44 space-y-1"
                      >
                        <p className="text-xs font-semibold text-gray-700 poppins-semibold px-1 truncate">
                          {c.name}
                        </p>
                        <p className="text-[10px] flex items-center gap-1 px-1 mb-2">
                          {c.isOnline ? (
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
                          onClick={() => openDm(c.userId, c.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors poppins-regular"
                        >
                          <MessageCircle size={13} />
                          Message
                        </button>
                        <button
                          onClick={() => inviteCompanion(c.userId)}
                          disabled={!c.isOnline}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors poppins-regular disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <DoorOpen size={13} />
                          Invite to My Room
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Close popover on outside click */}
        {openPopover && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
        )}

        {/* ── "Let's Study Together" CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 text-white flex items-center justify-between shadow-lg"
        >
          <div>
            <h2 className="text-2xl font-bold poppins-bold leading-tight">
              Ready to study?
            </h2>
            <p className="text-indigo-200 text-sm mt-1 poppins-regular">
              Your personal room is always ready.
            </p>
          </div>
          <motion.button
            onClick={enterMyRoom}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold poppins-bold shadow-md hover:bg-indigo-50 transition-colors"
          >
            Enter My Room
            <DoorOpen size={16} />
          </motion.button>
        </motion.section>

        {/* ── News Feed ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest poppins-semibold">
              Trending Now
            </h2>
            <div className="flex gap-1.5">
              {(["All", "AI", "Tech", "Productivity"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewsFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs poppins-semibold transition-all ${
                    newsFilter === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNews.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ background: article.accentColor }}
                  />
                  <div className="p-5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full poppins-semibold"
                      style={{
                        background: article.accentColor + "18",
                        color: article.accentColor,
                      }}
                    >
                      {article.category}
                    </span>
                    <h3 className="text-base font-bold mt-3 text-gray-900 leading-snug poppins-bold">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed poppins-regular">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400 poppins-regular">
                        {article.source} · {article.readTime} · {article.publishedAt}
                      </span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors poppins-semibold"
                      >
                        Read more <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Add Companion Modal ── */}
      <AnimatePresence>
        {showAddModal && (
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
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 pointer-events-auto overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 poppins-bold">
                      Add Study Companion
                    </h2>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Search input */}
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
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                    {searchLoading && (
                      <Loader2
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400"
                      />
                    )}
                  </div>

                  {/* Results */}
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
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(
                                u.userId
                              )}`}
                            >
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 poppins-semibold">
                                {u.name}
                              </p>
                              <p className="text-xs text-gray-400 poppins-regular">
                                {u.email}
                              </p>
                            </div>
                          </div>
                          {isCompanion ? (
                            <span className="text-xs text-emerald-600 poppins-semibold flex items-center gap-1">
                              <CheckCircle size={12} /> Companion
                            </span>
                          ) : isSent ? (
                            <span className="text-xs text-gray-400 poppins-regular">
                              Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => sendCompanionRequest(u.userId)}
                              className="flex items-center gap-1.5 text-xs poppins-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <UserPlus size={11} /> Add
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

      {/* ── DM Panel ── */}
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
