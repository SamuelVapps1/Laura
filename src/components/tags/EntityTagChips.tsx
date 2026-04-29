import { useLiveQuery } from 'dexie-react-hooks'

import { type TagDefinition, type TagScope, db } from '@/db/db'
import { getReadableTagTextColor, isTagDefinitionActive } from '@/lib/tags'

type Props = {
  entityType: TagScope
  entityId: string
}

type EntityTagChip = Pick<TagDefinition, 'id' | 'label' | 'color' | 'description'>

export function EntityTagChips({ entityType, entityId }: Props) {
  const tags = useLiveQuery(
    async () => {
      if (!entityId) return []

      const applications = await db.tagApplications
        .where('[entityType+entityId]')
        .equals([entityType, entityId])
        .toArray()
      if (applications.length === 0) return []

      const tagIds = applications.map((application) => application.tagId)
      const definitions = await db.tagDefinitions.bulkGet(tagIds)
      const definitionsById = new Map(
        definitions.filter(isDefined).map((definition) => [definition.id, definition])
      )

      const activeTags: EntityTagChip[] = []
      tagIds.forEach((tagId) => {
        const definition = definitionsById.get(tagId)
        if (!definition || !isTagDefinitionActive(definition)) return

        activeTags.push({
          id: definition.id,
          label: definition.label,
          color: definition.color,
          description: definition.description,
        })
      })

      return activeTags
    },
    [entityType, entityId],
    []
  )

  if (!entityId || tags.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          title={tag.description ?? undefined}
          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
          style={{
            backgroundColor: tag.color,
            color: getReadableTagTextColor(tag.color),
          }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  )
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
