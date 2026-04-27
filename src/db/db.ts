import Dexie, { Table } from 'dexie'

export type ISODateTime = string
export type EntityId = string

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
  }
}

export const db = new SalonDatabase()
