/* eslint-disable react-refresh/only-export-components */
// This file intentionally exports provider, hook, and shared busy-task types together.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { t } from '@/i18n/sk'

export type BusyTask = 'photo' | 'backup' | 'restore' | 'generic'

type BusyEntry = {
  task: BusyTask
  label: string | null
  order: number
}

type AppBusyContextValue = {
  active: boolean
  label: string | null
  startBusy: (task: BusyTask, label?: string) => string
  endBusy: (token: string) => void
}

const TASK_PRIORITY: Record<BusyTask, number> = {
  restore: 4,
  backup: 3,
  photo: 2,
  generic: 1,
}

const AppBusyContext = createContext<AppBusyContextValue | null>(null)

export function AppBusyProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, BusyEntry>>({})
  const counterRef = useRef(0)

  const startBusy = useCallback((task: BusyTask, label?: string) => {
    const token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `busy-${Date.now()}-${counterRef.current + 1}`

    counterRef.current += 1
    const normalizedLabel = typeof label === 'string' && label.length > 0 ? label : null

    setEntries((current) => ({
      ...current,
      [token]: {
        task,
        label: normalizedLabel,
        order: counterRef.current,
      },
    }))

    return token
  }, [])

  const endBusy = useCallback((token: string) => {
    setEntries((current) => {
      if (!current[token]) {
        return current
      }

      const next = { ...current }
      delete next[token]
      return next
    })
  }, [])

  const value = useMemo<AppBusyContextValue>(() => {
    const activeEntries = Object.values(entries)
    if (activeEntries.length === 0) {
      return { active: false, label: null, startBusy, endBusy }
    }

    const topEntry = activeEntries.reduce((best, candidate) => {
      const bestPriority = TASK_PRIORITY[best.task]
      const candidatePriority = TASK_PRIORITY[candidate.task]

      if (candidatePriority > bestPriority) return candidate
      if (candidatePriority < bestPriority) return best
      return candidate.order >= best.order ? candidate : best
    })

    const label =
      topEntry.label ??
      (topEntry.task === 'restore'
        ? t('processingRestoreGlobal')
        : topEntry.task === 'backup'
          ? t('processingBackupGlobal')
          : topEntry.task === 'photo'
            ? t('processingPhotoGlobal')
            : t('processingGeneric'))

    return {
      active: true,
      label,
      startBusy,
      endBusy,
    }
  }, [entries, endBusy, startBusy])

  return <AppBusyContext.Provider value={value}>{children}</AppBusyContext.Provider>
}

export function useAppBusy(): AppBusyContextValue {
  const context = useContext(AppBusyContext)
  if (!context) {
    throw new Error('useAppBusy must be used within an AppBusyProvider')
  }
  return context
}
