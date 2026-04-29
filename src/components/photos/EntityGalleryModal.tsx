import type { EntityGalleryRow } from '@/db/repositories/entityGallery'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { t } from '@/i18n/sk'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type EntityGalleryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: EntityGalleryRow | null
  title: string
}

export function EntityGalleryModal({
  open,
  onOpenChange,
  row,
  title,
}: EntityGalleryModalProps) {
  const asset = row?.full ?? row?.thumb ?? null
  const imageUrl = useObjectUrl(asset?.blob)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {imageUrl && (
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-md bg-black">
              <img
                src={imageUrl}
                alt={t('galleryPhotoOpen')}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            {row && (
              <p className="text-sm text-muted-foreground">
                {new Date(row.item.createdAt).toLocaleDateString('sk-SK')}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
