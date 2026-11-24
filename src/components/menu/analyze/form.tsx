import { useEffect, useRef, useState } from "react"
import Arrow from "../../svg/arrow"
import Image from "next/image"
import { Data } from "@/context/analyze"
import { platform } from "../menu"

type format = [string, string, string]

export const FORMATS: format[] = [
    ["Chess.com", `${process.env.NEXT_PUBLIC_BASE_PATH}/images/chesscom.svg`, "platform"],
    ["Lichess.org", `${process.env.NEXT_PUBLIC_BASE_PATH}/images/lichess.svg`, "platform"],
    ["PGN", `${process.env.NEXT_PUBLIC_BASE_PATH}/images/pgn.svg`, "format"],
    ["FEN", `${process.env.NEXT_PUBLIC_BASE_PATH}/images/json.svg`, "format"],
]

export default function Form(props: { setData: (data: Data) => void, selectGame: (username: string, platform: platform ) => void, selected: [number, (selected: number) => void] }) {
    const { setData, selectGame } = props

    const [isSelecting, setSelecting] = useState(false)
    const [value, setValue] = useState("")
    const [selected, select] = props.selected

    const formRef = useRef<HTMLFormElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const [fileError, setFileError] = useState("")

    useEffect(() => {
        const previousSelected = localStorage.getItem('format')
        if (!previousSelected) return

        const previousSelectedNumber = Number(previousSelected)

        if (FORMATS[previousSelectedNumber] != null) {
            select(previousSelectedNumber)
        } else {
            select(2)
            localStorage.setItem('format', String(2))
        }
    }, [])
    
    useEffect(() => {
        setValue("")
        setSelecting(false)
    }, [])

    useEffect(() => {
        switch (FORMATS[selected][0]) {
            case "Chess.com":
                const previousChesscomUserName = localStorage.getItem('chesscom') ?? ''
                setValue(previousChesscomUserName)
                break
            case "Lichess.org":
                const previousLichessorgUserName = localStorage.getItem('lichessorg') ?? ''
                setValue(previousLichessorgUserName)
                break
            default:
                setValue("")
        }
    }, [selected])

    function analyze(e: React.FormEvent) {
        e.preventDefault()

        const text = value.trim()
        if (!text) return

        switch (FORMATS[selected][0]) {
            case "Chess.com":
                localStorage.setItem("chesscom", text)
                selectGame(text, "chessCom")
                break
            case "Lichess.org":
                localStorage.setItem("lichessorg", text)
                selectGame(text, "lichessOrg")
                break
            case "PGN":
                setData({ format: "pgn", string: text })
                break
            case "FEN":
                setData({ format: "fen", string: text })
                break
        }
    }

    function changeSelected(i: number) {
        select(i)
        setSelecting(false)
        setFileError('')

        localStorage.setItem('format', String(i))

        const input = inputRef.current
        input?.focus()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            formRef.current?.requestSubmit()
        }
    }

    async function openPgn(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ""
        if (!file) return
        setFileError("")
        try {
            const text = (await file.text()).trim()
            if (!text) throw new Error("Empty file")
            setData({ format: "pgn", string: text })
        } catch {
            setFileError("Could not open this PGN file.")
        }
    }

    function isAPlatform(i: number) {
        return FORMATS[i][2] === "platform"
    }

    const inputPlaceholder = isAPlatform(selected) ?
        `Enter your ${FORMATS[selected][0]} user here` :
        `Paste your ${FORMATS[selected][0]} code here`

    const isPgn = FORMATS[selected][0] === "PGN"
    const analyzeValue = isAPlatform(selected) ?
        "List games" :
        "Analyze"

    return (
        <form ref={formRef} onSubmit={analyze} className="flex flex-col items-center gap-4">
            <textarea spellCheck={false} rows={1} value={value} onKeyDown={handleKeyDown} aria-label={inputPlaceholder} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e?.currentTarget.value)} ref={inputRef} placeholder={inputPlaceholder} className="w-[85%] px-2 py-[13px] flex items-center transition-colors text-xl font-bold rounded-borderRoundness border-border hover:border-borderHighlighted focus:border-borderHighlighted border-solid border-[1px] bg-backgroundBoxBox outline-none analysis-input placeholder:text-placeholder placeholder:font-normal resize-none" />
            <div className="w-[85%] flex flex-col gap-2">
                <div className="flex gap-2">
                    <button type="button" aria-label={`Game format: ${FORMATS[selected][0]}`} aria-expanded={isSelecting} className="flex flex-row gap-1 items-center justify-center min-w-0 flex-1 h-14 rounded-borderRoundness text-xl bg-backgroundBoxBox hover:bg-backgroundBoxBoxHover hover:text-foregroundHighlighted transition-colors font-bold relative" onClick={e => { e.preventDefault(); setSelecting(isSelecting => !isSelecting) }}>
                        <Image draggable={false} alt="icon" src={FORMATS[selected][1]} width={28} height={28} />
                        {FORMATS[selected][0]}
                        <div className={`absolute h-full right-6 top-0 flex flex-row items-center ${isSelecting ? "" : "rotate-180"}`}><Arrow class="fill-foregroundGrey" /></div>
                    </button>
                    {isPgn && (
                        <label title="Open PGN file" className="relative flex size-14 shrink-0 items-center justify-center rounded-borderRoundness bg-backgroundBoxBox text-foregroundGrey hover:bg-backgroundBoxBoxHover hover:text-foregroundHighlighted focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
                            </svg>
                            <input aria-label="Open PGN file" type="file" accept=".pgn,text/plain" onChange={openPgn} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                        </label>
                    )}
                </div>
                <div className="flex flex-col gap-2" style={{ display: isSelecting ? "" : "none" }}>
                    <h6 className="mt-2 font-bold flex flex-row gap-1"><Image alt="depth" src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/formats.svg`} width={18} height={18} />Game Formats</h6>
                    <ul className="grid grid-cols-2 gap-3">
                        {FORMATS.map((format, i) => {
                            return (
                                <li key={i}>
                                    <button type="button" onClick={() => changeSelected(i)} style={{ gap: i !== 0 ? '.4rem' : '0' }} className="flex flex-row items-center justify-center h-12 w-full hover:text-foregroundHighlighted rounded-borderRoundness text-md bg-backgroundBoxBox hover:bg-backgroundBoxBoxHover transition-colors font-bold">
                                        <Image draggable={false} alt="" src={format[1]} width={150} height={0} className="h-6 w-fit" priority />
                                        {format[0]}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
            {isPgn && fileError && <p role="alert" className="w-[85%] text-sm">{fileError}</p>}
            <input disabled={!value.trim()} type="submit" className="w-[85%] h-16 cursor-pointer rounded-borderExtraRoundness text-2xl bg-backgroundBoxBoxHighlighted hover:bg-backgroundBoxBoxHighlightedHover transition-all font-extrabold hover:shadow-shadowBoxBoxHighlighted" value={analyzeValue} />
        </form>
    )
}