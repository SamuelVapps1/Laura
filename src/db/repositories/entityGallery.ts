import {
  db,
  type EntityGalleryAsset,
  type EntityGalleryItem,
  type EntityId,
  type GalleryEntityType,
} from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { generateId } from '@/db/ids'

type GalleryBlobInput = {
  blob: Blob
  width: number | null
  height: number | null
  sizeBytes: number
}

export type EntityGalleryPhotoInput = {
  entityType: GalleryEntityType
  entityId: EntityId
  caption?: string | null
  full: GalleryBlobInput
  thumb: GalleryBlobInput
}

export type EntityGalleryRow = {
  item: EntityGalleryItem
  full: EntityGalleryAsset | null
  thumb: EntityGalleryAsset | null
}

export async function addEntityGalleryPhoto(input: EntityGalleryPhotoInput): Promise<EntityGalleryItem> {
  const entityType = validateGalleryEntityType(input.entityType)

  return db.transaction(
    'rw',
    db.owners,
    db.dogs,
    db.entityGalleryItems,
    db.entityGalleryAssets,
    async () => {
      await validateGalleryTargetExists(entityType, input.entityId)

      const now = new Date().toISOString()
      const item: EntityGalleryItem = {
        id: generateId(),
        entityType,
        entityId: input.entityId,
        caption: normalizeCaption(input.caption),
        createdAt: now,
        updatedAt: now,
      }

      await db.entityGalleryItems.add(item)
      await db.entityGalleryAssets.bulkAdd([
        buildGalleryAsset(item.id, 'full', input.full, now),
        buildGalleryAsset(item.id, 'thumb', input.thumb, now),
      ])

      return item
    }
  )
}

export async function getEntityGallery(
  entityType: GalleryEntityType,
  entityId: EntityId
): Promise<EntityGalleryRow[]> {
  const validatedEntityType = validateGalleryEntityType(entityType)
  const items = await db.entityGalleryItems
    .where('[entityType+entityId]')
    .equals([validatedEntityType, entityId])
    .toArray()

  const rows = await Promise.all(
    items.map(async (item): Promise<EntityGalleryRow | null> => {
      const assets = await db.entityGalleryAssets.where('itemId').equals(item.id).toArray()
      const full = assets.find((asset) => asset.variant === 'full') ?? null
      const thumb = assets.find((asset) => asset.variant === 'thumb') ?? null

      if (!full && !thumb) return null

      return { item, full, thumb }
    })
  )

  return rows
    .filter((row): row is EntityGalleryRow => row !== null)
    .sort((first, second) => (
      new Date(second.item.createdAt).getTime() - new Date(first.item.createdAt).getTime()
    ))
}

export async function deleteEntityGalleryItem(itemId: EntityId): Promise<void> {
  await db.transaction('rw', db.entityGalleryItems, db.entityGalleryAssets, async () => {
    const item = await db.entityGalleryItems.get(itemId)
    if (!item) return

    await deleteEntityGalleryItemInsideTransaction(item.id)
  })
}

export async function deleteEntityGalleryForEntity(
  entityType: GalleryEntityType,
  entityId: EntityId
): Promise<void> {
  const validatedEntityType = validateGalleryEntityType(entityType)

  await db.transaction('rw', db.entityGalleryItems, db.entityGalleryAssets, async () => {
    const items = await db.entityGalleryItems
      .where('[entityType+entityId]')
      .equals([validatedEntityType, entityId])
      .toArray()

    for (const item of items) {
      await deleteEntityGalleryItemInsideTransaction(item.id)
    }
  })
}

function buildGalleryAsset(
  itemId: EntityId,
  variant: EntityGalleryAsset['variant'],
  input: GalleryBlobInput,
  createdAt: string
): EntityGalleryAsset {
  return {
    id: generateId(),
    itemId,
    variant,
    blob: input.blob,
    mimeType: 'image/webp',
    width: input.width,
    height: input.height,
    sizeBytes: input.sizeBytes,
    createdAt,
  }
}

async function deleteEntityGalleryItemInsideTransaction(itemId: EntityId): Promise<void> {
  await db.entityGalleryAssets.where('itemId').equals(itemId).delete()
  await db.entityGalleryItems.delete(itemId)
}

async function validateGalleryTargetExists(
  entityType: GalleryEntityType,
  entityId: EntityId
): Promise<void> {
  if (entityType === 'owner') {
    const owner = await db.owners.get(entityId)
    if (!owner) throw new Error(DB_ERROR.OWNER_NOT_FOUND)
    return
  }

  const dog = await db.dogs.get(entityId)
  if (!dog) throw new Error(DB_ERROR.DOG_NOT_FOUND)
}

function validateGalleryEntityType(entityType: GalleryEntityType): GalleryEntityType {
  if (entityType !== 'owner' && entityType !== 'dog') {
    throw new Error(DB_ERROR.INVALID_GALLERY_ENTITY_TYPE)
  }

  return entityType
}

function normalizeCaption(caption: string | null | undefined): string | null {
  const normalized = caption?.trim()
  return normalized ? normalized : null
}
