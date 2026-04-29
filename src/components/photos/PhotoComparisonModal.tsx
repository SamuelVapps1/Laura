import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PhotoAsset } from '@/db/db'
import { getSessionPhotos } from '@/db/repositories/photos'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { t } from '@/i18n/sk'
import { cn } from '@/lib/utils'

interface PhotoComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
}

export function PhotoComparisonModal({ open, onOpenChange, sessionId }: PhotoComparisonModalProps) {
  const [sliderValue, setSliderValue] = useState(50)
  const photos = useLiveQuery(
    async () => getSessionPhotos(sessionId),
    [sessionId],
    {
      before: { full: null, thumb: null },
      after: { full: null, thumb: null },
    }
  )

  const before = photos.before.full
  const after = photos.after.full

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border-gray-800 bg-neutral-950 p-4 text-white sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{t('photoComparison')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="overflow-hidden rounded-md border border-white/10 bg-black">
            <ComparisonStage before={before} after={after} sliderValue={sliderValue} />
          </div>

          {before && after && (
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(event) => setSliderValue(Number(event.target.value))}
              aria-label={t('photoComparison')}
              className="w-full accent-white"
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <PhotoPanel label={t('labelBefore')} photo={before} missingLabel={t('photoMissingBefore')} />
            <PhotoPanel label={t('labelAfter')} photo={after} missingLabel={t('photoMissingAfter')} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ComparisonStage({
  before,
  after,
  sliderValue,
}: {
  before: PhotoAsset | null
  after: PhotoAsset | null
  sliderValue: number
}) {
  const beforeUrl = useObjectUrl(before?.blob)
  const afterUrl = useObjectUrl(after?.blob)

  if (!beforeUrl && !afterUrl) {
    return (
      <div className="grid min-h-[280px] place-items-center p-8 text-sm text-neutral-400">
        {t('emptyDogGallery')}
      </div>
    )
  }

  if (!beforeUrl || !afterUrl) {
    const url = beforeUrl ?? afterUrl
    const label = beforeUrl ? t('labelBefore') : t('labelAfter')

    return (
      <div className="relative grid min-h-[280px] place-items-center">
        <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {label}
        </span>
        <img src={url ?? ''} alt={label} className="max-h-[68vh] w-full object-contain" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto aspect-[4/3] max-h-[68vh] w-full">
      <img src={beforeUrl} alt={t('labelBefore')} className="absolute inset-0 h-full w-full object-contain" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
      >
        <img src={afterUrl} alt={t('labelAfter')} className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${sliderValue}%` }} />
      <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
        {t('labelAfter')}
      </span>
      <span className="absolute right-3 top-3 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
        {t('labelBefore')}
      </span>
    </div>
  )
}

function PhotoPanel({
  label,
  photo,
  missingLabel,
}: {
  label: string
  photo: PhotoAsset | null
  missingLabel: string
}) {
  const url = useObjectUrl(photo?.blob)

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-neutral-900">
      <div className="border-b border-white/10 px-3 py-2 text-sm font-medium">{label}</div>
      <div className={cn('grid min-h-[220px] place-items-center', !url && 'p-6 text-sm text-neutral-400')}>
        {url ? (
          <img
            src={url}
            alt={label}
            loading="lazy"
            decoding="async"
            className="max-h-[50vh] w-full object-contain"
          />
        ) : (
          missingLabel
        )}
      </div>
    </div>
  )
}
