import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { DogSearchSelect } from '@/components/appointments/DogSearchSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Appointment } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import {
  createAppointment,
  updateAppointment,
  type NewAppointmentInput,
} from '@/db/repositories/appointments'
import { t } from '@/i18n/sk'
import {
  appointmentStatusOptions,
  getAppointmentDurationMinutes,
  getAppointmentStatusLabel,
  toDateInputValue,
  toTimeInputValue,
} from '@/lib/appointments'

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  appointment?: Appointment
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  selectedDate,
  appointment,
}: AppointmentFormDialogProps) {
  const dogs = useLiveQuery(() => db.dogs.toArray(), [], [])
  const owners = useLiveQuery(() => db.owners.toArray(), [], [])

  const [dogId, setDogId] = useState('')
  const [date, setDate] = useState(toDateInputValue(selectedDate))
  const [time, setTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [serviceName, setServiceName] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<Appointment['status']>('scheduled')
  const [notes, setNotes] = useState('')
  const [paid, setPaid] = useState(false)
  const [cameDirty, setCameDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    if (appointment) {
      const startsAt = new Date(appointment.startsAt)
      setDogId(appointment.dogId)
      setDate(toDateInputValue(startsAt))
      setTime(toTimeInputValue(startsAt))
      setDurationMinutes(String(getAppointmentDurationMinutes(appointment)))
      setServiceName(appointment.serviceName ?? '')
      setPrice(appointment.price?.toString() ?? '')
      setStatus(appointment.status)
      setNotes(appointment.notes ?? '')
      setPaid(appointment.paid)
      setCameDirty(appointment.cameDirty)
    } else {
      setDogId('')
      setDate(toDateInputValue(selectedDate))
      setTime('09:00')
      setDurationMinutes('60')
      setServiceName('')
      setPrice('')
      setStatus('scheduled')
      setNotes('')
      setPaid(false)
      setCameDirty(false)
    }

    setError(null)
  }, [open, appointment, selectedDate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!dogId) {
      setError(t('errorDogRequired'))
      return
    }

    const selectedDog = dogs.find((dog) => dog.id === dogId)
    if (!selectedDog) {
      setError(t('errorDogNotFound'))
      return
    }

    const selectedOwner = owners.find((owner) => owner.id === selectedDog.ownerId)
    if (!selectedOwner) {
      setError(t('errorOwnerNotFound'))
      return
    }

    if (!date) {
      setError(t('errorDateRequired'))
      return
    }

    if (!time) {
      setError(t('errorTimeRequired'))
      return
    }

    const parsedDuration = Number(durationMinutes)
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setError(t('errorInvalidDuration'))
      return
    }

    const parsedPrice = price.trim() ? Number(price) : null
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError(t('errorInvalidPrice'))
      return
    }

    setIsSaving(true)
    try {
      const input: NewAppointmentInput = {
        dogId,
        date,
        time,
        durationMinutes: parsedDuration,
        serviceName: serviceName.trim() || null,
        price: parsedPrice,
        status,
        notes: notes.trim() || null,
        paid,
        cameDirty,
      }

      if (appointment) {
        await updateAppointment(appointment.id, input)
      } else {
        await createAppointment(input)
      }

      onOpenChange(false)
    } catch (err) {
      setError(getAppointmentFormError(err))
    } finally {
      setIsSaving(false)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{appointment ? t('dialogEditAppointment') : t('dialogAddAppointment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <DogSearchSelect
              dogs={dogs}
              owners={owners}
              value={dogId}
              onChange={setDogId}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="appointment-date">{t('labelDate')} *</Label>
                <Input
                  id="appointment-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointment-time">{t('labelTime')} *</Label>
                <Input
                  id="appointment-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointment-duration">{t('labelDurationMinutes')} *</Label>
                <Input
                  id="appointment-duration"
                  type="number"
                  min="1"
                  step="1"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="appointment-service">{t('labelService')}</Label>
                <Input
                  id="appointment-service"
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  placeholder={t('labelService')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appointment-price">{t('labelPrice')}</Label>
                <Input
                  id="appointment-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder={t('labelPrice')}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appointment-status">{t('labelStatus')} *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as Appointment['status'])}>
                <SelectTrigger id="appointment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getAppointmentStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appointment-notes">{t('labelNotes')}</Label>
              <Input
                id="appointment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('labelNotes')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={paid}
                  onChange={(event) => setPaid(event.target.checked)}
                />
                {t('labelPaid')}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={cameDirty}
                  onChange={(event) => setCameDirty(event.target.checked)}
                />
                {t('labelCameDirty')}
              </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
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

function getAppointmentFormError(error: unknown): string {
  if (!(error instanceof Error)) return t('validationError')

  switch (error.message) {
    case DB_ERROR.DOG_NOT_FOUND:
      return t('errorDogNotFound')
    case DB_ERROR.OWNER_NOT_FOUND:
      return t('errorOwnerNotFound')
    case DB_ERROR.APPOINTMENT_NOT_FOUND:
      return t('errorAppointmentNotFound')
    case DB_ERROR.INVALID_APPOINTMENT_DURATION:
      return t('errorInvalidDuration')
    case DB_ERROR.INVALID_APPOINTMENT_PRICE:
      return t('errorInvalidPrice')
    case DB_ERROR.INVALID_APPOINTMENT_DATE_TIME:
      return t('validationError')
    default:
      return t('validationError')
  }
}
