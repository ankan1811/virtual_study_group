import { Button } from "@/components/ui/button";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  X,
} from "lucide-react";

import React, { useState } from "react";
type StateFunction<T> = React.Dispatch<React.SetStateAction<T>>;
interface propsInterface {
  isAudioOn: boolean;
  isVideoOn: boolean;
  isAudioPubed: boolean;
  isVideoPubed: boolean;
  isVideoSubed: boolean;
  setIsAudioOn: StateFunction<boolean>;
  setIsVideoOn: StateFunction<boolean>;
  setIsAudioPubed: StateFunction<boolean>;
  setIsVideoPubed: StateFunction<boolean>;
  setIsVideoSubed: StateFunction<boolean>;
  turnOnCamera: VoidFunction;
  turnOnMicrophone: VoidFunction;
  publishVideo: VoidFunction;
  publishAudio: VoidFunction;
}

export default function Stream(prop: propsInterface) {
  const [showMainS, setShowMainS] = useState(false);

  return (
    // Stream__container
    <section className="flex flex-col justify-center items-center p-2 ">
      {showMainS ? (
        <div
          id="stream__box"
          className="bg-gray-500 h-[60vh] rounded-md w-full"
        >
          <div className="bg-transparent flex justify-end">
            <Button
              className="rounded-full p-2"
              onClick={() => setShowMainS(false)}
            >
              <X size={20} />
            </Button>
          </div>
        </div>
      ) : (
        ""
      )}
      {/* Streams container */}
      <div className="flex flex-wrap justify-evenly mt-[25px] w-full">
        {/* Video container */}
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[10rem] w-[10rem]"
          id="user-container-1"
          onClick={() => setShowMainS(!showMainS)}
        >
          <h1>1</h1>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[10rem] w-[10rem]"
          id="user-container-2"
        >
          <h1>2</h1>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[10rem] w-[10rem]"
          id="user-container-3"
        >
          <h1>3</h1>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[10rem] w-[10rem]"
          id="user-container-4"
        >
          <h1>4</h1>
        </div>
      </div>
      <div className="flex gap-4 fixed bottom-4">
        <Button
          className="rounded-full p-3"
          onClick={() => {
            setCam(!isCam);
          }}
        >
          {isCam ? <Camera size={15} /> : <CameraOff size={15} />}
        </Button>
        <Button
          className="rounded-full p-3"
          onClick={() => {
            setMic(!isMic);
          }}
        >
          {isMic ? <Mic size={15} /> : <MicOff size={15} />}
        </Button>
        <Button
          className="rounded-full p-3"
          onClick={() => {
            setPresent(!isPresent);
          }}
        >
          {isPresent ? <MonitorUp size={15} /> : <MonitorX size={15} />}
        </Button>
      </div>
    </section>
  );
}
