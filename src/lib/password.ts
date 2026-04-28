// Password verifier helpers for the lock-only mode of Patch 9.
//
// IMPORTANT: This is NOT at-rest encryption. The Dexie/IndexedDB data is
// stored unencrypted on the device. The verifier below only proves that
// the user knows the password so the UI can refuse to render private
// content until they unlock the app. Real protection of the local data
// still depends on the device account / OS-level protection.
//
// TODO: encryption mode in a future patch if real at-rest encryption is
// implemented end-to-end.

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_PBKDF2_ITERATIONS = 250_000
export const PASSWORD_SALT_BYTES = 16
export const PASSWORD_VERIFIER_BYTES = 32
export const PASSWORD_MODE_LOCK_ONLY = 'lock_only' as const

export type PasswordMode = typeof PASSWORD_MODE_LOCK_ONLY

export type PasswordVerifierRecord = {
  salt: string
  verifier: string
  iterations: number
  mode: PasswordMode
}

export type PasswordValidationCode =
  | 'PASSWORD_REQUIRED'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_CONFIRM_MISMATCH'

export function isPasswordStrongEnough(password: string): boolean {
  return typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH
}

export function validatePasswordInput(
  password: string,
  confirmPassword?: string,
): PasswordValidationCode | null {
  if (!password) {
    return 'PASSWORD_REQUIRED'
  }

  if (!isPasswordStrongEnough(password)) {
    return 'PASSWORD_TOO_SHORT'
  }

  if (typeof confirmPassword === 'string' && confirmPassword !== password) {
    return 'PASSWORD_CONFIRM_MISMATCH'
  }

  return null
}

export async function createPasswordVerifier(
  password: string,
): Promise<PasswordVerifierRecord> {
  if (!isPasswordStrongEnough(password)) {
    throw new Error('PASSWORD_TOO_SHORT')
  }

  const subtle = requireSubtleCrypto()
  const saltBytes = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES))
  const verifierBytes = await deriveVerifierBytes(
    subtle,
    password,
    saltBytes,
    PASSWORD_PBKDF2_ITERATIONS,
  )

  return {
    salt: bytesToBase64(saltBytes),
    verifier: bytesToBase64(verifierBytes),
    iterations: PASSWORD_PBKDF2_ITERATIONS,
    mode: PASSWORD_MODE_LOCK_ONLY,
  }
}

export async function verifyPassword(
  password: string,
  record: PasswordVerifierRecord,
): Promise<boolean> {
  if (!password || !record || record.mode !== PASSWORD_MODE_LOCK_ONLY) {
    return false
  }

  if (
    typeof record.salt !== 'string' ||
    typeof record.verifier !== 'string' ||
    typeof record.iterations !== 'number' ||
    record.iterations <= 0
  ) {
    return false
  }

  let saltBytes: Uint8Array
  let expectedBytes: Uint8Array

  try {
    saltBytes = base64ToBytes(record.salt)
    expectedBytes = base64ToBytes(record.verifier)
  } catch {
    return false
  }

  if (saltBytes.length === 0 || expectedBytes.length === 0) {
    return false
  }

  let candidateBytes: Uint8Array
  try {
    const subtle = requireSubtleCrypto()
    candidateBytes = await deriveVerifierBytes(
      subtle,
      password,
      saltBytes,
      record.iterations,
    )
  } catch {
    return false
  }

  return constantTimeEqual(candidateBytes, expectedBytes)
}

async function deriveVerifierBytes(
  subtle: SubtleCrypto,
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const passwordBuffer = toArrayBuffer(encoder.encode(password))
  const saltBuffer = toArrayBuffer(saltBytes)

  const baseKey = await subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derived = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    baseKey,
    PASSWORD_VERIFIER_BYTES * 8,
  )

  return new Uint8Array(derived)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length)
  let result = a.length ^ b.length
  for (let index = 0; index < length; index += 1) {
    const av = index < a.length ? a[index] : 0
    const bv = index < b.length ? b[index] : 0
    result |= av ^ bv
  }
  return result === 0
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function requireSubtleCrypto(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('PASSWORD_CRYPTO_UNAVAILABLE')
  }
  return crypto.subtle
}
