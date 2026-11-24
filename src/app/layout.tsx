import type { Metadata } from "next"
import "./globals.css"

import "@fontsource/roboto/latin-400.css"
import "@fontsource/roboto/latin-700.css"
import "@fontsource/roboto/latin-900.css"

export const metadata: Metadata = {
  title: "MysteriousChess — Game Analysis",
  description: "Import a chess game and review every move with Stockfish.",
  applicationName: "MysteriousChess",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/mysteriouschess.svg`,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex navTop:flex-row flex-col items-center justify-start h-screen w-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
