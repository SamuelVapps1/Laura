import type { Appointment } from '@/db/db'

export const DAY_START_HOUR = 7
export const DAY_END_HOUR = 20
export const HOUR_HEIGHT = 60
export const MIN_APPOINTMENT_HEIGHT = 24
export const TOTAL_GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT

export const HOUR_LABELS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index
)

export const SLOT_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index
)

type TimeGridPlacement = {
  top: number
  height: number
}

export function getAppointmentTimeGridPlacement(
  appointment: Appointment
): TimeGridPlacement | null {
  const startsAt = new Date(appointment.startsAt)
  const endsAt = new Date(appointment.endsAt)

  const rawStartMinutes = (startsAt.getHours() - DAY_START_HOUR) * 60 + startsAt.getMinutes()
  const rawEndMinutes = (endsAt.getHours() - DAY_START_HOUR) * 60 + endsAt.getMinutes()
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60

  if (rawEndMinutes <= 0 || rawStartMinutes >= totalMinutes) {
    return null
  }

  const visibleStartMinutes = clamp(rawStartMinutes, 0, totalMinutes)
  const visibleEndMinutes = clamp(rawEndMinutes, 0, totalMinutes)

  const top = (visibleStartMinutes / 60) * HOUR_HEIGHT
  const rawHeight = ((visibleEndMinutes - visibleStartMinutes) / 60) * HOUR_HEIGHT
  const maxHeight = TOTAL_GRID_HEIGHT - top
  const height = Math.min(Math.max(rawHeight, MIN_APPOINTMENT_HEIGHT), maxHeight)

  if (height <= 0) return null

  return { top, height }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
