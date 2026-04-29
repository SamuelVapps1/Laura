import { useMemo } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'

import type { Appointment, Dog, Owner } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  APPOINTMENT_STATUS_COLORS,
  formatAppointmentTime,
  getAppointmentDurationMinutes,
  getAppointmentStatusLabel,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'
import {
  DAY_START_HOUR,
  HOUR_HEIGHT,
  HOUR_LABELS,
  SLOT_HOURS,
  TOTAL_GRID_HEIGHT,
  getAppointmentTimeGridPlacement,
} from './timeGridUtils'

type DayTimeGridProps = {
  selectedDate: Date
  onSlotClick: (date: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
}

type DayGridAppointmentItem = {
  appointment: Appointment
  dog?: Dog
  owner?: Owner
}

export function DayTimeGrid({
  selectedDate,
  onSlotClick,
  onAppointmentClick,
}: DayTimeGridProps) {
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
      const [dogs, owners] = await Promise.all([db.dogs.bulkGet(dogIds), db.owners.bulkGet(ownerIds)])

      const dogsById = new Map(dogs.filter(isDefined).map((dog) => [dog.id, dog]))
      const ownersById = new Map(owners.filter(isDefined).map((owner) => [owner.id, owner]))

      return appointments.map(
        (appointment): DayGridAppointmentItem => ({
          appointment,
          dog: dogsById.get(appointment.dogId),
          owner: ownersById.get(appointment.ownerId),
        })
      )
    },
    [dayStartIso, dayEndIso],
    []
  )

  const dayLabel = useMemo(
    () => format(selectedDate, 'EEEE d. MMMM yyyy', { locale: sk }),
    [selectedDate]
  )

  return (
    <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-4" data-print-hidden="true">
      <div className="mb-3 text-sm font-medium text-gray-900">{dayLabel}</div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b">
            <div className="border-r" />
            <div className="px-2 py-2 text-center text-sm font-medium">
              {format(selectedDate, 'EEEE', { locale: sk })}
            </div>
          </div>

          <div className="grid grid-cols-[72px_minmax(0,1fr)]">
            <div className="relative border-r" style={{ height: TOTAL_GRID_HEIGHT }}>
              {HOUR_LABELS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 text-right text-xs text-muted-foreground"
                  style={{
                    top: (hour - DAY_START_HOUR) * HOUR_HEIGHT - 8,
                    paddingRight: 8,
                  }}
                >
                  {hour}:00
                </div>
              ))}
            </div>

            <div className="relative" style={{ height: TOTAL_GRID_HEIGHT }}>
              {HOUR_LABELS.map((hour) => (
                <div
                  key={`day-line-${hour}`}
                  className="absolute left-0 right-0 border-t border-border/60"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                />
              ))}

              {SLOT_HOURS.map((hour) => (
                <button
                  key={`day-slot-${hour}`}
                  type="button"
                  className="absolute inset-x-0 z-0 transition hover:bg-accent/30"
                  style={{
                    top: (hour - DAY_START_HOUR) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                  }}
                  onClick={() => {
                    const slotDate = new Date(selectedDate)
                    slotDate.setHours(hour, 0, 0, 0)
                    onSlotClick(slotDate)
                  }}
                  aria-label={`${format(selectedDate, 'd. M. yyyy', { locale: sk })} ${hour}:00`}
                />
              ))}

              {items.map(({ appointment, dog, owner }) => {
                const placement = getAppointmentTimeGridPlacement(appointment)
                if (!placement) return null

                const statusColors = APPOINTMENT_STATUS_COLORS[appointment.status]
                const showStatus = placement.height >= 60
                const showOwner = placement.height >= 40

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    className={cn(
                      'absolute left-2 right-2 z-10 overflow-hidden rounded-md border text-left shadow-sm',
                      statusColors.bg,
                      statusColors.text
                    )}
                    style={{
                      top: placement.top,
                      height: placement.height,
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onAppointmentClick(appointment)
                    }}
                  >
                    <span className={cn('absolute left-0 top-0 h-full w-1', statusColors.bar)} />
                    <div className="h-full p-1.5 pl-2">
                      <p className="truncate text-[11px] font-semibold leading-tight">
                        {formatAppointmentTime(appointment)} ({getAppointmentDurationMinutes(appointment)}m)
                      </p>
                      <p className="truncate text-[11px] leading-tight">
                        {dog?.name ?? t('appointmentUnknownDog')}
                      </p>
                      {showOwner && (
                        <p className="truncate text-[10px] leading-tight">
                          {owner?.fullName ?? t('appointmentUnknownOwner')}
                        </p>
                      )}
                      {showStatus && (
                        <p className="truncate text-[10px] leading-tight">
                          {getAppointmentStatusLabel(appointment.status)}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
