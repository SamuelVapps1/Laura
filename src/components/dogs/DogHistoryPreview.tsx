import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, type Appointment } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  formatAppointmentDateTime,
  formatAppointmentPrice,
  getAppointmentStatusLabel,
} from '@/lib/appointments'

type DogHistoryPreviewProps = {
  dogId: string
  currentAppointmentId?: string
}

export function DogHistoryPreview({ dogId, currentAppointmentId }: DogHistoryPreviewProps) {
  const appointments = useLiveQuery(
    async () => {
      const rows = await db.appointments.where('dogId').equals(dogId).toArray()
      return rows
        .sort(sortAppointmentsByStartDesc)
        .filter((appointment) => appointment.id !== currentAppointmentId)
        .slice(0, 5)
    },
    [dogId, currentAppointmentId],
    []
  )

  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyDogHistory')}</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('previousAppointments')}
      </p>
      <div className="space-y-2">
        {appointments.map((appointment) => (
          <Link
            key={appointment.id}
            to={`/calendar/appt/${appointment.id}`}
            className="block rounded-md border p-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-900">{formatAppointmentDateTime(appointment)}</span>
              <span className="text-xs text-muted-foreground">{getAppointmentStatusLabel(appointment.status)}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {appointment.serviceName ?? t('appointmentNoService')}
              {appointment.price !== null ? ` · ${formatAppointmentPrice(appointment.price)}` : ''}
            </p>
            {appointment.tipAmount !== null && appointment.tipAmount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('labelTip')}: {formatAppointmentPrice(appointment.tipAmount)}
              </p>
            )}
            {appointment.notes && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{appointment.notes}</p>
            )}
          </Link>
        ))}
      </div>
      <ButtonLink to={`/dogs/${dogId}#history`} label={t('openFullDogHistory')} />
    </div>
  )
}

function ButtonLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
    >
      {label}
    </Link>
  )
}

function sortAppointmentsByStartDesc(first: Appointment, second: Appointment): number {
  return new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime()
}
