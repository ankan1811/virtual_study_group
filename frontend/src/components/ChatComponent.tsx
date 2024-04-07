import React, { useEffect, useState } from "react";
import Emoji from "./shared/Emoji";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import io from "socket.io-client";
import { useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
const Socket = io();
interface Message {
  msg: string;
  sentby: string;
}
export default function ChatComponent({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<typeof Socket>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const user = useSelector((state: AuthState) => state.auth.user);
  useEffect(() => {
    const newSocket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("joinRoom", { roomId: roomId, name: user?.name });
    //Listening from server
    socket.on(`message:${roomId}`, ({ msg, sentby }: Message) => {
      console.log(`${msg} - ${sentby}`);
      setMessages((prev) => [...prev, { msg, sentby }]);
    });
    return () => {
      socket.off("message");
    };
  }, [socket, roomId, user]);

  const sendMessage = () => {
    if (inputValue.trim() !== "") {
      socket?.emit("serverMessage", { message: inputValue, roomId: roomId, sentby: user?.name });
    }
    setInputValue("");
  };

  return (
    <>
      <p className="px-3 py-2 gap-2 flex poppins-regular bg-slate-500 text-white rounded-tl-md">
        <Emoji symbol="💬" label="chat" />
        Room chat
      </p>
      <div className="bg-slate-300 h-full">
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
                  className="w-full  text-xs text-white justify-end flex"
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
                <li className="w-full  text-xs text-white" key={id}>
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
      <div className="w-full bg-slate-500 flex p-2 gap-3 rounded-bl-md">
        <Input
          className="rounded-full ring-current focus-visible:ring-0"
          onChange={(e) => setInputValue(e.target.value)}
          value={inputValue}
        />
        <Button type="submit" className=" rounded-full" onClick={sendMessage}>
          <Send size={14} />
        </Button>
      </div>
    </>
  );
}
