import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { PASSWORD_ERROR } from '@/db/errors'
import { getPasswordRecord } from '@/db/repositories/password'
import { verifyPassword, type PasswordVerifierRecord } from '@/lib/password'

type AuthState = {
  loading: boolean
  passwordEnabled: boolean
  unlocked: boolean
  unlock: (password: string) => Promise<void>
  lock: () => void
  refreshPasswordState: () => Promise<void>
  markCurrentSessionUnlocked: () => void
}

const AuthContext = createContext<AuthState | null>(null)

// Lock-only mode. Unlock state is in-memory only so a browser reload always
// re-prompts when a password is set. Do not persist it to localStorage or
// sessionStorage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const recordRef = useRef<PasswordVerifierRecord | null>(null)

  const applyRecord = useCallback((record: PasswordVerifierRecord | null) => {
    recordRef.current = record
    setPasswordEnabled(record !== null)
    if (record === null) {
      setUnlocked(true)
    }
  }, [])

  const loadRecord = useCallback(async (): Promise<PasswordVerifierRecord | null> => {
    try {
      const record = await getPasswordRecord()
      return record
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === PASSWORD_ERROR.PASSWORD_CONFIG_INVALID) {
        // Treat partial/corrupt config as "password enabled but unusable" so the
        // gate stays up. UI can surface a recovery message via Settings.
        return {
          salt: '',
          verifier: '',
          iterations: 0,
          mode: 'lock_only',
        }
      }
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const record = await loadRecord()
      if (cancelled) return
      applyRecord(record)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [applyRecord, loadRecord])

  const unlock = useCallback(async (password: string) => {
    const record = recordRef.current
    if (!record || record.verifier === '' || record.salt === '') {
      throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
    }

    const matches = await verifyPassword(password, record)
    if (!matches) {
      throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
    }

    setUnlocked(true)
  }, [])

  const lock = useCallback(() => {
    if (recordRef.current) {
      setUnlocked(false)
    }
  }, [])

  const refreshPasswordState = useCallback(async () => {
    const record = await loadRecord()
    applyRecord(record)
  }, [applyRecord, loadRecord])

  const markCurrentSessionUnlocked = useCallback(() => {
    if (recordRef.current) {
      setUnlocked(true)
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      passwordEnabled,
      unlocked,
      unlock,
      lock,
      refreshPasswordState,
      markCurrentSessionUnlocked,
    }),
    [
      loading,
      passwordEnabled,
      unlocked,
      unlock,
      lock,
      refreshPasswordState,
      markCurrentSessionUnlocked,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
