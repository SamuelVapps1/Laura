import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/i18n/sk'

interface DisclosureSectionProps {
  title: string
  openLabel: string
  defaultOpen?: boolean
  children: ReactNode
}

export function DisclosureSection({
  title,
  openLabel,
  defaultOpen = false,
  children,
}: DisclosureSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        aria-expanded={false}
        aria-controls={contentId}
        onClick={() => setOpen(true)}
      >
        {openLabel}
      </Button>
    )
  }

  return (
    <Card id={contentId}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={true}
          aria-controls={contentId}
          onClick={() => setOpen(false)}
        >
          {t('buttonClose')}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
