"use client"

import { AnalyzeContext } from "@/context/analyze"
import { ConfigContext } from "@/context/config"
import Image from "next/image"
import Link from "next/link"
import { useContext, useEffect, useRef } from "react"
import Settings from "../nav/settings/settings"
import GitHub from "../svg/github"

const iconControl = "flex size-8 shrink-0 items-center justify-center rounded-borderRoundness text-foregroundGrey hover:bg-backgroundBoxBoxHover hover:text-foregroundHighlighted"

export default function BoardMenu() {
    const { white: [, setWhite], animation: [, setAnimation] } = useContext(AnalyzeContext)
    const { openedMenu: [openedMenu, setOpenedMenu] } = useContext(ConfigContext)
    const settingsButton = useRef<HTMLButtonElement>(null)
    const settingsPanel = useRef<HTMLDivElement>(null)
    const isOpen = openedMenu === "settings"

    useEffect(() => {
        if (!isOpen) return

        function closeOutside(event: PointerEvent) {
            const target = event.target as Node
            if (settingsPanel.current?.contains(target) || settingsButton.current?.contains(target)) return
            setOpenedMenu(null)
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key !== "Escape") return
            setOpenedMenu(null)
            settingsButton.current?.focus()
        }

        document.addEventListener("pointerdown", closeOutside)
        document.addEventListener("keydown", closeOnEscape)
        return () => {
            document.removeEventListener("pointerdown", closeOutside)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [isOpen, setOpenedMenu])

    function flipBoard() {
        setAnimation(false)
        setWhite(prev => !prev)
    }

    return (
        <div aria-label="Board controls" role="group" className="flex shrink-0 justify-end gap-1 navTop:w-8 navTop:flex-col navTop:justify-start">
            <button className={iconControl} onClick={flipBoard} type="button" title="Flip Board" aria-label="Flip Board">
                <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/flip.svg`} alt="" width={17} height={17} />
            </button>
            <Link aria-label="Source Code" title="Source Code" target="_blank" href="https://github.com/Aaditya-Magar/chess-analysis-website" className={iconControl}>
                <GitHub class="fill-current" />
            </Link>
            <button ref={settingsButton} className={iconControl} type="button" aria-label="Settings" title="Settings" aria-controls="site-settings" aria-expanded={isOpen} onClick={() => setOpenedMenu(isOpen ? null : "settings")}>
                <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/setting.svg`} alt="" width={20} height={20} draggable={false} />
            </button>
            <div id="site-settings" ref={settingsPanel} hidden={!isOpen} className="fixed right-2 top-2 z-[500] max-h-[calc(100dvh-16px)] w-[min(360px,calc(100vw-16px))] select-none overflow-y-auto rounded-borderRoundness bg-backgroundBoxDarker p-2">
                <Settings hidden={!isOpen} />
                <Link href="/attributions" className="mt-2 block rounded-borderRoundness px-3 py-2 text-sm font-bold text-foregroundGrey hover:bg-backgroundBoxBoxHover hover:text-foregroundHighlighted">
                    Licenses
                </Link>
            </div>
        </div>
    )
}
