import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Appointment } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { deleteAppointment } from '@/db/repositories/appointments'
import { t } from '@/i18n/sk'

interface DeleteAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment
  onDeleted: () => void
}

export function DeleteAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onDeleted,
}: DeleteAppointmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteAppointment(appointment.id)
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      setError(getDeleteError(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('dialogDeleteAppointment')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-700">{t('confirmDeleteAppointment')}</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            {t('buttonCancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t('buttonDeleting') : t('buttonConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getDeleteError(error: unknown): string {
  if (error instanceof Error && error.message === DB_ERROR.APPOINTMENT_NOT_FOUND) {
    return t('errorAppointmentNotFound')
  }

  return t('validationError')
}
