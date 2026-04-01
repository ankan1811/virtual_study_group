import React, { useCallback, useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";
import {
  ArrowLeft,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  PenTool,
  FileText,
  Check,
  Save,
  X,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { generateAndSaveSummary } from "../utils/summaryApi";
import { useDarkMode } from "../utils/useDarkMode";

const Excalidraw = React.lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({
    default: mod.Excalidraw,
  }))
);

interface WhiteboardElement {
  type: string;
  text?: string;
  width: number;
  height: number;
}

interface QA {
  question: string;
  answer: string;
}

export default function WhiteboardPage() {
  const { roomId: paramRoomId } = useParams<{ roomId: string }>();
  const user = useSelector((state: AuthState) => state.auth.user);
  const { isDark } = useDarkMode();
  const roomIdFromRedux = useSelector(
    (state: AuthState) => state.room.currentRoomId
  );
  const roomId = paramRoomId ?? roomIdFromRedux ?? user?.roomId ?? "";
  const navigate = useNavigate();

  // Excalidraw
  const [api, setApi] = useState<any>(null);
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersionRef = useRef<number>(0);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  const pointerThrottle = useRef<number>(0);

  // AI panel
  const [showAi, setShowAi] = useState(false);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [wbSummaryLoading, setWbSummaryLoading] = useState(false);
  const [wbSummaryDone, setWbSummaryDone] = useState(false);

  // Whiteboard presence
  const [wbUsers, setWbUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const followingIdRef = useRef<string | null>(null);
  followingIdRef.current = followingId;
  const apiRef = useRef<any>(null);
  apiRef.current = api;

  // Save-on-exit modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingWb, setSavingWb] = useState(false);

  // Excalidraw onChange — only emit when elements actually changed
  const handleChange = useCallback(
    (excElements: readonly any[]) => {
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      // Fingerprint: sum of element versions — skips re-emitting unchanged elements
      const version = excElements.reduce(
        (acc: number, el: any) => acc + (el.version || 0) + (el.isDeleted ? 0 : 1),
        0
      );
      if (version === lastVersionRef.current) return;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        lastVersionRef.current = version;
        const active = excElements.filter((el: any) => !el.isDeleted);
        setElements(
          active.map((el: any) => ({
            type: el.type,
            ...(el.type === "text" && { text: el.text }),
            width: el.width,
            height: el.height,
          }))
        );
        const socket = getSocket();
        if (socket && roomId) {
          socket.emit("whiteboard:update", {
            roomId,
            elements: Array.from(excElements),
          });
        }
      }, 200);
    },
    [roomId]
  );

  // Collaborator color generator (deterministic from userId — no red to avoid "offline" confusion)
  const COLLAB_COLORS = [
    { background: "#4ECDC4", stroke: "#16A085" },
    { background: "#45B7D1", stroke: "#2980B9" },
    { background: "#96CEB4", stroke: "#27AE60" },
    { background: "#A29BFE", stroke: "#6C5CE7" },
    { background: "#FDA7DF", stroke: "#D63384" },
    { background: "#FDCB6E", stroke: "#E17055" },
  ];
  const getColorForUser = (uid: string) => {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = (hash + uid.charCodeAt(i)) % COLLAB_COLORS.length;
    return COLLAB_COLORS[hash];
  };

  // ── Stable listeners: pointer + presence (never torn down on api change) ──
  const joinedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    const onPointerUpdate = ({
      userId: uid,
      userName: uname,
      pointer,
      button,
      viewport,
    }: {
      userId: string;
      userName: string;
      pointer: { x: number; y: number; tool?: "pointer" | "laser" };
      button: "up" | "down";
      viewport?: { scrollX: number; scrollY: number; zoom: number };
    }) => {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(uid, {
          username: uname,
          color: getColorForUser(uid),
          pointer: { x: pointer.x, y: pointer.y, tool: pointer.tool || "pointer" },
          button,
          isCurrentUser: false,
        });
        return next;
      });

      // Follow mode — mirror the followed person's viewport (see what they see)
      if (followingIdRef.current === uid && apiRef.current && viewport) {
        apiRef.current.updateScene({
          appState: {
            scrollX: viewport.scrollX,
            scrollY: viewport.scrollY,
            zoom: { value: viewport.zoom },
          },
        });
      }

      // Self-healing presence: if this user's pill disappeared, restore it
      setWbUsers((prev) => {
        if (prev.some((u) => u.userId === uid)) return prev;
        return [...prev, { userId: uid, userName: uname }];
      });
    };

    const onUsers = (users: { userId: string; userName: string }[]) => {
      setWbUsers(users);
    };

    // Re-join on socket reconnection (e.g. after brief network blip)
    const onReconnect = () => {
      if (roomId) socket.emit("whiteboard:join", { roomId });
    };

    socket.on("whiteboard:pointer-update", onPointerUpdate);
    socket.on("whiteboard:users", onUsers);
    socket.on("connect", onReconnect);

    // Join room + register presence (once per roomId)
    if (joinedRoomRef.current !== roomId) {
      joinedRoomRef.current = roomId;
      socket.emit("whiteboard:join", { roomId });
    }

    return () => {
      socket.off("whiteboard:pointer-update", onPointerUpdate);
      socket.off("whiteboard:users", onUsers);
      socket.off("connect", onReconnect);
    };
  }, [roomId]);

  // ── Sync listeners (need api) ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !api) return;

    const onSync = ({ elements: els }: { elements: any[] }) => {
      isRemoteUpdate.current = true;
      api.updateScene({ elements: els });
    };
    const onCleared = () => {
      isRemoteUpdate.current = true;
      api.updateScene({ elements: [] });
    };
    const onState = ({ elements: els }: { elements: any[] }) => {
      isRemoteUpdate.current = true;
      api.updateScene({ elements: els });
    };

    socket.on("whiteboard:sync", onSync);
    socket.on("whiteboard:cleared", onCleared);
    socket.on("whiteboard:state", onState);

    // Re-request state now that api + listeners are ready
    // (the first whiteboard:join in [roomId] effect may have fired before api was set)
    if (roomId) {
      socket.emit("whiteboard:join", { roomId });
    }

    return () => {
      socket.off("whiteboard:sync", onSync);
      socket.off("whiteboard:cleared", onCleared);
      socket.off("whiteboard:state", onState);
    };
  }, [api]);

  // Clean up whiteboard presence on unmount
  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (socket && joinedRoomRef.current) {
        socket.emit("whiteboard:leave", { roomId: joinedRoomRef.current });
        joinedRoomRef.current = null;
      }
    };
  }, []);

  // Pointer move → broadcast to others + auto-unfollow on click
  const handlePointerUpdate = useCallback(
    ({ pointer, button }: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button: "up" | "down" }) => {
      if (button === "down" && followingIdRef.current) setFollowingId(null);
      const now = Date.now();
      if (now - pointerThrottle.current < 50) return;
      pointerThrottle.current = now;
      const socket = getSocket();
      if (socket && roomId) {
        // Include viewport state so followers can mirror what we see
        const s = apiRef.current?.getAppState();
        const viewport = s ? { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom?.value || 1 } : undefined;
        socket.emit("whiteboard:pointer", { roomId, pointer, button, viewport });
      }
    },
    [roomId]
  );

  // Push collaborator cursors to Excalidraw via API
  useEffect(() => {
    if (api) {
      api.updateScene({ collaborators });
    }
  }, [api, collaborators]);

  // Clear whiteboard
  const handleClear = () => {
    if (api) {
      api.updateScene({ elements: [] });
      setElements([]);
      const socket = getSocket();
      if (socket && roomId) {
        socket.emit("whiteboard:clear", { roomId });
      }
    }
  };

  // AI explain
  const explainWhiteboard = async (userQuestion?: string) => {
    if (elements.length === 0) return;
    setAiLoading(true);
    const token = localStorage.getItem("token");
    const question = userQuestion?.trim() || undefined;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/whiteboard-explain`,
        { elements, question },
        { headers: { Authorization: token || "" } }
      );
      setQaHistory((prev) => [
        ...prev,
        {
          question: question || "Explain this whiteboard",
          answer: res.data.explanation,
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } catch {
      setQaHistory((prev) => [
        ...prev,
        {
          question: question || "Explain this whiteboard",
          answer: "Could not analyze the whiteboard. Please try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
      setCustomPrompt("");
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      explainWhiteboard(customPrompt);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Hide Excalidraw's built-in collaborator avatars — we use our own pills */}
      <style>{`
        .excalidraw .UserList-Wrapper { display: none !important; }
        .excalidraw .UserList__collaborators { display: none !important; }
        .excalidraw .UserList__wrapper { display: none !important; }
        .excalidraw .layer-ui__library { display: none !important; }
        .excalidraw .sidebar-trigger.default-sidebar-trigger { display: none !important; }
        .excalidraw .HelpButton { display: none !important; }
        .excalidraw .help-icon { display: none !important; }
        .excalidraw .App-toolbar__extra-tools-trigger { display: none !important; }
        .excalidraw .App-toolbar__divider:last-of-type { display: none !important; }
        .excalidraw .Island.App-menu__left::before {
          content: '';
          display: block;
          width: 100%;
          padding-bottom: 52px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 48'%3E%3Ctext x='100' y='20' text-anchor='middle' font-family='system-ui,-apple-system,sans-serif' font-weight='700' font-size='14' fill='%237c3aed'%3EVirtual Study Group%3C/text%3E%3Ctext x='100' y='36' text-anchor='middle' font-family='system-ui,-apple-system,sans-serif' font-weight='400' font-size='10' fill='%239ca3af'%3Eby Ankan Pal%3C/text%3E%3C/svg%3E") no-repeat center;
          border-bottom: 1px solid var(--default-border-color);
          margin-bottom: 8px;
        }
        .excalidraw .main-menu-trigger { display: none !important; }
      `}</style>
      {/* Top toolbar */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 bg-gradient-to-r from-violet-600 to-indigo-600 border-b border-violet-700 shadow-lg shadow-violet-500/10">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (elements.length > 0) {
                setShowSaveModal(true);
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/15 transition-colors text-sm poppins-medium"
          >
            <ArrowLeft size={16} />
            Back to Room
          </button>
          <div className="w-px h-5 bg-violet-400/30" />
          <div className="flex items-center gap-2">
            <PenTool size={14} className="text-white" />
            <span className="text-sm text-white poppins-semibold">
              Whiteboard
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-violet-200 hover:text-red-400 hover:bg-red-500/20 transition-colors text-xs poppins-medium"
          >
            <Trash2 size={13} />
            Clear
          </button>
          <button
            onClick={async () => {
              setWbSummaryLoading(true);
              try {
                await generateAndSaveSummary(
                  "/ai/whiteboard-summary",
                  { elements },
                  { type: "whiteboard", contextId: roomId, contextLabel: `${user?.name || "Unknown"}'s Whiteboard` }
                );
                setWbSummaryDone(true);
                setTimeout(() => setWbSummaryDone(false), 2500);
              } catch (err) {
                console.error("Whiteboard summary failed:", err);
              } finally {
                setWbSummaryLoading(false);
              }
            }}
            disabled={wbSummaryLoading || elements.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-violet-200 hover:text-emerald-300 hover:bg-white/15 transition-colors text-xs poppins-medium disabled:opacity-40"
          >
            {wbSummaryLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : wbSummaryDone ? (
              <Check size={13} className="text-emerald-300" />
            ) : (
              <FileText size={13} />
            )}
            {wbSummaryLoading ? "Saving..." : wbSummaryDone ? "Saved!" : "Summary"}
          </button>
          <button
            onClick={() => setShowAi(!showAi)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs poppins-medium ${
              showAi
                ? "bg-white/25 text-white"
                : "text-violet-200 hover:text-white hover:bg-white/15"
            }`}
          >
            {showAi ? (
              <PanelRightClose size={14} />
            ) : (
              <PanelRightOpen size={14} />
            )}
            AI Assist
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Excalidraw canvas */}
        <div className="flex-1 relative bg-white">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-gray-50 gap-3">
                <Loader2
                  className="animate-spin text-indigo-400"
                  size={24}
                />
                <span className="text-sm text-gray-400 poppins-regular">
                  Loading whiteboard...
                </span>
              </div>
            }
          >
            <Excalidraw
              excalidrawAPI={(excalidrawApi: any) => setApi(excalidrawApi)}
              onChange={handleChange}
              onPointerUpdate={handlePointerUpdate}
              theme={isDark ? "dark" : "light"}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                },
              }}
              renderTopRightUI={() =>
                wbUsers.length > 0 ? (
                  <div className={`flex flex-col gap-0.5 p-1.5 rounded-2xl mt-8 ${isDark ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-xl shadow-lg border ${isDark ? "border-gray-700/40" : "border-black/[0.06]"} mr-1`}>
                    {wbUsers.map((u) => {
                      const isMe = u.userId === user?.userId;
                      const isFollowing = followingId === u.userId;
                      const color = getColorForUser(u.userId);
                      const initial = (u.userName || "?")[0].toUpperCase();
                      const firstName = u.userName.split(" ")[0];
                      return (
                        <div
                          key={u.userId}
                          className={`flex items-center gap-2 px-1.5 py-1 rounded-xl transition-all duration-200 ${
                            isFollowing
                              ? isDark ? "bg-violet-500/15" : "bg-violet-50"
                              : ""
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                              style={{ background: isMe ? "linear-gradient(135deg, #10B981, #059669)" : `linear-gradient(135deg, ${color.background}, ${color.stroke})` }}
                            >
                              {initial}
                            </div>
                            <span className={`absolute -bottom-px -right-px w-[9px] h-[9px] rounded-full border-[1.5px] ${isDark ? "border-gray-800" : "border-white"} bg-emerald-400`} />
                          </div>

                          {/* Name */}
                          <span className={`text-[11px] poppins-semibold flex-1 min-w-0 truncate ${
                            isMe
                              ? isDark ? "text-emerald-400" : "text-emerald-600"
                              : isDark ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {isMe ? "You" : firstName}
                          </span>

                          {/* Follow button (non-self only) */}
                          {isMe ? (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] poppins-semibold ${isDark ? "bg-emerald-900/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                              online
                            </span>
                          ) : (
                            <button
                              onClick={() => setFollowingId(isFollowing ? null : u.userId)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] poppins-semibold transition-all duration-150 flex-shrink-0 ${
                                isFollowing
                                  ? isDark
                                    ? "bg-violet-600 text-white hover:bg-violet-500"
                                    : "bg-violet-600 text-white hover:bg-violet-500"
                                  : isDark
                                    ? "bg-violet-600 text-white hover:bg-violet-500"
                                    : "bg-violet-600 text-white hover:bg-violet-500"
                              }`}
                            >
                              <Eye size={9} />
                              {isFollowing ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null
              }
            />
          </React.Suspense>
        </div>

        {/* AI Sidebar */}
        <AnimatePresence>
          {showAi && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 h-full border-l border-gray-200 bg-gray-50 overflow-hidden flex flex-col"
            >
              {/* Sidebar header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold poppins-semibold text-gray-800">
                      AI Whiteboard Assist
                    </p>
                    <p className="text-[10px] text-gray-400 poppins-regular">
                      Ask questions about your drawing
                    </p>
                  </div>
                </div>
              </div>

              {/* Q&A scrollable area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {qaHistory.length === 0 && elements.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
                      <PenTool size={24} className="text-teal-300" />
                    </div>
                    <p className="text-xs text-gray-400 poppins-regular max-w-[200px]">
                      Draw something on the whiteboard, then ask AI to explain
                      it
                    </p>
                  </div>
                )}
                {qaHistory.length === 0 && elements.length > 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
                      <Sparkles size={24} className="text-teal-300" />
                    </div>
                    <p className="text-xs text-gray-400 poppins-regular max-w-[200px]">
                      Click "Explain" or ask a question about your drawing
                    </p>
                  </div>
                )}
                {qaHistory.map((qa, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-teal-600 text-white px-3 py-2 rounded-2xl rounded-br-sm text-[13px] poppins-regular shadow-sm">
                        {qa.question}
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] bg-white border border-gray-100 px-3 py-2.5 rounded-2xl rounded-bl-sm text-[13px] text-gray-800 poppins-regular shadow-sm leading-relaxed">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles size={10} className="text-teal-500" />
                          <span className="text-[9px] font-semibold text-teal-500 poppins-semibold uppercase tracking-wide">
                            AI
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{qa.answer}</p>
                      </div>
                    </motion.div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                      <Loader2
                        size={14}
                        className="animate-spin text-teal-400"
                      />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white space-y-2">
                <button
                  onClick={() => explainWhiteboard()}
                  disabled={aiLoading || elements.length === 0}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Explain This
                    </>
                  )}
                </button>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ask about the drawing..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={handleAiKeyDown}
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent poppins-regular"
                  />
                  <button
                    onClick={() => explainWhiteboard(customPrompt)}
                    disabled={!customPrompt.trim() || aiLoading}
                    className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save-on-exit modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[360px] bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Save size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white poppins-semibold">
                      Save whiteboard?
                    </h3>
                    <p className="text-[11px] text-gray-400 poppins-regular mt-0.5">
                      Your drawings will be available next time
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setSavingWb(true);
                    try {
                      const socket = getSocket();
                      if (socket && roomId) {
                        socket.emit("whiteboard:save", { roomId });
                      }
                      // Small delay to let the save complete
                      await new Promise((r) => setTimeout(r, 400));
                    } catch (err) {
                      console.error("Whiteboard save failed:", err);
                    } finally {
                      setSavingWb(false);
                      setShowSaveModal(false);
                      navigate(-1);
                    }
                  }}
                  disabled={savingWb}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {savingWb ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save & Exit
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    navigate(-1);
                  }}
                  disabled={savingWb}
                  className="w-full py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium poppins-medium hover:bg-gray-750 hover:text-white transition-colors disabled:opacity-40"
                >
                  Don't Save
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  disabled={savingWb}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 poppins-regular transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
