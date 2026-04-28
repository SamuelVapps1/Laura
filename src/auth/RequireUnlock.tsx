import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './AuthProvider'

export function RequireUnlock({ children }: { children: ReactNode }) {
  const { loading, passwordEnabled, unlocked } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!passwordEnabled) {
    return <>{children}</>
  }

  if (unlocked) {
    return <>{children}</>
  }

  const fromPath = `${location.pathname}${location.search}${location.hash}` || '/calendar'

  return <Navigate to="/login" replace state={{ from: fromPath }} />
}

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-slate-900"
        aria-label="loading"
      />
    </div>
  )
}
