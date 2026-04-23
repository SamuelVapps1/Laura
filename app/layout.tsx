import type { Metadata } from "next"
import "./globals.css"
import { Navigation } from "@/components/Navigation"
import { GdprBanner } from "@/components/GdprBanner"

export const metadata: Metadata = {
  title: "Psí salón — diár",
  description: "Evidencia termínov a klientov psieho salónu",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="min-h-screen bg-[#faf9ff]">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <GdprBanner />
      </body>
    </html>
  )
}
