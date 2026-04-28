import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import type { TagScope } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { toggleTagApplication } from '@/db/repositories/tags'
import { t } from '@/i18n/sk'
import { getReadableTagTextColor } from '@/lib/tags'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  entityType: TagScope
  entityId: string
}

export function TagPicker({ entityType, entityId }: TagPickerProps) {
  const [error, setError] = useState<string | null>(null)

  const tagDefinitions = useLiveQuery(
    () => db.tagDefinitions.where('scopes').equals(entityType).sortBy('label'),
    [entityType],
    []
  )

  const applications = useLiveQuery(
    () => db.tagApplications.where('[entityType+entityId]').equals([entityType, entityId]).toArray(),
    [entityType, entityId],
    []
  )

  const appliedTagIds = useMemo(
    () => new Set(applications.map((application) => application.tagId)),
    [applications]
  )

  const handleToggle = async (tagId: string) => {
    setError(null)
    try {
      await toggleTagApplication(entityType, entityId, tagId)
    } catch (err) {
      setError(getTagPickerError(err))
    }
  }

  if (tagDefinitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyTagPicker')}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tagDefinitions.map((tag) => {
          const isApplied = appliedTagIds.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              title={tag.description ?? undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              style={{
                backgroundColor: isApplied ? tag.color : 'transparent',
                borderColor: tag.color,
                color: isApplied ? getReadableTagTextColor(tag.color) : tag.color,
              }}
              onClick={() => void handleToggle(tag.id)}
            >
              {tag.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function getTagPickerError(error: unknown): string {
  if (!(error instanceof Error)) return t('validationError')

  switch (error.message) {
    case DB_ERROR.TAG_DEFINITION_NOT_FOUND:
      return t('errorTagNotFound')
    case DB_ERROR.INVALID_TAG_SCOPE:
      return t('errorInvalidTagScope')
    case DB_ERROR.TAG_TARGET_NOT_FOUND:
      return t('errorTagTargetNotFound')
    case DB_ERROR.INVALID_TAG_COLOR:
      return t('errorInvalidTagColor')
    default:
      return t('validationError')
  }
}
