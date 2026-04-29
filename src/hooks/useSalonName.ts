import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/db/db'
import { SALON_NAME_SETTING_KEY } from '@/db/repositories/settings'
import { t } from '@/i18n/sk'

export function useSalonName(): string {
  const fallback = t('appName')

  return useLiveQuery(
    async () => {
      const row = await db.appSettings.get(SALON_NAME_SETTING_KEY)
      const value = row?.value.trim()
      return value || fallback
    },
    [],
    fallback,
  ) ?? fallback
}
