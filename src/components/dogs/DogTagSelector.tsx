import { t } from '@/i18n/sk'
import { ScopedTagSelector } from '@/components/tags/ScopedTagSelector'

type DogTagSelectorProps = {
  selectedTagIds: string[]
  onChange: (selectedTagIds: string[]) => void
  disabled?: boolean
}

export function DogTagSelector({ selectedTagIds, onChange, disabled }: DogTagSelectorProps) {
  return (
    <ScopedTagSelector
      scope="dog"
      selectedTagIds={selectedTagIds}
      onChange={onChange}
      disabled={disabled}
      emptyState={
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('noDogTagsAvailable')}</p>
          <p className="text-xs text-muted-foreground">{t('dogTagsHint')}</p>
        </div>
      }
      footer={<p className="text-xs text-muted-foreground">{t('dogTagsHint')}</p>}
    />
  )
}
