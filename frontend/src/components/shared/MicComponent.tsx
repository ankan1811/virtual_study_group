import { Mic } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import p5 from 'p5'
import "p5/lib/addons/p5.dom";
import "p5/lib/addons/p5.sound";
export default function MicComponent() {
  const maxDiv = 50;
  const [isMicOn, setIsMicOn] = useState(false);
  const divElems: React.ReactNode[] = [];
  for (let i = 0; i <= 50; i++) {
    divElems.push(<div key={i} className='bg-white opacity-30 shadow w-2 rounded-full'></div>);
  }
  const micInput = useRef<p5.AudioIn>();
  useEffect(() => {
    const sketch = new p5((p: p5) => {
      p.setup = () => {
        micInput.current = new p5.AudioIn();
        micInput.current.start();
      }
      p.draw = () => {
        if (isMicOn && micInput.current) {
          const vol = micInput.current.getLevel();

          document.querySelectorAll('#micCanvas div').forEach((e: Element, id) => {
            let height;
            if (id <= maxDiv / 2) {
              height = vol * 100 * id;
            } else {
              height = vol * 100 * (maxDiv - id);
            }
            if (height > 140) height = 140;
            if (height < 1) height = 0;
            (e as HTMLDivElement).style.height = `${height}px`;
            (e as HTMLDivElement).style.color = '#00FFFF';
          })
        }
      }
    });
    return () => {
      if (micInput.current) {
        micInput.current!.stop();
      }
      sketch.remove();
    }
  }, [isMicOn]);

  const toggleMic = () => {
    if (micInput.current) {
      if (isMicOn) {
        micInput.current.stop();
      } else {
        micInput.current.start();
      }
      setIsMicOn(!isMicOn);
    }
  }

  return (
    <div className='h-[150px] bg-gradient-to-r from-indigo-300 to-violet-500 rounded-lg p-2 flex items-center justify-center shadow-md relative mt-4'>
      <div className='absolute m-auto bg-white/50 flex items-center justify-around w-full h-full'>
        {isMicOn && <div id='micCanvas' className='flex gap-3 justify-center items-center'>
          {divElems}
        </div>}
      </div>
      <div className='z-1' onClick={toggleMic}>
        <Mic className='text-white h-[100px] w-[100px] drop-shadow-lg' />
      </div>
    </div>
  )
}
