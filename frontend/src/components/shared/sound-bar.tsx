import React, { useEffect } from 'react'
import p5 from 'p5'
export default function SoundBar() {
  const divElems = [];
  for (let i = 0; i < 50; i++) {
    divElems.push(<div key={i} className="h-[80%] w-[10px] rounded-md bg-cyan-100 opacity-50  shadow"></div>);
  }

  useEffect(() => {
    const sketch = new p5(p => {

    })




    return () => {

    }
  }, [])

  return (
    <div>sound-bar</div>
  )
}
