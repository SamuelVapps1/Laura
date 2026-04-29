import { db, type Owner, type NewOwnerInput, type UpdateOwnerInput } from '../db'
import { DB_ERROR } from '../errors'
import { generateId } from '../ids'
import { buildDogSearch, buildOwnerSearch } from '../search'

export async function createOwner(input: NewOwnerInput): Promise<Owner> {
  const now = new Date().toISOString()
  const id = generateId()
  
  const owner: Owner = {
    id,
    fullName: input.fullName,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    gdprConsent: input.gdprConsent ?? false,
    createdAt: now,
    updatedAt: now,
    _search: ''
  }
  
  owner._search = buildOwnerSearch(owner)
  
  await db.owners.add(owner)
  return owner
}

export async function updateOwner(id: string, patch: UpdateOwnerInput): Promise<Owner> {
  return db.transaction('rw', db.owners, db.dogs, async () => {
    const existing = await db.owners.get(id)
    if (!existing) {
      throw new Error(DB_ERROR.OWNER_NOT_FOUND)
    }

    const updated: Owner = {
      ...existing,
      fullName: patch.fullName ?? existing.fullName,
      phone: patch.phone !== undefined ? patch.phone : existing.phone,
      email: patch.email !== undefined ? patch.email : existing.email,
      notes: patch.notes !== undefined ? patch.notes : existing.notes,
      gdprConsent: patch.gdprConsent !== undefined ? patch.gdprConsent : existing.gdprConsent,
      updatedAt: new Date().toISOString(),
      _search: ''
    }

    updated._search = buildOwnerSearch(updated)

    await db.owners.put(updated)

    const dogs = await db.dogs.where('ownerId').equals(id).toArray()
    await Promise.all(
      dogs.map((dog) =>
        db.dogs.update(dog.id, {
          _search: buildDogSearch(dog, updated)
        })
      )
    )

    return updated
  })
}

export async function deleteOwner(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.owners,
      db.dogs,
      db.notes,
      db.tagApplications,
      db.entityGalleryItems,
      db.entityGalleryAssets,
    ],
    async () => {
      const dogCount = await db.dogs.where('ownerId').equals(id).count()
      if (dogCount > 0) {
        throw new Error(DB_ERROR.OWNER_HAS_DOGS)
      }

      const existing = await db.owners.get(id)
      if (!existing) {
        throw new Error(DB_ERROR.OWNER_NOT_FOUND)
      }

      await db.notes.delete(['owner', id])
      await db.tagApplications.where('[entityType+entityId]').equals(['owner', id]).delete()
      await deleteOwnerGallery(id)
      await db.owners.delete(id)
    }
  )
}

export async function getOwnerById(id: string): Promise<Owner | undefined> {
  return db.owners.get(id)
}

async function deleteOwnerGallery(ownerId: string): Promise<void> {
  const items = await db.entityGalleryItems
    .where('[entityType+entityId]')
    .equals(['owner', ownerId])
    .toArray()

  for (const item of items) {
    await db.entityGalleryAssets.where('itemId').equals(item.id).delete()
  }

  if (items.length > 0) {
    await db.entityGalleryItems.bulkDelete(items.map((item) => item.id))
  }
}
