import { useState } from 'react'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Dog } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { deleteDog } from '@/db/repositories/dogs'

interface DeleteDogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dog: Dog
  onSuccess?: () => void
}

export function DeleteDogDialog({ open, onOpenChange, dog, onSuccess }: DeleteDogDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      await deleteDog(dog.id)
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const message = (err as Error).message
      if (message === DB_ERROR.DOG_NOT_FOUND) {
        setError(t('errorDogNotFound'))
      } else if (message === DB_ERROR.DOG_HAS_APPOINTMENTS) {
        setError(t('errorCannotDeleteDogWithAppointments'))
      } else {
        setError(t('validationError'))
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('dialogDeleteDog')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            {t('confirmDeleteDog')}
          </p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
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
