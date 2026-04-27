import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db, type Dog, type Owner } from '@/db/db'
import { DogFormDialog } from '@/components/dogs/DogFormDialog'
import { DeleteDogDialog } from '@/components/dogs/DeleteDogDialog'
import { DogsList } from '@/components/dogs/DogsList'

export function DogsPage() {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDog, setEditingDog] = useState<Dog | undefined>()
  const [deletingDog, setDeletingDog] = useState<Dog | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  const owners = useLiveQuery(
    () => db.owners.toArray(),
    [],
    []
  )

  const dogs = useLiveQuery(
    () => db.dogs
      .filter(dog => dog._search.includes(search.toLowerCase()))
      .toArray(),
    [search, refreshKey],
    []
  )

  const handleAdd = () => {
    setEditingDog(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (dog: Dog) => {
    setEditingDog(dog)
    setIsFormOpen(true)
  }

  const handleDelete = (dog: Dog) => {
    setDeletingDog(dog)
  }

  const handleFormSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageDogsTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('pageDogsDescription')}</p>
        </div>
        <Button onClick={handleAdd}>{t('buttonAdd')}</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder={t('placeholderSearch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DogsList
        dogs={dogs || []}
        owners={owners || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DogFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        dog={editingDog}
        owners={owners || []}
        onSuccess={handleFormSuccess}
      />

      {deletingDog && (
        <DeleteDogDialog
          open={!!deletingDog}
          onOpenChange={(open) => !open && setDeletingDog(undefined)}
          dog={deletingDog}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
