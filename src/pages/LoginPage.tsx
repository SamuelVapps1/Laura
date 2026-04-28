import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_ERROR } from '@/db/errors'
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="text-3xl">🔒</div>
          <CardTitle>{t('loginTitle')}</CardTitle>
          <CardDescription>{t('loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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
