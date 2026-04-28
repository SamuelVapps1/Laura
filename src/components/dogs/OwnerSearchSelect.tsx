import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Owner } from '@/db/db'
import { normalizeSearchText } from '@/db/search'
import { t } from '@/i18n/sk'

interface OwnerSearchSelectProps {
  owners: Owner[]
  value: string
  onChange: (value: string) => void
}

export function OwnerSearchSelect({ owners, value, onChange }: OwnerSearchSelectProps) {
  const selectedOwner = owners.find((owner) => owner.id === value)
  const [query, setQuery] = useState(selectedOwner?.fullName ?? '')
  const [isOpen, setIsOpen] = useState(false)

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
                <span className="truncate">{owner.fullName}</span>
                {owner.phone && <span className="ml-2 text-xs text-muted-foreground">{owner.phone}</span>}
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
