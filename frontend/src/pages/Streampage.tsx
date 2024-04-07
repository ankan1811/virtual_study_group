import React from 'react'
import Navbar from '../components/Navbar'
import { Mic, Podcast, Video, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Streampage() {
  return (
    <div className='flex justify-center'>
      <Navbar />
      <div className='mt-20 bg-[#ACE2E1] xl:w-[1280px] w-full h-[80vh] flex flex-col rounded-md p-4 shadow-md'>
        <h3 className='text-4xl poppins-semibold flex items-center gap-3'>Streaming
          <Podcast className='text-red-500 h-10 w-10' />
        </h3>
        <div className='w-full flex justify-center gap-4 mt-5'>
          <div className='h-[300px] w-full bg-slate-500 rounded-lg relative'>
            <div>

            </div>
            <div className='flex gap-3 z-1 absolute bottom-4 w-full justify-center'>
              <Button>
                <Mic />
              </Button>
              <Button>
                <Video />
              </Button>
            </div>
          </div>
          <div className='w-full h-[300px] bg-stone-800 p-2'>
            <h3 className='text-white poppins-regular text-2xl'>Connections possible</h3>
            <div className='flex'>
              <Youtube className='text-red-600 h-14 w-14' />
            </div>
          </div>
        </div>
        <div className='w-full flex justify-center mt-6'>
          <Button className='bg-my-chat poppins-regular hover:bg-my-chat hover:bg-opacity-90 text-lg'>Start streaming</Button>
        </div>
      </div>
    </div>
  )
}
