import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          {icon ?? <span className="text-xl">•</span>}
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && onAction && (
          <Button type="button" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
