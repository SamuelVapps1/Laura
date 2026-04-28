import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import { LAST_BACKUP_AT_KEY } from '@/db/repositories/settings'
import { formatBackupOldWarning, t } from '@/i18n/sk'

const BACKUP_WARNING_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export function BackupWarningBanner() {
  const lastBackupAt = useLiveQuery(
    async () => {
      const setting = await db.appSettings.get(LAST_BACKUP_AT_KEY)
      return setting?.value ?? null
    },
    [],
    undefined
  )

  if (lastBackupAt === undefined) {
    return null
  }

  const message = getWarningMessage(lastBackupAt)

  if (!message) {
    return null
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="border-yellow-400 bg-white text-yellow-950 hover:bg-yellow-100">
        <Link to="/settings">{t('goToSettings')}</Link>
      </Button>
    </div>
  )
}

function getWarningMessage(lastBackupAt: string | null): string | null {
  if (!lastBackupAt) {
    return t('backupNeverCreatedWarning')
  }

  const lastBackupDate = new Date(lastBackupAt)

  if (!isValidDate(lastBackupDate)) {
    return t('backupInvalidDateWarning')
  }

  const days = Math.max(0, Math.floor((startOfLocalDay(new Date()).getTime() - startOfLocalDay(lastBackupDate).getTime()) / DAY_MS))

  if (days > BACKUP_WARNING_DAYS) {
    return formatBackupOldWarning(days)
  }

  return null
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}
