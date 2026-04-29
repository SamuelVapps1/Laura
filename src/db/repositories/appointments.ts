import { db, type Appointment, type EntityId } from '../db'
import { DB_ERROR } from '../errors'
import { generateId } from '../ids'
import { buildAppointmentSearch } from '../search'

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'done',
  'cancelled',
  'no_show',
] as const satisfies readonly Appointment['status'][]

export type NewAppointmentInput = {
  dogId: EntityId
  date: string
  time: string
  durationMinutes: number
  status: Appointment['status']
  serviceName?: string | null
  price?: number | null
  tipAmount?: number | null
  paid?: boolean
  cameDirty?: boolean
  notes?: string | null
}

export type UpdateAppointmentInput = Partial<NewAppointmentInput>

export async function createAppointment(input: NewAppointmentInput): Promise<Appointment> {
  return db.transaction('rw', db.appointments, db.dogs, db.owners, async () => {
    const dog = await db.dogs.get(input.dogId)
    if (!dog) {
      throw new Error(DB_ERROR.DOG_NOT_FOUND)
    }

    const owner = await db.owners.get(dog.ownerId)
    if (!owner) {
      throw new Error(DB_ERROR.OWNER_NOT_FOUND)
    }

    const { startsAt, endsAt } = buildSchedule(input.date, input.time, input.durationMinutes)
    const status = validateStatus(input.status)
    const now = new Date().toISOString()

    const appointment: Appointment = {
      id: generateId(),
      dogId: dog.id,
      ownerId: dog.ownerId,
      startsAt,
      endsAt,
      status,
      serviceName: normalizeOptionalText(input.serviceName),
      price: normalizePrice(input.price),
      tipAmount: normalizeTipAmount(input.tipAmount),
      paid: input.paid ?? false,
      cameDirty: input.cameDirty ?? false,
      notes: normalizeOptionalText(input.notes),
      createdAt: now,
      updatedAt: now,
      _search: '',
    }

    appointment._search = buildAppointmentSearch(appointment, dog, owner)

    await db.appointments.add(appointment)
    return appointment
  })
}

export async function updateAppointment(id: EntityId, patch: UpdateAppointmentInput): Promise<Appointment> {
  return db.transaction('rw', db.appointments, db.dogs, db.owners, async () => {
    const existing = await db.appointments.get(id)
    if (!existing) {
      throw new Error(DB_ERROR.APPOINTMENT_NOT_FOUND)
    }

    const dogId = patch.dogId ?? existing.dogId
    const dog = await db.dogs.get(dogId)
    if (!dog) {
      throw new Error(DB_ERROR.DOG_NOT_FOUND)
    }

    const owner = await db.owners.get(dog.ownerId)
    if (!owner) {
      throw new Error(DB_ERROR.OWNER_NOT_FOUND)
    }

    const existingStart = new Date(existing.startsAt)
    const durationMinutes = patch.durationMinutes ?? getDurationMinutes(existing)
    const date = patch.date ?? formatDateInput(existingStart)
    const time = patch.time ?? formatTimeInput(existingStart)
    const { startsAt, endsAt } = buildSchedule(date, time, durationMinutes)
    const status = validateStatus(patch.status ?? existing.status)

    const updated: Appointment = {
      ...existing,
      dogId: dog.id,
      ownerId: dog.ownerId,
      startsAt,
      endsAt,
      status,
      serviceName: patch.serviceName !== undefined
        ? normalizeOptionalText(patch.serviceName)
        : existing.serviceName,
      price: patch.price !== undefined ? normalizePrice(patch.price) : existing.price,
      tipAmount: patch.tipAmount !== undefined
        ? normalizeTipAmount(patch.tipAmount)
        : normalizeTipAmount(existing.tipAmount),
      paid: patch.paid ?? existing.paid,
      cameDirty: patch.cameDirty ?? existing.cameDirty,
      notes: patch.notes !== undefined ? normalizeOptionalText(patch.notes) : existing.notes,
      updatedAt: new Date().toISOString(),
      _search: '',
    }

    updated._search = buildAppointmentSearch(updated, dog, owner)

    await db.appointments.put(updated)
    return updated
  })
}

export async function deleteAppointment(id: EntityId): Promise<void> {
  await db.transaction(
    'rw',
    [db.appointments, db.notes, db.tagApplications, db.photoSessions, db.photos],
    async () => {
      const existing = await db.appointments.get(id)
      if (!existing) {
        throw new Error(DB_ERROR.APPOINTMENT_NOT_FOUND)
      }

      await db.notes.delete(['appointment', id])
      await db.tagApplications.where('[entityType+entityId]').equals(['appointment', id]).delete()
      await db.photos.where('appointmentId').equals(id).delete()
      await db.photoSessions.where('appointmentId').equals(id).delete()
      await db.appointments.delete(id)
    }
  )
}

export async function getAppointmentById(id: EntityId): Promise<Appointment | undefined> {
  return db.appointments.get(id)
}

function buildSchedule(date: string, time: string, durationMinutes: number) {
  validateDuration(durationMinutes)

  const starts = parseLocalDateTime(date, time)
  const ends = new Date(starts.getTime() + durationMinutes * 60_000)

  return {
    startsAt: starts.toISOString(),
    endsAt: ends.toISOString(),
  }
}

function parseLocalDateTime(date: string, time: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_DATE_TIME)
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_DATE_TIME)
  }

  return parsed
}

function validateDuration(durationMinutes: number): void {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_DURATION)
  }
}

function normalizePrice(price: number | null | undefined): number | null {
  if (price === undefined || price === null) return null
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_PRICE)
  }
  return price
}

function normalizeTipAmount(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_TIP)
  }
  return value
}

function validateStatus(status: Appointment['status']): Appointment['status'] {
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw new Error(DB_ERROR.INVALID_APPOINTMENT_STATUS)
  }
  return status
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function getDurationMinutes(appointment: Appointment): number {
  const starts = new Date(appointment.startsAt)
  const ends = new Date(appointment.endsAt)
  return Math.round((ends.getTime() - starts.getTime()) / 60_000)
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeInput(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}
