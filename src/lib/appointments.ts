import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

import type { Appointment } from '@/db/db'
import { t, type TranslationKey } from '@/i18n/sk'

export const appointmentStatusKeys: Record<Appointment['status'], TranslationKey> = {
  scheduled: 'statusScheduled',
  done: 'statusDone',
  cancelled: 'statusCancelled',
  no_show: 'statusNoShow',
}

export const appointmentStatusOptions = [
  'scheduled',
  'done',
  'cancelled',
  'no_show',
] as const satisfies readonly Appointment['status'][]

export function getAppointmentStatusLabel(status: Appointment['status']): string {
  return t(appointmentStatusKeys[status])
}

export function formatAppointmentTime(appointment: Appointment): string {
  return format(new Date(appointment.startsAt), 'HH:mm')
}

export function formatAppointmentDateTime(appointment: Appointment): string {
  return format(new Date(appointment.startsAt), 'd. MMMM yyyy, HH:mm', { locale: sk })
}

export function formatAppointmentPrice(price: number): string {
  return `${price.toLocaleString('sk-SK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${t('labelEur')}`
}

export function getAppointmentDurationMinutes(appointment: Appointment): number {
  const starts = new Date(appointment.startsAt)
  const ends = new Date(appointment.endsAt)
  return Math.round((ends.getTime() - starts.getTime()) / 60_000)
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toMonthInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
