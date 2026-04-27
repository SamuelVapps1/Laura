import { db, type Owner, type NewOwnerInput, type UpdateOwnerInput } from '../db'
import { generateId } from '../ids'
import { buildOwnerSearch } from '../search'

export async function createOwner(input: NewOwnerInput): Promise<Owner> {
  const now = new Date().toISOString()
  const id = generateId()
  
  const owner: Owner = {
    id,
    fullName: input.fullName,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
    _search: ''
  }
  
  owner._search = buildOwnerSearch(owner)
  
  await db.owners.add(owner)
  return owner
}

export async function updateOwner(id: string, patch: UpdateOwnerInput): Promise<Owner> {
  const existing = await db.owners.get(id)
  if (!existing) {
    throw new Error('Owner not found')
  }
  
  const updated: Owner = {
    ...existing,
    fullName: patch.fullName ?? existing.fullName,
    phone: patch.phone !== undefined ? patch.phone : existing.phone,
    email: patch.email !== undefined ? patch.email : existing.email,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    updatedAt: new Date().toISOString(),
    _search: ''
  }
  
  updated._search = buildOwnerSearch(updated)
  
  await db.owners.put(updated)
  return updated
}

export async function deleteOwner(id: string): Promise<void> {
  const dogCount = await db.dogs.where('ownerId').equals(id).count()
  if (dogCount > 0) {
    throw new Error('Cannot delete owner with dogs')
  }
  
  await db.owners.delete(id)
}

export async function getOwnerById(id: string): Promise<Owner | undefined> {
  return db.owners.get(id)
}
