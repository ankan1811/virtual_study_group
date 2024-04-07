import React, { useEffect, useRef, useState } from "react";
import NavbarCall from "../components/NavbarCall";
import { User } from "lucide-react";
import Emoji from "../components/shared/Emoji";
import Stream from "../components/Stream";
// import dotenv from "dotenv";
// dotenv.config();
import type {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng/esm";
import AgoraRTC from "agora-rtc-sdk-ng"
import {
  createClient,
  createCameraVideoTrack,
  createMicrophoneAudioTrack,
  onCameraChanged,
  onMicrophoneChanged,
} from "agora-rtc-sdk-ng/esm";
import ChatComponent from "../components/ChatComponent";

//console.log("Current SDK VERSION: ", VERSION);

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

export default function RoomCallPage() {
  console.log("rendered");

  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioPubed, setIsAudioPubed] = useState(false);
  const [isVideoPubed, setIsVideoPubed] = useState(false);
  const [isVideoSubed, setIsVideoSubed] = useState(false);

  const turnOnCamera = async (flag?: boolean) => {
    flag = flag ?? !isVideoOn;
    setIsVideoOn(flag);

    if (videoTrack) {
      return videoTrack.setEnabled(flag);
    }
    videoTrack = await createCameraVideoTrack();
    videoTrack.play("camera-video");
    // if (!isVideoPubed) {
    // await client.publish(videoTrack);
    // setIsVideoPubed(true);
    // }
  };

  const turnOnMicrophone = async (flag?: boolean) => {
    flag = flag ?? !isAudioOn;
    setIsAudioOn(flag);

    if (audioTrack) {
      return audioTrack.setEnabled(flag);
    }

    audioTrack = await createMicrophoneAudioTrack();
    // audioTrack.play();
  };

  const [isJoined, setIsJoined] = useState(false);
  const channel = useRef("");
  channel.current = localStorage.getItem("room-id")!;
  const appid = useRef("");
  appid.current = "0f5775ce2bed49cfa080d178da7a6866";
  const token = useRef("");

  const joinChannel = async () => {
    if (!channel.current) {
      channel.current = "react-room";
    }

    if (isJoined) {
      await leaveChannel();
    }

    client.on("user-published", onUserPublish);

    await client.join(
      appid.current,
      channel.current,
      token.current || null,
      null
    );
    setIsJoined(true);
  };

  const leaveChannel = async () => {
    setIsJoined(false);
    setIsAudioPubed(false);
    setIsVideoPubed(false);

    await client.leave();
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

  const publishVideo = async () => {
    await turnOnCamera(true);

    if (!isJoined) {
      await joinChannel();
    }
    await client.publish(videoTrack);
    setIsVideoPubed(true);
  };

  const publishAudio = async () => {
    await turnOnMicrophone(true);

    if (!isJoined) {
      await joinChannel();
    }

    await client.publish(audioTrack);
    setIsAudioPubed(true);
  };
  useEffect(() => {
    AgoraRTC.setLogLevel(4)
    joinChannel();
  }, []);
  return (
    <div className="h-screen flex flex-col">
      <NavbarCall leaveChannel={leaveChannel} />
      <div className="flex h-full">
        <div className="w-min flex flex-col rounded-md">
          <div className="px-2 py-1 flex bg-slate-500 text-white items-center poppins-regular shadow-md gap-2 rounded-tr-md ">
            <p className="text-sm flex items-center">
              <Emoji symbol="📌" label="pin" />
              Participants
            </p>
            <button className="px-2 py-1 bg-slate-800 rounded">27</button>
          </div>
          <ul className="text-xs h-full poppins-regular px-3 py-2 justify-start bg-slate-300 rounded-br-md">
            {/* Particpants list */}
            <li className="flex gap-1 mt-2">
              <User size={10} />
              Nilabhra Adhikari
            </li>
            <li className="flex gap-1 mt-2">
              <User size={10} />
              Ankan Pal
            </li>
            <li className="flex gap-1 mt-2">
              <User size={10} />
              Nilabhra Adhikari
            </li>
            <li className="flex gap-1 mt-2">
              <User size={10} />
              Ankan Pal
            </li>
          </ul>
        </div>
        <div className="w-full">
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
        <div className="w-[40%] h-full flex flex-col">
          <ChatComponent roomId={localStorage.getItem("room-id")!} />
        </div>
      </div>
    </div>
  );
}
