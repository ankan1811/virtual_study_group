import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import { Mic, MicOff, Podcast, Video, VideoOff, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import io from "socket.io-client";
const Socket = io();
export default function Streampage() {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState<typeof Socket>();
  const [mediaState, setMediaState] = useState({ audio: false, video: false });
  let mediaObj = { media: null };
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ytString, setYtString] = useState<string>('');
  useEffect(() => {
    const newSocket = io("http://localhost:3002", {
      transports: ["websocket", "polling"],
    });
    return () => {
      newSocket.disconnect();
    }
  }, [])

  useEffect(() => {
    setMediaState({ audio: true, video: isVideoOn });
    const initializeMediaStream = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia(mediaState);
        setMediaStream(media);
        videoRef.current!.srcObject = media;
      } catch (error) {
        console.log(error);
      }
    };
    initializeMediaStream();
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    }
  }, [isVideoOn]);

  const toggleAudio = () => {
    // console.log(!isMicOn)
    // setIsMicOn(!isMicOn);
  }

  const toggleVideo = () => {
    console.log(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  }

  const startStreaming = () => {
    // setIsStreaming(true);
    // const mediaRecorder = new MediaRecorder(mediaObj.media, {
    //   audioBitsPerSecond: 128000,
    //   videoBitsPerSecond: 2500000,
    //   framerate: 30,
    // });
  }


  return (
    <div className='flex justify-center'>
      <Navbar />
      <div className='mt-20 bg-[#ACE2E1] xl:w-[1280px] w-full h-[80vh] flex flex-col rounded-md p-4 shadow-md'>
        <h3 className='text-4xl poppins-semibold flex items-center gap-3'>Streaming
          <Podcast className='text-red-500 h-10 w-10' />
        </h3>
        <div className='w-full flex justify-center gap-4 mt-5'>
          <div className='h-[300px] w-full bg-slate-500 rounded-lg relative'>
            <video className='w-full h-full z-2' autoPlay muted ref={videoRef}></video>
            <div className='flex gap-3 z-1 absolute bottom-4 w-full justify-center'>
              <Button onClick={toggleAudio}>
                {!isMicOn && <Mic />}
                {isMicOn && <MicOff />}
              </Button>
              <Button onClick={toggleVideo}>
                {!isVideoOn && <Video />}
                {isVideoOn && <VideoOff />}
              </Button>
            </div>
          </div>
          <div className='w-full h-[300px] bg-stone-800 p-2'>
            <h3 className='text-white poppins-regular text-2xl'>Connections possible</h3>
            <div className='flex items-center gap-2 px-4'>
              <Youtube className='text-red-600 h-14 w-14' />
              <input type="text" value={ytString} onChange={(e) => setYtString(e.target.value)} className='pt-1 p-2 w-full rounded-md' />
            </div>
          </div>
        </div>
        <div className='w-full flex justify-center mt-6'>
          <Button className={`${!isStreaming ? `bg-green-500 hover:bg-green-400` : `bg-red-500 hover:bg-red-400`} poppins-regular text-lg`} onClick={startStreaming}>{isStreaming ? `Stop streaming` : `Start streaming`}</Button>
        </div>
      </div>
    </div>
  )
}
