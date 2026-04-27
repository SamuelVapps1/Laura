import { t } from '@/i18n/sk'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Owner } from '@/db/db'

interface OwnerSearchSelectProps {
  owners: Owner[]
  value: string
  onChange: (value: string) => void
}

export function OwnerSearchSelect({ owners, value, onChange }: OwnerSearchSelectProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="owner">{t('labelOwner')} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="owner">
          <SelectValue placeholder={t('placeholderSelectOwner')} />
        </SelectTrigger>
        <SelectContent>
          {owners.map((owner) => (
            <SelectItem key={owner.id} value={owner.id}>
              {owner.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
