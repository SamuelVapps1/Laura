import { useEffect, useState, type FormEvent } from 'react'

import { DisclosureSection } from '@/components/DisclosureSection'
import { AppointmentPhotoSection } from '@/components/photos/AppointmentPhotoSection'
import { Button } from '@/components/ui/button'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Appointment } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { updateAppointment } from '@/db/repositories/appointments'
import { t } from '@/i18n/sk'

type AppointmentCompletionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  defaultMode?: 'finish' | 'cancel'
  includePhotos?: boolean
}

export function AppointmentCompletionDialog({
  open,
  onOpenChange,
  appointment,
  defaultMode = 'finish',
  includePhotos = false,
}: AppointmentCompletionDialogProps) {
  const [status, setStatus] = useState<Appointment['status']>('done')
  const [paid, setPaid] = useState(false)
  const [cameDirty, setCameDirty] = useState(false)
  const [notes, setNotes] = useState('')
  const [customerGaveTip, setCustomerGaveTip] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !appointment) return

    const initialStatus =
      defaultMode === 'cancel'
        ? 'cancelled'
        : appointment.status === 'scheduled'
          ? 'done'
          : appointment.status

    setStatus(initialStatus)
    setPaid(appointment.paid)
    setCameDirty(appointment.cameDirty)
    setNotes(appointment.notes ?? '')

    const hasTip = (appointment.tipAmount ?? 0) > 0
    setCustomerGaveTip(hasTip)
    setTipAmount(hasTip ? String(appointment.tipAmount ?? '') : '')
    setErrorMessage(null)
  }, [appointment, defaultMode, open])

  if (!appointment) return null
  const currentAppointment = appointment

  const isCancelMode = defaultMode === 'cancel'
  const title = isCancelMode ? t('cancelAppointmentTitle') : t('finishAppointmentTitle')
  const description = isCancelMode ? t('cancelAppointmentDescription') : t('finishAppointmentDescription')

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setSubmitting(true)

    try {
      let parsedTipAmount: number | null = null

      if (customerGaveTip) {
        const trimmed = tipAmount.trim()
        const value = Number(trimmed)
        if (!trimmed || !Number.isFinite(value) || value < 0) {
          setErrorMessage(t('errorInvalidTip'))
          return
        }
        parsedTipAmount = value
      }

      await updateAppointment(currentAppointment.id, {
        status: isCancelMode ? 'cancelled' : status,
        paid,
        cameDirty,
        notes: notes.trim() || null,
        tipAmount: parsedTipAmount,
      })

      onOpenChange(false)
    } catch (error) {
      setErrorMessage(mapCompletionError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <span className="block pt-1">{t('appointmentSavedToDogHistory')}</span>
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {!isCancelMode && (
            <div className="grid gap-2">
              <Label htmlFor="completion-status">{t('labelStatus')}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as Appointment['status'])}
                disabled={submitting}
              >
                <SelectTrigger id="completion-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">{t('statusDone')}</SelectItem>
                  <SelectItem value="cancelled">{t('statusCancelled')}</SelectItem>
                  <SelectItem value="no_show">{t('statusNoShow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={paid}
              disabled={submitting}
              onChange={(event) => setPaid(event.target.checked)}
            />
            {t('labelPaid')}
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={cameDirty}
              disabled={submitting}
              onChange={(event) => setCameDirty(event.target.checked)}
            />
            {t('labelCameDirty')}
          </label>

          <div className="grid gap-2">
            <Label htmlFor="completion-notes">{t('completionNote')}</Label>
            <Textarea
              id="completion-notes"
              value={notes}
              disabled={submitting}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={customerGaveTip}
              disabled={submitting}
              onChange={(event) => {
                setCustomerGaveTip(event.target.checked)
                if (!event.target.checked) {
                  setTipAmount('')
                }
              }}
            />
            {t('customerGaveTip')}
          </label>

          {customerGaveTip && (
            <div className="grid gap-2">
              <Label htmlFor="completion-tip-amount">{t('labelTipAmount')}</Label>
              <Input
                id="completion-tip-amount"
                type="number"
                min="0"
                step="0.01"
                value={tipAmount}
                disabled={submitting}
                onChange={(event) => setTipAmount(event.target.value)}
              />
            </div>
          )}

          {includePhotos && (
            <DisclosureSection title={t('appointmentPhotos')} openLabel={t('openPhotos')}>
              <AppointmentPhotoSection
                appointmentId={currentAppointment.id}
                dogId={currentAppointment.dogId}
              />
            </DisclosureSection>
          )}

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              {t('buttonCancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('saveAppointmentCompletion')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function mapCompletionError(error: unknown): string {
  if (!(error instanceof Error)) return t('validationError')

  switch (error.message) {
    case DB_ERROR.APPOINTMENT_NOT_FOUND:
      return t('errorAppointmentNotFound')
    case DB_ERROR.DOG_NOT_FOUND:
      return t('errorDogNotFound')
    case DB_ERROR.OWNER_NOT_FOUND:
      return t('errorOwnerNotFound')
    case DB_ERROR.INVALID_APPOINTMENT_STATUS:
      return t('validationError')
    case DB_ERROR.INVALID_APPOINTMENT_TIP:
      return t('errorInvalidTip')
    default:
      return t('validationError')
  }
}
