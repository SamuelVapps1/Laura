import { getSetting, setSetting } from '@/db/repositories/settings'

export type StoragePersistStatus = 'granted' | 'denied' | 'unsupported'

const STORAGE_PERSIST_REQUESTED_AT_KEY = 'storagePersistRequestedAt'
const STORAGE_PERSIST_STATUS_KEY = 'storagePersistStatus'

export async function requestPersistentStorageOnce(): Promise<StoragePersistStatus> {
  const requestedAt = await getSetting(STORAGE_PERSIST_REQUESTED_AT_KEY)
  if (requestedAt) {
    const existingStatus = await getStoredPersistentStorageStatus()
    return existingStatus ?? 'denied'
  }

  let status: StoragePersistStatus = 'denied'

  try {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
      status = 'unsupported'
    } else {
      status = (await navigator.storage.persist()) ? 'granted' : 'denied'
    }
  } catch {
    status = 'denied'
  }

  const now = new Date().toISOString()
  await Promise.all([
    setSetting(STORAGE_PERSIST_REQUESTED_AT_KEY, now),
    setSetting(STORAGE_PERSIST_STATUS_KEY, status),
  ])

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
