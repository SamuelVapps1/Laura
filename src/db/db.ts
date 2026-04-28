import Dexie, { Table } from 'dexie'
import { normalizeSearchText } from './search'

export type ISODateTime = string
export type EntityId = string
export type NoteScope = "appointment" | "owner" | "dog"

export interface Owner {
  id: EntityId
  fullName: string
  phone: string | null
  email: string | null
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export interface Dog {
  id: EntityId
  ownerId: EntityId
  name: string
  breed: string | null
  age: string | null
  sex: "male" | "female" | "unknown"
  color: string | null
  weightKg: number | null
  behaviorNotes: string | null
  healthNotes: string | null
  groomingNotes: string | null
  priceNotes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export interface Appointment {
  id: EntityId
  dogId: EntityId
  ownerId: EntityId
  startsAt: ISODateTime
  endsAt: ISODateTime
  status: "scheduled" | "done" | "cancelled" | "no_show"
  serviceName: string | null
  price: number | null
  paid: boolean
  cameDirty: boolean
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export interface Tag {
  id: EntityId
  name: string
  color: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export interface DogTag {
  id: EntityId
  dogId: EntityId
  tagId: EntityId
  createdAt: ISODateTime
}

export interface AppSetting {
  key: string
  value: string
  updatedAt: ISODateTime
}

export interface EntityNote {
  scope: NoteScope
  entityId: EntityId
  text: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export type NewOwnerInput = {
  fullName: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}

export type UpdateOwnerInput = Partial<NewOwnerInput>

export type NewDogInput = {
  ownerId: EntityId
  name: string
  breed?: string | null
  age?: string | null
  sex?: "male" | "female" | "unknown"
  color?: string | null
  weightKg?: number | null
  behaviorNotes?: string | null
  healthNotes?: string | null
  groomingNotes?: string | null
  priceNotes?: string | null
}

export type UpdateDogInput = Partial<NewDogInput>

class SalonDatabase extends Dexie {
  owners!: Table<Owner, string>
  dogs!: Table<Dog, string>
  appointments!: Table<Appointment, string>
  tags!: Table<Tag, string>
  dogTags!: Table<DogTag, string>
  appSettings!: Table<AppSetting, string>
  notes!: Table<EntityNote, [NoteScope, string]>

  constructor() {
    super('salon-app-db')
    this.version(1).stores({
      owners: 'id, fullName, phone, createdAt, updatedAt, _search',
      dogs: 'id, ownerId, name, breed, createdAt, updatedAt, _search',
      appointments: 'id, dogId, ownerId, startsAt, endsAt, status, createdAt, updatedAt, _search',
      tags: 'id, name, createdAt, updatedAt, _search',
      dogTags: 'id, dogId, tagId, [dogId+tagId]',
      appSettings: 'key, updatedAt'
    })
    this.version(2).stores({
      owners: 'id, fullName, phone, createdAt, updatedAt, _search',
      dogs: 'id, ownerId, name, breed, createdAt, updatedAt, _search',
      appointments: 'id, dogId, ownerId, startsAt, endsAt, status, createdAt, updatedAt, _search',
      tags: 'id, name, createdAt, updatedAt, _search',
      dogTags: 'id, dogId, tagId, [dogId+tagId]',
      appSettings: 'key, updatedAt',
      notes: '[scope+entityId], scope, entityId, updatedAt, _search'
    }).upgrade(async (transaction) => {
      const notes = transaction.table<EntityNote, [NoteScope, string]>('notes')
      const owners = await transaction.table<Owner, string>('owners').toArray()
      const appointments = await transaction.table<Appointment, string>('appointments').toArray()

      await Promise.all([
        ...owners.map((owner) => migrateLegacyNote(notes, 'owner', owner.id, owner.notes, owner.createdAt, owner.updatedAt)),
        ...appointments.map((appointment) =>
          migrateLegacyNote(
            notes,
            'appointment',
            appointment.id,
            appointment.notes,
            appointment.createdAt,
            appointment.updatedAt
          )
        ),
      ])
    })
  }
}

export const db = new SalonDatabase()

async function migrateLegacyNote(
  notes: Table<EntityNote, [NoteScope, string]>,
  scope: NoteScope,
  entityId: EntityId,
  text: string | null,
  createdAt: ISODateTime,
  updatedAt: ISODateTime
): Promise<void> {
  const normalizedText = text?.trim()
  if (!normalizedText) return

  const key: [NoteScope, string] = [scope, entityId]
  const existing = await notes.get(key)
  if (existing) return

  await notes.add({
    scope,
    entityId,
    text: normalizedText,
    createdAt,
    updatedAt,
    _search: normalizeSearchText(normalizedText),
  })
}
