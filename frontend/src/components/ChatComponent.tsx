import React, { useEffect, useRef, useState } from "react";
import { Send, Save, Check, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";

/** Renders text with clickable URLs */
function Linkify({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 underline hover:text-indigo-700 break-all"
          >
            View Summary
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface Message {
  msg: string;
  sentby: string;
  sentById?: string;
}

interface ChatComponentProps {
  roomId: string;
  onMessagesChange?: (messages: Message[]) => void;
  onSaveChats?: (messages: Message[]) => Promise<void>;
}

export default function ChatComponent({ roomId, onMessagesChange, onSaveChats }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const lastSavedCountRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const user = useSelector((state: AuthState) => state.auth.user);

  const userMessages = messages.filter((m) => m.sentby !== "bot");
  const hasUnsaved = userMessages.length > 0 && userMessages.length > lastSavedCountRef.current;

  // Fetch chat history on mount
  useEffect(() => {
    if (!roomId) return;
    axios
      .get(`${import.meta.env.VITE_API_URL}/chat/view/${roomId}`)
      .then((res) => {
        const history: Message[] = (res.data.chats || []).map((c: any) => ({
          msg: c.message,
          sentby: c.senderName,
          sentById: c.sendById,
        }));
        if (history.length > 0) setMessages(history);
      })
      .catch(() => {});
  }, [roomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Sync messages to parent (separate effect to avoid setState-during-render)
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages]);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setInterval> | null = null;

    const joinAndListen = () => {
      const socket = getSocket();
      if (!socket) return false;

      socket.emit("joinRoom", { roomId, name: user?.name });

      const handleMessage = ({ msg, sentby, sentById }: Message) => {
        setMessages((prev) => [...prev, { msg, sentby, sentById }]);
      };

      const handleReconnect = () => {
        socket.emit("joinRoom", { roomId, name: user?.name });
      };

      socket.on(`message:${roomId}`, handleMessage);
      socket.on("connect", handleReconnect);

      cleanupRef.current = () => {
        socket.off(`message:${roomId}`, handleMessage);
        socket.off("connect", handleReconnect);
        socket.emit("leaveRoom", { roomId });
      };

      return true;
    };

    if (!joinAndListen()) {
      retryTimer = setInterval(() => {
        if (joinAndListen() && retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 200);
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [roomId, user]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    const socket = getSocket();
    socket?.emit("serverMessage", {
      message: inputValue,
      roomId,
      sentby: user?.name,
      sentById: user?.userId,
    });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSave = async () => {
    if (!onSaveChats || saving || !hasUnsaved) return;
    setSaving(true);
    try {
      await onSaveChats(messages);
      lastSavedCountRef.current = userMessages.length;
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // parent handles errors
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-850"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Send size={22} className="text-gray-300 dark:text-gray-600 -rotate-12" />
            </div>
            <div className="text-center">
              <p className="text-xs poppins-medium text-gray-400 dark:text-gray-500">No messages yet</p>
              <p className="text-[10px] poppins-regular text-gray-300 dark:text-gray-600 mt-0.5">
                Start the conversation!
              </p>
            </div>
          </div>
        )}

        {messages.map((message, id) => {
          // Bot / system message
          if (message.sentby === "bot") {
            const isSummaryMsg = message.msg.includes("saved a session summary");
            const isJoinLeave = message.msg.includes("joined the room") || message.msg.includes("left the room");
            return (
              <div key={id} className="flex justify-center">
                <span
                  className={`text-[10px] px-3 py-1 rounded-full poppins-regular ${
                    isSummaryMsg
                      ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 text-xs py-1.5"
                      : isJoinLeave
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Linkify text={message.msg} />
                </span>
              </div>
            );
          }

          const isMe = message.sentById ? message.sentById === user?.userId : message.sentby === user?.name;
          const initials = message.sentby
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();

          return (
            <div
              key={id}
              className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mb-0.5">
                  {initials}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700"
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-semibold poppins-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">
                    {message.sentby}
                  </p>
                )}
                <p className={`text-[13px] poppins-regular leading-relaxed ${isMe ? "text-white" : ""}`}>
                  {message.msg}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 flex items-center gap-2">
        {onSaveChats && (
          <button
            onClick={handleSave}
            disabled={!hasUnsaved || saving}
            title={justSaved ? "Saved!" : hasUnsaved ? "Save chats" : "No new messages"}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              justSaved
                ? "bg-emerald-500 text-white"
                : hasUnsaved && !saving
                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : justSaved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
          </button>
        )}
        <input
          className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-full px-4 py-2 text-sm poppins-regular text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          placeholder="Type a message..."
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          value={inputValue}
        />
        <button
          onClick={sendMessage}
          disabled={!inputValue.trim()}
          className={`p-2.5 rounded-full transition-all ${
            inputValue.trim()
              ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
              : "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600"
          }`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
