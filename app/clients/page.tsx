"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Client } from "@/lib/types"
import { Card, Button } from "@/components/ui"
import Link from "next/link"
import { Search, PlusCircle } from "lucide-react"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .order("dog_name")
      .then(({ data }) => {
        setClients(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.dog_name.toLowerCase().includes(query.toLowerCase()) ||
      c.owner_name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Klienti</h1>
        <Link href="/clients/new">
          <Button className="flex items-center gap-2">
            <PlusCircle size={16} />
            Nový klient
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Hľadať podľa mena psa alebo majiteľa..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Načítavam...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-4xl mb-3">🐕</p>
          <p className="text-gray-500">
            {query ? "Žiadny klient nezodpovedá hľadaniu." : "Zatiaľ žiadni klienti."}
          </p>
          {!query && (
            <Link href="/clients/new">
              <Button className="mt-4">Pridať prvého klienta</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="p-5 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-xl shrink-0">
                    🐶
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate">
                      {c.dog_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{c.owner_name}</p>
                  </div>
                </div>
                {c.breed && (
                  <p className="mt-3 text-xs text-gray-400">{c.breed}{c.dog_age ? `, ${c.dog_age}` : ""}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
