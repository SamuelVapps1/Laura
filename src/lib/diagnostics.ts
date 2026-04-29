import { db, DB_SCHEMA_VERSION } from '@/db/db'
import { getLastBackupAt } from '@/db/repositories/settings'
import { getStoredPersistentStorageStatus, type StoragePersistStatus } from '@/lib/storagePersistence'

export type DiagnosticsSnapshot = {
  appVersion: string
  dbSchemaVersion: number | string
  storageUsageBytes: number | null
  storageQuotaBytes: number | null
  persistentStorageStatus: StoragePersistStatus | null
  lastBackupAt: string | null
  counts: Record<string, number>
}

export async function getDiagnosticsSnapshot(): Promise<DiagnosticsSnapshot> {
  const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev'

  const [storage, persistentStorageStatus, lastBackupAt, counts] = await Promise.all([
    getStorageEstimate(),
    getPersistentStorageStatusSafe(),
    getLastBackupAt().then((value) => value ?? null),
    getTableCounts(),
  ])

  return {
    appVersion,
    dbSchemaVersion: DB_SCHEMA_VERSION,
    storageUsageBytes: storage.usage,
    storageQuotaBytes: storage.quota,
    persistentStorageStatus,
    lastBackupAt,
    counts,
  }
}

async function getStorageEstimate(): Promise<{ usage: number | null; quota: number | null }> {
  if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
    return { usage: null, quota: null }
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      usage: typeof estimate.usage === 'number' ? estimate.usage : null,
      quota: typeof estimate.quota === 'number' ? estimate.quota : null,
    }
  } catch {
    return { usage: null, quota: null }
  }
}

async function getPersistentStorageStatusSafe(): Promise<StoragePersistStatus | null> {
  try {
    return await getStoredPersistentStorageStatus()
  } catch {
    return null
  }
}

async function getTableCounts(): Promise<Record<string, number>> {
  const [
    owners,
    dogs,
    appointments,
    notes,
    tagDefinitions,
    tagApplications,
    photoSessions,
    photos,
    tags,
    dogTags,
    appSettings,
  ] = await Promise.all([
    db.owners.count(),
    db.dogs.count(),
    db.appointments.count(),
    db.notes.count(),
    db.tagDefinitions.count(),
    db.tagApplications.count(),
    db.photoSessions.count(),
    db.photos.count(),
    db.tags.count(),
    db.dogTags.count(),
    db.appSettings.count(),
  ])

  return {
    owners,
    dogs,
    appointments,
    notes,
    tagDefinitions,
    tagApplications,
    photoSessions,
    photos,
    tags,
    dogTags,
    appSettings,
  }
}
