import { t } from '@/i18n/sk'
import { getReadableTagTextColor } from '@/lib/tags'
import { cn } from '@/lib/utils'

type TagChoiceChipProps = {
  label: string
  color: string
  selected: boolean
  inactive?: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
  className?: string
}

export function TagChoiceChip({
  label,
  color,
  selected,
  inactive = false,
  disabled = false,
  title,
  onClick,
  className,
}: TagChoiceChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed',
        className
      )}
      style={{
        backgroundColor: selected ? color : 'transparent',
        borderColor: color,
        color: selected ? getReadableTagTextColor(color) : color,
      }}
      onClick={onClick}
    >
      <span>{label}</span>
      {inactive && (
        <span className="rounded-sm border border-current/40 px-1 py-0.5 text-[10px] leading-none">
          {t('tagInactiveBadge')}
        </span>
      )}
    </button>
  )
}
