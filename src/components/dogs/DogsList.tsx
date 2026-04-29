import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Dog, Owner } from '@/db/db'

interface DogsListProps {
  dogs: Dog[]
  owners: Owner[]
  onEdit: (dog: Dog) => void
  onDelete: (dog: Dog) => void
  onCreate?: () => void
  isSearchActive?: boolean
  hasAnyDogs?: boolean
}

export function DogsList({
  dogs,
  owners,
  onEdit,
  onDelete,
  onCreate,
  isSearchActive = false,
  hasAnyDogs = false,
}: DogsListProps) {
  const getOwnerName = (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId)
    return owner?.fullName || '-'
  }

  if (dogs.length === 0) {
    if (hasAnyDogs && isSearchActive) {
      return (
        <EmptyState
          title={t('emptyDogsSearchTitle')}
          description={t('emptySearchDescription')}
        />
      )
    }

    return (
      <EmptyState
        title={t('emptyDogsTitle')}
        description={t('emptyDogsDescription')}
        actionLabel={onCreate ? t('addFirstDog') : undefined}
        onAction={onCreate}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('labelName')}</TableHead>
              <TableHead>{t('labelOwner')}</TableHead>
              <TableHead>{t('labelBreed')}</TableHead>
              <TableHead>{t('labelSex')}</TableHead>
              <TableHead>{t('labelAge')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dogs.map((dog) => (
              <TableRow key={dog.id}>
                <TableCell className="font-medium">{dog.name}</TableCell>
                <TableCell>{getOwnerName(dog.ownerId)}</TableCell>
                <TableCell>{dog.breed || '-'}</TableCell>
                <TableCell>{t(dog.sex === 'male' ? 'labelSexMale' : dog.sex === 'female' ? 'labelSexFemale' : 'labelSexUnknown')}</TableCell>
                <TableCell>{dog.age || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/dogs/${dog.id}`}>{t('buttonDetail')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(dog)}>
                      {t('buttonEdit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(dog)}>
                      {t('buttonDelete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
