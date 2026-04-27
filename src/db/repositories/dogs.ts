import { db, type Dog, type Owner, type NewDogInput, type UpdateDogInput } from '../db'
import { generateId } from '../ids'
import { buildDogSearch } from '../search'

export async function createDog(input: NewDogInput): Promise<Dog> {
  const owner = await db.owners.get(input.ownerId)
  if (!owner) {
    throw new Error('Owner not found')
  }
  
  const now = new Date().toISOString()
  const id = generateId()
  
  const dog: Dog = {
    id,
    ownerId: input.ownerId,
    name: input.name,
    breed: input.breed ?? null,
    age: input.age ?? null,
    sex: input.sex ?? 'unknown',
    color: input.color ?? null,
    weightKg: input.weightKg ?? null,
    behaviorNotes: input.behaviorNotes ?? null,
    healthNotes: input.healthNotes ?? null,
    groomingNotes: input.groomingNotes ?? null,
    priceNotes: input.priceNotes ?? null,
    createdAt: now,
    updatedAt: now,
    _search: ''
  }
  
  dog._search = buildDogSearch(dog, owner)
  
  await db.dogs.add(dog)
  return dog
}

export async function updateDog(id: string, patch: UpdateDogInput): Promise<Dog> {
  const existing = await db.dogs.get(id)
  if (!existing) {
    throw new Error('Dog not found')
  }
  
  let owner: Owner | undefined
  if (patch.ownerId !== undefined && patch.ownerId !== existing.ownerId) {
    owner = await db.owners.get(patch.ownerId)
    if (!owner) {
      throw new Error('Owner not found')
    }
  } else {
    owner = await db.owners.get(existing.ownerId)
  }
  
  const updated: Dog = {
    ...existing,
    ownerId: patch.ownerId ?? existing.ownerId,
    name: patch.name ?? existing.name,
    breed: patch.breed !== undefined ? patch.breed : existing.breed,
    age: patch.age !== undefined ? patch.age : existing.age,
    sex: patch.sex ?? existing.sex,
    color: patch.color !== undefined ? patch.color : existing.color,
    weightKg: patch.weightKg !== undefined ? patch.weightKg : existing.weightKg,
    behaviorNotes: patch.behaviorNotes !== undefined ? patch.behaviorNotes : existing.behaviorNotes,
    healthNotes: patch.healthNotes !== undefined ? patch.healthNotes : existing.healthNotes,
    groomingNotes: patch.groomingNotes !== undefined ? patch.groomingNotes : existing.groomingNotes,
    priceNotes: patch.priceNotes !== undefined ? patch.priceNotes : existing.priceNotes,
    updatedAt: new Date().toISOString(),
    _search: ''
  }
  
  updated._search = buildDogSearch(updated, owner)
  
  await db.dogs.put(updated)
  return updated
}

export async function deleteDog(id: string): Promise<void> {
  await db.dogs.delete(id)
}

export async function getDogById(id: string): Promise<Dog | undefined> {
  return db.dogs.get(id)
}
