import React from 'react'
import Navbar from '../components/Navbar'
import MicComponent from '../components/shared/MicComponent'

export default function AskAiPage() {
  return (
    <div className='flex justify-center'>
      <Navbar />
      <div className='mt-20 xl:w-[1280px] w-full h-[80vh] flex flex-col rounded-md p-4 border-4'>
        <h1 className='text-3xl poppins-bold'>
          AskAiPage
        </h1>
        <MicComponent />
      </div>
    </div>
  )
}
