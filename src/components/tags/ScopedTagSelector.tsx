import { useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { type TagScope, db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  canToggleTagDefinition,
  getSortedVisibleScopedTagDefinitions,
} from '@/lib/tags'
import { TagChoiceChip } from '@/components/tags/TagChoiceChip'

type ScopedTagSelectorProps = {
  scope: TagScope
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  emptyState?: ReactNode
  footer?: ReactNode
}

export function ScopedTagSelector({
  scope,
  selectedTagIds,
  onChange,
  disabled,
  emptyState,
  footer,
}: ScopedTagSelectorProps) {
  const visibleScopedTags = useLiveQuery(
    async () => {
      const all = await db.tagDefinitions.toArray()
      return getSortedVisibleScopedTagDefinitions(all, scope, selectedTagIds)
    },
    [scope, selectedTagIds],
    []
  )

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  const toggleTag = (tagId: string) => {
    if (disabled) return
    const targetTag = visibleScopedTags.find((tag) => tag.id === tagId)
    if (!targetTag) return
    const isSelected = selectedSet.has(tagId)
    if (!canToggleTagDefinition(targetTag, isSelected)) return

    const next = new Set(selectedTagIds)
    if (isSelected) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onChange(Array.from(next))
  }

  if (visibleScopedTags.length === 0) {
    return (
      <>
        {emptyState ?? <p className="text-sm text-muted-foreground">{t('emptyTagPicker')}</p>}
      </>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleScopedTags.map((tag) => {
          const isSelected = selectedSet.has(tag.id)
          return (
            <TagChoiceChip
              key={tag.id}
              label={tag.label}
              color={tag.color}
              selected={isSelected}
              inactive={tag.isActive === false}
              disabled={disabled}
              title={tag.description ?? undefined}
              className="disabled:opacity-50"
              onClick={() => toggleTag(tag.id)}
            />
          )
        })}
      </div>
      {footer}
    </div>
  )
}
