import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dog } from '@/db/db'
import { t } from '@/i18n/sk'

interface OwnerDogSelectProps {
  dogs: Dog[]
  value: string
  onChange: (dogId: string) => void
  disabled?: boolean
}

export function OwnerDogSelect({ dogs, value, onChange, disabled }: OwnerDogSelectProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="appointment-dog">{t('labelDog')} *</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="appointment-dog">
          <SelectValue placeholder={disabled ? t('selectOwnerFirst') : t('placeholderSelectDog')} />
        </SelectTrigger>
        <SelectContent>
          {dogs.map((dog) => (
            <SelectItem key={dog.id} value={dog.id}>
              {dog.name}
              {dog.breed ? ` — ${dog.breed}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
