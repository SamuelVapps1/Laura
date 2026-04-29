import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { type TagScope, db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  getReadableTagTextColor,
  getVisibleScopedTagDefinitions,
  isTagDefinitionActive,
  sortTagDefinitionsByLabel,
} from '@/lib/tags'
import { cn } from '@/lib/utils'

type ScopedTagSelectorProps = {
  scope: TagScope
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function ScopedTagSelector({
  scope,
  selectedTagIds,
  onChange,
  disabled,
}: ScopedTagSelectorProps) {
  const visibleScopedTags = useLiveQuery(
    async () => {
      const all = await db.tagDefinitions.toArray()
      const selectedSet = new Set(selectedTagIds)
      return getVisibleScopedTagDefinitions(all, scope, selectedSet)
    },
    [scope, selectedTagIds],
    []
  )

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])
  const sortedTags = useMemo(() => {
    const selected = sortTagDefinitionsByLabel(
      visibleScopedTags.filter((definition) => selectedSet.has(definition.id))
    )
    const unselected = sortTagDefinitionsByLabel(
      visibleScopedTags.filter((definition) => !selectedSet.has(definition.id))
    )
    return [...selected, ...unselected]
  }, [selectedSet, visibleScopedTags])

  const toggleTag = (tagId: string) => {
    if (disabled) return
    const targetTag = visibleScopedTags.find((tag) => tag.id === tagId)
    if (!targetTag) return
    if (!isTagDefinitionActive(targetTag) && !selectedSet.has(tagId)) return

    const next = new Set(selectedTagIds)
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onChange(Array.from(next))
  }

  if (visibleScopedTags.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyTagPicker')}</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {sortedTags.map((tag) => {
          const isSelected = selectedSet.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              title={tag.description ?? undefined}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50'
              )}
              style={{
                backgroundColor: isSelected ? tag.color : 'transparent',
                borderColor: tag.color,
                color: isSelected ? getReadableTagTextColor(tag.color) : tag.color,
              }}
              onClick={() => toggleTag(tag.id)}
            >
              <span>{tag.label}</span>
              {tag.isActive === false && (
                <span className="rounded-sm border border-current/40 px-1 py-0.5 text-[10px] leading-none">
                  {t('tagInactiveBadge')}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
