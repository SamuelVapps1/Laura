import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'

import {
  bytesToBase64,
  base64ToBytes,
  decryptBackupPayload,
  encryptBackupPayload,
  EncryptedBackupDecryptError,
  ENCRYPTED_BACKUP_FORMAT,
  ENCRYPTED_BACKUP_VERSION,
  isEncryptedBackupManifest,
  validateBackupPassword,
  type EncryptedBackupManifest,
} from '@/lib/backupCrypto'
import { db, type AppSetting, type Appointment, type Dog, type DogTag, type EntityId, type EntityNote, type ISODateTime, type Owner, type PhotoAsset, type PhotoKind, type PhotoSession, type PhotoVariant, type Tag, type TagApplication, type TagDefinition, type TagScope } from '@/db/db'
import { LAST_BACKUP_AT_KEY, setLastBackupAt } from '@/db/repositories/settings'

export const BACKUP_FORMAT = 'salon-app-backup'
export const BACKUP_VERSION = 1

export type BackupProgressStage =
  | 'idle'
  | 'reading'
  | 'preparing'
  | 'packing'
  | 'encrypting'
  | 'downloading'
  | 'parsing'
  | 'restoring'
  | 'done'
  | 'error'

export type BackupProgress = {
  stage: BackupProgressStage
  message?: string
  current?: number
  total?: number
}

export type BackupCounts = {
  owners: number
  dogs: number
  appointments: number
  tags: number
  dogTags: number
  appSettings: number
  notes: number
  tagDefinitions: number
  tagApplications: number
  photoSessions: number
  photos: number
}

export type BackupManifest = {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  createdAt: ISODateTime
  appName: 'Salón pre psov'
  counts: BackupCounts
}

export type PhotoBackupRecord = {
  id: EntityId
  sessionId: EntityId
  appointmentId: EntityId
  dogId: EntityId
  groupId: EntityId
  kind: PhotoKind
  variant: PhotoVariant
  mimeType: 'image/webp'
  width: number | null
  height: number | null
  sizeBytes: number
  createdAt: ISODateTime
  filePath: string
}

export type BackupData = {
  owners: Owner[]
  dogs: Dog[]
  appointments: Appointment[]
  tags: Tag[]
  dogTags: DogTag[]
  appSettings: AppSetting[]
  notes: EntityNote[]
  tagDefinitions: TagDefinition[]
  tagApplications: TagApplication[]
  photoSessions: PhotoSession[]
  photos: PhotoBackupRecord[]
}

export type ParsedBackupPreview = {
  manifest: BackupManifest
  data: BackupData
  photoFiles: Map<string, Uint8Array>
  counts: BackupCounts
  warnings: string[]
  /** Plain (legacy) unencrypted ZIP from older exports — optional UI notice only. */
  plainBackupNotEncrypted?: boolean
}

export type BackupErrorCode =
  | 'invalid_file'
  | 'unsupported_version'
  | 'restore_failed'
  | 'backup_password_required'
  | 'backup_password_too_short'
  | 'backup_password_confirm_mismatch'
  | 'encrypted_backup_password_required'
  | 'encrypted_backup_wrong_password'
  | 'encrypted_backup_invalid'

export class BackupError extends Error {
  code: BackupErrorCode

  constructor(code: BackupErrorCode) {
    super(code)
    this.name = 'BackupError'
    this.code = code
  }
}

const APP_NAME = 'Salón pre psov'
const PHOTO_DIR = 'photos'
const PHOTO_FILE_PATTERN = /^photos\/[^/\\]+\.webp$/
const PHOTO_KINDS = ['before', 'after'] as const satisfies readonly PhotoKind[]
const PHOTO_VARIANTS = ['full', 'thumb'] as const satisfies readonly PhotoVariant[]
const NOTE_SCOPES = ['appointment', 'owner', 'dog'] as const
const TAG_SCOPES = ['appointment', 'owner', 'dog'] as const satisfies readonly TagScope[]
const APPOINTMENT_STATUSES = ['scheduled', 'done', 'cancelled', 'no_show'] as const satisfies readonly Appointment['status'][]
const BACKUP_DATA_KEYS = [
  'owners',
  'dogs',
  'appointments',
  'tags',
  'dogTags',
  'appSettings',
  'notes',
  'tagDefinitions',
  'tagApplications',
  'photoSessions',
  'photos',
] as const satisfies readonly (keyof BackupData)[]

const BACKUP_COUNT_KEYS = BACKUP_DATA_KEYS satisfies readonly (keyof BackupCounts)[]
const ALL_APP_TABLES = [
  db.owners,
  db.dogs,
  db.appointments,
  db.tags,
  db.dogTags,
  db.appSettings,
  db.notes,
  db.tagDefinitions,
  db.tagApplications,
  db.photoSessions,
  db.photos,
] as const

type BackupSnapshot = Omit<BackupData, 'photos'> & {
  photos: PhotoAsset[]
}

export type ExportBackupOptions = {
  password: string
}

function assertBackupPasswordForExport(password: string): string {
  const violation = validateBackupPassword(password)
  if (!violation) {
    return password.trim()
  }
  switch (violation) {
    case 'BACKUP_PASSWORD_REQUIRED':
      throw new BackupError('backup_password_required')
    case 'BACKUP_PASSWORD_TOO_SHORT':
      throw new BackupError('backup_password_too_short')
    case 'BACKUP_PASSWORD_CONFIRM_MISMATCH':
      throw new BackupError('backup_password_confirm_mismatch')
    default:
      throw new BackupError('invalid_file')
  }
}

/** Encrypted export is the default. Pass a backup password (min 12 characters). Optional progress callback second. */
export async function exportBackup(
  password: string | ExportBackupOptions,
  onProgress?: (progress: BackupProgress) => void
): Promise<void> {
  try {
    const rawPassword =
      typeof password === 'string'
        ? password
        : password.password

    const trimmedPassword = assertBackupPasswordForExport(rawPassword)

    reportProgress(onProgress, { stage: 'reading' })
    const plainZipBytes = await buildPlainBackupZip(onProgress)

    reportProgress(onProgress, { stage: 'encrypting' })
    const { ciphertext, salt, iv } = await encryptBackupPayload(plainZipBytes, trimmedPassword)

    const createdAt = new Date().toISOString()
    const encryptedManifest: EncryptedBackupManifest = {
      format: ENCRYPTED_BACKUP_FORMAT,
      version: ENCRYPTED_BACKUP_VERSION,
      createdAt,
      appName: APP_NAME,
      encryption: {
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 250000,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        keyLengthBits: 256,
      },
      payload: {
        file: 'payload.bin',
        byteLength: ciphertext.byteLength,
      },
    }

    const outerZip: Zippable = {
      'manifest.json': strToU8(JSON.stringify(encryptedManifest, null, 2)),
      'payload.bin': [ciphertext, { level: 0 }],
    }

    reportProgress(onProgress, { stage: 'packing' })
    const outerBytes = zipSync(outerZip, { level: 6 })

    reportProgress(onProgress, { stage: 'downloading' })
    const blob = new Blob([toArrayBuffer(outerBytes)], { type: 'application/zip' })
    triggerDownload(blob, buildEncryptedBackupFilename(new Date()))

    await setLastBackupAt(new Date().toISOString())
    reportProgress(onProgress, { stage: 'done' })
  } catch (error) {
    reportProgress(onProgress, { stage: 'error' })
    if (error instanceof BackupError) {
      throw error
    }
    throw error
  }
}

async function buildPlainBackupZip(onProgress?: (progress: BackupProgress) => void): Promise<Uint8Array> {
  const snapshot = await readBackupSnapshot()
  const data: BackupData = {
    owners: snapshot.owners,
    dogs: snapshot.dogs,
    appointments: snapshot.appointments,
    tags: snapshot.tags,
    dogTags: snapshot.dogTags,
    appSettings: snapshot.appSettings,
    notes: snapshot.notes,
    tagDefinitions: snapshot.tagDefinitions,
    tagApplications: snapshot.tagApplications,
    photoSessions: snapshot.photoSessions,
    photos: [],
  }
  const zipEntries: Zippable = {}

  reportProgress(onProgress, {
    stage: 'preparing',
    current: 0,
    total: snapshot.photos.length,
  })

  for (let index = 0; index < snapshot.photos.length; index += 1) {
    const photo = snapshot.photos[index]
    const record = toPhotoBackupRecord(photo)
    const bytes = new Uint8Array(await photo.blob.arrayBuffer())

    data.photos.push(record)
    zipEntries[record.filePath] = [bytes, { level: 0 }]

    if (shouldReportPhotoProgress(index, snapshot.photos.length)) {
      reportProgress(onProgress, {
        stage: 'preparing',
        current: index + 1,
        total: snapshot.photos.length,
      })
    }
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appName: APP_NAME,
    counts: createCounts(data),
  }

  zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  zipEntries['data.json'] = strToU8(JSON.stringify(data, null, 2))

  reportProgress(onProgress, { stage: 'packing' })
  return zipSync(zipEntries, { level: 6 })
}

export async function parseBackupFile(file: File, password?: string): Promise<ParsedBackupPreview> {
  if (!isZipLikeFile(file)) {
    throw new BackupError('invalid_file')
  }

  let unzipped: Record<string, Uint8Array>

  try {
    unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new BackupError('invalid_file')
  }

  const manifestBytes = unzipped['manifest.json']

  if (!manifestBytes) {
    throw new BackupError('invalid_file')
  }

  const manifestPeek = parseJsonFile(manifestBytes)

  if (isEncryptedBackupManifest(manifestPeek)) {
    return parseEncryptedOuterBackup(unzipped, manifestPeek, password)
  }

  const preview = parsePlainBackupFromUnzipped(unzipped)
  return {
    ...preview,
    plainBackupNotEncrypted: true,
  }
}

function parsePlainBackupFromUnzipped(unzipped: Record<string, Uint8Array>): ParsedBackupPreview {
  const dataBytes = unzipped['data.json']

  if (!dataBytes) {
    throw new BackupError('invalid_file')
  }

  const manifestBytes = unzipped['manifest.json']

  if (!manifestBytes) {
    throw new BackupError('invalid_file')
  }

  const manifest = validateManifestPayload(parseJsonFile(manifestBytes))
  const data = validateBackupDataPayload(parseJsonFile(dataBytes))
  const photoFiles = collectPhotoFiles(unzipped)

  validateBackupIntegrity(data, photoFiles)

  const counts = createCounts(data)
  return {
    manifest,
    data,
    photoFiles,
    counts,
    warnings: buildWarnings(manifest, counts),
  }
}

async function parseEncryptedOuterBackup(
  unzipped: Record<string, Uint8Array>,
  manifest: EncryptedBackupManifest,
  password: string | undefined
): Promise<ParsedBackupPreview> {
  const trimmed = password?.trim() ?? ''
  if (!trimmed) {
    throw new BackupError('encrypted_backup_password_required')
  }

  const payloadBytes = unzipped['payload.bin']

  if (!payloadBytes || payloadBytes.byteLength === 0) {
    throw new BackupError('encrypted_backup_invalid')
  }

  if (payloadBytes.byteLength !== manifest.payload.byteLength) {
    throw new BackupError('encrypted_backup_invalid')
  }

  let salt: Uint8Array
  let iv: Uint8Array

  try {
    salt = base64ToBytes(manifest.encryption.salt)
    iv = base64ToBytes(manifest.encryption.iv)
  } catch {
    throw new BackupError('encrypted_backup_invalid')
  }

  if (salt.byteLength !== 16 || iv.byteLength !== 12) {
    throw new BackupError('encrypted_backup_invalid')
  }

  let plainZipBytes: Uint8Array

  try {
    plainZipBytes = await decryptBackupPayload(
      {
        ciphertext: payloadBytes,
        salt,
        iv,
      },
      trimmed
    )
  } catch (error) {
    if (error instanceof EncryptedBackupDecryptError) {
      throw new BackupError('encrypted_backup_wrong_password')
    }

    throw new BackupError('encrypted_backup_invalid')
  }

  let innerUnzipped: Record<string, Uint8Array>

  try {
    innerUnzipped = unzipSync(plainZipBytes)
  } catch {
    throw new BackupError('encrypted_backup_invalid')
  }

  try {
    return parsePlainBackupFromUnzipped(innerUnzipped)
  } catch (error) {
    if (error instanceof BackupError && error.code === 'unsupported_version') {
      throw error
    }

    if (error instanceof BackupError) {
      throw new BackupError('encrypted_backup_invalid')
    }

    throw error
  }
}

export async function restoreBackup(
  parsed: ParsedBackupPreview,
  onProgress?: (progress: BackupProgress) => void
): Promise<void> {
  try {
    const manifest = validateManifestPayload(parsed.manifest)
    const data = validateBackupDataPayload(parsed.data)

    if (!(parsed.photoFiles instanceof Map)) {
      throw new BackupError('invalid_file')
    }

    validateBackupIntegrity(data, parsed.photoFiles)
    reportProgress(onProgress, {
      stage: 'restoring',
      current: 0,
      total: data.photos.length + 12,
    })

    const photoAssets = data.photos.map((photo, index) => {
      const bytes = parsed.photoFiles.get(photo.filePath)
      if (!bytes) {
        throw new BackupError('invalid_file')
      }

      if (shouldReportPhotoProgress(index, data.photos.length)) {
        reportProgress(onProgress, {
          stage: 'restoring',
          current: index + 1,
          total: data.photos.length + 12,
        })
      }

      return toPhotoAsset(photo, bytes)
    })

    const now = new Date().toISOString()
    let current = data.photos.length

    await db.transaction('rw', ALL_APP_TABLES, async () => {
      await clearAllStores()
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.owners.length > 0) await db.owners.bulkAdd(data.owners)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.dogs.length > 0) await db.dogs.bulkAdd(data.dogs)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.appointments.length > 0) await db.appointments.bulkAdd(data.appointments)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.tags.length > 0) await db.tags.bulkAdd(data.tags)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.dogTags.length > 0) await db.dogTags.bulkAdd(data.dogTags)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.appSettings.length > 0) await db.appSettings.bulkAdd(data.appSettings)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.notes.length > 0) await db.notes.bulkAdd(data.notes)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.tagDefinitions.length > 0) await db.tagDefinitions.bulkAdd(data.tagDefinitions)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.tagApplications.length > 0) await db.tagApplications.bulkAdd(data.tagApplications)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (data.photoSessions.length > 0) await db.photoSessions.bulkAdd(data.photoSessions)
      current += 1
      reportProgress(onProgress, { stage: 'restoring', current, total: data.photos.length + 12 })

      if (photoAssets.length > 0) await db.photos.bulkAdd(photoAssets)
      await db.appSettings.put({
        key: LAST_BACKUP_AT_KEY,
        value: now,
        updatedAt: now,
      })
    })

    if (manifest.version !== BACKUP_VERSION) {
      throw new BackupError('unsupported_version')
    }

    reportProgress(onProgress, { stage: 'done' })
  } catch (error) {
    reportProgress(onProgress, { stage: 'error' })

    if (error instanceof BackupError) {
      throw error
    }

    throw new BackupError('restore_failed')
  }
}

function readBackupSnapshot(): Promise<BackupSnapshot> {
  return db.transaction('r', ALL_APP_TABLES, async () => ({
    owners: await db.owners.toArray(),
    dogs: await db.dogs.toArray(),
    appointments: await db.appointments.toArray(),
    tags: await db.tags.toArray(),
    dogTags: await db.dogTags.toArray(),
    appSettings: await db.appSettings.toArray(),
    notes: await db.notes.toArray(),
    tagDefinitions: await db.tagDefinitions.toArray(),
    tagApplications: await db.tagApplications.toArray(),
    photoSessions: await db.photoSessions.toArray(),
    photos: await db.photos.toArray(),
  }))
}

async function clearAllStores(): Promise<void> {
  await db.owners.clear()
  await db.dogs.clear()
  await db.appointments.clear()
  await db.tags.clear()
  await db.dogTags.clear()
  await db.appSettings.clear()
  await db.notes.clear()
  await db.tagDefinitions.clear()
  await db.tagApplications.clear()
  await db.photoSessions.clear()
  await db.photos.clear()
}

function toPhotoBackupRecord(photo: PhotoAsset): PhotoBackupRecord {
  return {
    id: photo.id,
    sessionId: photo.sessionId,
    appointmentId: photo.appointmentId,
    dogId: photo.dogId,
    groupId: photo.groupId,
    kind: photo.kind,
    variant: photo.variant,
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
    sizeBytes: photo.sizeBytes,
    createdAt: photo.createdAt,
    filePath: getPhotoFilePath(photo.id),
  }
}

function toPhotoAsset(photo: PhotoBackupRecord, bytes: Uint8Array): PhotoAsset {
  return {
    id: photo.id,
    sessionId: photo.sessionId,
    appointmentId: photo.appointmentId,
    dogId: photo.dogId,
    groupId: photo.groupId,
    kind: photo.kind,
    variant: photo.variant,
    blob: new Blob([toArrayBuffer(bytes)], { type: 'image/webp' }),
    mimeType: 'image/webp',
    width: photo.width,
    height: photo.height,
    sizeBytes: photo.sizeBytes,
    createdAt: photo.createdAt,
  }
}

function validateManifestPayload(value: unknown): BackupManifest {
  const record = requireRecord(value)

  if (record.format !== BACKUP_FORMAT) {
    throw new BackupError('invalid_file')
  }

  if (record.version !== BACKUP_VERSION) {
    throw new BackupError('unsupported_version')
  }

  if (typeof record.createdAt !== 'string' || typeof record.appName !== 'string') {
    throw new BackupError('invalid_file')
  }

  const countsRecord = requireRecord(record.counts)
  const counts = BACKUP_COUNT_KEYS.reduce<BackupCounts>((result, key) => {
    const count = countsRecord[key]
    if (!isValidCount(count)) {
      throw new BackupError('invalid_file')
    }

    result[key] = count
    return result
  }, createEmptyCounts())

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: record.createdAt,
    appName: APP_NAME,
    counts,
  }
}

function validateBackupDataPayload(value: unknown): BackupData {
  const record = requireRecord(value)

  return {
    owners: validateArray(record.owners, validateOwner),
    dogs: validateArray(record.dogs, validateDog),
    appointments: validateArray(record.appointments, validateAppointment),
    tags: validateArray(record.tags, validateTag),
    dogTags: validateArray(record.dogTags, validateDogTag),
    appSettings: validateArray(record.appSettings, validateAppSetting),
    notes: validateArray(record.notes, validateEntityNote),
    tagDefinitions: validateArray(record.tagDefinitions, validateTagDefinition),
    tagApplications: validateArray(record.tagApplications, validateTagApplication),
    photoSessions: validateArray(record.photoSessions, validatePhotoSession),
    photos: validateArray(record.photos, validatePhotoBackupRecord),
  }
}

function validateBackupIntegrity(data: BackupData, photoFiles: Map<string, Uint8Array>): void {
  ensureUniqueValues(data.owners.map((owner) => owner.id))
  ensureUniqueValues(data.dogs.map((dog) => dog.id))
  ensureUniqueValues(data.appointments.map((appointment) => appointment.id))
  ensureUniqueValues(data.tags.map((tag) => tag.id))
  ensureUniqueValues(data.dogTags.map((dogTag) => dogTag.id))
  ensureUniqueValues(data.appSettings.map((setting) => setting.key))
  ensureUniqueValues(data.notes.map((note) => `${note.scope}\u0000${note.entityId}`))
  ensureUniqueValues(data.tagDefinitions.map((tag) => tag.id))
  ensureUniqueValues(data.tagApplications.map((application) => `${application.tagId}\u0000${application.entityType}\u0000${application.entityId}`))
  ensureUniqueValues(data.photoSessions.map((session) => session.id))
  ensureUniqueValues(data.photos.map((photo) => photo.id))
  ensureUniqueValues(data.dogTags.map((dogTag) => `${dogTag.dogId}\u0000${dogTag.tagId}`))

  const ownerIds = new Set(data.owners.map((owner) => owner.id))
  const legacyTagIds = new Set(data.tags.map((tag) => tag.id))
  const tagDefinitionIds = new Set(data.tagDefinitions.map((tag) => tag.id))
  const dogsById = new Map(data.dogs.map((dog) => [dog.id, dog]))
  const appointmentsById = new Map(data.appointments.map((appointment) => [appointment.id, appointment]))
  const photoSessionsById = new Map(data.photoSessions.map((session) => [session.id, session]))
  const dogIds = new Set(data.dogs.map((dog) => dog.id))
  const appointmentIds = new Set(data.appointments.map((appointment) => appointment.id))

  data.dogs.forEach((dog) => {
    if (!ownerIds.has(dog.ownerId)) {
      throw new BackupError('invalid_file')
    }
  })

  data.dogTags.forEach((dogTag) => {
    if (!dogIds.has(dogTag.dogId) || !legacyTagIds.has(dogTag.tagId)) {
      throw new BackupError('invalid_file')
    }
  })

  data.appointments.forEach((appointment) => {
    const dog = dogsById.get(appointment.dogId)

    if (!dog || !ownerIds.has(appointment.ownerId) || dog.ownerId !== appointment.ownerId) {
      throw new BackupError('invalid_file')
    }
  })

  data.notes.forEach((note) => {
    switch (note.scope) {
      case 'owner':
        if (!ownerIds.has(note.entityId)) throw new BackupError('invalid_file')
        return
      case 'dog':
        if (!dogIds.has(note.entityId)) throw new BackupError('invalid_file')
        return
      case 'appointment':
        if (!appointmentIds.has(note.entityId)) throw new BackupError('invalid_file')
        return
      default:
        throw new BackupError('invalid_file')
    }
  })

  data.tagApplications.forEach((application) => {
    if (!tagDefinitionIds.has(application.tagId)) {
      throw new BackupError('invalid_file')
    }

    switch (application.entityType) {
      case 'owner':
        if (!ownerIds.has(application.entityId)) throw new BackupError('invalid_file')
        return
      case 'dog':
        if (!dogIds.has(application.entityId)) throw new BackupError('invalid_file')
        return
      case 'appointment':
        if (!appointmentIds.has(application.entityId)) throw new BackupError('invalid_file')
        return
      default:
        throw new BackupError('invalid_file')
    }
  })

  data.photoSessions.forEach((session) => {
    const appointment = appointmentsById.get(session.appointmentId)

    if (!appointment || !dogIds.has(session.dogId) || appointment.dogId !== session.dogId) {
      throw new BackupError('invalid_file')
    }
  })

  data.photos.forEach((photo) => {
    const bytes = photoFiles.get(photo.filePath)
    const session = photoSessionsById.get(photo.sessionId)

    if (
      !session ||
      !appointmentIds.has(photo.appointmentId) ||
      !dogIds.has(photo.dogId) ||
      photo.appointmentId !== session.appointmentId ||
      photo.dogId !== session.dogId
    ) {
      throw new BackupError('invalid_file')
    }

    if (!bytes || bytes.byteLength === 0) {
      throw new BackupError('invalid_file')
    }
  })
}

function validateOwner(value: unknown): asserts value is Owner {
  const record = requireRecord(value)
  requireString(record.id)
}

function validateDog(value: unknown): asserts value is Dog {
  const record = requireRecord(value)
  requireString(record.id)
  requireString(record.ownerId)
}

function validateAppointment(value: unknown): asserts value is Appointment {
  const record = requireRecord(value)
  requireString(record.id)
  requireString(record.dogId)
  requireString(record.ownerId)

  if (!APPOINTMENT_STATUSES.includes(record.status as Appointment['status'])) {
    throw new BackupError('invalid_file')
  }
}

function validateTag(value: unknown): asserts value is Tag {
  const record = requireRecord(value)
  requireString(record.id)
}

function validateDogTag(value: unknown): asserts value is DogTag {
  const record = requireRecord(value)
  requireString(record.id)
  requireString(record.dogId)
  requireString(record.tagId)
}

function validateAppSetting(value: unknown): asserts value is AppSetting {
  const record = requireRecord(value)
  requireString(record.key)
  requireString(record.value)
  requireString(record.updatedAt)
}

function validateEntityNote(value: unknown): asserts value is EntityNote {
  const record = requireRecord(value)
  requireString(record.entityId)

  if (!NOTE_SCOPES.includes(record.scope as (typeof NOTE_SCOPES)[number])) {
    throw new BackupError('invalid_file')
  }
}

function validateTagDefinition(value: unknown): asserts value is TagDefinition {
  const record = requireRecord(value)
  requireString(record.id)

  if (!Array.isArray(record.scopes)) {
    throw new BackupError('invalid_file')
  }

  record.scopes.forEach((scope) => {
    if (!TAG_SCOPES.includes(scope as TagScope)) {
      throw new BackupError('invalid_file')
    }
  })
}

function validateTagApplication(value: unknown): asserts value is TagApplication {
  const record = requireRecord(value)
  requireString(record.tagId)
  requireString(record.entityId)

  if (!TAG_SCOPES.includes(record.entityType as TagScope)) {
    throw new BackupError('invalid_file')
  }
}

function validatePhotoSession(value: unknown): asserts value is PhotoSession {
  const record = requireRecord(value)
  requireString(record.id)
  requireString(record.appointmentId)
  requireString(record.dogId)
}

function validatePhotoBackupRecord(value: unknown): asserts value is PhotoBackupRecord {
  const record = requireRecord(value)
  const id = requireString(record.id)
  const filePath = requireString(record.filePath)

  requireString(record.sessionId)
  requireString(record.appointmentId)
  requireString(record.dogId)
  requireString(record.groupId)
  requireString(record.createdAt)

  if ('blob' in record) {
    throw new BackupError('invalid_file')
  }

  if (filePath !== getPhotoFilePath(id) || !PHOTO_FILE_PATTERN.test(filePath)) {
    throw new BackupError('invalid_file')
  }

  if (!PHOTO_KINDS.includes(record.kind as PhotoKind)) {
    throw new BackupError('invalid_file')
  }

  if (!PHOTO_VARIANTS.includes(record.variant as PhotoVariant)) {
    throw new BackupError('invalid_file')
  }

  if (record.mimeType !== 'image/webp') {
    throw new BackupError('invalid_file')
  }

  if (!isNullableFiniteNumber(record.width) || !isNullableFiniteNumber(record.height)) {
    throw new BackupError('invalid_file')
  }

  if (typeof record.sizeBytes !== 'number' || !Number.isFinite(record.sizeBytes) || record.sizeBytes < 0) {
    throw new BackupError('invalid_file')
  }
}

function validateArray<T>(value: unknown, validate: (row: unknown) => asserts row is T): T[] {
  if (!Array.isArray(value)) {
    throw new BackupError('invalid_file')
  }

  value.forEach(validate)
  return value
}

function collectPhotoFiles(unzipped: Record<string, Uint8Array>): Map<string, Uint8Array> {
  const photoFiles = new Map<string, Uint8Array>()

  Object.entries(unzipped).forEach(([path, bytes]) => {
    if (path.startsWith(`${PHOTO_DIR}/`)) {
      photoFiles.set(path, bytes)
    }
  })

  return photoFiles
}

function parseJsonFile(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(strFromU8(bytes))
  } catch {
    throw new BackupError('invalid_file')
  }
}

function createCounts(data: BackupData): BackupCounts {
  return {
    owners: data.owners.length,
    dogs: data.dogs.length,
    appointments: data.appointments.length,
    tags: data.tags.length,
    dogTags: data.dogTags.length,
    appSettings: data.appSettings.length,
    notes: data.notes.length,
    tagDefinitions: data.tagDefinitions.length,
    tagApplications: data.tagApplications.length,
    photoSessions: data.photoSessions.length,
    photos: data.photos.length,
  }
}

function createEmptyCounts(): BackupCounts {
  return {
    owners: 0,
    dogs: 0,
    appointments: 0,
    tags: 0,
    dogTags: 0,
    appSettings: 0,
    notes: 0,
    tagDefinitions: 0,
    tagApplications: 0,
    photoSessions: 0,
    photos: 0,
  }
}

function buildWarnings(manifest: BackupManifest, counts: BackupCounts): string[] {
  const warnings: string[] = []

  BACKUP_COUNT_KEYS.forEach((key) => {
    if (manifest.counts[key] !== counts[key]) {
      warnings.push(`count:${key}`)
    }
  })

  return warnings
}

function isZipLikeFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return name.endsWith('.zip') || type === 'application/zip' || type === 'application/x-zip-compressed'
}

function buildEncryptedBackupFilename(date: Date): string {
  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hour = padDatePart(date.getHours())
  const minute = padDatePart(date.getMinutes())

  return `salon-zaloha-sifrovana-${year}-${month}-${day}_${hour}-${minute}.zip`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function getPhotoFilePath(photoId: string): string {
  return `${PHOTO_DIR}/${photoId}.webp`
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function reportProgress(onProgress: ((progress: BackupProgress) => void) | undefined, progress: BackupProgress): void {
  onProgress?.(progress)
}

function shouldReportPhotoProgress(index: number, total: number): boolean {
  return total === 0 || index === total - 1 || index % 5 === 0
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BackupError('invalid_file')
  }

  return value as Record<string, unknown>
}

function requireString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BackupError('invalid_file')
  }

  return value
}

function isValidCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function ensureUniqueValues(values: string[]): void {
  const seen = new Set<string>()

  values.forEach((value) => {
    if (seen.has(value)) {
      throw new BackupError('invalid_file')
    }

    seen.add(value)
  })
}
