import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
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

      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 poppins-bold">
              Session History
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
              Browse your past study room sessions
            </p>
          </div>
        </div>

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
              const isExpired = new Date(s.expiresAt) < new Date();
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSessionChats(s.roomId)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-400" />
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
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 poppins-regular">
                          {isExpired ? "Expired" : "Active"}
                        </p>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 max-h-80 overflow-y-auto">
                      {isLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 size={18} className="animate-spin text-indigo-400" />
                        </div>
                      ) : !chats || chats.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4 poppins-regular">
                          No messages in this session
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {chats.map((c, i) => {
                            const isMine = c.sendById === user?.userId;
                            return (
                              <div
                                key={i}
                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] poppins-regular ${
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
                                  <p className="leading-snug">{c.message}</p>
                                  <p
                                    className={`text-[9px] mt-0.5 ${
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
                      )}
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
