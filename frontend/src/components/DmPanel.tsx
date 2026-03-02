import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { X, Send, Loader2, Check, CheckCheck, Clock } from "lucide-react";
import { useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";

const API = import.meta.env.VITE_API_URL as string;

// Status of a sent message from the current user's perspective
type MsgStatus = "sending" | "delivered" | "read";

interface DmMessage {
  _id?: string;
  tempId?: string; // local-only id for optimistic messages
  from: string;
  fromName: string;
  content: string;
  createdAt: string;
  read?: boolean;
  status?: MsgStatus; // only meaningful for outgoing messages
}

interface DmPanelProps {
  companionId: string;
  companionName: string;
  onClose: () => void;
}

function DeliveryTick({ status }: { status: MsgStatus }) {
  if (status === "sending")
    return <Clock size={10} className="text-white/50 flex-shrink-0" />;
  if (status === "delivered")
    return <Check size={10} className="text-white/70 flex-shrink-0" />;
  // read
  return <CheckCheck size={10} className="text-indigo-200 flex-shrink-0" />;
}

export default function DmPanel({ companionId, companionName, onClose }: DmPanelProps) {
  const user = useSelector((state: AuthState) => state.auth.user);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(() => {
    const token = localStorage.getItem("token");
    // REST — handles cases where socket isn't ready yet
    axios
      .patch(`${API}/dm/${companionId}/read`, {}, { headers: { Authorization: token || "" } })
      .catch(() => {});
    // Socket — notifies sender in real-time
    getSocket()?.emit("dm:markRead", { toUserId: companionId });
  }, [companionId]);

  // Load history + join DM socket room + mark as read
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
          // Derive delivery status for my outgoing messages from the persisted read flag
          status: m.from === user?.userId
            ? (m.read ? ("read" as MsgStatus) : ("delivered" as MsgStatus))
            : undefined,
        }));
        setMessages(msgs);
        markRead();
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Handle incoming DMs and delivery acks for our own sent messages
    const handleReceive = (msg: any) => {
      // Ignore messages not part of this conversation
      if (msg.from !== companionId && msg.from !== user?.userId) return;

      if (msg.from === user?.userId) {
        // Server ack for our optimistic message — match by tempId, upgrade status
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === msg.tempId
              ? { ...m, _id: msg._id, status: "delivered" as MsgStatus, tempId: undefined }
              : m
          )
        );
      } else {
        // Incoming message from companion
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
        // Panel is open, mark immediately
        markRead();
      }
    };

    // Companion opened our conversation — upgrade all delivered → read
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

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const socket = getSocket();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const content = input.trim();

    // Show optimistically before server ack
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-[120] flex flex-col border-l border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold poppins-semibold">
              {getInitials(companionName)}
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold leading-none">
              {companionName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 size={22} className="animate-spin text-indigo-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular">
                No messages yet.
                <br />
                Say hello!
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
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm poppins-regular shadow-sm transition-opacity ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
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
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent poppins-regular"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
