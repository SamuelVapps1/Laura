"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, Input, Textarea, Button } from "@/components/ui"
import Link from "next/link"

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    owner_name: "",
    dog_name: "",
    breed: "",
    dog_age: "",
    phone: "",
    behavior_notes: "",
    tips_notes: "",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        owner_name: form.owner_name,
        dog_name: form.dog_name,
        breed: form.breed || null,
        dog_age: form.dog_age || null,
        phone: form.phone || null,
        behavior_notes: form.behavior_notes || null,
        tips_notes: form.tips_notes || null,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/clients/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-brand-600 hover:underline">← Späť na klientov</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nový klient</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Majiteľ</h2>
            <div className="space-y-4">
              <Input
                label="Meno majiteľa *"
                required
                placeholder="Jana Nováková"
                value={form.owner_name}
                onChange={(e) => set("owner_name", e.target.value)}
              />
              <Input
                label="Telefón"
                type="tel"
                placeholder="+421 900 000 000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-purple-100 pt-5">
            <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Pes</h2>
            <div className="space-y-4">
              <Input
                label="Meno psa *"
                required
                placeholder="Bobík"
                value={form.dog_name}
                onChange={(e) => set("dog_name", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Plemeno"
                  placeholder="Labrádor"
                  value={form.breed}
                  onChange={(e) => set("breed", e.target.value)}
                />
                <Input
                  label="Vek"
                  placeholder="3 roky"
                  value={form.dog_age}
                  onChange={(e) => set("dog_age", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-purple-100 pt-5">
            <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Poznámky</h2>
            <div className="space-y-4">
              <Textarea
                label="Správanie / temperament"
                placeholder="Nervózny pri strihani pazúrov, pokojný inak..."
                value={form.behavior_notes}
                onChange={(e) => set("behavior_notes", e.target.value)}
              />
              <Textarea
                label="Sprepitné a iné tipy"
                placeholder="Dáva sprepitné, preferuje ranné termíny..."
                value={form.tips_notes}
                onChange={(e) => set("tips_notes", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Ukladám..." : "Uložiť klienta"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/clients")}>
              Zrušiť
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
