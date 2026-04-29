import { db, type Dog, type NewDogInput, type UpdateDogInput } from '../db'
import { DB_ERROR } from '../errors'
import { generateId } from '../ids'
import { buildDogSearch } from '../search'

export async function createDog(input: NewDogInput): Promise<Dog> {
  const owner = await db.owners.get(input.ownerId)
  if (!owner) {
    throw new Error(DB_ERROR.OWNER_NOT_FOUND)
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
  return db.transaction('rw', db.dogs, db.owners, async () => {
    const existing = await db.dogs.get(id)
    if (!existing) {
      throw new Error(DB_ERROR.DOG_NOT_FOUND)
    }

    const ownerId = patch.ownerId ?? existing.ownerId
    const owner = await db.owners.get(ownerId)
    if (!owner) {
      throw new Error(DB_ERROR.OWNER_NOT_FOUND)
    }

    const updated: Dog = {
      ...existing,
      ownerId,
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
  })
}

export async function deleteDog(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.dogs,
      db.appointments,
      db.notes,
      db.tagApplications,
      db.dogTags,
      db.entityGalleryItems,
      db.entityGalleryAssets,
    ],
    async () => {
      const existing = await db.dogs.get(id)
      if (!existing) {
        throw new Error(DB_ERROR.DOG_NOT_FOUND)
      }

      const appointmentCount = await db.appointments.where('dogId').equals(id).count()
      if (appointmentCount > 0) {
        throw new Error(DB_ERROR.DOG_HAS_APPOINTMENTS)
      }

      await db.notes.delete(['dog', id])
      await db.tagApplications.where('[entityType+entityId]').equals(['dog', id]).delete()
      await db.dogTags.where('dogId').equals(id).delete()
      await deleteDogGallery(id)
      await db.dogs.delete(id)
    }
  )
}

export async function getDogById(id: string): Promise<Dog | undefined> {
  return db.dogs.get(id)
}

async function deleteDogGallery(dogId: string): Promise<void> {
  const items = await db.entityGalleryItems
    .where('[entityType+entityId]')
    .equals(['dog', dogId])
    .toArray()

  for (const item of items) {
    await db.entityGalleryAssets.where('itemId').equals(item.id).delete()
  }

  if (items.length > 0) {
    await db.entityGalleryItems.bulkDelete(items.map((item) => item.id))
  }
}
