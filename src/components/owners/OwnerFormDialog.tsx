import { useEffect, useState } from 'react'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Owner, NewOwnerInput } from '@/db/db'
import { createOwner, updateOwner } from '@/db/repositories/owners'

interface OwnerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner?: Owner
  onSuccess: () => void
}

export function OwnerFormDialog({ open, onOpenChange, owner, onSuccess }: OwnerFormDialogProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setFullName(owner?.fullName ?? '')
    setPhone(owner?.phone ?? '')
    setEmail(owner?.email ?? '')
    setNotes(owner?.notes ?? '')
    setError(null)
  }, [open, owner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError(t('errorFullNameRequired'))
      return
    }

    setIsSaving(true)
    try {
      const input: NewOwnerInput = {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null
      }

      if (owner) {
        await updateOwner(owner.id, input)
      } else {
        await createOwner(input)
      }

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (err) {
      setError(t('validationError'))
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFullName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{owner ? t('dialogEditOwner') : t('dialogAddOwner')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">{t('labelFullName')} *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('labelFullName')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('labelPhone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('labelPhone')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('labelEmail')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('labelEmail')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t('labelNotes')}</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('labelNotes')}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('buttonCancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('buttonSaving') : t('buttonSave')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
