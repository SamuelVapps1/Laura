import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { DogFormDialog } from '@/components/dogs/DogFormDialog'
import { DogNotesSummary } from '@/components/dogs/DogNotesSummary'
import { EntityTagChips } from '@/components/tags/EntityTagChips'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Dog } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'

interface OwnerDogsSectionProps {
  ownerId: string
}

export function OwnerDogsSection({ ownerId }: OwnerDogsSectionProps) {
  const [dogFormOpen, setDogFormOpen] = useState(false)
  const [dogDraft, setDogDraft] = useState<Dog | undefined>(undefined)

  const owners = useLiveQuery(() => db.owners.toArray(), [], [])
  const dogs = useLiveQuery(
    async () => (ownerId ? db.dogs.where('ownerId').equals(ownerId).sortBy('name') : []),
    [ownerId],
    []
  )

  const openCreate = () => {
    setDogDraft(undefined)
    setDogFormOpen(true)
  }

  const openEdit = (dog: Dog) => {
    setDogDraft(dog)
    setDogFormOpen(true)
  }

  const handleFormOpenChange = (open: boolean) => {
    setDogFormOpen(open)
    if (!open) {
      setDogDraft(undefined)
    }
  }

  return (
    <>
      <Card id="dogs" className="scroll-mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{t('ownerDogsSection')}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            {dogs.length === 0 ? t('addFirstDogForOwner') : t('addDogForOwner')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {dogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('ownerHasNoDogs')}</p>
          ) : (
            <ul className="space-y-2">
              {dogs.map((dog) => (
                <li
                  key={dog.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="font-medium text-gray-900">{dog.name}</span>
                      {dog.breed && <span className="ml-2 text-muted-foreground">{dog.breed}</span>}
                      <span className="ml-2 text-muted-foreground">
                        {' - '}
                        {t(
                          dog.sex === 'male'
                            ? 'labelSexMale'
                            : dog.sex === 'female'
                              ? 'labelSexFemale'
                              : 'labelSexUnknown'
                        )}
                      </span>
                    </div>
                    <EntityTagChips entityType="dog" entityId={dog.id} />
                    <DogNotesSummary dog={dog} compact maxLength={160} />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/dogs/${dog.id}`}>{t('buttonDetail')}</Link>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(dog)}>
                      {t('buttonEdit')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DogFormDialog
        open={dogFormOpen}
        onOpenChange={handleFormOpenChange}
        dog={dogDraft}
        owners={owners}
        defaultOwnerId={ownerId}
        lockOwner
      />
    </>
  )
}
