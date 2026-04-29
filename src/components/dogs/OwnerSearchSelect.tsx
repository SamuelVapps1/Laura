import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { Button } from '@/components/ui/button'
import { OwnerTipBadge } from '@/components/owners/OwnerTipBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Owner } from '@/db/db'
import { getOwnerTipStatsMap, type OwnerTipStats } from '@/db/repositories/ownerStats'
import { normalizeSearchText } from '@/db/search'
import { t } from '@/i18n/sk'
import { formatAppointmentPrice } from '@/lib/appointments'

interface OwnerSearchSelectProps {
  owners: Owner[]
  value: string
  onChange: (value: string) => void
}

export function OwnerSearchSelect({ owners, value, onChange }: OwnerSearchSelectProps) {
  const selectedOwner = owners.find((owner) => owner.id === value)
  const [query, setQuery] = useState(selectedOwner?.fullName ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const ownerIds = useMemo(() => owners.map((owner) => owner.id), [owners])
  const ownerIdsKey = useMemo(() => ownerIds.join('|'), [ownerIds])
  const emptyStatsMap = useMemo(() => new Map<string, OwnerTipStats>(), [])

  const tipStatsMap = useLiveQuery(
    async () => getOwnerTipStatsMap(ownerIds),
    [ownerIdsKey],
    emptyStatsMap
  )

  useEffect(() => {
    setQuery(selectedOwner?.fullName ?? '')
  }, [selectedOwner?.id, selectedOwner?.fullName])

  const filteredOwners = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)

    return owners
      .filter((owner) => {
        if (!normalizedQuery) return true

        const searchableOwner = normalizeSearchText(
          [
            owner._search,
            owner.fullName,
            owner.phone,
            owner.email
          ].filter(Boolean).join(' ')
        )

        return searchableOwner.includes(normalizedQuery)
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'sk'))
  }, [owners, query])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setIsOpen(true)
    if (value && normalizeSearchText(nextQuery) !== normalizeSearchText(selectedOwner?.fullName)) {
      onChange('')
    }
  }

  const handleSelect = (owner: Owner) => {
    onChange(owner.id)
    setQuery(owner.fullName)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const selectedOwnerTotalTips = selectedOwner ? (tipStatsMap.get(selectedOwner.id)?.totalTips ?? 0) : 0

  return (
    <div className="grid gap-2" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsOpen(false)
      }
    }}>
      <Label htmlFor="owner">{t('labelOwner')} *</Label>
      <Input
        id="owner"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholderSearchOwner')}
        autoComplete="off"
      />
      {selectedOwner && selectedOwnerTotalTips > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('ownerTotalTipInline')}: {formatAppointmentPrice(selectedOwnerTotalTips)}
        </p>
      )}
      {isOpen && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-background">
          {filteredOwners.length > 0 ? (
            filteredOwners.map((owner) => (
              <Button
                key={owner.id}
                type="button"
                variant={owner.id === value ? 'secondary' : 'ghost'}
                className="w-full justify-start rounded-none"
                onClick={() => handleSelect(owner)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate">{owner.fullName}</span>
                    {owner.phone && (
                      <span className="block truncate text-xs text-muted-foreground">{owner.phone}</span>
                    )}
                  </span>
                  <OwnerTipBadge totalTips={tipStatsMap.get(owner.id)?.totalTips ?? 0} compact />
                </span>
              </Button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t('emptyOwnerSearch')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
