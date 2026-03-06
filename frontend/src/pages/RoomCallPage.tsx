import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { Users, Loader2, LogOut, MessageSquare, Bot, FileText, PenTool } from "lucide-react";
import Stream from "../components/Stream";
import type {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng/esm";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  createClient,
  createCameraVideoTrack,
  createMicrophoneAudioTrack,
  onCameraChanged,
  onMicrophoneChanged,
} from "agora-rtc-sdk-ng/esm";
import ChatComponent from "../components/ChatComponent";
import AiPanel from "../components/AiPanel";
import WhiteboardExplainPanel from "../components/WhiteboardExplainPanel";
import SaveChatPrompt from "../components/SaveChatPrompt";
import { AuthState } from "../store/authStore/store";
import { leaveRoom } from "../store/RoomStore/roomSlice";

const WhiteboardPanel = React.lazy(
  () => import("../components/WhiteboardPanel")
);

onCameraChanged((device) => {
  console.log("onCameraChanged: ", device);
});
onMicrophoneChanged((device) => {
  console.log("onMicrophoneChanged: ", device);
});

const client: IAgoraRTCClient = createClient({
  mode: "rtc",
  codec: "vp8",
});

let audioTrack: IMicrophoneAudioTrack;
let videoTrack: ICameraVideoTrack;

type TabType = "chat" | "ai" | "summary" | "whiteboard";

interface WhiteboardElement {
  type: string;
  text?: string;
  width: number;
  height: number;
}

interface Message {
  msg: string;
  sentby: string;
}

export default function RoomCallPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state: AuthState) => state.auth.user);
  const roomIdFromRedux = useSelector((state: AuthState) => state.room.currentRoomId);

  // Resolve roomId: router state > Redux > user's personal room
  const roomIdFromNav = (location.state as any)?.roomId as string | undefined;
  const roomId = roomIdFromNav ?? roomIdFromRedux ?? user?.roomId ?? "";

  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioPubed, setIsAudioPubed] = useState(false);
  const [isVideoPubed, setIsVideoPubed] = useState(false);
  const [isVideoSubed, setIsVideoSubed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  // Lifted chat messages for AI summary
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  // Whiteboard elements (lifted from WhiteboardPanel for AI explain + summary)
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  // Preserve Excalidraw scene across tab switches
  const whiteboardSceneRef = useRef<readonly any[]>([]);

  const channel = useRef(roomId);
  const appid = useRef(import.meta.env.VITE_AGORA_APP_ID || "");
  const token = useRef("");
  const [isJoined, setIsJoined] = useState(false);

  // ---- Chat persistence state ----
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const lastSavedCountRef = useRef(0);

  const hasUnsavedMessages = () => {
    const userMsgs = chatMessages.filter((m) => m.sentby !== "bot");
    return userMsgs.length > 0 && userMsgs.length > lastSavedCountRef.current;
  };

  // ---- Agora helpers ----
  const turnOnCamera = async (flag?: boolean) => {
    flag = flag ?? !isVideoOn;
    setIsVideoOn(flag);
    if (videoTrack) return videoTrack.setEnabled(flag);
    videoTrack = await createCameraVideoTrack();
    videoTrack.play("camera-video");
  };

  const turnOnMicrophone = async (flag?: boolean) => {
    flag = flag ?? !isAudioOn;
    setIsAudioOn(flag);
    if (audioTrack) return audioTrack.setEnabled(flag);
    audioTrack = await createMicrophoneAudioTrack();
  };

  const onUserPublish = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "video" | "audio"
  ) => {
    if (mediaType === "video") {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play("remote-video");
      setIsVideoSubed(true);
    }
    if (mediaType === "audio") {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play();
    }
  };

  const joinChannel = async () => {
    const ch = channel.current || "react-room";
    if (isJoined) await leaveChannelInternal();
    client.on("user-published", onUserPublish);
    await client.join(appid.current, ch, token.current || null, null);
    setIsJoined(true);
  };

  const leaveChannelInternal = async () => {
    setIsJoined(false);
    setIsAudioPubed(false);
    setIsVideoPubed(false);
    await client.leave();
  };

  const leaveChannel = async () => {
    await leaveChannelInternal();
    dispatch(leaveRoom());
  };

  const publishVideo = async () => {
    await turnOnCamera(true);
    if (!isJoined) await joinChannel();
    await client.publish(videoTrack);
    setIsVideoPubed(true);
  };

  const publishAudio = async () => {
    await turnOnMicrophone(true);
    if (!isJoined) await joinChannel();
    await client.publish(audioTrack);
    setIsAudioPubed(true);
  };

  useEffect(() => {
    channel.current = roomId;
    AgoraRTC.setLogLevel(4);
    joinChannel().catch((err) => console.error("Agora join failed:", err));
    return () => {
      leaveChannelInternal();
      dispatch(leaveRoom());
    };
  }, []);

  // ---- Chat persistence: save to server ----
  const saveChatsToServer = async () => {
    const authToken = localStorage.getItem("token");
    const userMsgs = chatMessages.filter((m) => m.sentby !== "bot");
    await axios.post(
      `${import.meta.env.VITE_API_URL}/chat/bulk-save`,
      { roomId, messages: userMsgs },
      { headers: { Authorization: authToken || "" } }
    );
    lastSavedCountRef.current = userMsgs.length;
  };

  // Inline save button callback (passed to ChatComponent)
  const handleInlineSaveChats = async () => {
    await saveChatsToServer();
  };

  // Exit prompt: Save & Exit
  const handleSaveAndExit = async () => {
    try {
      await saveChatsToServer();
    } catch (err) {
      console.error("Failed to save chats:", err);
    }
    completeExit();
  };

  // Exit prompt: Exit without saving
  const handleDiscardAndExit = () => {
    completeExit();
  };

  const completeExit = () => {
    setShowSavePrompt(false);
    if (pendingNavigationPath) {
      leaveChannel();
      navigate(pendingNavigationPath);
      setPendingNavigationPath(null);
    }
  };

  // NavbarCall exit click
  const handleExitClick = () => {
    if (hasUnsavedMessages()) {
      setShowSavePrompt(true);
      setPendingNavigationPath("/home");
    } else {
      leaveChannel();
      navigate("/home");
    }
  };

  // ---- Browser tab/window close ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedMessages()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [chatMessages]);

  // ---- Tabs & whiteboard ----
  const tabItems: { key: TabType; label: string; icon: typeof MessageSquare }[] = [
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "ai", label: "AI Doubt", icon: Bot },
    { key: "summary", label: "Summary", icon: FileText },
    { key: "whiteboard", label: "Whiteboard", icon: PenTool },
  ];

  const handleWhiteboardSceneChange = (elements: WhiteboardElement[]) => {
    setWhiteboardElements(elements);
    whiteboardSceneRef.current = elements;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Navbar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Participants strip */}
        <div className="w-16 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center pt-14 pb-4 gap-3">
          <div className="flex flex-col items-center gap-1">
            <Users size={16} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 poppins-medium">{user ? 1 : 0}</span>
          </div>
          <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
          {user && (
            <div className="group relative flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold poppins-semibold ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800">
                {user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 poppins-regular truncate max-w-[56px] text-center">
                {user.name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>

        {/* Center: Video / Whiteboard */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "whiteboard" ? (
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                  <Loader2 className="animate-spin text-indigo-400" size={32} />
                </div>
              }
            >
              <WhiteboardPanel
                roomId={roomId}
                onSceneChange={handleWhiteboardSceneChange}
                initialElements={whiteboardSceneRef.current}
              />
            </React.Suspense>
          ) : (
            <Stream
              isAudioOn={isAudioOn}
              isVideoOn={isVideoOn}
              isAudioPubed={isAudioPubed}
              isVideoPubed={isVideoPubed}
              isVideoSubed={isVideoSubed}
              setIsAudioOn={setIsAudioOn}
              setIsAudioPubed={setIsAudioPubed}
              setIsVideoOn={setIsVideoOn}
              setIsVideoPubed={setIsVideoPubed}
              setIsVideoSubed={setIsVideoSubed}
              turnOnCamera={turnOnCamera}
              turnOnMicrophone={turnOnMicrophone}
              publishAudio={publishAudio}
              publishVideo={publishVideo}
            />
          )}
        </div>

        {/* Right: Tabbed panel */}
        <div className="w-[380px] flex-shrink-0 h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          {/* Spacer to clear fixed navbar buttons (hamburger/avatar/bell) */}
          <div className="h-14 flex-shrink-0" />

          {/* Tab bar + Exit button row */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            {tabItems.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold poppins-semibold transition-all duration-200 ${
                    activeTab === t.key
                      ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
            <button
              onClick={handleExitClick}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 mr-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 text-[11px] font-semibold poppins-semibold transition-colors"
            >
              <LogOut size={12} />
              Exit
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === "chat" ? (
              <ChatComponent
                roomId={roomId}
                onMessagesChange={setChatMessages}
                onSaveChats={handleInlineSaveChats}
              />
            ) : activeTab === "whiteboard" ? (
              <WhiteboardExplainPanel elements={whiteboardElements} />
            ) : (
              <AiPanel
                tab={activeTab}
                chatMessages={chatMessages}
                roomId={roomId}
                whiteboardElements={whiteboardElements}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save chat prompt overlay */}
      <SaveChatPrompt
        isOpen={showSavePrompt}
        messageCount={chatMessages.filter((m) => m.sentby !== "bot").length}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardAndExit}
      />
    </div>
  );
}
