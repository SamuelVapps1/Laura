import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, startOfMonth, startOfWeek } from 'date-fns'
import { sk as skLocale } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { DayFlag, DayPicker, SelectionState, UI, type DayButtonProps } from 'react-day-picker'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AppointmentDetailPanel } from '@/components/appointments/AppointmentDetailPanel'
import { AppointmentCompletionDialog } from '@/components/appointments/AppointmentCompletionDialog'
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog'
import { AppointmentPhotoDialog } from '@/components/appointments/AppointmentPhotoDialog'
import { DayTimeGrid } from '@/components/appointments/DayTimeGrid'
import { DayAppointmentsPane } from '@/components/appointments/DayAppointmentsPane'
import { WeekTimeGrid } from '@/components/appointments/WeekTimeGrid'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  APPOINTMENT_STATUS_COLORS,
  getAppointmentStatusLabel,
  toDateInputValue,
  toMonthInputValue,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'

const STATUS_DOT_PRIORITY = [
  'scheduled',
  'done',
  'no_show',
  'cancelled',
] as const satisfies readonly Appointment['status'][]

type CalendarView = 'month' | 'week' | 'day'

const CALENDAR_VIEW_OPTIONS = [
  { value: 'month', labelKey: 'calendarViewMonth' },
  { value: 'week', labelKey: 'calendarViewWeek' },
  { value: 'day', labelKey: 'calendarViewDay' },
] as const

export function CalendarPage() {
  const navigate = useNavigate()
  const { appointmentId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedActionAppointment, setSelectedActionAppointment] = useState<Appointment | null>(null)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [completionMode, setCompletionMode] = useState<'finish' | 'cancel'>('finish')
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  const dateParam = searchParams.get('date')
  const monthParam = searchParams.get('month')
  const viewParam = searchParams.get('view')
  const view = useMemo(() => parseViewParam(viewParam), [viewParam])

  const selectedDate = useMemo(() => parseDateParam(dateParam) ?? new Date(), [dateParam])
  const visibleMonth = useMemo(
    () => parseMonthParam(monthParam) ?? startOfMonth(selectedDate),
    [monthParam, selectedDate]
  )

  const monthStartIso = startOfMonth(visibleMonth).toISOString()
  const monthEndIso = endOfMonth(visibleMonth).toISOString()
  const selectedWeekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  )

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
    if (!isValidDate(startsAt)) return

    const nextParams = new URLSearchParams(searchParams)

    if (!dateParam) {
      nextParams.set('date', toDateInputValue(startsAt))
    }

    if (!monthParam) {
      nextParams.set('month', toMonthInputValue(startsAt))
    }

    setSearchParams(nextParams, { replace: true })
  }, [appointmentId, dateParam, linkedAppointment, monthParam, searchParams, setSearchParams])

  const bookedByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()

    monthAppointments.forEach((appointment) => {
      const startsAt = new Date(appointment.startsAt)
      if (!isValidDate(startsAt)) return

      const dateKey = toDateInputValue(startsAt)
      const existing = map.get(dateKey) ?? []
      existing.push(appointment)
      map.set(dateKey, existing)
    })

    map.forEach((appointments) => {
      appointments.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    })

    return map
  }, [monthAppointments])

  const bookedDates = useMemo(() => {
    return Array.from(bookedByDate.keys()).flatMap((dateKey) => {
      const parsedDate = parseDate(dateKey)
      return parsedDate ? [parsedDate] : []
    })
  }, [bookedByDate])

  const handleSelectDate = (date?: Date) => {
    if (!date) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('date', toDateInputValue(date))
    nextParams.set('month', toMonthInputValue(date))
    setSearchParams(nextParams)
  }

  const handleViewChange = (nextView: CalendarView) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)

    if (!nextParams.get('date')) {
      nextParams.set('date', toDateInputValue(selectedDate))
    }

    if (!nextParams.get('month')) {
      nextParams.set('month', toMonthInputValue(selectedDate))
    }

    setSearchParams(nextParams)
  }

  const handleMonthChange = (month: Date) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('month', toMonthInputValue(month))
    setSearchParams(nextParams)
  }

  const handleSlotClick = (slotDate: Date) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('date', toDateInputValue(slotDate))
    nextParams.set('month', toMonthInputValue(slotDate))
    nextParams.set('view', view)
    setSearchParams(nextParams)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    const search = searchParams.toString()
    navigate({
      pathname: `/calendar/appt/${appointment.id}`,
      search: search ? `?${search}` : '',
    })
  }

  const handleAppointmentAction = (
    appointment: Appointment,
    action: 'open' | 'finish' | 'cancel' | 'photos'
  ) => {
    if (action === 'open') {
      handleAppointmentClick(appointment)
      return
    }

    setSelectedActionAppointment(appointment)

    if (action === 'finish') {
      setCompletionMode('finish')
      setCompletionDialogOpen(true)
      return
    }

    if (action === 'cancel') {
      setCompletionMode('cancel')
      setCompletionDialogOpen(true)
      return
    }

    setPhotoDialogOpen(true)
  }

  const handleCloseDetail = (options: { preserveParams?: boolean } = {}) => {
    if (options.preserveParams === false) {
      navigate('/calendar')
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    const linkedAppointmentDate = linkedAppointment ? new Date(linkedAppointment.startsAt) : null
    const fallbackDate = linkedAppointmentDate && isValidDate(linkedAppointmentDate)
      ? linkedAppointmentDate
      : selectedDate

    if (!nextParams.get('date')) {
      nextParams.set('date', toDateInputValue(fallbackDate))
    }

    if (!nextParams.get('month')) {
      nextParams.set('month', toMonthInputValue(fallbackDate))
    }

    const search = nextParams.toString()
    navigate({
      pathname: '/calendar',
      search: search ? `?${search}` : '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4" data-print-hidden="true">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageCalendarTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('pageCalendarDescription')}</p>
        </div>
        <Button className="hidden sm:inline-flex" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('buttonNewAppointment')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" data-print-hidden="true">
        {CALENDAR_VIEW_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={view === option.value ? 'default' : 'outline'}
            onClick={() => handleViewChange(option.value)}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      {view === 'month' && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <section className="min-w-0 overflow-hidden rounded-lg border bg-card p-3 shadow-sm sm:p-4 print:hidden" data-print-hidden="true">
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
              components={{
                DayButton: (props) => (
                  <CalendarDayButton
                    {...props}
                    bookedByDate={bookedByDate}
                  />
                ),
              }}
              classNames={{
                [UI.Root]: "w-full max-w-full",
                [UI.Months]: "relative w-full max-w-full",
                [UI.Month]: "space-y-4",
                [UI.MonthCaption]: "flex h-10 items-center justify-center",
                [UI.CaptionLabel]: "text-base font-semibold text-gray-900",
                [UI.Nav]: "absolute right-0 top-1 flex items-center gap-1 sm:right-1",
                [UI.PreviousMonthButton]: "inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40",
                [UI.NextMonthButton]: "inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40",
                [UI.Chevron]: "h-4 w-4",
                [UI.MonthGrid]: "w-full table-fixed border-collapse",
                [UI.Weekdays]: "grid grid-cols-7",
                [UI.Weekday]: "py-2 text-center text-xs font-medium text-muted-foreground",
                [UI.Weeks]: "block",
                [UI.Week]: "grid grid-cols-7",
                [UI.Day]: "flex aspect-square min-w-0 items-center justify-center p-0",
                [UI.DayButton]: "relative flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:h-10 sm:w-10",
                [DayFlag.outside]: "text-muted-foreground opacity-40",
                [DayFlag.today]: "font-semibold text-primary",
                [SelectionState.selected]: "text-primary-foreground",
              }}
            />
            <AppointmentStatusLegend />
          </section>

          <DayAppointmentsPane
            selectedDate={selectedDate}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentAction={handleAppointmentAction}
            onCreateAppointment={() => setIsCreateOpen(true)}
          />
        </div>
      )}

      {view === 'week' && (
        <WeekTimeGrid
          weekStart={selectedWeekStart}
          onSlotClick={handleSlotClick}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      {view === 'day' && (
        <div className="space-y-6">
          <DayTimeGrid
            selectedDate={selectedDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
          <DayAppointmentsPane
            selectedDate={selectedDate}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentAction={handleAppointmentAction}
            onCreateAppointment={() => setIsCreateOpen(true)}
          />
        </div>
      )}

      <Button
        className="fixed bottom-6 right-6 z-30 rounded-full shadow-lg sm:hidden"
        onClick={() => setIsCreateOpen(true)}
        data-print-hidden="true"
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

      <AppointmentCompletionDialog
        open={completionDialogOpen}
        onOpenChange={(open) => {
          setCompletionDialogOpen(open)
          if (!open) {
            setSelectedActionAppointment(null)
          }
        }}
        appointment={selectedActionAppointment}
        defaultMode={completionMode}
        includePhotos={completionMode === 'finish'}
      />

      <AppointmentPhotoDialog
        open={photoDialogOpen}
        onOpenChange={(open) => {
          setPhotoDialogOpen(open)
          if (!open) {
            setSelectedActionAppointment(null)
          }
        }}
        appointment={selectedActionAppointment}
      />
    </div>
  )
}

type CalendarDayButtonProps = DayButtonProps & {
  bookedByDate: Map<string, Appointment[]>
}

function CalendarDayButton({
  className,
  children,
  day,
  modifiers,
  bookedByDate,
  ...props
}: CalendarDayButtonProps) {
  const dateKey = toDateInputValue(day.date)
  const appointments = bookedByDate.get(dateKey) ?? []
  const statusDots = getStatusDots(appointments)

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
      {statusDots.length > 0 && (
        <span className="absolute bottom-1 flex items-center gap-0.5">
          {statusDots.map((status) => (
            <span
              key={status}
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                APPOINTMENT_STATUS_COLORS[status].bar,
                modifiers.selected && 'ring-1 ring-white/80'
              )}
            />
          ))}
        </span>
      )}
    </button>
  )
}

function AppointmentStatusLegend() {
  return (
    <div
      className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground"
      data-print-hidden="true"
    >
      {STATUS_DOT_PRIORITY.map((status) => (
        <span key={status} className="inline-flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', APPOINTMENT_STATUS_COLORS[status].bar)} />
          {getAppointmentStatusLabel(status)}
        </span>
      ))}
    </div>
  )
}

function getStatusDots(appointments: Appointment[]): Appointment['status'][] {
  const present = new Set(appointments.map((appointment) => appointment.status))
  return STATUS_DOT_PRIORITY.filter((status) => present.has(status)).slice(0, 3)
}

function parseViewParam(value: string | null): CalendarView {
  if (value === 'week' || value === 'day' || value === 'month') return value
  return 'month'
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  return parseDate(value)
}

function parseMonthParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  return parseDate(`${value}-01`)
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

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}
