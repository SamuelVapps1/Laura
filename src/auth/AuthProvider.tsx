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
  passwordConfigInvalid: boolean
  unlocked: boolean
  unlock: (password: string) => Promise<void>
  lock: () => void
  refreshPasswordState: () => Promise<void>
  markCurrentSessionUnlocked: () => void
}

type LoadedPasswordState =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'valid'; record: PasswordVerifierRecord }

const AuthContext = createContext<AuthState | null>(null)

// Lock-only mode. Unlock state is in-memory only so a browser reload always
// re-prompts when a password is set. Do not persist it to localStorage or
// sessionStorage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [passwordConfigInvalid, setPasswordConfigInvalid] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const recordRef = useRef<PasswordVerifierRecord | null>(null)
  const configInvalidRef = useRef(false)

  const applyState = useCallback((state: LoadedPasswordState) => {
    if (state.kind === 'valid') {
      recordRef.current = state.record
      configInvalidRef.current = false
      setPasswordEnabled(true)
      setPasswordConfigInvalid(false)
      // Do not change `unlocked` here: keep current session as-is when a
      // valid record is (re)loaded. Initial mount defaults `unlocked` to
      // false so a fresh reload re-prompts.
      return
    }

    if (state.kind === 'invalid') {
      // Corrupt/partial password config. Keep the gate up so private
      // content cannot render, but never pretend this is a normal
      // verifier. LoginPage surfaces a recovery action.
      recordRef.current = null
      configInvalidRef.current = true
      setPasswordEnabled(true)
      setPasswordConfigInvalid(true)
      setUnlocked(false)
      return
    }

    recordRef.current = null
    configInvalidRef.current = false
    setPasswordEnabled(false)
    setPasswordConfigInvalid(false)
    setUnlocked(true)
  }, [])

  const loadRecord = useCallback(async (): Promise<LoadedPasswordState> => {
    try {
      const record = await getPasswordRecord()
      return record === null ? { kind: 'none' } : { kind: 'valid', record }
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === PASSWORD_ERROR.PASSWORD_CONFIG_INVALID) {
        return { kind: 'invalid' }
      }
      return { kind: 'none' }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const state = await loadRecord()
      if (cancelled) return
      applyState(state)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [applyState, loadRecord])

  const unlock = useCallback(async (password: string) => {
    if (configInvalidRef.current) {
      throw new Error(PASSWORD_ERROR.PASSWORD_CONFIG_INVALID)
    }

    const record = recordRef.current
    if (!record) {
      throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
    }

    const matches = await verifyPassword(password, record)
    if (!matches) {
      throw new Error(PASSWORD_ERROR.PASSWORD_INVALID)
    }

    setUnlocked(true)
  }, [])

  const lock = useCallback(() => {
    if (recordRef.current || configInvalidRef.current) {
      setUnlocked(false)
    }
  }, [])

  const refreshPasswordState = useCallback(async () => {
    const state = await loadRecord()
    applyState(state)
  }, [applyState, loadRecord])

  const markCurrentSessionUnlocked = useCallback(() => {
    if (recordRef.current && !configInvalidRef.current) {
      setUnlocked(true)
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      passwordEnabled,
      passwordConfigInvalid,
      unlocked,
      unlock,
      lock,
      refreshPasswordState,
      markCurrentSessionUnlocked,
    }),
    [
      loading,
      passwordEnabled,
      passwordConfigInvalid,
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
