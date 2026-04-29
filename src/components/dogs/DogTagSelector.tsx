import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  getReadableTagTextColor,
  getVisibleScopedTagDefinitions,
  isTagDefinitionActive,
  sortTagDefinitionsByLabel,
} from '@/lib/tags'
import { cn } from '@/lib/utils'

type DogTagSelectorProps = {
  selectedTagIds: string[]
  onChange: (selectedTagIds: string[]) => void
  disabled?: boolean
}

export function DogTagSelector({ selectedTagIds, onChange, disabled }: DogTagSelectorProps) {
  const visibleDogTags = useLiveQuery(
    async () => {
      const all = await db.tagDefinitions.toArray()
      const selectedSet = new Set(selectedTagIds)
      return getVisibleScopedTagDefinitions(all, 'dog', selectedSet)
    },
    [selectedTagIds],
    []
  )

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])
  const sortedTags = useMemo(() => {
    const selected = sortTagDefinitionsByLabel(
      visibleDogTags.filter((definition) => selectedSet.has(definition.id))
    )
    const unselected = sortTagDefinitionsByLabel(
      visibleDogTags.filter((definition) => !selectedSet.has(definition.id))
    )
    return [...selected, ...unselected]
  }, [visibleDogTags, selectedSet])

  const toggleTag = (tagId: string) => {
    if (disabled) return
    const targetTag = visibleDogTags.find((tag) => tag.id === tagId)
    if (!targetTag) return

    if (!isTagDefinitionActive(targetTag) && !selectedSet.has(tagId)) {
      return
    }

    const next = new Set(selectedTagIds)
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onChange(Array.from(next))
  }

  if (!visibleDogTags) {
    return <p className="text-sm text-muted-foreground">{t('dogTagsHint')}</p>
  }

  if (visibleDogTags.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('noDogTagsAvailable')}</p>
        <p className="text-xs text-muted-foreground">{t('dogTagsHint')}</p>
      </div>
    )
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
      <p className="text-xs text-muted-foreground">{t('dogTagsHint')}</p>
    </div>
  )
}
