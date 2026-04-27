import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db, type Owner } from '@/db/db'
import { normalizeSearchText } from '@/db/search'
import { OwnerFormDialog } from '@/components/owners/OwnerFormDialog'
import { DeleteOwnerDialog } from '@/components/owners/DeleteOwnerDialog'
import { OwnersList } from '@/components/owners/OwnersList'

export function OwnersPage() {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | undefined>()
  const [deletingOwner, setDeletingOwner] = useState<Owner | undefined>()
  const normalizedSearch = normalizeSearchText(search)

  const owners = useLiveQuery(
    () => db.owners
      .filter(owner => owner._search.includes(normalizedSearch))
      .sortBy('fullName'),
    [normalizedSearch],
    []
  )

  const handleAdd = () => {
    setEditingOwner(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner)
    setIsFormOpen(true)
  }

  const handleDelete = (owner: Owner) => {
    setDeletingOwner(owner)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageOwnersTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('pageOwnersDescription')}</p>
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

      <OwnersList
        owners={owners || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <OwnerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        owner={editingOwner}
        onSuccess={() => undefined}
      />

      {deletingOwner && (
        <DeleteOwnerDialog
          open={!!deletingOwner}
          onOpenChange={(open) => !open && setDeletingOwner(undefined)}
          owner={deletingOwner}
          onSuccess={() => undefined}
        />
      )}
    </div>
  )
}
