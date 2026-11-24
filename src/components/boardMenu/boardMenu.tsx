"use client"

import { AnalyzeContext } from '@/context/analyze'
import Image from 'next/image'
import { useContext } from 'react'

export default function BoardMenu() {
    const analyzeContext = useContext(AnalyzeContext)

    const setWhite = analyzeContext.white[1]
    const setAnimation = analyzeContext.animation[1]


    function flipBoard() {
        setAnimation(false)
        setWhite(prev => !prev)
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <div className='flex navTop:flex-col flex-row-reverse gap-2'>
                <button className='outline-none' onClick={flipBoard} type='button'><Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/flip.svg`} title='Flip Board' alt="Flip Board" width={17} height={17} className='min-w-[17px]' /></button>
            </div>
            <div>

            </div>
        </div>
    )
}