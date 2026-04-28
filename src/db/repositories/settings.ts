import { db, type AppSetting } from '../db'

export const LAST_BACKUP_AT_KEY = 'lastBackupAt'

export async function getSetting(key: string): Promise<AppSetting | undefined> {
  return db.appSettings.get(key)
}

export async function setSetting(key: string, value: string): Promise<AppSetting> {
  const setting: AppSetting = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  }

  await db.appSettings.put(setting)
  return setting
}

export async function getLastBackupAt(): Promise<string | undefined> {
  const setting = await getSetting(LAST_BACKUP_AT_KEY)
  return setting?.value
}

export async function setLastBackupAt(dateIso: string): Promise<AppSetting> {
  return setSetting(LAST_BACKUP_AT_KEY, dateIso)
}
