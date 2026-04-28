import type { Owner, Dog, Appointment } from './db'

export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function buildOwnerSearch(owner: Owner): string {
  const parts = [
    owner.fullName,
    owner.phone,
    owner.email,
    owner.notes
  ]
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

export function buildDogSearch(dog: Dog, owner?: Owner): string {
  const parts = [
    dog.name,
    dog.breed,
    dog.color,
    owner?.fullName,
    owner?.phone
  ]
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

const appointmentStatusSearchLabels: Record<Appointment['status'], string> = {
  scheduled: 'plánovaný',
  done: 'vykonaný',
  cancelled: 'zrušený',
  no_show: 'nedostavil sa',
}

export function buildAppointmentSearch(appointment: Appointment, dog: Dog, owner: Owner): string {
  const parts = [
    dog.name,
    dog.breed,
    owner.fullName,
    owner.phone,
    appointment.serviceName,
    appointment.status,
    appointmentStatusSearchLabels[appointment.status],
    appointment.notes,
  ]
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}
