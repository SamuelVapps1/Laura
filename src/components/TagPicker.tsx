import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import type { TagScope } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { removeTag, toggleTagApplication } from '@/db/repositories/tags'
import { TagChoiceChip } from '@/components/tags/TagChoiceChip'
import { t } from '@/i18n/sk'
import {
  canToggleTagDefinition,
  getSortedVisibleScopedTagDefinitions,
  isTagDefinitionActive,
} from '@/lib/tags'

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

  const sortedTagDefinitions = useMemo(() => {
    return getSortedVisibleScopedTagDefinitions(allTagDefinitions, entityType, appliedTagIds)
  }, [allTagDefinitions, entityType, appliedTagIds])

  const handleToggle = async (tagId: string) => {
    const pendingKey = getPendingKey(entityType, entityId, tagId)
    if (pendingTagKeysRef.current.has(pendingKey)) return

    pendingTagKeysRef.current.add(pendingKey)
    setPendingTagKeys((current) => new Set(current).add(pendingKey))
    setError(null)

    const tag = allTagDefinitions.find((definition) => definition.id === tagId)

    try {
      if (!tag) return

      const isApplied = appliedTagIds.has(tagId)
      if (!canToggleTagDefinition(tag, isApplied)) return

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
            <TagChoiceChip
              key={tag.id}
              label={tag.label}
              color={tag.color}
              selected={isApplied}
              inactive={tag.isActive === false}
              disabled={isPending}
              title={tag.description ?? undefined}
              className="disabled:opacity-70"
              onClick={() => void handleToggle(tag.id)}
            />
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
