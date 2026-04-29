import { useMemo } from 'react'

import { useAppBusy } from '@/context/AppBusyContext'
import { t } from '@/i18n/sk'

export function AppBusyOverlay() {
  const { active, label } = useAppBusy()

  const text = label ?? t('processingGeneric')
  const isProminent = useMemo(
    () => text === t('processingBackupGlobal') || text === t('processingRestoreGlobal'),
    [text],
  )

  if (!active) {
    return null
  }

  if (isProminent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="inline-flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <span>{text}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-40">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium text-slate-900 shadow">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <span>{text}</span>
      </div>
    </div>
  )
}
