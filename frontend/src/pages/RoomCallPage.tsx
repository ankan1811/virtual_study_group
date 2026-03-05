import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import axios from "axios";
import NavbarCall from "../components/NavbarCall";
import { User, Loader2 } from "lucide-react";
import Emoji from "../components/shared/Emoji";
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
    joinChannel();
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
    if (blocker.state === "blocked") {
      leaveChannel();
      blocker.proceed();
    } else if (pendingNavigationPath) {
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

  // ---- React Router navigation blocking ----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return (
      hasUnsavedMessages() &&
      currentLocation.pathname !== nextLocation.pathname &&
      !showSavePrompt
    );
  });

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowSavePrompt(true);
    }
  }, [blocker.state]);

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
  const tabItems: { key: TabType; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "ai", label: "AI Doubt" },
    { key: "summary", label: "Summary" },
    { key: "whiteboard", label: "Whiteboard" },
  ];

  const handleWhiteboardSceneChange = (elements: WhiteboardElement[]) => {
    setWhiteboardElements(elements);
    whiteboardSceneRef.current = elements;
  };

  return (
    <div className="h-screen flex flex-col">
      <NavbarCall onExitClick={handleExitClick} />
      <div className="flex h-full overflow-hidden">
        {/* Participants sidebar */}
        <div className="w-min flex flex-col rounded-md flex-shrink-0">
          <div className="px-2 py-1 flex bg-slate-500 text-white items-center poppins-regular shadow-md gap-2 rounded-tr-md">
            <p className="text-sm flex items-center">
              <Emoji symbol="📌" label="pin" />
              Participants
            </p>
            <button className="px-2 py-1 bg-slate-800 rounded">
              {user ? 1 : 0}
            </button>
          </div>
          <ul className="text-xs h-full poppins-regular px-3 py-2 justify-start bg-slate-300 rounded-br-md min-w-[120px]">
            {user && (
              <li className="flex gap-1 mt-2">
                <User size={10} />
                {user.name}
              </li>
            )}
          </ul>
        </div>

        {/* Video / Whiteboard area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "whiteboard" ? (
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <Loader2 className="animate-spin text-teal-400" size={32} />
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

        {/* Right panel: Chat / AI / Summary tabs */}
        <div className="w-[380px] flex-shrink-0 h-full flex flex-col border-l border-gray-200 bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
            {tabItems.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-3 text-xs font-semibold poppins-semibold transition-colors ${
                  activeTab === t.key
                    ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
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
