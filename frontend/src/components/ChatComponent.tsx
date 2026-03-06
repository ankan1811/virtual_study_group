import React, { useEffect, useRef, useState } from "react";
import { Send, Save, Check, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
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
  const user = useSelector((state: AuthState) => state.auth.user);

  const userMessages = messages.filter((m) => m.sentby !== "bot");
  const hasUnsaved = userMessages.length > 0 && userMessages.length > lastSavedCountRef.current;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("joinRoom", { roomId, name: user?.name });

    const handleMessage = ({ msg, sentby }: Message) => {
      setMessages((prev) => {
        const next = [...prev, { msg, sentby }];
        onMessagesChange?.(next);
        return next;
      });
    };

    socket.on(`message:${roomId}`, handleMessage);
    return () => {
      socket.off(`message:${roomId}`, handleMessage);
    };
  }, [roomId, user]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    const socket = getSocket();
    socket?.emit("serverMessage", {
      message: inputValue,
      roomId,
      sentby: user?.name,
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-850"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Send size={20} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-xs poppins-regular">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((message, id) => {
          // Bot / system message
          if (message.sentby === "bot") {
            const isSummaryMsg = message.msg.includes("saved a session summary");
            return (
              <div key={id} className="flex justify-center">
                <span
                  className={`text-[10px] px-3 py-1 rounded-full poppins-regular ${
                    isSummaryMsg
                      ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 text-xs py-1.5"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Linkify text={message.msg} />
                  {!isSummaryMsg && " 👋"}
                </span>
              </div>
            );
          }

          const isMe = message.sentby === user?.name;

          return (
            <div
              key={id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
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
