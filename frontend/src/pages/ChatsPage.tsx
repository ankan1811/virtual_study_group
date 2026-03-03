import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { MessageCircle, Loader2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "../components/Navbar";
import DmPanel from "../components/DmPanel";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";

const API = import.meta.env.VITE_API_URL;

interface ChatPreview {
  companionId: string;
  companionName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isMine: boolean;
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: AuthState) => s.auth.isAuthenticated);
  const user = useSelector((s: AuthState) => s.auth.user);

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dmTarget, setDmTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const dmTargetRef = useRef(dmTarget);
  dmTargetRef.current = dmTarget;

  // Fetch recent chats
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API}/dm/recent`, { headers: { authorization: token } })
      .then((res) => setChats(res.data.chats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Real-time: bump chat to top on new message
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (msg: {
      from: string;
      fromName: string;
      content: string;
      createdAt: string;
    }) => {
      setChats((prev) => {
        const companionId =
          msg.from === user?.userId
            ? // outgoing: find who the DM was to — use dmTarget
              dmTargetRef.current?.userId || msg.from
            : msg.from;
        const companionName =
          msg.from === user?.userId
            ? dmTargetRef.current?.name || "Unknown"
            : msg.fromName;
        const isMine = msg.from === user?.userId;

        const existing = prev.find((c) => c.companionId === companionId);
        const updated: ChatPreview = {
          companionId,
          companionName: existing?.companionName || companionName,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount:
            isMine || dmTargetRef.current?.userId === companionId
              ? 0
              : (existing?.unreadCount || 0) + 1,
          isMine,
        };

        const filtered = prev.filter((c) => c.companionId !== companionId);
        return [updated, ...filtered];
      });
    };

    socket.on("dm:receive", handleReceive);
    return () => {
      socket.off("dm:receive", handleReceive);
    };
  }, [user?.userId]);

  const openChat = (chat: ChatPreview) => {
    // Clear unread
    setChats((prev) =>
      prev.map((c) =>
        c.companionId === chat.companionId ? { ...c, unreadCount: 0 } : c
      )
    );
    setDmTarget({ userId: chat.companionId, name: chat.companionName });
  };

  const closeDm = () => setDmTarget(null);

  const getInitials = (n: string) =>
    n
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const filtered = search.trim()
    ? chats.filter((c) =>
        c.companionName.toLowerCase().includes(search.toLowerCase())
      )
    : chats;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white poppins-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <MessageCircle
                size={22}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>
            Chats
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 poppins-regular">
            Your recent conversations
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative mb-4"
        >
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all poppins-regular placeholder:text-gray-400"
          />
        </motion.div>

        {/* Chat list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MessageCircle
                size={28}
                className="text-gray-400 dark:text-gray-500"
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 poppins-regular text-sm">
              {search.trim()
                ? "No chats match your search"
                : "No conversations yet. Message a companion to get started!"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800"
          >
            {filtered.map((chat, i) => (
              <motion.button
                key={chat.companionId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openChat(chat)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
              >
                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold poppins-semibold shadow-sm ${
                    chat.unreadCount > 0
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-300 dark:ring-indigo-700"
                      : "bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700"
                  }`}
                >
                  {getInitials(chat.companionName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm truncate poppins-${
                        chat.unreadCount > 0 ? "semibold" : "regular"
                      } ${
                        chat.unreadCount > 0
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {chat.companionName}
                    </p>
                    <span
                      className={`text-[11px] flex-shrink-0 ml-2 ${
                        chat.unreadCount > 0
                          ? "text-indigo-600 dark:text-indigo-400 font-medium"
                          : "text-gray-400 dark:text-gray-500"
                      } poppins-regular`}
                    >
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p
                      className={`text-[13px] truncate max-w-[280px] ${
                        chat.unreadCount > 0
                          ? "text-gray-700 dark:text-gray-300 font-medium"
                          : "text-gray-400 dark:text-gray-500"
                      } poppins-regular`}
                    >
                      {chat.isMine && (
                        <span className="text-gray-400 dark:text-gray-500">
                          You:{" "}
                        </span>
                      )}
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center px-1.5 poppins-semibold">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* DM Panel */}
      <AnimatePresence>
        {dmTarget && (
          <DmPanel
            companionId={dmTarget.userId}
            companionName={dmTarget.name}
            onClose={closeDm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
