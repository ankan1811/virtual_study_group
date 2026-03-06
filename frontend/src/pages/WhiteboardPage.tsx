import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

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
  const roomIdFromRedux = useSelector(
    (state: AuthState) => state.room.currentRoomId
  );
  const roomId = paramRoomId ?? roomIdFromRedux ?? user?.roomId ?? "";
  const navigate = useNavigate();

  // Excalidraw
  const [api, setApi] = useState<any>(null);
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);

  // AI panel
  const [showAi, setShowAi] = useState(false);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Excalidraw onChange — fully debounced to avoid infinite loops
  const handleChange = useCallback(
    (excElements: readonly any[]) => {
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
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

  // Remote sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onSync = ({ elements: els }: { elements: any[] }) => {
      if (api) {
        isRemoteUpdate.current = true;
        api.updateScene({ elements: els });
      }
    };
    const onCleared = () => {
      if (api) {
        isRemoteUpdate.current = true;
        api.updateScene({ elements: [] });
      }
    };
    socket.on("whiteboard:sync", onSync);
    socket.on("whiteboard:cleared", onCleared);
    return () => {
      socket.off("whiteboard:sync", onSync);
      socket.off("whiteboard:cleared", onCleared);
    };
  }, [api]);

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
      {/* Top toolbar */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 bg-gray-900 border-b border-gray-800">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm poppins-medium"
          >
            <ArrowLeft size={16} />
            Back to Room
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2">
            <PenTool size={14} className="text-indigo-400" />
            <span className="text-sm text-gray-300 poppins-semibold">
              Whiteboard
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors text-xs poppins-medium"
          >
            <Trash2 size={13} />
            Clear
          </button>
          <button
            onClick={() => setShowAi(!showAi)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs poppins-medium ${
              showAi
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
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
              theme="light"
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                },
              }}
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
    </div>
  );
}
