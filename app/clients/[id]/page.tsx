"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Client, Appointment } from "@/lib/types"
import { Card, Input, Textarea, Button, Badge } from "@/components/ui"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Phone, Trash2, PlusCircle, AlertTriangle } from "lucide-react"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("appointments")
        .select("*")
        .eq("client_id", id)
        .order("scheduled_at", { ascending: false }),
    ]).then(([{ data: c }, { data: a }]) => {
      setClient(c)
      setForm(c ?? {})
      setAppointments(a ?? [])
      setLoading(false)
    })
  }, [id])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from("clients")
      .update({
        owner_name: form.owner_name,
        dog_name: form.dog_name,
        breed: form.breed || null,
        dog_age: form.dog_age || null,
        phone: form.phone || null,
        behavior_notes: form.behavior_notes || null,
        tips_notes: form.tips_notes || null,
      })
      .eq("id", id)
    setClient({ ...client!, ...form } as Client)
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    await supabase.from("clients").delete().eq("id", id)
    router.push("/clients")
  }

  if (loading) return <p className="text-gray-400">Načítavam...</p>
  if (!client) return <p className="text-gray-500">Klient neexistuje.</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/clients" className="text-sm text-brand-600 hover:underline">← Späť na klientov</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {client.dog_name}
          </h1>
          <p className="text-gray-500">{client.owner_name}</p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>Upraviť</Button>
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Zmazať
              </Button>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <Card className="p-5 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-700">Zmazať klienta?</p>
              <p className="text-sm text-red-600 mt-1">
                Zmažú sa aj všetky termíny tohto klienta. Táto akcia je nevratná.
              </p>
              <div className="flex gap-3 mt-3">
                <Button variant="danger" onClick={handleDelete}>Áno, zmazať</Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Zrušiť</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        {editing ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Majiteľ</h2>
              <div className="space-y-4">
                <Input label="Meno majiteľa" value={form.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} />
                <Input label="Telefón" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
            <div className="border-t border-purple-100 pt-5">
              <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Pes</h2>
              <div className="space-y-4">
                <Input label="Meno psa" value={form.dog_name ?? ""} onChange={(e) => set("dog_name", e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Plemeno" value={form.breed ?? ""} onChange={(e) => set("breed", e.target.value)} />
                  <Input label="Vek" value={form.dog_age ?? ""} onChange={(e) => set("dog_age", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="border-t border-purple-100 pt-5">
              <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3">Poznámky</h2>
              <div className="space-y-4">
                <Textarea label="Správanie / temperament" value={form.behavior_notes ?? ""} onChange={(e) => set("behavior_notes", e.target.value)} />
                <Textarea label="Sprepitné a tipy" value={form.tips_notes ?? ""} onChange={(e) => set("tips_notes", e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Ukladám..." : "Uložiť zmeny"}</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setForm(client) }}>Zrušiť</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-3xl">🐶</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{client.dog_name}</p>
                {client.breed && <p className="text-sm text-gray-500">{client.breed}{client.dog_age ? ` · ${client.dog_age}` : ""}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Majiteľ</p>
                <p className="font-medium text-gray-900">{client.owner_name}</p>
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline mt-1">
                    <Phone size={13} />{client.phone}
                  </a>
                )}
              </div>
            </div>

            {client.behavior_notes && (
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Správanie</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{client.behavior_notes}</p>
              </div>
            )}

            {client.tips_notes && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Sprepitné & tipy</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{client.tips_notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">História termínov</h2>
          <Link href={`/appointments/new?client=${id}`}>
            <Button variant="secondary" className="flex items-center gap-1.5 text-sm">
              <PlusCircle size={14} />
              Nový termín
            </Button>
          </Link>
        </div>

        {appointments.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-400 text-sm">Zatiaľ žiadne termíny.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => (
              <Link key={a.id} href={`/appointments/${a.id}`}>
                <Card className="p-4 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{formatDateTime(a.scheduled_at)}</p>
                    <p className="text-xs text-gray-400">{a.duration_minutes} min{a.price != null ? ` · ${a.price} €` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.came_dirty && <Badge color="amber">Špinavý</Badge>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
