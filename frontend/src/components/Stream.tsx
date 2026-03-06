import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  Users,
} from "lucide-react";

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

function useVoiceActivity(isAudioOn: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isAudioOn) {
      setIsSpeaking(false);
      return;
    }

    let cancelled = false;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (cancelled) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setIsSpeaking(avg > 15);
        rafRef.current = requestAnimationFrame(poll);
      };
      poll();
    }).catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
      streamRef.current = null;
      ctxRef.current = null;
      analyserRef.current = null;
      setIsSpeaking(false);
    };
  }, [isAudioOn]);

  return isSpeaking;
}

export default function Stream(prop: propsInterface) {
  const isSpeaking = useVoiceActivity(prop.isAudioOn);

  return (
    <div className="relative flex flex-col h-full bg-gray-950">
      {/* Video grid */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-3 w-full max-w-3xl">
          {/* Local user */}
          <div
            className={`relative aspect-video bg-gray-800 rounded-2xl overflow-hidden transition-all duration-200 ${
              isSpeaking
                ? "ring-[3px] ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]"
                : "ring-1 ring-white/10"
            }`}
            id="user-container-1"
          >
            <video
              id="camera-video"
              className="w-full h-full object-cover"
              hidden={!prop.isVideoOn}
            />
            {!prop.isVideoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
              <span className="text-xs text-white poppins-medium">You</span>
              {prop.isAudioOn && (
                <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
              )}
            </div>
          </div>

          {/* Remote user */}
          <div
            className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-white/10"
            id="user-container-2"
          >
            <video
              id="remote-video"
              className="w-full h-full object-cover"
              hidden={!prop.isVideoSubed}
            />
            {!prop.isVideoSubed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
                  <Users size={24} className="text-gray-500" />
                </div>
                <span className="text-xs text-gray-500 poppins-regular">
                  Waiting...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom media controls — above MiniPlayer */}
      <div className="flex justify-center pb-16 pt-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800/80 backdrop-blur-sm ring-1 ring-white/10">
          <button
            onClick={() => prop.turnOnCamera()}
            className={`p-3 rounded-xl transition-all duration-200 ${
              prop.isVideoOn
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
          >
            {prop.isVideoOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          <button
            onClick={() => prop.turnOnMicrophone()}
            className={`p-3 rounded-xl transition-all duration-200 ${
              prop.isAudioOn
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
          >
            {prop.isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={() => prop.publishVideo()}
            className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <MonitorUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
