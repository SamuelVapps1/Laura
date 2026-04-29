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
  const [showInactiveTags, setShowInactiveTags] = useState(false)

  const tags = useLiveQuery(
    () => db.tagDefinitions.orderBy('label').toArray(),
    [],
    []
  )
  const visibleTags = showInactiveTags ? tags : tags.filter((tag) => tag.isActive !== false)

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

      <label className="inline-flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={showInactiveTags}
          onChange={(event) => setShowInactiveTags(event.target.checked)}
        />
        {t('showInactiveTags')}
      </label>

      {visibleTags.length === 0 ? (
        <EmptyState
          title={t('emptyTagsTitle')}
          description={t('emptyTagsDescription')}
          actionLabel={t('addFirstTag')}
          onAction={handleAdd}
        />
      ) : (
        <TagDefinitionsList
          tags={visibleTags}
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
