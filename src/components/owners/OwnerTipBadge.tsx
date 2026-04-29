import { t } from '@/i18n/sk'
import { formatAppointmentPrice } from '@/lib/appointments'

type OwnerTipBadgeProps = {
  totalTips: number
  appointmentsWithTips?: number
  compact?: boolean
}

export function OwnerTipBadge({ totalTips, compact = false }: OwnerTipBadgeProps) {
  if (totalTips <= 0) {
    return null
  }

  const formattedTips = formatAppointmentPrice(totalTips)
  const ariaLabel = `${t('ownerTotalTipAria')}: ${formattedTips}`

  if (compact) {
    return (
      <span
        title={ariaLabel}
        aria-label={ariaLabel}
        className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
      >
        +{formattedTips}
      </span>
    )
  }

  return (
    <span
      title={ariaLabel}
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
    >
      {t('ownerTipBadge')}: {formattedTips}
    </span>
  )
}
