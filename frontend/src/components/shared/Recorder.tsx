
import React, { useEffect, useState } from 'react'
import ActiveLogo from "../../assets/active.gif"

export const mimeType = "audio/webm";
export default function Recorder({ uploadAudio }: { uploadAudio: (blob: Blob) => void }) {
  const [permission, setPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingStatus, setRecordingStatus] = useState("inactive");

  useEffect(() => {
    getMicPermission();
  }, [])

  const getMicPermission = async () => {
    if ("MediaRecorder" in window) {
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setPermission(true);
        setStream(streamData);
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      alert("The microphone is not accessible. Please check your browser settings.")
    }
  }

  const startRecording = async () => {
    if (stream === null) return;

    setRecordingStatus("recording");
  }

  return (
    <div className='flex items-center justify-center text-white'>
      {!permission && (<button onClick={getMicPermission}>Get Microphone</button>)}
      <img src={ActiveLogo} alt="Recording" width={150} height={150} />
    </div>
  )
}
