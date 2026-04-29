import Dexie, { Table } from 'dexie'
import { normalizeSearchText } from './search'

export type ISODateTime = string
export type EntityId = string
export type NoteScope = "appointment" | "owner" | "dog"
export type TagScope = "appointment" | "owner" | "dog"
export type PhotoKind = "before" | "after"
export type PhotoVariant = "full" | "thumb"

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
  tipAmount: number | null
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

export interface TagDefinition {
  id: EntityId
  label: string
  description: string | null
  color: string
  scopes: TagScope[]
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
  _search: string
}

export interface TagApplication {
  tagId: EntityId
  entityType: TagScope
  entityId: EntityId
  createdAt: ISODateTime
}

export interface PhotoSession {
  id: EntityId
  appointmentId: EntityId
  dogId: EntityId
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface PhotoAsset {
  id: EntityId
  sessionId: EntityId
  appointmentId: EntityId
  dogId: EntityId
  groupId: EntityId
  kind: PhotoKind
  variant: PhotoVariant
  blob: Blob
  mimeType: "image/webp"
  width: number | null
  height: number | null
  sizeBytes: number
  createdAt: ISODateTime
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

export const DB_SCHEMA_VERSION = 5

class SalonDatabase extends Dexie {
  owners!: Table<Owner, string>
  dogs!: Table<Dog, string>
  appointments!: Table<Appointment, string>
  tags!: Table<Tag, string>
  dogTags!: Table<DogTag, string>
  appSettings!: Table<AppSetting, string>
  notes!: Table<EntityNote, [NoteScope, string]>
  tagDefinitions!: Table<TagDefinition, string>
  tagApplications!: Table<TagApplication, [EntityId, TagScope, EntityId]>
  photoSessions!: Table<PhotoSession, string>
  photos!: Table<PhotoAsset, string>

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
    this.version(3).stores({
      owners: 'id, fullName, phone, createdAt, updatedAt, _search',
      dogs: 'id, ownerId, name, breed, createdAt, updatedAt, _search',
      appointments: 'id, dogId, ownerId, startsAt, endsAt, status, createdAt, updatedAt, _search',
      tags: 'id, name, createdAt, updatedAt, _search',
      dogTags: 'id, dogId, tagId, [dogId+tagId]',
      appSettings: 'key, updatedAt',
      notes: '[scope+entityId], scope, entityId, updatedAt, _search',
      tagDefinitions: 'id, label, updatedAt, _search, *scopes',
      tagApplications: '[tagId+entityType+entityId], tagId, entityType, entityId, [entityType+entityId]'
    }).upgrade(async (transaction) => {
      const tagDefinitions = transaction.table<TagDefinition, string>('tagDefinitions')
      const tagApplications = transaction.table<TagApplication, [EntityId, TagScope, EntityId]>('tagApplications')
      const legacyTags = await transaction.table<Tag, string>('tags').toArray()
      const legacyDogTags = await transaction.table<DogTag, string>('dogTags').toArray()

      await Promise.all(
        legacyTags.map(async (tag) => {
          const existing = await tagDefinitions.get(tag.id)
          if (existing) return

          const definition: TagDefinition = {
            id: tag.id,
            label: tag.name,
            description: null,
            color: normalizeLegacyTagColor(tag.color),
            scopes: ['dog'],
            isActive: true,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
            _search: normalizeSearchText([tag.name, 'dog', 'pes'].join(' ')),
          }

          await tagDefinitions.add(definition)
        })
      )

      await Promise.all(
        legacyDogTags.map(async (dogTag) => {
          const key: [EntityId, TagScope, EntityId] = [dogTag.tagId, 'dog', dogTag.dogId]
          const tagDefinition = await tagDefinitions.get(dogTag.tagId)
          if (!tagDefinition) return

          const existing = await tagApplications.get(key)
          if (existing) return

          await tagApplications.add({
            tagId: dogTag.tagId,
            entityType: 'dog',
            entityId: dogTag.dogId,
            createdAt: dogTag.createdAt,
          })
        })
      )
    })
    this.version(4).stores({
      owners: 'id, fullName, phone, createdAt, updatedAt, _search',
      dogs: 'id, ownerId, name, breed, createdAt, updatedAt, _search',
      appointments: 'id, dogId, ownerId, startsAt, endsAt, status, createdAt, updatedAt, _search',
      tags: 'id, name, createdAt, updatedAt, _search',
      dogTags: 'id, dogId, tagId, [dogId+tagId]',
      appSettings: 'key, updatedAt',
      notes: '[scope+entityId], scope, entityId, updatedAt, _search',
      tagDefinitions: 'id, label, updatedAt, _search, *scopes',
      tagApplications: '[tagId+entityType+entityId], tagId, entityType, entityId, [entityType+entityId]',
      photoSessions: 'id, appointmentId, dogId, updatedAt',
      photos: 'id, sessionId, appointmentId, dogId, groupId, kind, variant, createdAt, [sessionId+kind], [sessionId+kind+variant], [dogId+sessionId]',
    })
    this.version(5).stores({
      owners: 'id, fullName, phone, createdAt, updatedAt, _search',
      dogs: 'id, ownerId, name, breed, createdAt, updatedAt, _search',
      appointments: 'id, dogId, ownerId, startsAt, endsAt, status, createdAt, updatedAt, _search',
      tags: 'id, name, createdAt, updatedAt, _search',
      dogTags: 'id, dogId, tagId, [dogId+tagId]',
      appSettings: 'key, updatedAt',
      notes: '[scope+entityId], scope, entityId, updatedAt, _search',
      tagDefinitions: 'id, label, updatedAt, _search, *scopes',
      tagApplications: '[tagId+entityType+entityId], tagId, entityType, entityId, [entityType+entityId]',
      photoSessions: 'id, appointmentId, dogId, updatedAt',
      photos: 'id, sessionId, appointmentId, dogId, groupId, kind, variant, createdAt, [sessionId+kind], [sessionId+kind+variant], [dogId+sessionId]',
    }).upgrade(async (transaction) => {
      const tagDefinitions = transaction.table<TagDefinition, string>('tagDefinitions')
      await tagDefinitions.toCollection().modify((definition) => {
        if (definition.isActive === undefined) {
          definition.isActive = true
        }
      })
    })
  }
}

export const db = new SalonDatabase()

const DEFAULT_TAG_COLOR = "#3b82f6"
const TAG_MIGRATION_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]

function normalizeLegacyTagColor(color: string | null): string {
  if (color && TAG_MIGRATION_COLOR_PALETTE.includes(color)) {
    return color
  }

  return DEFAULT_TAG_COLOR
}

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
