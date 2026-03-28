
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import ActiveLogo from "../../assets/active.gif"

export const mimeType = "audio/webm";
export default function Recorder({ }: { uploadAudio: (blob: Blob) => void }) {
  const [permission, setPermission] = useState(false);
  const [, setStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);


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
        setMicError(err.message);
        setTimeout(() => setMicError(null), 3500);
      }
    } else {
      setMicError("The microphone is not accessible. Please check your browser settings.");
      setTimeout(() => setMicError(null), 3500);
    }
  }

  return (
    <div className='flex items-center justify-center text-white'>
      {!permission && (<button onClick={getMicPermission}>Get Microphone</button>)}
      <img src={ActiveLogo} alt="Recording" width={150} height={150} />

      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-black/20"
          >
            <div className="px-6 py-4 rounded-2xl text-white text-sm poppins-semibold shadow-2xl flex items-center gap-3 bg-gradient-to-r from-red-600 to-rose-600 ring-1 ring-white/10">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} />
              </span>
              {micError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
