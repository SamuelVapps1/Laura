import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Dog, Owner } from '@/db/db'
import { normalizeSearchText } from '@/db/search'
import { t } from '@/i18n/sk'

interface DogSearchSelectProps {
  dogs: Dog[]
  owners: Owner[]
  value: string
  onChange: (value: string) => void
}

export function DogSearchSelect({ dogs, owners, value, onChange }: DogSearchSelectProps) {
  const selectedDog = useMemo(
    () => dogs.find((dog) => dog.id === value),
    [dogs, value],
  )
  const selectedOwner = useMemo(
    () => selectedDog ? owners.find((owner) => owner.id === selectedDog.ownerId) : undefined,
    [owners, selectedDog],
  )
  const selectedDogLabel = useMemo(
    () => getDogOptionLabel(selectedDog, selectedOwner),
    [selectedDog, selectedOwner],
  )
  const [query, setQuery] = useState(selectedDogLabel)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setQuery(selectedDogLabel)
  }, [selectedDogLabel])

  const filteredDogs = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)

    return dogs
      .filter((dog) => {
        const owner = owners.find((candidate) => candidate.id === dog.ownerId)
        if (!normalizedQuery) return true

        const searchableDog = normalizeSearchText(
          [
            dog._search,
            dog.name,
            dog.breed,
            owner?.fullName,
            owner?.phone,
          ].filter(Boolean).join(' ')
        )

        return searchableDog.includes(normalizedQuery)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  }, [dogs, owners, query])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setIsOpen(true)

    if (value && normalizeSearchText(nextQuery) !== normalizeSearchText(selectedDogLabel)) {
      onChange('')
    }
  }

  const handleSelect = (dog: Dog) => {
    const owner = owners.find((candidate) => candidate.id === dog.ownerId)
    onChange(dog.id)
    setQuery(getDogOptionLabel(dog, owner))
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div
      className="grid gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false)
        }
      }}
    >
      <Label htmlFor="appointment-dog">{t('labelDog')} *</Label>
      <Input
        id="appointment-dog"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholderSearchDog')}
        autoComplete="off"
      />
      {isOpen && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-input bg-background">
          {filteredDogs.length > 0 ? (
            filteredDogs.map((dog) => {
              const owner = owners.find((candidate) => candidate.id === dog.ownerId)

              return (
                <Button
                  key={dog.id}
                  type="button"
                  variant={dog.id === value ? 'secondary' : 'ghost'}
                  className="w-full justify-start rounded-none"
                  onClick={() => handleSelect(dog)}
                >
                  <span className="truncate">{getDogOptionLabel(dog, owner)}</span>
                  {dog.breed && <span className="ml-2 text-xs text-muted-foreground">{dog.breed}</span>}
                </Button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t('emptyDogSearch')}
            </div>
          )}
        </div>
      )}
      {value && !selectedDog && (
        <p className="text-sm text-red-500">{t('errorDogNotFound')}</p>
      )}
    </div>
  )
}

function getDogOptionLabel(dog?: Dog, owner?: Owner): string {
  if (!dog) return ''
  return `${dog.name} (${owner?.fullName ?? t('appointmentUnknownOwner')})`
}
