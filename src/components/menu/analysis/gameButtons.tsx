"use client"

import { useContext } from "react"
import NextMove from "../../svg/nextMove"
import Play from "../../svg/play"
import SkipGame from "../../svg/skipGame"
import Pause from "../../svg/pause"
import { AnalyzeContext } from "@/context/analyze"

const icon = "fill-foregroundGrey transition-colors group-hover:fill-foregroundHighlighted group-focus-visible:fill-foregroundHighlighted"

export default function GameButtons() {
    const { playing: [playing], gameController, analyzingMove: [analyzingMove] } = useContext(AnalyzeContext)
    const controls = [
        { label: "First position", action: gameController.first, icon: <SkipGame class={`h-[45px] rotate-180 ${icon}`} /> },
        { label: "Previous move", action: gameController.back, icon: <NextMove class={`h-[25px] rotate-180 ${icon}`} /> },
        { label: playing ? "Pause playback" : "Play game", action: gameController.togglePlay, icon: playing ? <Pause class={`h-[25px] pr-1 ${icon}`} /> : <Play class={`h-[25px] pl-1 ${icon}`} /> },
        { label: "Next move", action: gameController.forward, icon: <NextMove class={`h-[25px] ${icon}`} /> },
        { label: "Last move", action: gameController.last, icon: <SkipGame class={`h-[45px] ${icon}`} /> },
    ]

    return (
        <div className="w-[85%] rounded-borderRoundness p-3 flex flex-row justify-around items-center">
            {controls.map(control => (
                <button key={control.label} className="group rounded min-h-11 px-1" type="button" title={control.label} aria-label={control.label} onClick={control.action} disabled={analyzingMove}>
                    {control.icon}
                </button>
            ))}
        </div>
    )
}
