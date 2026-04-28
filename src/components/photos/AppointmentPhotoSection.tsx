import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImageIcon, Loader2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { PhotoComparisonModal } from '@/components/photos/PhotoComparisonModal'
import { Button } from '@/components/ui/button'
import type { PhotoAsset, PhotoKind } from '@/db/db'
import {
  getOrCreatePhotoSessionForAppointment,
  getSessionPhotos,
} from '@/db/repositories/photos'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { t } from '@/i18n/sk'
import { processAndStorePhoto } from '@/lib/photos'
import { cn } from '@/lib/utils'

interface AppointmentPhotoSectionProps {
  appointmentId: string
  dogId: string
}

const PHOTO_SLOTS = [
  { kind: 'before', label: t('labelBefore'), missingLabel: t('photoMissingBefore') },
  { kind: 'after', label: t('labelAfter'), missingLabel: t('photoMissingAfter') },
] as const

type ProcessingState = Record<PhotoKind, boolean>
type ErrorState = Record<PhotoKind, string | null>

const EMPTY_PHOTOS = {
  before: { full: null, thumb: null },
  after: { full: null, thumb: null },
}

export function AppointmentPhotoSection({ appointmentId, dogId }: AppointmentPhotoSectionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({ before: false, after: false })
  const [errors, setErrors] = useState<ErrorState>({ before: null, after: null })
  const [comparisonOpen, setComparisonOpen] = useState(false)

  useEffect(() => {
    let active = true

    setSessionId(null)
    getOrCreatePhotoSessionForAppointment(appointmentId)
      .then((session) => {
        if (active) {
          setSessionId(session.id)
        }
      })
      .catch(() => {
        if (active) {
          setErrors({ before: t('photoUploadError'), after: t('photoUploadError') })
        }
      })

    return () => {
      active = false
    }
  }, [appointmentId])

  const photos = useLiveQuery(
    async () => sessionId ? getSessionPhotos(sessionId) : EMPTY_PHOTOS,
    [sessionId],
    EMPTY_PHOTOS
  )

  async function handleFile(kind: PhotoKind, file: File | undefined): Promise<void> {
    if (!file || !sessionId) return

    setErrors((current) => ({ ...current, [kind]: null }))
    setProcessing((current) => ({ ...current, [kind]: true }))

    try {
      await processAndStorePhoto(file, {
        dogId,
        appointmentId,
        sessionId,
        kind,
      })
    } catch {
      setErrors((current) => ({ ...current, [kind]: t('photoUploadError') }))
    } finally {
      setProcessing((current) => ({ ...current, [kind]: false }))
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {PHOTO_SLOTS.map((slot) => (
          <PhotoSlot
            key={slot.kind}
            kind={slot.kind}
            label={slot.label}
            missingLabel={slot.missingLabel}
            photo={photos[slot.kind].thumb}
            processing={processing[slot.kind]}
            error={errors[slot.kind]}
            disabled={!sessionId}
            onFileSelected={handleFile}
            onOpenComparison={() => setComparisonOpen(true)}
          />
        ))}
      </div>

      {sessionId && (
        <PhotoComparisonModal open={comparisonOpen} onOpenChange={setComparisonOpen} sessionId={sessionId} />
      )}
    </div>
  )
}

function PhotoSlot({
  kind,
  label,
  missingLabel,
  photo,
  processing,
  error,
  disabled,
  onFileSelected,
  onOpenComparison,
}: {
  kind: PhotoKind
  label: string
  missingLabel: string
  photo: PhotoAsset | null
  processing: boolean
  error: string | null
  disabled: boolean
  onFileSelected: (kind: PhotoKind, file: File | undefined) => Promise<void>
  onOpenComparison: () => void
}) {
  const uploadId = `${useId()}-upload`
  const captureId = `${useId()}-capture`
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const captureInputRef = useRef<HTMLInputElement | null>(null)
  const thumbUrl = useObjectUrl(photo?.blob)
  const slotDisabled = disabled || processing

  async function handleChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    await onFileSelected(kind, file)
  }

  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        {processing && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('processingPhoto')}
          </span>
        )}
      </div>

      <button
        type="button"
        className={cn(
          'grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-md border bg-muted text-sm text-muted-foreground',
          thumbUrl && 'bg-black',
          !thumbUrl && 'p-4'
        )}
        disabled={!thumbUrl}
        onClick={onOpenComparison}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="inline-flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {missingLabel}
          </span>
        )}
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          ref={uploadInputRef}
          id={uploadId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={slotDisabled}
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={slotDisabled}
          onClick={() => uploadInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {t('uploadPhoto')}
        </Button>

        <input
          ref={captureInputRef}
          id={captureId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={slotDisabled}
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={slotDisabled}
          onClick={() => captureInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          {t('capturePhoto')}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
