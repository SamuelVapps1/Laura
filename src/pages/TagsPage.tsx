import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { EmptyState } from '@/components/EmptyState'
import { DeleteTagDefinitionDialog } from '@/components/tags/DeleteTagDefinitionDialog'
import { TagDefinitionFormDialog } from '@/components/tags/TagDefinitionFormDialog'
import { TagDefinitionsList } from '@/components/tags/TagDefinitionsList'
import { Button } from '@/components/ui/button'
import type { TagDefinition } from '@/db/db'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'

export function TagsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagDefinition | undefined>()
  const [deletingTag, setDeletingTag] = useState<TagDefinition | undefined>()

  const tags = useLiveQuery(
    () => db.tagDefinitions.orderBy('label').toArray(),
    [],
    []
  )

  const handleAdd = () => {
    setEditingTag(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (tag: TagDefinition) => {
    setEditingTag(tag)
    setIsFormOpen(true)
  }

  const handleDelete = (tag: TagDefinition) => {
    setDeletingTag(tag)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageTagsTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('pageTagsDescription')}</p>
        </div>
        <Button onClick={handleAdd}>{t('buttonAddTag')}</Button>
      </div>

      {tags.length === 0 ? (
        <EmptyState
          title={t('emptyTagsTitle')}
          description={t('emptyTagsDescription')}
          actionLabel={t('addFirstTag')}
          onAction={handleAdd}
        />
      ) : (
        <TagDefinitionsList
          tags={tags}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <TagDefinitionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        tag={editingTag}
      />

      {deletingTag && (
        <DeleteTagDefinitionDialog
          open={!!deletingTag}
          onOpenChange={(open) => !open && setDeletingTag(undefined)}
          tag={deletingTag}
        />
      )}
    </div>
  )
}
