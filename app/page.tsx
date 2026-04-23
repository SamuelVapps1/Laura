"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addHours } from "date-fns"
import { sk } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { sk },
})

const messages = {
  today: "Dnes",
  previous: "←",
  next: "→",
  month: "Mesiac",
  week: "Týždeň",
  day: "Deň",
  agenda: "Zoznam",
  date: "Dátum",
  time: "Čas",
  event: "Termín",
  noEventsInRange: "Žiadne termíny v tomto období.",
  showMore: (count: number) => `+${count} ďalších`,
}

export default function HomePage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, client:clients(owner_name, dog_name)")
      .order("scheduled_at")
    setAppointments(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const events = appointments.map((a) => ({
    id: a.id,
    title: a.client
      ? `${a.client.dog_name} (${a.client.owner_name})`
      : "Termín",
    start: new Date(a.scheduled_at),
    end: addHours(new Date(a.scheduled_at), (a.duration_minutes ?? 60) / 60),
  }))

  const todayCount = appointments.filter((a) => {
    const d = new Date(a.scheduled_at)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalendár termínov</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Dnes: <span className="font-semibold text-brand-600">{todayCount} termínov</span>
          </p>
        </div>
      </div>

      <Card className="p-4 overflow-hidden">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center text-gray-400">
            Načítavam...
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            style={{ height: 620 }}
            messages={messages}
            culture="sk"
            onSelectEvent={(event) => router.push(`/appointments/${event.id}`)}
            onSelectSlot={(slot) => {
              const iso = slot.start.toISOString()
              router.push(`/appointments/new?date=${iso}`)
            }}
            selectable
            popup
          />
        )}
      </Card>
    </div>
  )
}
