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
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[20rem] w-[20rem] m-2"
          id="user-container-1"
          onClick={() => setShowMainS(!showMainS)}
        >
          {
            <div className="flex flex-col">
              <video
                id="camera-video"
                className="p-2"
                hidden={prop.isVideoOn ? false : true}
              ></video>
              <h1 className="z-10 text-right  poppins-regular">User 1</h1>
            </div>
          }
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[15rem] w-[20rem] m-2"
          id="user-container-2"
        >
          <div className="flex flex-col">
            <video
              id="remote-video"
              className="p-2"
              hidden={prop.isVideoSubed ? false : true}
            ></video>
            <h1 className="z-10 text-right  poppins-regular">User 2</h1>
          </div>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[15rem] w-[20rem] m-2"
          id="user-container-3"
        >
          <h1>3</h1>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[15rem] w-[20rem] m-2"
          id="user-container-4"
        >
          <h1>4</h1>
        </div>
        <div
          className="flex justify-center items-center border-2 rounded-2xl cursor-pointer overflow-hidden h-[15rem] w-[20rem] m-2"
          id="user-container-4"
        >
          <h1>5</h1>
        </div>
      </div>
      <div className="flex gap-4 fixed bottom-4">
        <Button
          className="rounded-full p-3"
          onClick={() => {
            // setCam(!isCam);
            prop.turnOnCamera();
            // if(!prop.isVideoPubed)
            //   prop.publishVideo();
            // else prop.setIsVideoOn(false);
            // prop.setIsVideoOn(!prop.isVideoOn);
          }}
        >
          {!prop.isVideoOn ? <Camera size={15} /> : <CameraOff size={15} />}
        </Button>
        <Button
          className="rounded-full p-3"
          onClick={() => {
            // setMic(!isMic);
            prop.setIsAudioOn(!prop.isAudioOn);
          }}
        >
          {!prop.isAudioOn ? <Mic size={15} /> : <MicOff size={15} />}
        </Button>
        <Button
          className="rounded-full p-3"
          onClick={() => {
            // setPresent(!isPresent);
          }}
        >
          {<MonitorUp size={15} />}
        </Button>
      </div>
    </section>
  );
}
