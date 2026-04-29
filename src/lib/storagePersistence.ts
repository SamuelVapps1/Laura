import { db, type AppSetting } from '@/db/db'
import { getSetting } from '@/db/repositories/settings'

export type StoragePersistStatus = 'granted' | 'denied' | 'unsupported'

const STORAGE_PERSIST_REQUESTED_AT_KEY = 'storagePersistRequestedAt'
const STORAGE_PERSIST_STATUS_KEY = 'storagePersistStatus'

export async function requestPersistentStorageOnce(): Promise<StoragePersistStatus> {
  const requestedAt = await getSetting(STORAGE_PERSIST_REQUESTED_AT_KEY)
  const existingStatus = await getStoredPersistentStorageStatus()

  if (requestedAt) {
    if (existingStatus) {
      return existingStatus
    }

    const reconciledStatus = await detectPersistentStorageStatusWithoutRequest()
    await writePersistentStorageState(reconciledStatus, requestedAt.value)
    return reconciledStatus
  }

  let status: StoragePersistStatus = await detectPersistentStorageStatusWithoutRequest()

  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      status = (await navigator.storage.persist()) ? 'granted' : 'denied'
    }
  } catch {
    status = status === 'unsupported' ? 'unsupported' : 'denied'
  }

  const now = new Date().toISOString()
  await writePersistentStorageState(status, now)

  return status
}

export async function getStoredPersistentStorageStatus(): Promise<StoragePersistStatus | null> {
  const statusSetting = await getSetting(STORAGE_PERSIST_STATUS_KEY)
  return parseStorageStatus(statusSetting?.value)
}

function parseStorageStatus(value: string | undefined): StoragePersistStatus | null {
  if (value === 'granted' || value === 'denied' || value === 'unsupported') {
    return value
  }

  return null
}

async function detectPersistentStorageStatusWithoutRequest(): Promise<StoragePersistStatus> {
  if (!navigator.storage) {
    return 'unsupported'
  }

  if (typeof navigator.storage.persisted === 'function') {
    try {
      return (await navigator.storage.persisted()) ? 'granted' : 'denied'
    } catch {
      return typeof navigator.storage.persist === 'function' ? 'denied' : 'unsupported'
    }
  }

  return typeof navigator.storage.persist === 'function' ? 'denied' : 'unsupported'
}

async function writePersistentStorageState(status: StoragePersistStatus, requestedAt: string): Promise<void> {
  const updatedAt = new Date().toISOString()
  const entries: AppSetting[] = [
    { key: STORAGE_PERSIST_REQUESTED_AT_KEY, value: requestedAt, updatedAt },
    { key: STORAGE_PERSIST_STATUS_KEY, value: status, updatedAt },
  ]

  await db.transaction('rw', db.appSettings, async () => {
    await db.appSettings.bulkPut(entries)
  })
}
