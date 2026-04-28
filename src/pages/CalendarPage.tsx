import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { sk as skLocale } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { DayFlag, DayPicker, SelectionState, UI, type DayButtonProps } from 'react-day-picker'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AppointmentDetailPanel } from '@/components/appointments/AppointmentDetailPanel'
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog'
import { DayAppointmentsPane } from '@/components/appointments/DayAppointmentsPane'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import { toDateInputValue, toMonthInputValue } from '@/lib/appointments'
import { cn } from '@/lib/utils'

export function CalendarPage() {
  const navigate = useNavigate()
  const { appointmentId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const dateParam = searchParams.get('date')
  const monthParam = searchParams.get('month')

  const selectedDate = useMemo(() => parseDateParam(dateParam) ?? new Date(), [dateParam])
  const visibleMonth = useMemo(
    () => parseMonthParam(monthParam) ?? startOfMonth(selectedDate),
    [monthParam, selectedDate]
  )

  const monthStartIso = startOfMonth(visibleMonth).toISOString()
  const monthEndIso = endOfMonth(visibleMonth).toISOString()

  const monthAppointments = useLiveQuery(
    () => db.appointments
      .where('startsAt')
      .between(monthStartIso, monthEndIso, true, true)
      .toArray(),
    [monthStartIso, monthEndIso],
    []
  )

  const linkedAppointment = useLiveQuery(
    () => appointmentId ? db.appointments.get(appointmentId) : undefined,
    [appointmentId],
    undefined
  )

  useEffect(() => {
    if (!appointmentId || !linkedAppointment) return
    if (dateParam && monthParam) return

    const startsAt = new Date(linkedAppointment.startsAt)
    const nextParams = new URLSearchParams(searchParams)

    if (!dateParam) {
      nextParams.set('date', toDateInputValue(startsAt))
    }

    if (!monthParam) {
      nextParams.set('month', toMonthInputValue(startsAt))
    }

    setSearchParams(nextParams, { replace: true })
  }, [appointmentId, dateParam, linkedAppointment, monthParam, searchParams, setSearchParams])

  const bookedDates = useMemo(() => {
    const bookedDateKeys = new Set(
      monthAppointments.map((appointment) => toDateInputValue(new Date(appointment.startsAt)))
    )

    return Array.from(bookedDateKeys).map(parseRequiredDate)
  }, [monthAppointments])

  const handleSelectDate = (date?: Date) => {
    if (!date) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('date', toDateInputValue(date))
    nextParams.set('month', toMonthInputValue(date))
    setSearchParams(nextParams)
  }

  const handleMonthChange = (month: Date) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('month', toMonthInputValue(month))
    setSearchParams(nextParams)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    const search = searchParams.toString()
    navigate({
      pathname: `/calendar/appt/${appointment.id}`,
      search: search ? `?${search}` : '',
    })
  }

  const handleCloseDetail = () => {
    const nextParams = new URLSearchParams(searchParams)

    if (!nextParams.get('date')) {
      nextParams.set('date', toDateInputValue(selectedDate))
    }

    if (!nextParams.get('month')) {
      nextParams.set('month', toMonthInputValue(visibleMonth))
    }

    const search = nextParams.toString()
    navigate({
      pathname: '/calendar',
      search: search ? `?${search}` : '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageCalendarTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('pageCalendarDescription')}</p>
        </div>
        <Button className="hidden sm:inline-flex" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('buttonNewAppointment')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={visibleMonth}
            onSelect={handleSelectDate}
            onMonthChange={handleMonthChange}
            locale={skLocale}
            weekStartsOn={1}
            showOutsideDays
            fixedWeeks
            modifiers={{ booked: bookedDates }}
            components={{ DayButton: CalendarDayButton }}
            classNames={{
              [UI.Root]: "w-full",
              [UI.Months]: "relative",
              [UI.Month]: "space-y-4",
              [UI.MonthCaption]: "flex h-10 items-center justify-center",
              [UI.CaptionLabel]: "text-base font-semibold text-gray-900",
              [UI.Nav]: "absolute right-4 top-4 flex items-center gap-1",
              [UI.PreviousMonthButton]: "inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40",
              [UI.NextMonthButton]: "inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40",
              [UI.Chevron]: "h-4 w-4",
              [UI.MonthGrid]: "w-full border-collapse",
              [UI.Weekdays]: "grid grid-cols-7",
              [UI.Weekday]: "py-2 text-center text-xs font-medium text-muted-foreground",
              [UI.Weeks]: "block",
              [UI.Week]: "grid grid-cols-7",
              [UI.Day]: "flex h-11 items-center justify-center p-0",
              [UI.DayButton]: "relative flex h-10 w-10 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              [DayFlag.outside]: "text-muted-foreground opacity-40",
              [DayFlag.today]: "font-semibold text-primary",
              [SelectionState.selected]: "text-primary-foreground",
            }}
          />
        </section>

        <DayAppointmentsPane
          selectedDate={selectedDate}
          onAppointmentClick={handleAppointmentClick}
        />
      </div>

      <Button
        className="fixed bottom-6 right-6 z-30 rounded-full shadow-lg sm:hidden"
        onClick={() => setIsCreateOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t('buttonNewAppointment')}
      </Button>

      <AppointmentFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        selectedDate={selectedDate}
      />

      <AppointmentDetailPanel
        appointmentId={appointmentId}
        onClose={handleCloseDetail}
      />
    </div>
  )
}

function CalendarDayButton({ className, children, day: _day, modifiers, ...props }: DayButtonProps) {
  return (
    <button
      className={cn(
        className,
        modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary",
        modifiers.today && !modifiers.selected && "ring-1 ring-primary/40",
        modifiers.booked && "font-semibold"
      )}
      {...props}
    >
      <span>{children}</span>
      {modifiers.booked && (
        <span
          className={cn(
            "absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary",
            modifiers.selected && "bg-primary-foreground"
          )}
        />
      )}
    </button>
  )
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  return parseDate(value)
}

function parseMonthParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  return parseDate(`${value}-01`)
}

function parseRequiredDate(value: string): Date {
  return parseDate(value) ?? new Date()
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}
