"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/lib/types"
import { Card, Badge, Button } from "@/components/ui"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Clock, Euro, Trash2, Dog } from "lucide-react"

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*, client:clients(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setAppt(data)
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirm("Naozaj chceš zmazať tento termín?")) return
    setDeleting(true)
    await supabase.from("appointments").delete().eq("id", id)
    router.push("/")
  }

  if (loading) return <p className="text-gray-400">Načítavam...</p>
  if (!appt) return <p className="text-gray-500">Termín neexistuje.</p>

  const client = appt.client!

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Späť na kalendár</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Detail termínu</h1>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-gray-900">{client.dog_name}</p>
            <p className="text-gray-500 text-sm">{client.owner_name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {appt.came_dirty && <Badge color="amber">Prišiel špinavý</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} className="text-brand-500" />
            <div>
              <p className="font-medium text-gray-900">{formatDateTime(appt.scheduled_at)}</p>
              <p className="text-gray-400">{appt.duration_minutes} minút</p>
            </div>
          </div>

          {appt.price != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Euro size={16} className="text-brand-500" />
              <p className="font-medium text-gray-900">{appt.price} €</p>
            </div>
          )}
        </div>

        {appt.notes && (
          <div className="bg-brand-50 rounded-xl p-4 text-sm text-gray-700">
            <p className="font-medium text-brand-700 mb-1">Poznámky</p>
            {appt.notes}
          </div>
        )}

        <div className="border-t border-purple-100 pt-4 flex items-center gap-3">
          <Link href={`/clients/${client.id}`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Dog size={15} />
              Profil klienta
            </Button>
          </Link>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 ml-auto"
          >
            <Trash2 size={15} />
            {deleting ? "Mažem..." : "Zmazať"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
