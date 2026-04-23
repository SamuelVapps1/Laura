"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function GdprBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("gdpr_accepted")
    if (!accepted) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white border border-purple-200 rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-600 flex-1">
          Táto aplikácia ukladá osobné údaje klientov (meno, telefón, poznámky)
          v súlade s{" "}
          <Link href="/gdpr" className="underline text-brand-600">
            GDPR
          </Link>
          . Údaje sú chránené a nie sú zdieľané s tretími stranami.
        </p>
        <button
          onClick={() => {
            localStorage.setItem("gdpr_accepted", "1")
            setVisible(false)
          }}
          className="shrink-0 px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Rozumiem
        </button>
      </div>
    </div>
  )
}
