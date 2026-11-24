"use client"

import Image from "next/image"
import Link from "next/link"
import { useContext, useEffect, useRef } from "react"
import GitHub from "../svg/github"
import Settings from "./settings/settings"
import { ConfigContext } from "@/context/config"

const links = [
    { label: "Source Code", href: "https://github.com/wdeloo/Brilliant-Chess", icon: GitHub },
]

export default function Nav() {
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

    return (
        <nav aria-label="Site navigation" className="relative flex w-screen flex-col navTop:h-screen navTop:w-max">
            <div className="flex w-full justify-end bg-backgroundBox select-none navTop:h-full navTop:flex-col navTop:pb-2">
                <div className="flex flex-row text-sm font-bold navTop:w-full navTop:flex-col">
                    {links.map(({ label, href, icon: Icon }) => (
                        <Link aria-label={label} key={href} target="_blank" href={href} className="group flex items-center justify-center gap-2 p-2 text-foregroundGrey hover:bg-backgroundBoxHover hover:text-foregroundHighlighted reduceNav:justify-start reduceNav:px-3">
                            <Icon class="fill-foregroundGrey transition-colors group-hover:fill-foregroundHighlighted" />
                            <span className="hidden reduceNav:block">{label}</span>
                        </Link>
                    ))}
                </div>
                <button
                    ref={settingsButton}
                    aria-label="Settings"
                    aria-controls="site-settings"
                    aria-expanded={isOpen}
                    title="Settings"
                    type="button"
                    onClick={() => setOpenedMenu(isOpen ? null : "settings")}
                    className="fixed bottom-2 left-2 z-[510] flex items-center justify-start gap-2.5 rounded-borderRoundness bg-[#252421] px-3.5 py-2.5 text-lg font-bold leading-none text-[#dedede] hover:bg-backgroundBoxBoxHover navTop:static navTop:w-full"
                >
                    <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/setting.svg`} alt="" width={27} height={27} draggable={false} />
                    Settings
                </button>
            </div>
            <div id="site-settings" ref={settingsPanel} hidden={!isOpen} className="fixed bottom-14 left-2 z-[500] max-h-[calc(100dvh-68px)] w-[min(360px,calc(100vw-16px))] overflow-y-auto rounded-borderRoundness bg-backgroundBoxDarker p-2 select-none navTop:absolute navTop:bottom-2 navTop:left-full">
                <Settings hidden={!isOpen} />
                <Link href="/attributions" className="mt-2 block rounded-borderRoundness px-3 py-2 text-sm font-bold text-foregroundGrey hover:bg-backgroundBoxBoxHover hover:text-foregroundHighlighted">
                    Licenses
                </Link>
            </div>
        </nav>
    )
}
