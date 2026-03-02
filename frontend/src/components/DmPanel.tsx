import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { X, Send, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";

interface DmMessage {
  from: string;
  fromName: string;
  content: string;
  createdAt: string;
}

interface DmPanelProps {
  companionId: string;
  companionName: string;
  onClose: () => void;
}

export default function DmPanel({ companionId, companionName, onClose }: DmPanelProps) {
  const user = useSelector((state: AuthState) => state.auth.user);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history + join DM socket room
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = getSocket();

    socket?.emit("dm:join", { toUserId: companionId });

    axios
      .get(`${import.meta.env.VITE_API_URL}/dm/${companionId}`, {
        headers: { Authorization: token || "" },
      })
      .then((res) => {
        setMessages(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    const handleReceive = (msg: DmMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket?.on("dm:receive", handleReceive);
    return () => {
      socket?.off("dm:receive", handleReceive);
    };
  }, [companionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    socket?.emit("dm:send", { toUserId: companionId, content: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

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
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold leading-none">
                {companionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
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
                  key={i}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm poppins-regular shadow-sm ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    <p>{msg.content}</p>
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
