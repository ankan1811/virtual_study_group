import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { Users, LogOut, MessageSquare, Bot, PenTool, Share2, Check, Video, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import ChatTabPanel from "../components/ChatTabPanel";
import AiPanel from "../components/AiPanel";
import SaveChatPrompt from "../components/SaveChatPrompt";
import { AuthState } from "../store/authStore/store";
import { leaveRoom } from "../store/RoomStore/roomSlice";
import { generateAndSaveSummary } from "../utils/summaryApi";

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

type TabType = "chat" | "ai";

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
  const [copied, setCopied] = useState(false);

  const channel = useRef(roomId);
  const appid = useRef(import.meta.env.VITE_AGORA_APP_ID || "");
  const token = useRef("");
  const [isJoined, setIsJoined] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [lobbySummaryLoading, setLobbySummaryLoading] = useState(false);
  const [lobbySummaryDone, setLobbySummaryDone] = useState(false);

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

  const handleStartCall = async () => {
    try {
      await joinChannel();
      setIsInCall(true);
    } catch (err) {
      console.error("Failed to join Agora:", err);
    }
  };

  const handleEndCall = async () => {
    await leaveChannelInternal();
    setIsInCall(false);
  };

  useEffect(() => {
    channel.current = roomId;
    AgoraRTC.setLogLevel(4);
    return () => {
      if (isJoined) leaveChannelInternal();
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
      if (isInCall) leaveChannel();
      else dispatch(leaveRoom());
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
      if (isInCall) leaveChannel();
      else dispatch(leaveRoom());
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

  // ---- Tabs ----
  const tabItems: { key: TabType; label: string; icon: typeof MessageSquare }[] = [
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "ai", label: "AI Doubt", icon: Bot },
  ];

  const handleTabClick = (key: TabType) => {
    setActiveTab(key);
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

        {/* Center: Video / Lobby */}
        <div className="flex-1 overflow-hidden">
          {isInCall ? (
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
              onEndCall={handleEndCall}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-950">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Video size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-white poppins-semibold">Room Ready</h2>
                  <p className="text-gray-400 text-sm mt-1 poppins-regular">
                    Use chat, AI, and tools freely. Start a video call when you're ready.
                  </p>
                </div>
                <button
                  onClick={handleStartCall}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white poppins-semibold hover:opacity-90 transition-opacity"
                >
                  Start Video Call
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabbed panel */}
        <div className="w-[380px] flex-shrink-0 h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          {/* Top bar: Whiteboard button (left of bell icon area) */}
          <div className="h-14 flex-shrink-0 flex items-center justify-start px-3 gap-2">
            <button
              onClick={() => navigate(`/whiteboard/${roomId}`)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] font-semibold poppins-semibold shadow-md shadow-teal-500/20 dark:shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              <PenTool size={13} className="group-hover:rotate-[-12deg] transition-transform duration-200" />
              Whiteboard
            </button>
          </div>

          {/* Tab bar + Exit */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            {tabItems.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabClick(t.key)}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold poppins-semibold transition-all duration-200 ${
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
              <ChatTabPanel
                roomId={roomId}
                onMessagesChange={setChatMessages}
                onSaveChats={handleInlineSaveChats}
              />
            ) : (
              <AiPanel
                tab={activeTab as "ai"}
                chatMessages={chatMessages}
                roomId={roomId}
              />
            )}
          </div>

          {/* Bottom action bar: Invite + Summary */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={async () => {
                const link = `${window.location.origin}/join/${roomId}`;
                try {
                  await navigator.clipboard.writeText(link);
                } catch {
                  const ta = document.createElement("textarea");
                  ta.value = link;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[11px] font-semibold poppins-semibold transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1 text-emerald-500"
                  >
                    <Check size={12} />
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="share"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1"
                  >
                    <Share2 size={12} />
                    Invite
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {activeTab === "chat" && (
              <button
                onClick={async () => {
                  setLobbySummaryLoading(true);
                  try {
                    await generateAndSaveSummary(
                      "/ai/summary",
                      { messages: chatMessages },
                      { type: "room", contextId: roomId, contextLabel: `Room ${roomId}` }
                    );
                    setLobbySummaryDone(true);
                    setTimeout(() => setLobbySummaryDone(false), 2500);
                  } catch (err) {
                    console.error("Summary failed:", err);
                  } finally {
                    setLobbySummaryLoading(false);
                  }
                }}
                disabled={lobbySummaryLoading || chatMessages.filter((m) => m.sentby !== "bot").length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-[11px] font-semibold poppins-semibold transition-colors disabled:opacity-40"
              >
                {lobbySummaryLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : lobbySummaryDone ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Sparkles size={12} />
                )}
                {lobbySummaryLoading ? "Saving..." : lobbySummaryDone ? "Saved!" : "Summary"}
              </button>
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
