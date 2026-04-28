import { db, type AppSetting } from '../db'
import { PASSWORD_ERROR } from '../errors'
import {
  PASSWORD_MODE_LOCK_ONLY,
  createPasswordVerifier,
  isPasswordStrongEnough,
  verifyPassword,
  type PasswordMode,
  type PasswordVerifierRecord,
} from '@/lib/password'

export const PASSWORD_VERIFIER_KEY = 'passwordVerifier'
export const PASSWORD_SALT_KEY = 'passwordSalt'
export const PASSWORD_ITERATIONS_KEY = 'passwordIterations'
export const PASSWORD_MODE_KEY = 'passwordMode'

const PASSWORD_KEYS = [
  PASSWORD_VERIFIER_KEY,
  PASSWORD_SALT_KEY,
  PASSWORD_ITERATIONS_KEY,
  PASSWORD_MODE_KEY,
] as const

export async function getPasswordRecord(): Promise<PasswordVerifierRecord | null> {
  const settings = await db.appSettings.bulkGet(PASSWORD_KEYS as unknown as string[])
  const [verifierEntry, saltEntry, iterationsEntry, modeEntry] = settings

  const presentCount = settings.filter((entry) => entry !== undefined).length

  if (presentCount === 0) {
    return null
  }

  if (
    !verifierEntry ||
    !saltEntry ||
    !iterationsEntry ||
    !modeEntry ||
    typeof verifierEntry.value !== 'string' ||
    typeof saltEntry.value !== 'string' ||
    typeof iterationsEntry.value !== 'string' ||
    typeof modeEntry.value !== 'string'
  ) {
    throw new Error(PASSWORD_ERROR.PASSWORD_CONFIG_INVALID)
  }

  if (modeEntry.value !== PASSWORD_MODE_LOCK_ONLY) {
    throw new Error(PASSWORD_ERROR.PASSWORD_CONFIG_INVALID)
  }

  const iterations = Number(iterationsEntry.value)
  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error(PASSWORD_ERROR.PASSWORD_CONFIG_INVALID)
  }

  if (verifierEntry.value.length === 0 || saltEntry.value.length === 0) {
    throw new Error(PASSWORD_ERROR.PASSWORD_CONFIG_INVALID)
  }

  return {
    verifier: verifierEntry.value,
    salt: saltEntry.value,
    iterations,
    mode: modeEntry.value as PasswordMode,
  }
}

export async function hasPassword(): Promise<boolean> {
  const record = await getPasswordRecord()
  return record !== null
}

export async function setPassword(password: string): Promise<void> {
  if (!isPasswordStrongEnough(password)) {
    throw new Error(PASSWORD_ERROR.PASSWORD_TOO_SHORT)
  }

  const existing = await getPasswordRecord()
  if (existing) {
    throw new Error(PASSWORD_ERROR.PASSWORD_ALREADY_SET)
  }

  const record = await createPasswordVerifier(password)
  await persistPasswordRecord(record)
}

export async function changePassword(
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const existing = await getPasswordRecord()
  if (!existing) {
    throw new Error(PASSWORD_ERROR.PASSWORD_NOT_SET)
  }

  const matches = await verifyPassword(currentPassword, existing)
  if (!matches) {
    throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
  }

  if (!isPasswordStrongEnough(nextPassword)) {
    throw new Error(PASSWORD_ERROR.PASSWORD_TOO_SHORT)
  }

  const nextRecord = await createPasswordVerifier(nextPassword)
  await persistPasswordRecord(nextRecord)
}

export async function removePassword(currentPassword: string): Promise<void> {
  const existing = await getPasswordRecord()
  if (!existing) {
    throw new Error(PASSWORD_ERROR.PASSWORD_NOT_SET)
  }

  const matches = await verifyPassword(currentPassword, existing)
  if (!matches) {
    throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
  }

  await db.transaction('rw', db.appSettings, async () => {
    await db.appSettings.bulkDelete(PASSWORD_KEYS as unknown as string[])
  })
}

async function persistPasswordRecord(record: PasswordVerifierRecord): Promise<void> {
  const updatedAt = new Date().toISOString()
  const entries: AppSetting[] = [
    { key: PASSWORD_VERIFIER_KEY, value: record.verifier, updatedAt },
    { key: PASSWORD_SALT_KEY, value: record.salt, updatedAt },
    { key: PASSWORD_ITERATIONS_KEY, value: String(record.iterations), updatedAt },
    { key: PASSWORD_MODE_KEY, value: record.mode, updatedAt },
  ]

  await db.transaction('rw', db.appSettings, async () => {
    await db.appSettings.bulkPut(entries)
  })
}
