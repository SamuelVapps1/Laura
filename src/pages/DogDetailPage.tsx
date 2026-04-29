import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Images } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { DisclosureSection } from '@/components/DisclosureSection'
import { NotesEditor } from '@/components/NotesEditor'
import { OwnerTipBadge } from '@/components/owners/OwnerTipBadge'
import { TagPicker } from '@/components/TagPicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db, type Appointment } from '@/db/db'
import { getOwnerTipStats } from '@/db/repositories/ownerStats'
import { t } from '@/i18n/sk'
import {
  formatAppointmentDateTime,
  formatAppointmentPrice,
  getAppointmentStatusLabel,
} from '@/lib/appointments'

export function DogDetailPage() {
  const { dogId = '' } = useParams()
  const location = useLocation()
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20)

  const dog = useLiveQuery(
    async () => dogId ? (await db.dogs.get(dogId)) ?? null : null,
    [dogId],
    undefined
  )

  const owner = useLiveQuery(
    async () => dog ? (await db.owners.get(dog.ownerId)) ?? null : null,
    [dog],
    undefined
  )
  const ownerTipStats = useLiveQuery(
    async () => (dog ? getOwnerTipStats(dog.ownerId) : null),
    [dog?.ownerId],
    null
  )

  const appointments = useLiveQuery(
    async () => {
      if (!dogId) return []
      const rows = await db.appointments.where('dogId').equals(dogId).toArray()
      return rows.sort(sortAppointmentsByStartDesc)
    },
    [dogId],
    []
  )

  useEffect(() => {
    if (location.hash === '#history') {
      requestAnimationFrame(() => {
        document.getElementById('history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash])

  useEffect(() => {
    setVisibleHistoryCount(20)
  }, [dogId])

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
          <h1 className="text-2xl font-bold text-gray-900">{t('dogDetail')}</h1>
          <p className="mt-2 text-gray-600">{dog.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/dogs/${dog.id}/gallery`}>
              <Images className="h-4 w-4" />
              {t('openDogGallery')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dogs">{t('backToDogs')}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dog.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {owner && (
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <span className="text-muted-foreground">{t('labelOwner')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Link className="font-medium text-primary hover:underline" to={`/owners/${owner.id}`}>
                  {owner.fullName}
                </Link>
                <OwnerTipBadge compact totalTips={ownerTipStats?.totalTips ?? 0} />
              </div>
            </div>
          )}
          {dog.breed && <DetailRow label={t('labelBreed')} value={dog.breed} />}
          {dog.age && <DetailRow label={t('labelAge')} value={dog.age} />}
          <DetailRow label={t('labelSex')} value={getSexLabel(dog.sex)} />
          {dog.color && <DetailRow label={t('labelColor')} value={dog.color} />}
          {dog.weightKg !== null && <DetailRow label={t('labelWeight')} value={String(dog.weightKg)} />}
          {dog.behaviorNotes && <DetailRow label={t('labelBehaviorNotes')} value={dog.behaviorNotes} />}
          {dog.healthNotes && <DetailRow label={t('labelHealthNotes')} value={dog.healthNotes} />}
          {dog.groomingNotes && <DetailRow label={t('labelGroomingNotes')} value={dog.groomingNotes} />}
          {dog.priceNotes && <DetailRow label={t('labelPriceNotes')} value={dog.priceNotes} />}
        </CardContent>
      </Card>

      <Card id="history" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('allDogAppointments')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('emptyDogHistory')}</p>
          )}
          {appointments.slice(0, visibleHistoryCount).map((appointment) => (
            <Link
              key={appointment.id}
              to={`/calendar/appt/${appointment.id}`}
              className="block rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{formatAppointmentDateTime(appointment)}</span>
                <span className="text-xs text-muted-foreground">{getAppointmentStatusLabel(appointment.status)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {appointment.serviceName ?? t('appointmentNoService')}
                {appointment.price !== null ? ` · ${formatAppointmentPrice(appointment.price)}` : ''}
              </p>
              {appointment.tipAmount !== null && appointment.tipAmount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('labelTip')}: {formatAppointmentPrice(appointment.tipAmount)}
                </p>
              )}
              {appointment.notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {appointment.notes.length > 140 ? `${appointment.notes.slice(0, 140)}...` : appointment.notes}
                </p>
              )}
            </Link>
          ))}
          {appointments.length > visibleHistoryCount && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibleHistoryCount((previous) => previous + 20)}
            >
              {t('showMoreAppointments')}
            </Button>
          )}
        </CardContent>
      </Card>

      <DisclosureSection title={t('dogNotes')} openLabel={t('openNotes')}>
        <NotesEditor scope="dog" entityId={dog.id} />
      </DisclosureSection>

      <DisclosureSection title={t('dogTags')} openLabel={t('openTags')}>
        <TagPicker entityType="dog" entityId={dog.id} />
      </DisclosureSection>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function getSexLabel(sex: 'male' | 'female' | 'unknown'): string {
  if (sex === 'male') return t('labelSexMale')
  if (sex === 'female') return t('labelSexFemale')
  return t('labelSexUnknown')
}

function sortAppointmentsByStartDesc(first: Appointment, second: Appointment): number {
  return new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime()
}
