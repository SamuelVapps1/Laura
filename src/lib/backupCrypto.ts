import type { ISODateTime } from '@/db/db'

export const ENCRYPTED_BACKUP_FORMAT = 'salon-app-encrypted-backup' as const
export const ENCRYPTED_BACKUP_VERSION = 1
export const BACKUP_PASSWORD_MIN_LENGTH = 12

const SALT_BYTES = 16
const IV_BYTES = 12
const PBKDF2_ITERATIONS = 250_000
const AES_KEY_BITS = 256

export type BackupPasswordValidationCode =
  | 'BACKUP_PASSWORD_REQUIRED'
  | 'BACKUP_PASSWORD_TOO_SHORT'
  | 'BACKUP_PASSWORD_CONFIRM_MISMATCH'

export type EncryptedBackupManifest = {
  format: typeof ENCRYPTED_BACKUP_FORMAT
  version: typeof ENCRYPTED_BACKUP_VERSION
  createdAt: ISODateTime
  appName: 'Salón pre psov'
  encryption: {
    algorithm: 'AES-GCM'
    kdf: 'PBKDF2-SHA256'
    iterations: typeof PBKDF2_ITERATIONS
    salt: string
    iv: string
    keyLengthBits: typeof AES_KEY_BITS
  }
  payload: {
    file: 'payload.bin'
    byteLength: number
  }
}

/** Crypto material + ciphertext for round-trip; used by backup.ts to build the outer ZIP. */
export type EncryptedBackupPayload = {
  ciphertext: Uint8Array
  salt: Uint8Array
  iv: Uint8Array
}

export class EncryptedBackupDecryptError extends Error {
  readonly code = 'encrypted_backup_wrong_password' as const

  constructor() {
    super('encrypted_backup_wrong_password')
    this.name = 'EncryptedBackupDecryptError'
  }
}

export function validateBackupPassword(password: string, confirmPassword?: string): BackupPasswordValidationCode | null {
  const trimmed = password.trim()
  if (trimmed.length === 0) {
    return 'BACKUP_PASSWORD_REQUIRED'
  }
  if (trimmed.length < BACKUP_PASSWORD_MIN_LENGTH) {
    return 'BACKUP_PASSWORD_TOO_SHORT'
  }
  if (confirmPassword !== undefined) {
    const confirmTrimmed = confirmPassword.trim()
    if (trimmed !== confirmTrimmed) {
      return 'BACKUP_PASSWORD_CONFIRM_MISMATCH'
    }
  }
  return null
}

export function isEncryptedBackupManifest(value: unknown): value is EncryptedBackupManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>

  if (record.format !== ENCRYPTED_BACKUP_FORMAT) {
    return false
  }

  if (record.version !== ENCRYPTED_BACKUP_VERSION) {
    return false
  }

  if (typeof record.createdAt !== 'string') {
    return false
  }

  if (record.appName !== 'Salón pre psov') {
    return false
  }

  const enc = record.encryption
  if (typeof enc !== 'object' || enc === null || Array.isArray(enc)) {
    return false
  }

  const encRecord = enc as Record<string, unknown>

  if (encRecord.algorithm !== 'AES-GCM') {
    return false
  }
  if (encRecord.kdf !== 'PBKDF2-SHA256') {
    return false
  }
  if (encRecord.iterations !== PBKDF2_ITERATIONS) {
    return false
  }
  if (typeof encRecord.salt !== 'string' || encRecord.salt.length === 0) {
    return false
  }
  if (typeof encRecord.iv !== 'string' || encRecord.iv.length === 0) {
    return false
  }
  if (encRecord.keyLengthBits !== AES_KEY_BITS) {
    return false
  }

  const payload = record.payload
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return false
  }

  const payloadRecord = payload as Record<string, unknown>
  if (payloadRecord.file !== 'payload.bin') {
    return false
  }

  return typeof payloadRecord.byteLength === 'number' && Number.isFinite(payloadRecord.byteLength) && payloadRecord.byteLength >= 0
}

export async function encryptBackupPayload(plainZipBytes: Uint8Array, password: string): Promise<EncryptedBackupPayload> {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveAesKey(password, salt)

  const ivCopy = new Uint8Array(iv)
  const plaintextView = new Uint8Array(plainZipBytes)

  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivCopy }, key, plaintextView)
  const ciphertext = new Uint8Array(cipherBuffer)

  return { ciphertext, salt, iv }
}

export async function decryptBackupPayload(payload: EncryptedBackupPayload, password: string): Promise<Uint8Array> {
  const { ciphertext, salt, iv } = payload

  try {
    const key = await deriveAesKey(password.trim(), salt)
    const ivCopy = new Uint8Array(iv)
    const ciphertextView = new Uint8Array(ciphertext)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy }, key, ciphertextView)
    return new Uint8Array(decrypted)
  } catch {
    throw new EncryptedBackupDecryptError()
  }
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBytes = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits', 'deriveKey'])

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['decrypt', 'encrypt']
  )
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer as ArrayBuffer
  }

  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    throw new Error('invalid_base64')
  }
}
