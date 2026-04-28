import { db, type EntityId, type TagApplication, type TagDefinition, type TagScope } from '../db'
import { DB_ERROR } from '../errors'
import { generateId } from '../ids'
import { buildTagDefinitionSearch } from '../search'
import { TAG_COLOR_PALETTE, tagScopes } from '@/lib/tags'

export type NewTagDefinitionInput = {
  label: string
  description?: string | null
  color: string
  scopes: TagScope[]
}

export type UpdateTagDefinitionInput = Partial<NewTagDefinitionInput>

export async function createTagDefinition(input: NewTagDefinitionInput): Promise<TagDefinition> {
  const label = normalizeLabel(input.label)
  const color = validateColor(input.color)
  const scopes = validateScopes(input.scopes)
  const now = new Date().toISOString()

  const tag: TagDefinition = {
    id: generateId(),
    label,
    description: normalizeOptionalText(input.description),
    color,
    scopes,
    createdAt: now,
    updatedAt: now,
    _search: '',
  }

  tag._search = buildTagDefinitionSearch(tag)

  await db.tagDefinitions.add(tag)
  return tag
}

export async function updateTagDefinition(
  id: EntityId,
  patch: UpdateTagDefinitionInput
): Promise<TagDefinition> {
  return db.transaction('rw', db.tagDefinitions, db.tagApplications, async () => {
    const existing = await db.tagDefinitions.get(id)
    if (!existing) {
      throw new Error(DB_ERROR.TAG_DEFINITION_NOT_FOUND)
    }

    const updated: TagDefinition = {
      ...existing,
      label: patch.label !== undefined ? normalizeLabel(patch.label) : existing.label,
      description: patch.description !== undefined
        ? normalizeOptionalText(patch.description)
        : existing.description,
      color: patch.color !== undefined ? validateColor(patch.color) : existing.color,
      scopes: patch.scopes !== undefined ? validateScopes(patch.scopes) : existing.scopes,
      updatedAt: new Date().toISOString(),
      _search: '',
    }

    updated._search = buildTagDefinitionSearch(updated)

    await db.tagDefinitions.put(updated)
    await removeApplicationsOutsideScopes(updated.id, updated.scopes)

    return updated
  })
}

export async function deleteTagDefinition(id: EntityId): Promise<void> {
  await db.transaction('rw', db.tagDefinitions, db.tagApplications, async () => {
    const existing = await db.tagDefinitions.get(id)
    if (!existing) {
      throw new Error(DB_ERROR.TAG_DEFINITION_NOT_FOUND)
    }

    await db.tagApplications.where('tagId').equals(id).delete()
    await db.tagDefinitions.delete(id)
  })
}

export async function getTagDefinitionById(id: EntityId): Promise<TagDefinition | undefined> {
  return db.tagDefinitions.get(id)
}

export async function toggleTagApplication(
  entityType: TagScope,
  entityId: EntityId,
  tagId: EntityId
): Promise<boolean> {
  validateScope(entityType)

  return db.transaction('rw', [db.tagDefinitions, db.tagApplications, db.appointments, db.owners, db.dogs], async () => {
    const key = getApplicationKey(tagId, entityType, entityId)
    const existing = await db.tagApplications.get(key)

    if (existing) {
      await db.tagApplications.delete(key)
      return false
    }

    await applyTagInsideTransaction(entityType, entityId, tagId)
    return true
  })
}

export async function applyTag(
  entityType: TagScope,
  entityId: EntityId,
  tagId: EntityId
): Promise<TagApplication> {
  validateScope(entityType)

  return db.transaction('rw', [db.tagDefinitions, db.tagApplications, db.appointments, db.owners, db.dogs], async () => {
    return applyTagInsideTransaction(entityType, entityId, tagId)
  })
}

export async function removeTag(
  entityType: TagScope,
  entityId: EntityId,
  tagId: EntityId
): Promise<void> {
  validateScope(entityType)
  await db.tagApplications.delete(getApplicationKey(tagId, entityType, entityId))
}

export async function getTagApplicationsForEntity(
  entityType: TagScope,
  entityId: EntityId
): Promise<TagApplication[]> {
  validateScope(entityType)
  return db.tagApplications.where('[entityType+entityId]').equals([entityType, entityId]).toArray()
}

/** Replace entity tag applications to exactly match allowed `selectedTagIds` (definitions must include scope). */
export async function setTagApplicationsForEntity(
  entityType: TagScope,
  entityId: EntityId,
  selectedTagIds: EntityId[]
): Promise<void> {
  validateScope(entityType)

  const desiredUnique = Array.from(new Set(selectedTagIds))

  return db.transaction(
    'rw',
    [db.tagDefinitions, db.tagApplications, db.appointments, db.owners, db.dogs],
    async () => {
      await validateTargetExists(entityType, entityId)

      const definitions = await db.tagDefinitions.toArray()
      const allowedIds = new Set(
        definitions
          .filter((definition) => definition.scopes.includes(entityType))
          .map((definition) => definition.id)
      )

      // UI selectors are already scope-limited, so out-of-scope IDs are ignored defensively here.
      const desired = desiredUnique.filter((tagId) => allowedIds.has(tagId))
      const desiredSet = new Set(desired)

      const existing = await db.tagApplications
        .where('[entityType+entityId]')
        .equals([entityType, entityId])
        .toArray()

      for (const application of existing) {
        if (!desiredSet.has(application.tagId)) {
          await db.tagApplications.delete(getApplicationKey(application.tagId, entityType, entityId))
        }
      }

      const existingIds = new Set(existing.map((application) => application.tagId))
      for (const tagId of desired) {
        if (!existingIds.has(tagId)) {
          await applyTagInsideTransaction(entityType, entityId, tagId)
        }
      }
    }
  )
}

function normalizeLabel(label: string): string {
  const normalized = label.trim()
  if (!normalized) {
    throw new Error(DB_ERROR.TAG_LABEL_REQUIRED)
  }
  return normalized
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function validateColor(color: string): string {
  if (!TAG_COLOR_PALETTE.includes(color as (typeof TAG_COLOR_PALETTE)[number])) {
    throw new Error(DB_ERROR.INVALID_TAG_COLOR)
  }
  return color
}

function validateScopes(scopes: TagScope[]): TagScope[] {
  const uniqueScopes = Array.from(new Set(scopes))

  if (uniqueScopes.length === 0) {
    throw new Error(DB_ERROR.TAG_SCOPES_REQUIRED)
  }

  uniqueScopes.forEach(validateScope)
  return uniqueScopes
}

function validateScope(scope: TagScope): void {
  if (!tagScopes.includes(scope)) {
    throw new Error(DB_ERROR.INVALID_TAG_SCOPE)
  }
}

async function applyTagInsideTransaction(
  entityType: TagScope,
  entityId: EntityId,
  tagId: EntityId
): Promise<TagApplication> {
  const tag = await db.tagDefinitions.get(tagId)
  if (!tag) {
    throw new Error(DB_ERROR.TAG_DEFINITION_NOT_FOUND)
  }

  if (!tag.scopes.includes(entityType)) {
    throw new Error(DB_ERROR.INVALID_TAG_SCOPE)
  }

  await validateTargetExists(entityType, entityId)

  const application: TagApplication = {
    tagId,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  }

  await db.tagApplications.put(application)
  return application
}

async function validateTargetExists(entityType: TagScope, entityId: EntityId): Promise<void> {
  if (entityType === 'appointment') {
    const appointment = await db.appointments.get(entityId)
    if (!appointment) throw new Error(DB_ERROR.TAG_TARGET_NOT_FOUND)
    return
  }

  if (entityType === 'owner') {
    const owner = await db.owners.get(entityId)
    if (!owner) throw new Error(DB_ERROR.TAG_TARGET_NOT_FOUND)
    return
  }

  const dog = await db.dogs.get(entityId)
  if (!dog) throw new Error(DB_ERROR.TAG_TARGET_NOT_FOUND)
}

async function removeApplicationsOutsideScopes(tagId: EntityId, scopes: TagScope[]): Promise<void> {
  const applications = await db.tagApplications.where('tagId').equals(tagId).toArray()
  const invalidKeys = applications
    .filter((application) => !scopes.includes(application.entityType))
    .map((application) => getApplicationKey(application.tagId, application.entityType, application.entityId))

  if (invalidKeys.length > 0) {
    await db.tagApplications.bulkDelete(invalidKeys)
  }
}

function getApplicationKey(
  tagId: EntityId,
  entityType: TagScope,
  entityId: EntityId
): [EntityId, TagScope, EntityId] {
  return [tagId, entityType, entityId]
}
