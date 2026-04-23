"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Client } from "@/lib/types"
import { Card, Input, Textarea, Select, Button } from "@/components/ui"
import Link from "next/link"
import { format } from "date-fns"

function NewAppointmentForm() {
  const router = useRouter()
  const params = useSearchParams()
  const dateParam = params.get("date")

  const defaultDate = dateParam
    ? format(new Date(dateParam), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd")
  const defaultTime = dateParam
    ? format(new Date(dateParam), "HH:mm")
    : "09:00"

  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    client_id: "",
    date: defaultDate,
    time: defaultTime,
    duration_minutes: "60",
    came_dirty: false,
    price: "",
    notes: "",
  })

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .order("dog_name")
      .then(({ data }) => setClients(data ?? []))
  }, [])

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) { setError("Vyber prosím klienta."); return }

    setSaving(true)
    const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString()

    const { error: err } = await supabase.from("appointments").insert({
      client_id: form.client_id,
      scheduled_at,
      duration_minutes: Number(form.duration_minutes),
      came_dirty: form.came_dirty,
      price: form.price ? Number(form.price) : null,
      notes: form.notes || null,
    })

    if (err) { setError(err.message); setSaving(false); return }
    router.push("/")
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Späť na kalendár</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nový termín</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Klient / Pes *</label>
            <select
              required
              value={form.client_id}
              onChange={(e) => set("client_id", e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">— Vyber klienta —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.dog_name} ({c.owner_name})
                </option>
              ))}
            </select>
            <Link href="/clients/new" className="text-xs text-brand-600 hover:underline mt-0.5">
              + Pridať nového klienta
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dátum *"
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
            <Input
              label="Čas *"
              type="time"
              required
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Trvanie"
              value={form.duration_minutes}
              onChange={(e) => set("duration_minutes", e.target.value)}
            >
              <option value="30">30 minút</option>
              <option value="45">45 minút</option>
              <option value="60">1 hodina</option>
              <option value="90">1,5 hodiny</option>
              <option value="120">2 hodiny</option>
              <option value="180">3 hodiny</option>
            </Select>

            <Input
              label="Cena (€)"
              type="number"
              min="0"
              step="0.5"
              placeholder="napr. 25"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.came_dirty}
              onChange={(e) => set("came_dirty", e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm font-medium text-gray-700">Pes prišiel špinavý</span>
          </label>

          <Textarea
            label="Poznámky k termínu"
            placeholder="Špeciálne požiadavky, upozornenia..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Ukladám..." : "Uložiť termín"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>
              Zrušiť
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function NewAppointmentPage() {
  return (
    <Suspense>
      <NewAppointmentForm />
    </Suspense>
  )
}
