import React, { useEffect, useState } from "react";
import Emoji from "./shared/Emoji";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { getSocket } from "../utils/socketInstance";

interface Message {
  msg: string;
  sentby: string;
}

interface ChatComponentProps {
  roomId: string;
  onMessagesChange?: (messages: Message[]) => void;
}

export default function ChatComponent({ roomId, onMessagesChange }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const user = useSelector((state: AuthState) => state.auth.user);

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
              return (
                <li className="text-[10px] w-full flex justify-center" key={id}>
                  {message.msg}
                  <Emoji symbol="👋" label="wave" />
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
      <div className="w-full bg-slate-500 flex p-2 gap-3 rounded-bl-md flex-shrink-0">
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
