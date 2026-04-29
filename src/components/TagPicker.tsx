import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import type { TagScope } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { removeTag, toggleTagApplication } from '@/db/repositories/tags'
import { t } from '@/i18n/sk'
import {
  getReadableTagTextColor,
  getVisibleScopedTagDefinitions,
  isTagDefinitionActive,
  sortTagDefinitionsByLabel,
} from '@/lib/tags'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  entityType: TagScope
  entityId: string
}

export function TagPicker({ entityType, entityId }: TagPickerProps) {
  const [error, setError] = useState<string | null>(null)
  const [pendingTagKeys, setPendingTagKeys] = useState<Set<string>>(() => new Set())
  const pendingTagKeysRef = useRef<Set<string>>(new Set())

  const allTagDefinitions = useLiveQuery(
    () => db.tagDefinitions.toArray(),
    [],
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

  const visibleTagDefinitions = useMemo(() => {
    return getVisibleScopedTagDefinitions(allTagDefinitions, entityType, appliedTagIds)
  }, [allTagDefinitions, entityType, appliedTagIds])

  const sortedTagDefinitions = useMemo(() => {
    const applied = sortTagDefinitionsByLabel(
      visibleTagDefinitions.filter((definition) => appliedTagIds.has(definition.id))
    )
    const unapplied = sortTagDefinitionsByLabel(
      visibleTagDefinitions.filter((definition) => !appliedTagIds.has(definition.id))
    )
    return [...applied, ...unapplied]
  }, [visibleTagDefinitions, appliedTagIds])

  const handleToggle = async (tagId: string) => {
    const pendingKey = getPendingKey(entityType, entityId, tagId)
    if (pendingTagKeysRef.current.has(pendingKey)) return

    pendingTagKeysRef.current.add(pendingKey)
    setPendingTagKeys((current) => new Set(current).add(pendingKey))
    setError(null)

    const tag = allTagDefinitions.find((definition) => definition.id === tagId)

    try {
      if (!tag) return

      if (!isTagDefinitionActive(tag)) {
        const existing = await db.tagApplications.get([tagId, entityType, entityId])
        if (!existing) return
        await removeTag(entityType, entityId, tagId)
        return
      }

      await toggleTagApplication(entityType, entityId, tagId)
    } catch (err) {
      setError(getTagPickerError(err))
    } finally {
      pendingTagKeysRef.current.delete(pendingKey)
      setPendingTagKeys((current) => {
        const next = new Set(current)
        next.delete(pendingKey)
        return next
      })
    }
  }

  useEffect(() => {
    pendingTagKeysRef.current.clear()
    setPendingTagKeys(new Set())
  }, [entityType, entityId])

  if (sortedTagDefinitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyTagPicker')}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sortedTagDefinitions.map((tag) => {
          const isApplied = appliedTagIds.has(tag.id)
          const isPending = pendingTagKeys.has(getPendingKey(entityType, entityId, tag.id))
          return (
            <button
              key={tag.id}
              type="button"
              disabled={isPending}
              title={tag.description ?? undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              )}
              style={{
                backgroundColor: isApplied ? tag.color : 'transparent',
                borderColor: tag.color,
                color: isApplied ? getReadableTagTextColor(tag.color) : tag.color,
              }}
              onClick={() => void handleToggle(tag.id)}
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
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function getPendingKey(entityType: TagScope, entityId: string, tagId: string): string {
  return `${entityType}:${entityId}:${tagId}`
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
