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
