import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import { getReadableTagTextColor } from '@/lib/tags'
import { cn } from '@/lib/utils'

type DogTagSelectorProps = {
  selectedTagIds: string[]
  onChange: (selectedTagIds: string[]) => void
  disabled?: boolean
}

export function DogTagSelector({ selectedTagIds, onChange, disabled }: DogTagSelectorProps) {
  const dogScopedTags = useLiveQuery(
    async () => {
      const all = await db.tagDefinitions.toArray()
      return all
        .filter((definition) => definition.scopes.includes('dog'))
        .sort((a, b) => a.label.localeCompare(b.label, 'sk'))
    },
    [],
    []
  )

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  const toggleTag = (tagId: string) => {
    if (disabled) return
    const next = new Set(selectedTagIds)
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onChange(Array.from(next))
  }

  if (!dogScopedTags) {
    return <p className="text-sm text-muted-foreground">{t('dogTagsHint')}</p>
  }

  if (dogScopedTags.length === 0) {
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
        {dogScopedTags.map((tag) => {
          const isSelected = selectedSet.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              title={tag.description ?? undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50'
              )}
              style={{
                backgroundColor: isSelected ? tag.color : 'transparent',
                borderColor: tag.color,
                color: isSelected ? getReadableTagTextColor(tag.color) : tag.color,
              }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('dogTagsHint')}</p>
    </div>
  )
}
