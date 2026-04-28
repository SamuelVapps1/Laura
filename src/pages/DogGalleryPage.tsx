import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { PhotoComparisonModal } from '@/components/photos/PhotoComparisonModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db, type Appointment, type PhotoAsset, type PhotoSession } from '@/db/db'
import { getDogPhotoSessions, getSessionPhotos } from '@/db/repositories/photos'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { t } from '@/i18n/sk'
import { formatAppointmentDateTime } from '@/lib/appointments'

type GallerySession = {
  session: PhotoSession
  appointment: Appointment
  beforeThumb: PhotoAsset | null
  afterThumb: PhotoAsset | null
}

export function DogGalleryPage() {
  const { dogId = '' } = useParams()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const dog = useLiveQuery(
    async () => dogId ? (await db.dogs.get(dogId)) ?? null : null,
    [dogId],
    undefined
  )

  const gallerySessions = useLiveQuery(
    async () => {
      if (!dogId) return []

      const sessions = await getDogPhotoSessions(dogId)
      const rows = await Promise.all(
        sessions.map(async (session): Promise<GallerySession | null> => {
          const [appointment, photos] = await Promise.all([
            db.appointments.get(session.appointmentId),
            getSessionPhotos(session.id),
          ])

          if (!appointment || (!photos.before.thumb && !photos.after.thumb)) {
            return null
          }

          return {
            session,
            appointment,
            beforeThumb: photos.before.thumb,
            afterThumb: photos.after.thumb,
          }
        })
      )

      return rows
        .filter((row): row is GallerySession => row !== null)
        .sort((first, second) => new Date(second.appointment.startsAt).getTime() - new Date(first.appointment.startsAt).getTime())
    },
    [dogId],
    []
  )

  if (dog === undefined) {
    return null
  }

  if (!dog) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to="/dogs">{t('backToDogs')}</Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {t('dogNotFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dogGallery')}</h1>
          <p className="mt-2 text-gray-600">{dog.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/dogs/${dog.id}`}>{t('backToDogDetail')}</Link>
        </Button>
      </div>

      {gallerySessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {t('emptyDogGallery')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {gallerySessions.map((row) => (
            <Card key={row.session.id}>
              <CardHeader className="p-4">
                <CardTitle className="text-base">{formatAppointmentDateTime(row.appointment)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {row.appointment.serviceName ?? t('appointmentNoService')}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 pt-0">
                <button
                  type="button"
                  className="grid gap-3 text-left md:grid-cols-2"
                  onClick={() => setSelectedSessionId(row.session.id)}
                >
                  <GalleryThumb label={t('labelBefore')} photo={row.beforeThumb} missingLabel={t('photoMissingBefore')} />
                  <GalleryThumb label={t('labelAfter')} photo={row.afterThumb} missingLabel={t('photoMissingAfter')} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSessionId && (
        <PhotoComparisonModal
          open={!!selectedSessionId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSessionId(null)
            }
          }}
          sessionId={selectedSessionId}
        />
      )}
    </div>
  )
}

function GalleryThumb({
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
    <div className="overflow-hidden rounded-md border bg-muted">
      <div className="border-b bg-background px-3 py-2 text-sm font-medium text-gray-900">{label}</div>
      <div className="grid aspect-[4/3] place-items-center text-sm text-muted-foreground">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="inline-flex items-center gap-2 px-3 text-center">
            <ImageIcon className="h-4 w-4" />
            {missingLabel}
          </span>
        )}
      </div>
    </div>
  )
}
