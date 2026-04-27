import { useState } from 'react'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Owner } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { deleteOwner } from '@/db/repositories/owners'

interface DeleteOwnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner: Owner
  onSuccess: () => void
}

export function DeleteOwnerDialog({ open, onOpenChange, owner, onSuccess }: DeleteOwnerDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      await deleteOwner(owner.id)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const message = (err as Error).message
      setError(message === DB_ERROR.OWNER_HAS_DOGS ? t('errorCannotDeleteOwnerWithDogs') : t('validationError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('dialogDeleteOwner')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            {t('confirmDeleteOwner')}
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
