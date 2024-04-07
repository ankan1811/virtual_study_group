import React, { useRef } from 'react'
import Messages from '../components/Messages'
import Recorder from '../components/shared/Recorder'

export default function DemoAiPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const uploadAudio = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const file = new File([blob], 'audio.webm', { type: blob.type });
    //set the file as the value of the hidden file input field
    if (fileRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileRef.current.files = dataTransfer.files;
      //simulate a click & submit the form
      if (submitButtonRef.current) {
        submitButtonRef.current.click();
      }
    }
  }
  return (
    <div className='w-full bg-slate-500 h-[100vh] overflow-auto flex relative'>
      <div className='absolute top-0 h-20 bg-slate-950 w-full text-white flex justify-center items-center'>
        Header
      </div>
      <div className='mt-20'>
        <form action="">
          <div>
            {/* Messages */}
            <Messages />
          </div>
          <input type="file" name="audio" hidden ref={fileRef} />
          <button type='submit' hidden ref={submitButtonRef}></button>
          <div className='fixed bottom-0 bg-black rounded-t-xl w-full'>
            <Recorder uploadAudio={uploadAudio} />
          </div>
        </form>
      </div>
    </div>
  )
}
