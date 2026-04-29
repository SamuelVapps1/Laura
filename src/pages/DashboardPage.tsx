import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Appointment, db, type Dog, type Owner } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  formatAppointmentPrice,
  formatAppointmentTime,
  getAppointmentStatusLabel,
} from '@/lib/appointments'

type DashboardAppointmentItem = {
  appointment: Appointment
  dog?: Dog
  owner?: Owner
}

export function DashboardPage() {
  const navigate = useNavigate()
  const now = new Date()

  const dayStartIso = startOfDay(now).toISOString()
  const dayEndIso = endOfDay(now).toISOString()
  const monthStartIso = startOfMonth(now).toISOString()
  const monthEndIso = endOfMonth(now).toISOString()

  const todayItems = useLiveQuery(
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
        (appointment): DashboardAppointmentItem => ({
          appointment,
          dog: dogsById.get(appointment.dogId),
          owner: ownersById.get(appointment.ownerId),
        })
      )
    },
    [dayStartIso, dayEndIso],
    []
  )

  const monthDoneAppointments = useLiveQuery(
    async () =>
      db.appointments
        .where('startsAt')
        .between(monthStartIso, monthEndIso, true, true)
        .filter((appointment) => appointment.status === 'done')
        .toArray(),
    [monthStartIso, monthEndIso],
    []
  )

  const monthRevenue = monthDoneAppointments.reduce(
    (sum, appointment) => sum + (appointment.price ?? 0),
    0
  )
  const monthTips = monthDoneAppointments.reduce(
    (sum, appointment) => sum + (appointment.tipAmount ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{t('pageDashboardTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('pageDashboardDescription')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboardTodayAppointments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('dashboardCount')}: {todayItems.length}
            </p>

            {todayItems.length > 0 ? (
              <div className="space-y-2">
                {todayItems.map(({ appointment, dog, owner }) => (
                  <button
                    key={appointment.id}
                    type="button"
                    className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-accent"
                    onClick={() => navigate(`/calendar/appt/${appointment.id}`)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {formatAppointmentTime(appointment)} - {dog?.name ?? t('appointmentUnknownDog')}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {owner?.fullName ?? t('appointmentUnknownOwner')}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                          appointment.status
                        )}`}
                      >
                        {getAppointmentStatusLabel(appointment.status)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('emptyDayAppointments')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboardMonthRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{formatAppointmentPrice(monthRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboardMonthTips')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{formatAppointmentPrice(monthTips)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

function getStatusBadgeClass(status: Appointment['status']): string {
  if (status === 'scheduled') return 'bg-blue-50 text-blue-700'
  if (status === 'done') return 'bg-emerald-50 text-emerald-700'
  if (status === 'cancelled') return 'bg-gray-100 text-gray-600'
  return 'bg-amber-50 text-amber-700'
}
