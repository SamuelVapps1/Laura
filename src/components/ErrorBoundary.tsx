import { Component, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n/sk'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  errorMessage: string | null
  errorStack: string | null
}

const isDevelopment = import.meta.env.DEV

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    errorStack: null,
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : null,
      errorStack: error instanceof Error ? error.stack ?? null : null,
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{t('appCrashedTitle')}</h1>
          <p className="mt-2 text-sm text-slate-700">{t('appCrashedDescription')}</p>
          <div className="mt-4">
            <Button type="button" onClick={this.handleReload}>
              {t('restartApplication')}
            </Button>
          </div>

          {isDevelopment && this.state.errorMessage && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="break-words">{this.state.errorMessage}</p>
              {this.state.errorStack && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
                  {this.state.errorStack}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
}
