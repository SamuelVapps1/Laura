import { useEffect, useState } from 'react'
import { CalendarClock, Pencil, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { DisclosureSection } from '@/components/DisclosureSection'
import { NotesEditor } from '@/components/NotesEditor'
import { TagPicker } from '@/components/TagPicker'
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog'
import { DeleteAppointmentDialog } from '@/components/appointments/DeleteAppointmentDialog'
import { DogHistoryPreview } from '@/components/dogs/DogHistoryPreview'
import { AppointmentPhotoSection } from '@/components/photos/AppointmentPhotoSection'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { Appointment, Dog, Owner } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import { updateAppointment } from '@/db/repositories/appointments'
import { t } from '@/i18n/sk'
import {
  formatAppointmentDateTime,
  formatAppointmentPrice,
  getAppointmentStatusLabel,
} from '@/lib/appointments'

interface AppointmentDetailPanelProps {
  appointmentId?: string
  onClose: (options?: { preserveParams?: boolean }) => void
}

type AppointmentDetail = {
  loaded: boolean
  appointment: Appointment | null
  dog: Dog | null
  owner: Owner | null
}

export function AppointmentDetailPanel({ appointmentId, onClose }: AppointmentDetailPanelProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [finishStatus, setFinishStatus] = useState<Appointment['status']>('done')
  const [finishPaid, setFinishPaid] = useState(false)
  const [finishCameDirty, setFinishCameDirty] = useState(false)
  const [finishNotes, setFinishNotes] = useState('')
  const [finishHasTip, setFinishHasTip] = useState(false)
  const [finishTipAmount, setFinishTipAmount] = useState('')
  const [finishError, setFinishError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const detail = useLiveQuery(
    async (): Promise<AppointmentDetail> => {
      if (!appointmentId) {
        return { loaded: true, appointment: null, dog: null, owner: null }
      }

      const appointment = await db.appointments.get(appointmentId)
      if (!appointment) {
        return { loaded: true, appointment: null, dog: null, owner: null }
      }

      const [dog, owner] = await Promise.all([
        db.dogs.get(appointment.dogId),
        db.owners.get(appointment.ownerId),
      ])

      return {
        loaded: true,
        appointment,
        dog: dog ?? null,
        owner: owner ?? null,
      }
    },
    [appointmentId],
    { loaded: false, appointment: null, dog: null, owner: null }
  )

  const appointment = detail.appointment
  const selectedDate = appointment ? new Date(appointment.startsAt) : new Date()

  useEffect(() => {
    if (!isFinishOpen || !appointment) return
    setFinishStatus(appointment.status === 'scheduled' ? 'done' : appointment.status)
    setFinishPaid(appointment.paid)
    setFinishCameDirty(appointment.cameDirty)
    setFinishNotes(appointment.notes ?? '')
    const hasTip = (appointment.tipAmount ?? 0) > 0
    setFinishHasTip(hasTip)
    setFinishTipAmount(hasTip ? String(appointment.tipAmount ?? '') : '')
    setFinishError(null)
  }, [isFinishOpen, appointment])

  return (
    <Sheet
      open={!!appointmentId}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose({ preserveParams: !detail.loaded || !!appointment })
        }
      }}
    >
      <SheetContent>
        {!detail.loaded && (
          <SheetHeader>
            <SheetTitle>{t('appointmentDetail')}</SheetTitle>
          </SheetHeader>
        )}

        {detail.loaded && !appointment && (
          <div className="flex min-h-full flex-col">
            <SheetHeader>
              <SheetTitle>{t('appointmentNotFound')}</SheetTitle>
              <SheetDescription>{t('errorAppointmentNotFound')}</SheetDescription>
            </SheetHeader>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onClose({ preserveParams: false })}>
                <X className="h-4 w-4" />
                {t('buttonClose')}
              </Button>
            </SheetFooter>
          </div>
        )}

        {detail.loaded && appointment && (
          <div className="flex min-h-full flex-col gap-6">
            <SheetHeader>
              <div className="flex items-start gap-3 pr-8">
                <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">
                    {detail.dog?.name ?? t('appointmentUnknownDog')}
                  </SheetTitle>
                  <SheetDescription>
                    {detail.owner?.fullName ?? t('appointmentUnknownOwner')}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
              <DetailRow label={t('labelDate')} value={formatAppointmentDateTime(appointment)} />
              <DetailRow label={t('labelService')} value={appointment.serviceName ?? t('appointmentNoService')} />
              {appointment.price !== null && (
                <DetailRow label={t('labelPrice')} value={formatAppointmentPrice(appointment.price)} />
              )}
              {appointment.tipAmount !== null && appointment.tipAmount > 0 && (
                <DetailRow label={t('labelTip')} value={formatAppointmentPrice(appointment.tipAmount)} />
              )}
              <DetailRow label={t('labelStatus')} value={getAppointmentStatusLabel(appointment.status)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setIsFinishOpen(true)}>
                {appointment.status === 'done' ? t('editAppointmentCompletion') : t('finishAppointment')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                {t('buttonEdit')}
              </Button>
              <Button type="button" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                {t('buttonDelete')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onClose()}>
                <X className="h-4 w-4" />
                {t('buttonClose')}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DisclosureSection title={t('appointmentNotes')} openLabel={t('openNotes')}>
                <NotesEditor scope="appointment" entityId={appointment.id} />
              </DisclosureSection>

              <DisclosureSection title={t('appointmentTags')} openLabel={t('openTags')}>
                <TagPicker entityType="appointment" entityId={appointment.id} />
              </DisclosureSection>

              <DisclosureSection title={t('appointmentPhotos')} openLabel={t('openPhotos')}>
                <AppointmentPhotoSection appointmentId={appointment.id} dogId={appointment.dogId} />
              </DisclosureSection>

              <DisclosureSection title={t('appointmentDogHistory')} openLabel={t('openDogHistory')}>
                <DogHistoryPreview dogId={appointment.dogId} currentAppointmentId={appointment.id} />
              </DisclosureSection>
            </div>

            <AppointmentFormDialog
              open={isEditOpen}
              onOpenChange={setIsEditOpen}
              selectedDate={selectedDate}
              appointment={appointment}
            />

            <DeleteAppointmentDialog
              open={isDeleteOpen}
              onOpenChange={setIsDeleteOpen}
              appointment={appointment}
              onDeleted={onClose}
            />

            <Dialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('finishAppointmentTitle')}</DialogTitle>
                  <DialogDescription>{t('finishAppointmentDescription')}</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!appointment) return
                    void handleFinishAppointment({
                      appointment,
                      finishStatus,
                      finishPaid,
                      finishCameDirty,
                      finishNotes,
                      finishHasTip,
                      finishTipAmount,
                      setFinishError,
                      setIsFinishing,
                      onSuccess: () => setIsFinishOpen(false),
                    })
                  }}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="finish-status">{t('labelStatus')}</Label>
                    <Select
                      value={finishStatus}
                      onValueChange={(value) => setFinishStatus(value as Appointment['status'])}
                      disabled={isFinishing}
                    >
                      <SelectTrigger id="finish-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="done">{t('statusDone')}</SelectItem>
                        <SelectItem value="cancelled">{t('statusCancelled')}</SelectItem>
                        <SelectItem value="no_show">{t('statusNoShow')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={finishPaid}
                      disabled={isFinishing}
                      onChange={(event) => setFinishPaid(event.target.checked)}
                    />
                    {t('labelPaid')}
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={finishCameDirty}
                      disabled={isFinishing}
                      onChange={(event) => setFinishCameDirty(event.target.checked)}
                    />
                    {t('labelCameDirty')}
                  </label>

                  <div className="grid gap-2">
                    <Label htmlFor="finish-notes">{t('completionNote')}</Label>
                    <Textarea
                      id="finish-notes"
                      value={finishNotes}
                      disabled={isFinishing}
                      onChange={(event) => setFinishNotes(event.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={finishHasTip}
                      disabled={isFinishing}
                      onChange={(event) => {
                        setFinishHasTip(event.target.checked)
                        if (!event.target.checked) {
                          setFinishTipAmount('')
                        }
                      }}
                    />
                    {t('customerGaveTip')}
                  </label>

                  {finishHasTip && (
                    <div className="grid gap-2">
                      <Label htmlFor="finish-tip">{t('labelTipAmount')}</Label>
                      <Input
                        id="finish-tip"
                        type="number"
                        min="0"
                        step="0.01"
                        value={finishTipAmount}
                        disabled={isFinishing}
                        onChange={(event) => setFinishTipAmount(event.target.value)}
                      />
                    </div>
                  )}

                  {finishError && <p className="text-sm text-red-500">{finishError}</p>}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isFinishing}
                      onClick={() => setIsFinishOpen(false)}
                    >
                      {t('buttonCancel')}
                    </Button>
                    <Button type="submit" disabled={isFinishing}>
                      {t('saveAppointmentCompletion')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

async function handleFinishAppointment({
  appointment,
  finishStatus,
  finishPaid,
  finishCameDirty,
  finishNotes,
  finishHasTip,
  finishTipAmount,
  setFinishError,
  setIsFinishing,
  onSuccess,
}: {
  appointment: Appointment
  finishStatus: Appointment['status']
  finishPaid: boolean
  finishCameDirty: boolean
  finishNotes: string
  finishHasTip: boolean
  finishTipAmount: string
  setFinishError: (value: string | null) => void
  setIsFinishing: (value: boolean) => void
  onSuccess: () => void
}): Promise<void> {
  setFinishError(null)
  setIsFinishing(true)
  try {
    let parsedTipAmount: number | null = null
    if (finishHasTip) {
      const trimmed = finishTipAmount.trim()
      if (!trimmed) {
        setFinishError(t('errorInvalidTip'))
        return
      }
      const value = Number(trimmed)
      if (!Number.isFinite(value) || value < 0) {
        setFinishError(t('errorInvalidTip'))
        return
      }
      parsedTipAmount = value
    }

    await updateAppointment(appointment.id, {
      status: finishStatus,
      paid: finishPaid,
      cameDirty: finishCameDirty,
      notes: finishNotes.trim() || null,
      tipAmount: parsedTipAmount,
    })
    onSuccess()
  } catch (error) {
    setFinishError(mapFinishError(error))
  } finally {
    setIsFinishing(false)
  }
}

function mapFinishError(error: unknown): string {
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
