import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_ERROR } from '@/db/errors'
import { clearPasswordSettingsWithoutVerification } from '@/db/repositories/password'
import { t, type TranslationKey } from '@/i18n/sk'

const DEFAULT_TARGET = '/calendar'

type LocationState = { from?: string } | null

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  const target = resolveTarget((location.state as LocationState) ?? null)

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (!auth.passwordEnabled || auth.unlocked) {
    return <Navigate to={target} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setErrorKey(null)

    if (!password) {
      setErrorKey('errorPasswordRequired')
      return
    }

    setIsSubmitting(true)
    try {
      await auth.unlock(password)
      setPassword('')
      navigate(target, { replace: true })
    } catch (error) {
      setErrorKey(mapUnlockError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmRecovery = async () => {
    if (isRecovering) return
    setIsRecovering(true)
    try {
      await clearPasswordSettingsWithoutVerification()
      await auth.refreshPasswordState()
      setRecoveryOpen(false)
      setPassword('')
      setErrorKey(null)
      navigate('/calendar', { replace: true })
    } finally {
      setIsRecovering(false)
    }
  }

  const configInvalid = auth.passwordConfigInvalid

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="text-3xl">🔒</div>
          <CardTitle>{t('loginTitle')}</CardTitle>
          <CardDescription>{t('loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {configInvalid ? (
            <div className="space-y-4">
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {t('errorPasswordConfigInvalid')}
              </p>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setRecoveryOpen(true)}
                disabled={isRecovering}
              >
                {t('buttonRemoveBrokenPasswordLock')}
              </Button>
              <p className="text-center text-xs text-gray-500">{t('appLockedInfo')}</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t('labelPassword')}</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {errorKey && (
                <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-900">
                  {t(errorKey)}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {t('buttonUnlock')}
              </Button>

              <p className="text-center text-xs text-gray-500">{t('appLockedInfo')}</p>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={recoveryOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isRecovering) setRecoveryOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmRemoveBrokenPasswordLockTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmRemoveBrokenPasswordLockDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecoveryOpen(false)}
              disabled={isRecovering}
            >
              {t('buttonCancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRecovery}
              disabled={isRecovering}
            >
              {t('buttonRemoveBrokenPasswordLock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function resolveTarget(state: LocationState): string {
  const candidate = state?.from
  if (typeof candidate !== 'string') return DEFAULT_TARGET
  if (!candidate.startsWith('/')) return DEFAULT_TARGET
  if (candidate.startsWith('/login')) return DEFAULT_TARGET
  return candidate
}

function mapUnlockError(error: unknown): TranslationKey {
  const code = error instanceof Error ? error.message : ''
  if (code === PASSWORD_ERROR.PASSWORD_INVALID) {
    return 'errorPasswordInvalid'
  }
  if (code === PASSWORD_ERROR.PASSWORD_CONFIG_INVALID) {
    return 'errorPasswordConfigInvalid'
  }
  return 'errorPasswordInvalid'
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-slate-900"
        aria-label="loading"
      />
    </div>
  )
}
