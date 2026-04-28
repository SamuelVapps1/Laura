import type { TagScope } from '@/db/db'
import { t } from '@/i18n/sk'

export const TAG_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const

export const tagScopes = ['appointment', 'owner', 'dog'] as const satisfies readonly TagScope[]

export function getTagScopeLabel(scope: TagScope): string {
  switch (scope) {
    case 'appointment':
      return t('scopeAppointment')
    case 'owner':
      return t('scopeOwner')
    case 'dog':
      return t('scopeDog')
  }
}

export function getReadableTagTextColor(color: string): "#ffffff" | "#111827" {
  const hex = color.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#111827"
  }

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.58 ? "#111827" : "#ffffff"
}
