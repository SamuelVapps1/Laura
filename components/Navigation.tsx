"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Users, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Kalendár", icon: CalendarDays },
  { href: "/clients", label: "Klienti", icon: Users },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-purple-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-bold text-xl text-brand-700">Psí salón</span>
        </div>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}

          <Link
            href="/appointments/new"
            className="ml-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            Nový termín
          </Link>
        </nav>
      </div>
    </header>
  )
}
