import { db, type AppSetting } from '../db'

export const LAST_BACKUP_AT_KEY = 'lastBackupAt'
export const SALON_NAME_SETTING_KEY = 'salon.name'

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

export async function getSalonNameSetting(): Promise<string | null> {
  const row = await db.appSettings.get(SALON_NAME_SETTING_KEY)
  const value = row?.value.trim()
  return value ? value : null
}

export async function setSalonNameSetting(value: string): Promise<void> {
  const normalized = value.trim()
  const updatedAt = new Date().toISOString()

  if (!normalized) {
    await db.appSettings.delete(SALON_NAME_SETTING_KEY)
    return
  }

  await db.appSettings.put({
    key: SALON_NAME_SETTING_KEY,
    value: normalized,
    updatedAt,
  })
}

export async function getSalonNameOrFallback(fallback: string): Promise<string> {
  return (await getSalonNameSetting()) ?? fallback
}
