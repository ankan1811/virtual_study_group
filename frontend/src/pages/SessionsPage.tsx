import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Clock, ChevronDown, ChevronRight, Loader2, FileText, Check, MessageSquare } from "lucide-react";
import { generateAndSaveSummary } from "../utils/summaryApi";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";

interface Session {
  id: string;
  roomId: string;
  createdAt: string;
  expiresAt: string;
}

interface ChatMsg {
  message: string;
  senderName: string;
  sendById: string;
  createdAt: string;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: AuthState) => s.auth.isAuthenticated);
  const user = useSelector((s: AuthState) => s.auth.user);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionChats, setSessionChats] = useState<Record<string, ChatMsg[]>>({});
  const [sessionChatsLoading, setSessionChatsLoading] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);
  const [summaryDone, setSummaryDone] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    const token = localStorage.getItem("token");
    axios
      .get(`${import.meta.env.VITE_API_URL}/room/sessions`, {
        headers: { Authorization: token || "" },
      })
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const toggleSessionChats = async (sessionRoomId: string) => {
    if (expandedSession === sessionRoomId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionRoomId);
    if (sessionChats[sessionRoomId]) return;
    setSessionChatsLoading(sessionRoomId);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/room/sessions/${encodeURIComponent(sessionRoomId)}/chats`,
        { headers: { Authorization: token || "" } }
      );
      setSessionChats((prev) => ({ ...prev, [sessionRoomId]: res.data.chats || [] }));
    } catch {
      setSessionChats((prev) => ({ ...prev, [sessionRoomId]: [] }));
    } finally {
      setSessionChatsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white poppins-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <Clock
                size={22}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>
            Session History
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 poppins-regular">
            Browse your past study room sessions and generate AI summaries
          </p>

          {/* Stats strip */}
          {!loading && sessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-4 flex flex-wrap items-center gap-2.5"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
                <Clock size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 poppins-semibold">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40">
                <MessageSquare size={13} className="text-violet-500 dark:text-violet-400" />
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 poppins-semibold">
                  With chat history
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                <FileText size={13} className="text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 poppins-semibold">
                  AI summaries available
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Clock size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 poppins-medium">
              No sessions yet
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600 poppins-regular mt-1">
              Sessions will appear here after you enter your room
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const isExpanded = expandedSession === s.roomId;
              const chats = sessionChats[s.roomId];
              const isLoading = sessionChatsLoading === s.roomId;
              const chatCount = chats?.length;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <button
                      onClick={() => toggleSessionChats(s.roomId)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-violet-400" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" — "}
                          {new Date(s.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        {chatCount !== undefined && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 poppins-regular">
                            {chatCount} message{chatCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      title="Generate summary"
                      disabled={summaryLoading === s.roomId}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSummaryLoading(s.roomId);
                        try {
                          let msgs = sessionChats[s.roomId];
                          if (!msgs) {
                            const token = localStorage.getItem("token");
                            const res = await axios.get(
                              `${import.meta.env.VITE_API_URL}/room/sessions/${encodeURIComponent(s.roomId)}/chats`,
                              { headers: { Authorization: token || "" } }
                            );
                            msgs = res.data.chats || [];
                            setSessionChats((prev) => ({ ...prev, [s.roomId]: msgs }));
                          }
                          if (msgs.length > 0) {
                            const chatMessages = msgs.map((c: ChatMsg) => ({
                              sentby: c.senderName,
                              msg: c.message,
                            }));
                            const dateLabel = new Date(s.createdAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            });
                            await generateAndSaveSummary(
                              "/ai/summary",
                              { messages: chatMessages },
                              { type: "room", contextId: s.roomId, contextLabel: `Session — ${dateLabel}` }
                            );
                            setSummaryDone(s.roomId);
                            setTimeout(() => setSummaryDone(null), 2500);
                          }
                        } catch (err) {
                          console.error("Session summary failed:", err);
                        } finally {
                          setSummaryLoading(null);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 text-gray-400 hover:text-violet-500 transition-colors disabled:opacity-40 flex-shrink-0 text-xs poppins-medium"
                    >
                      {summaryLoading === s.roomId ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-violet-400" />
                          <span className="text-violet-400">Saving...</span>
                        </>
                      ) : summaryDone === s.roomId ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Saved!</span>
                        </>
                      ) : (
                        <>
                          <FileText size={13} />
                          <span>Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <div
                        className="px-4 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
                        style={{ maxHeight: '60vh' }}
                      >
                        {isLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                          </div>
                        ) : !chats || chats.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4 poppins-regular">
                            No messages in this session
                          </p>
                        ) : (() => {
                          const limit = visibleCount[s.roomId] || PAGE_SIZE;
                          const total = chats.length;
                          const startIdx = Math.max(0, total - limit);
                          const visible = chats.slice(startIdx);
                          const hasMore = startIdx > 0;
                          return (
                            <div className="space-y-2.5">
                              {hasMore && (
                                <button
                                  onClick={() =>
                                    setVisibleCount((prev) => ({
                                      ...prev,
                                      [s.roomId]: (prev[s.roomId] || PAGE_SIZE) + PAGE_SIZE,
                                    }))
                                  }
                                  className="w-full py-2 text-xs text-violet-500 dark:text-violet-400 poppins-medium hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                                >
                                  Load {Math.min(PAGE_SIZE, startIdx)} older messages ({startIdx} remaining)
                                </button>
                              )}
                              {visible.map((c, i) => {
                                const isMine = c.sendById === user?.userId;
                                return (
                                  <div
                                    key={startIdx + i}
                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[13px] poppins-regular ${
                                        isMine
                                          ? "bg-indigo-600 text-white rounded-br-sm"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                                      }`}
                                    >
                                      {!isMine && (
                                        <p className="text-[10px] font-semibold poppins-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">
                                          {c.senderName}
                                        </p>
                                      )}
                                      <p className="leading-snug break-words">{c.message}</p>
                                      <p
                                        className={`text-[9px] mt-1 ${
                                          isMine ? "text-indigo-200" : "text-gray-400"
                                        }`}
                                      >
                                        {new Date(c.createdAt).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
