import React, { useEffect, useRef, useState } from "react";
import Emoji from "./shared/Emoji";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
            className="text-indigo-600 underline hover:text-indigo-800 break-all"
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
  const user = useSelector((state: AuthState) => state.auth.user);

  const userMessages = messages.filter((m) => m.sentby !== "bot");
  const hasUnsaved = userMessages.length > 0 && userMessages.length > lastSavedCountRef.current;

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
    <>
      <p className="px-3 py-2 gap-2 flex poppins-regular bg-slate-500 text-white rounded-tl-md flex-shrink-0">
        <Emoji symbol="💬" label="chat" />
        Room chat
      </p>
      <div className="bg-slate-300 flex-1 overflow-y-auto">
        <ul className="px-3 py-2 poppins-regular flex flex-col gap-3">
          {messages.map((message, id) => {
            if (message.sentby === "bot") {
              const isSummaryMsg = message.msg.includes("saved a session summary");
              return (
                <li
                  className={`w-full flex justify-center text-center ${
                    isSummaryMsg
                      ? "text-xs bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 my-1"
                      : "text-[10px]"
                  }`}
                  key={id}
                >
                  <span>
                    <Linkify text={message.msg} />
                    {!isSummaryMsg && <Emoji symbol="👋" label="wave" />}
                  </span>
                </li>
              );
            } else {
              return message.sentby === user?.name ? (
                <li
                  className="w-full text-xs text-white justify-end flex"
                  key={id}
                >
                  <div className="flex flex-col p-3 bg-my-chat w-[200px] justify-end shadow-md items-end rounded-sm gap-2">
                    <h1 className="text-[13px] arvo-regular text-white">
                      {message.sentby}
                    </h1>
                    <p className="text-white">{message.msg}</p>
                  </div>
                </li>
              ) : (
                <li className="w-full text-xs text-white" key={id}>
                  <div className="flex flex-col p-3 bg-white w-[200px] shadow-md rounded-sm gap-2">
                    <h1 className="text-[13px] arvo-regular text-my-text-color">
                      {message.sentby}
                    </h1>
                    <p className="text-[10px] text-black">{message.msg}</p>
                  </div>
                </li>
              );
            }
          })}
        </ul>
      </div>
      <div className="w-full bg-slate-500 flex p-2 gap-2 rounded-bl-md flex-shrink-0">
        {onSaveChats && (
          <button
            onClick={handleSave}
            disabled={!hasUnsaved || saving}
            title={justSaved ? "Saved!" : hasUnsaved ? "Save chats" : "No new messages to save"}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold poppins-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
              justSaved
                ? "bg-emerald-500 text-white"
                : hasUnsaved && !saving
                ? "bg-indigo-500 text-white hover:bg-indigo-600"
                : "bg-slate-400 text-slate-200 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : justSaved ? (
              <Check size={12} />
            ) : (
              <Save size={12} />
            )}
            {saving ? "Saving" : justSaved ? "Saved" : "Save"}
          </button>
        )}
        <Input
          className="rounded-full ring-current focus-visible:ring-0"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          value={inputValue}
        />
        <Button type="submit" className="rounded-full" onClick={sendMessage}>
          <Send size={14} />
        </Button>
      </div>
    </>
  );
}
