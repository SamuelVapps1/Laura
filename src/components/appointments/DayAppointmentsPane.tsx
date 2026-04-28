import { endOfDay, format, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'

import type { Appointment, Dog, Owner } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  formatAppointmentPrice,
  formatAppointmentTime,
  getAppointmentStatusLabel,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'

interface DayAppointmentsPaneProps {
  selectedDate: Date
  onAppointmentClick: (appointment: Appointment) => void
}

type DayAppointment = {
  appointment: Appointment
  dog?: Dog
  owner?: Owner
}

export function DayAppointmentsPane({ selectedDate, onAppointmentClick }: DayAppointmentsPaneProps) {
  const dayStartIso = startOfDay(selectedDate).toISOString()
  const dayEndIso = endOfDay(selectedDate).toISOString()

  const items = useLiveQuery(
    async () => {
      const appointments = await db.appointments
        .where('startsAt')
        .between(dayStartIso, dayEndIso, true, true)
        .toArray()

      appointments.sort((a, b) => a.startsAt.localeCompare(b.startsAt))

      const dogIds = Array.from(new Set(appointments.map((appointment) => appointment.dogId)))
      const ownerIds = Array.from(new Set(appointments.map((appointment) => appointment.ownerId)))
      const dogs = await db.dogs.bulkGet(dogIds)
      const owners = await db.owners.bulkGet(ownerIds)
      const dogsById = new Map(dogs.filter(isDefined).map((dog) => [dog.id, dog]))
      const ownersById = new Map(owners.filter(isDefined).map((owner) => [owner.id, owner]))

      return appointments.map((appointment): DayAppointment => ({
        appointment,
        dog: dogsById.get(appointment.dogId),
        owner: ownersById.get(appointment.ownerId),
      }))
    },
    [dayStartIso, dayEndIso],
    []
  )

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(selectedDate, 'EEEE d. MMMM yyyy', { locale: sk })}
        </h2>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(({ appointment, dog, owner }) => (
            <button
              key={appointment.id}
              type="button"
              className="w-full rounded-md border bg-background p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => onAppointmentClick(appointment)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {formatAppointmentTime(appointment)} - {dog?.name ?? t('appointmentUnknownDog')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {owner?.fullName ?? t('appointmentUnknownOwner')}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium",
                  appointment.status === 'scheduled' && "bg-blue-50 text-blue-700",
                  appointment.status === 'done' && "bg-emerald-50 text-emerald-700",
                  appointment.status === 'cancelled' && "bg-gray-100 text-gray-600",
                  appointment.status === 'no_show' && "bg-amber-50 text-amber-700"
                )}>
                  {getAppointmentStatusLabel(appointment.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                <span>{appointment.serviceName ?? t('appointmentNoService')}</span>
                {appointment.price !== null && (
                  <span>{formatAppointmentPrice(appointment.price)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('emptyDayAppointments')}
        </div>
      )}
    </section>
  )
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
