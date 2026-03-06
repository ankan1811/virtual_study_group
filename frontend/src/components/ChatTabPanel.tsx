import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Users,
  MessageCircle,
  Loader2,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { AuthState } from "../store/authStore/store";
import { Companion } from "../store/companionStore/companionSlice";
import { getSocket } from "../utils/socketInstance";
import ChatComponent from "./ChatComponent";

const API = import.meta.env.VITE_API_URL as string;

type MsgStatus = "sending" | "delivered" | "read";

interface DmMessage {
  _id?: string;
  tempId?: string;
  from: string;
  fromName: string;
  content: string;
  createdAt: string;
  read?: boolean;
  status?: MsgStatus;
}

interface ChatTabPanelProps {
  roomId: string;
  onMessagesChange?: (messages: { msg: string; sentby: string }[]) => void;
  onSaveChats?: (messages: { msg: string; sentby: string }[]) => Promise<void>;
}

// ── Delivery ticks for sent messages ──
function DeliveryTick({ status }: { status: MsgStatus }) {
  if (status === "sending")
    return <Clock size={10} className="text-white/50 flex-shrink-0" />;
  if (status === "delivered")
    return <Check size={10} className="text-white/70 flex-shrink-0" />;
  return <CheckCheck size={10} className="text-indigo-200 flex-shrink-0" />;
}

// ── Inline DM conversation view ──
function InlineDm({
  companionId,
  companionName,
  onBack,
}: {
  companionId: string;
  companionName: string;
  onBack: () => void;
}) {
  const user = useSelector((state: AuthState) => state.auth.user);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(() => {
    const token = localStorage.getItem("token");
    axios
      .patch(`${API}/dm/${companionId}/read`, {}, { headers: { Authorization: token || "" } })
      .catch(() => {});
    getSocket()?.emit("dm:markRead", { toUserId: companionId });
  }, [companionId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = getSocket();
    socket?.emit("dm:join", { toUserId: companionId });

    axios
      .get(`${API}/dm/${companionId}`, { headers: { Authorization: token || "" } })
      .then((res) => {
        const msgs: DmMessage[] = (res.data.messages || []).map((m: any) => ({
          _id: m._id,
          from: m.from,
          fromName: m.fromName,
          content: m.content,
          createdAt: m.createdAt,
          read: m.read,
          status:
            m.from === user?.userId
              ? m.read
                ? ("read" as MsgStatus)
                : ("delivered" as MsgStatus)
              : undefined,
        }));
        setMessages(msgs);
        markRead();
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    const handleReceive = (msg: any) => {
      if (msg.from !== companionId && msg.from !== user?.userId) return;
      if (msg.from === user?.userId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === msg.tempId
              ? { ...m, _id: msg._id, status: "delivered" as MsgStatus, tempId: undefined }
              : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            _id: msg._id,
            from: msg.from,
            fromName: msg.fromName,
            content: msg.content,
            createdAt: msg.createdAt,
            read: false,
          },
        ]);
        markRead();
      }
    };

    const handleReadUpdate = ({ byUserId }: { byUserId: string }) => {
      if (byUserId !== companionId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.from === user?.userId && m.status === "delivered"
            ? { ...m, status: "read" as MsgStatus }
            : m
        )
      );
    };

    socket?.on("dm:receive", handleReceive);
    socket?.on("dm:readUpdate", handleReadUpdate);
    return () => {
      socket?.off("dm:receive", handleReceive);
      socket?.off("dm:readUpdate", handleReadUpdate);
    };
  }, [companionId, user?.userId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const socket = getSocket();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const content = input.trim();
    const optimistic: DmMessage = {
      tempId,
      from: user.userId,
      fromName: user.name,
      content,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    socket?.emit("dm:send", { toUserId: companionId, content, tempId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* DM header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold">
          {getInitials(companionName)}
        </div>
        <p className="text-sm font-semibold poppins-semibold text-gray-800 dark:text-gray-200 truncate">
          {companionName}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-850">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Send size={18} className="text-gray-300 dark:text-gray-600 -rotate-12" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.from === user?.userId;
            return (
              <div
                key={msg._id ?? msg.tempId ?? i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] poppins-regular shadow-sm transition-opacity ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700"
                  } ${msg.status === "sending" ? "opacity-60" : ""}`}
                >
                  <p className="leading-snug">{msg.content}</p>
                  {isMe && msg.status && (
                    <div className="flex justify-end mt-0.5">
                      <DeliveryTick status={msg.status} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-full px-4 py-2 text-sm poppins-regular text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className={`p-2.5 rounded-full transition-all ${
            input.trim()
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

// ── Main Chat Tab Panel ──
type ChatView = "list" | "room" | { dm: string; name: string };

export default function ChatTabPanel({ roomId, onMessagesChange, onSaveChats }: ChatTabPanelProps) {
  const [view, setView] = useState<ChatView>("room");
  const companions = useSelector((state: AuthState) => state.companion.companions);

  // Conversation list view
  if (view === "list") {
    return (
      <div className="flex flex-col h-full">
        {/* Scrollable conversation list */}
        <div className="flex-1 overflow-y-auto">
          {/* Room Chat — pinned at top */}
          <button
            onClick={() => setView("room")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold poppins-semibold text-gray-800 dark:text-gray-200">
                Room Chat
              </p>
              <p className="text-[11px] poppins-regular text-gray-400 dark:text-gray-500 truncate">
                Group chat with everyone in the call
              </p>
            </div>
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <MessageCircle size={11} className="text-indigo-500" />
            </div>
          </button>

          {/* Section label */}
          {companions.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/30">
              <p className="text-[10px] font-semibold poppins-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Direct Messages
              </p>
            </div>
          )}

          {/* Companion DM list */}
          {companions.map((c: Companion) => (
            <button
              key={c.userId}
              onClick={() => setView({ dm: c.userId, name: c.name })}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50"
            >
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold poppins-semibold">
                  {c.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                    c.isOnline ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium poppins-medium text-gray-800 dark:text-gray-200 truncate">
                  {c.name}
                </p>
                <p className="text-[11px] poppins-regular text-gray-400 dark:text-gray-500">
                  {c.isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <MessageCircle size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </button>
          ))}

          {companions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <MessageCircle size={20} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-xs poppins-medium text-gray-400 dark:text-gray-500">
                No companions yet
              </p>
              <p className="text-[10px] poppins-regular text-gray-300 dark:text-gray-600 mt-1">
                Add companions from the home page to DM them here
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Room chat view
  if (view === "room") {
    return (
      <div className="flex flex-col h-full">
        {/* Back to list header */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => setView("list")}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Users size={13} className="text-white" />
          </div>
          <p className="text-sm font-semibold poppins-semibold text-gray-800 dark:text-gray-200">
            Room Chat
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <ChatComponent
            roomId={roomId}
            onMessagesChange={onMessagesChange}
            onSaveChats={onSaveChats}
          />
        </div>
      </div>
    );
  }

  // DM view
  return (
    <InlineDm
      companionId={view.dm}
      companionName={view.name}
      onBack={() => setView("list")}
    />
  );
}
