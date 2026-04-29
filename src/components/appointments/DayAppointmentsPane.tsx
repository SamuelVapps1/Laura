import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Appointment, Dog, Owner } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  formatAppointmentPrice,
  formatAppointmentTime,
  getAppointmentStatusLabel,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'

type AppointmentAction = 'open' | 'finish' | 'cancel' | 'photos'

interface DayAppointmentsPaneProps {
  selectedDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onAppointmentAction?: (appointment: Appointment, action: AppointmentAction) => void
}

type DayAppointment = {
  appointment: Appointment
  dog?: Dog
  owner?: Owner
}

type MenuState = {
  appointment: Appointment
  x: number
  y: number
}

const MENU_WIDTH = 220
const MENU_PADDING = 8

export function DayAppointmentsPane({
  selectedDate,
  onAppointmentClick,
  onAppointmentAction,
}: DayAppointmentsPaneProps) {
  const dayStartIso = startOfDay(selectedDate).toISOString()
  const dayEndIso = endOfDay(selectedDate).toISOString()
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    if (!menuState) return

    function handlePointerDown(event: PointerEvent): void {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuState(null)
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMenuState(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menuState])

  function openMenuAtPointer(appointment: Appointment, event: MouseEvent): void {
    event.preventDefault()
    const position = clampMenuPosition(event.clientX, event.clientY)
    setMenuState({ appointment, ...position })
  }

  function openMenuFromButton(appointment: Appointment, element: HTMLElement): void {
    const rect = element.getBoundingClientRect()
    const position = clampMenuPosition(rect.right - 8, rect.bottom + 4)
    setMenuState({ appointment, ...position })
  }

  function handleAction(action: AppointmentAction): void {
    if (!menuState) return
    setMenuState(null)

    if (action === 'open') {
      if (onAppointmentAction) {
        onAppointmentAction(menuState.appointment, 'open')
      } else {
        onAppointmentClick(menuState.appointment)
      }
      return
    }

    onAppointmentAction?.(menuState.appointment, action)
  }

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
            <div key={appointment.id} className="relative rounded-md border bg-background shadow-sm">
              <button
                type="button"
                className="w-full rounded-md p-3 pr-12 text-left transition hover:border-primary/40 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => onAppointmentClick(appointment)}
                onContextMenu={(event) => openMenuAtPointer(appointment, event)}
                onKeyDown={(event) => {
                  if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
                    event.preventDefault()
                    openMenuFromButton(appointment, event.currentTarget)
                  }
                }}
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
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      appointment.status === 'scheduled' && 'bg-blue-50 text-blue-700',
                      appointment.status === 'done' && 'bg-emerald-50 text-emerald-700',
                      appointment.status === 'cancelled' && 'bg-gray-100 text-gray-600',
                      appointment.status === 'no_show' && 'bg-amber-50 text-amber-700'
                    )}
                  >
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

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                aria-label={t('moreAppointmentActions')}
                onClick={(event) => {
                  event.stopPropagation()
                  openMenuFromButton(appointment, event.currentTarget)
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('emptyDayAppointments')}
        </div>
      )}

      {menuState && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('appointmentActions')}
          className="fixed z-50 min-w-[220px] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: menuState.x, top: menuState.y }}
        >
          <MenuActionButton onClick={() => handleAction('open')}>
            {t('openAppointmentDetail')}
          </MenuActionButton>
          <MenuActionButton onClick={() => handleAction('finish')}>
            {menuState.appointment.status === 'done' ? t('editAppointmentCompletion') : t('finishAppointment')}
          </MenuActionButton>
          <MenuActionButton onClick={() => handleAction('cancel')}>
            {t('cancelAppointment')}
          </MenuActionButton>
          <MenuActionButton onClick={() => handleAction('photos')}>
            {t('uploadAppointmentPhotos')}
          </MenuActionButton>
        </div>
      )}
    </section>
  )
}

function MenuActionButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition hover:bg-accent focus:bg-accent"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function clampMenuPosition(rawX: number, rawY: number): { x: number; y: number } {
  const maxX = Math.max(MENU_PADDING, window.innerWidth - MENU_WIDTH - MENU_PADDING)
  const maxY = Math.max(MENU_PADDING, window.innerHeight - 220)

  return {
    x: Math.min(Math.max(MENU_PADDING, rawX), maxX),
    y: Math.min(Math.max(MENU_PADDING, rawY), maxY),
  }
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
