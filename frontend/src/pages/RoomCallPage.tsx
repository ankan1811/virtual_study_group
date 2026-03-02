import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import NavbarCall from "../components/NavbarCall";
import { User } from "lucide-react";
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
import { AuthState } from "../store/authStore/store";
import { leaveRoom } from "../store/RoomStore/roomSlice";

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

type TabType = "chat" | "ai" | "summary";

interface Message {
  msg: string;
  sentby: string;
}

export default function RoomCallPage() {
  const dispatch = useDispatch();
  const location = useLocation();
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

  const channel = useRef(roomId);
  const appid = useRef("0f5775ce2bed49cfa080d178da7a6866");
  const token = useRef("");
  const [isJoined, setIsJoined] = useState(false);

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

  const tabItems: { key: TabType; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "ai", label: "AI Doubt" },
    { key: "summary", label: "Summary" },
  ];

  return (
    <div className="h-screen flex flex-col">
      <NavbarCall leaveChannel={leaveChannel} />
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

        {/* Video area */}
        <div className="flex-1 overflow-hidden">
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
              />
            ) : (
              <AiPanel tab={activeTab} chatMessages={chatMessages} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
