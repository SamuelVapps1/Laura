import { useRef, useState, type ChangeEvent } from 'react'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { EntityGalleryModal } from '@/components/photos/EntityGalleryModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GalleryEntityType } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import {
  addEntityGalleryPhoto,
  deleteEntityGalleryItem,
  getEntityGallery,
  type EntityGalleryRow,
} from '@/db/repositories/entityGallery'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { t } from '@/i18n/sk'
import { processGalleryImageFile } from '@/lib/photos'
import { cn } from '@/lib/utils'

type EntityGallerySectionProps = {
  entityType: GalleryEntityType
  entityId: string
  title: string
}

export function EntityGallerySection({
  entityType,
  entityId,
  title,
}: EntityGallerySectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const rows = useLiveQuery(
    () => getEntityGallery(entityType, entityId),
    [entityType, entityId],
    []
  )
  const selectedRow = rows.find((row) => row.item.id === selectedItemId) ?? null

  async function handleFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''

    if (files.length === 0 || processing) return

    setProcessing(true)
    setError(null)

    try {
      for (const file of files) {
        const processed = await processGalleryImageFile(file)
        await addEntityGalleryPhoto({
          entityType,
          entityId,
          full: processed.full,
          thumb: processed.thumb,
        })
      }
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError))
    } finally {
      setProcessing(false)
    }
  }

  async function handleDelete(row: EntityGalleryRow): Promise<void> {
    if (!window.confirm(t('galleryPhotoDeleteConfirm'))) return

    setError(null)
    await deleteEntityGalleryItem(row.item.id)
    if (selectedItemId === row.item.id) {
      setSelectedItemId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('emptyEntityGalleryDescription')}
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={processing}
            onChange={handleFiles}
          />
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => inputRef.current?.click()}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {processing ? t('galleryPhotosProcessing') : t('uploadGalleryPhotos')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {rows.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-md border border-dashed p-6 text-center">
            <div className="grid gap-2">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-gray-900">{t('emptyEntityGalleryTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('emptyEntityGalleryDescription')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) => (
              <EntityGalleryTile
                key={row.item.id}
                row={row}
                disabled={processing}
                onOpen={() => setSelectedItemId(row.item.id)}
                onDelete={() => void handleDelete(row)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <EntityGalleryModal
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null)
        }}
        row={selectedRow}
        title={title}
      />
    </Card>
  )
}

function EntityGalleryTile({
  row,
  disabled,
  onOpen,
  onDelete,
}: {
  row: EntityGalleryRow
  disabled: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const asset = row.thumb ?? row.full
  const imageUrl = useObjectUrl(asset?.blob)

  return (
    <div className="group relative overflow-hidden rounded-md border bg-background">
      <button
        type="button"
        className={cn(
          'grid aspect-square w-full place-items-center bg-muted text-sm text-muted-foreground',
          imageUrl && 'bg-black'
        )}
        onClick={onOpen}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={t('galleryPhotoOpen')}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-6 w-6" />
        )}
      </button>

      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute right-2 top-2 h-8 w-8 opacity-95 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        disabled={disabled}
        aria-label={t('deleteGalleryPhoto')}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return t('galleryPhotoUploadError')

  if (error.message === DB_ERROR.PHOTO_STORAGE_QUOTA_EXCEEDED) {
    return t('photoStorageQuotaError')
  }

  return t('galleryPhotoUploadError')
}
