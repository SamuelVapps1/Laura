import type { ReactNode } from 'react'

import type { Dog } from '@/db/db'
import { t } from '@/i18n/sk'

type DogNotesSummaryProps = {
  dog: Dog
  compact?: boolean
  emptyFallback?: ReactNode
  maxLength?: number
}

type DogNoteRow = {
  label: string
  value: string
}

export function DogNotesSummary({
  dog,
  compact = false,
  emptyFallback,
  maxLength,
}: DogNotesSummaryProps) {
  const rows = getDogNoteRows(dog, maxLength)

  if (rows.length === 0) {
    return emptyFallback ?? null
  }

  if (compact) {
    return (
      <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">
        {rows.map((row) => (
          <p key={row.label}>
            <span className="font-medium text-gray-700">{row.label}: </span>
            {row.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 sm:grid-cols-[140px_1fr]">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium text-gray-900">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function getDogNoteRows(dog: Dog, maxLength: number | undefined): DogNoteRow[] {
  return [
    { label: t('labelBehaviorNotes'), value: dog.behaviorNotes },
    { label: t('labelHealthNotes'), value: dog.healthNotes },
    { label: t('labelGroomingNotes'), value: dog.groomingNotes },
    { label: t('labelPriceNotes'), value: dog.priceNotes },
  ]
    .map((row) => ({
      label: row.label,
      value: formatNoteValue(row.value, maxLength),
    }))
    .filter((row): row is DogNoteRow => row.value.length > 0)
}

function formatNoteValue(value: string | null, maxLength: number | undefined): string {
  const normalized = value?.trim() ?? ''
  if (!maxLength || normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}
