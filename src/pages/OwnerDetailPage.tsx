import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { DisclosureSection } from '@/components/DisclosureSection'
import { NotesEditor } from '@/components/NotesEditor'
import { TagPicker } from '@/components/TagPicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'

export function OwnerDetailPage() {
  const { ownerId = '' } = useParams()

  const owner = useLiveQuery(
    async () => ownerId ? (await db.owners.get(ownerId)) ?? null : null,
    [ownerId],
    undefined
  )

  const dogs = useLiveQuery(
    async () => ownerId ? db.dogs.where('ownerId').equals(ownerId).sortBy('name') : [],
    [ownerId],
    []
  )

  if (owner === undefined) {
    return null
  }

  if (!owner) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to="/owners">{t('backToOwners')}</Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {t('ownerNotFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('ownerDetail')}</h1>
          <p className="mt-2 text-gray-600">{owner.fullName}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/owners">{t('backToOwners')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{owner.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {owner.phone && <DetailRow label={t('labelPhone')} value={owner.phone} />}
          {owner.email && <DetailRow label={t('labelEmail')} value={owner.email} />}
          {owner.notes && <DetailRow label={t('legacyNotes')} value={owner.notes} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ownerDogs')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dogs.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('noOwnerDogs')}</p>
          )}
          {dogs.map((dog) => (
            <Link
              key={dog.id}
              to={`/dogs/${dog.id}`}
              className="block rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium text-gray-900">{dog.name}</span>
              {dog.breed && <span className="ml-2 text-muted-foreground">{dog.breed}</span>}
            </Link>
          ))}
        </CardContent>
      </Card>

      <DisclosureSection title={t('ownerNotes')} openLabel={t('openNotes')}>
        <NotesEditor scope="owner" entityId={owner.id} />
      </DisclosureSection>

      <DisclosureSection title={t('ownerTags')} openLabel={t('openTags')}>
        <TagPicker entityType="owner" entityId={owner.id} />
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
