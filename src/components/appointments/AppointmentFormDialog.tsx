import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { DogFormDialog } from '@/components/dogs/DogFormDialog'
import { OwnerDogSelect } from '@/components/dogs/OwnerDogSelect'
import { OwnerSearchSelect } from '@/components/dogs/OwnerSearchSelect'
import { EntityTagChips } from '@/components/tags/EntityTagChips'
import { ScopedTagSelector } from '@/components/tags/ScopedTagSelector'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Appointment, Dog } from '@/db/db'
import { db } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import {
  createAppointment,
  updateAppointment,
  type NewAppointmentInput,
} from '@/db/repositories/appointments'
import { getTagApplicationsForEntity, setTagApplicationsForEntity } from '@/db/repositories/tags'
import { t } from '@/i18n/sk'
import {
  appointmentStatusOptions,
  getAppointmentDurationMinutes,
  getAppointmentStatusLabel,
  toDateInputValue,
  toTimeInputValue,
} from '@/lib/appointments'
import {
  CUSTOM_SERVICE_PRESET_ID,
  SERVICE_PRESETS,
  findServicePresetIdForStoredName,
  getServicePresetById,
} from '@/lib/servicePresets'

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  defaultTime?: string
  appointment?: Appointment
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  selectedDate,
  defaultTime,
  appointment,
}: AppointmentFormDialogProps) {
  const dogs = useLiveQuery(() => db.dogs.toArray(), [], [])
  const owners = useLiveQuery(() => db.owners.toArray(), [], [])

  const [ownerId, setOwnerId] = useState('')
  const [dogId, setDogId] = useState('')
  const [dogFormOpen, setDogFormOpen] = useState(false)
  const [recentlyCreatedDog, setRecentlyCreatedDog] = useState<Dog | null>(null)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [appointmentTagsLoaded, setAppointmentTagsLoaded] = useState(false)
  const [appointmentTagsLoadError, setAppointmentTagsLoadError] = useState(false)

  const [servicePresetId, setServicePresetId] = useState<string>('small_grooming')
  const [customServiceName, setCustomServiceName] = useState('')

  const [date, setDate] = useState(toDateInputValue(selectedDate))
  const [time, setTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<Appointment['status']>('scheduled')
  const [notes, setNotes] = useState('')
  const [paid, setPaid] = useState(false)
  const [cameDirty, setCameDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const appointmentId = appointment?.id ?? null

  useEffect(() => {
    if (!open) return

    if (appointment) {
      const startsAt = new Date(appointment.startsAt)
      setOwnerId(appointment.ownerId)
      setDogId(appointment.dogId)
      setDate(toDateInputValue(startsAt))
      setTime(toTimeInputValue(startsAt))
      setDurationMinutes(String(getAppointmentDurationMinutes(appointment)))
      setPrice(appointment.price?.toString() ?? '')
      setStatus(appointment.status)
      setNotes(appointment.notes ?? '')
      setPaid(appointment.paid)
      setCameDirty(appointment.cameDirty)

      const presetId = findServicePresetIdForStoredName(appointment.serviceName, t)
      setServicePresetId(presetId)
      setCustomServiceName(presetId === CUSTOM_SERVICE_PRESET_ID ? (appointment.serviceName ?? '') : '')
      setRecentlyCreatedDog(null)
    } else {
      setOwnerId('')
      setDogId('')
      setDate(toDateInputValue(selectedDate))
      setTime(defaultTime ?? '09:00')
      setStatus('scheduled')
      setNotes('')
      setPaid(false)
      setCameDirty(false)

      const starter = SERVICE_PRESETS.find((p) => p.id !== CUSTOM_SERVICE_PRESET_ID) ?? SERVICE_PRESETS[0]
      setServicePresetId(starter.id)
      setCustomServiceName('')
      if (starter.durationMinutes != null) {
        setDurationMinutes(String(starter.durationMinutes))
      } else {
        setDurationMinutes('60')
      }
      if (starter.price != null) {
        setPrice(String(starter.price))
      } else {
        setPrice('')
      }
      setRecentlyCreatedDog(null)
    }

    setError(null)
  }, [open, appointment, selectedDate, defaultTime])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    if (!appointmentId) {
      setSelectedTagIds([])
      setTagsExpanded(false)
      setAppointmentTagsLoaded(true)
      setAppointmentTagsLoadError(false)
      return () => {
        cancelled = true
      }
    }

    setAppointmentTagsLoaded(false)
    setAppointmentTagsLoadError(false)

    void getTagApplicationsForEntity('appointment', appointmentId)
      .then((applications) => {
        if (cancelled) return
        const ids = applications.map((application) => application.tagId)
        setSelectedTagIds(ids)
        setTagsExpanded(ids.length > 0)
        setAppointmentTagsLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setAppointmentTagsLoaded(false)
        setAppointmentTagsLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [open, appointmentId])

  useEffect(() => {
    if (!open) return
    if (!ownerId) {
      setDogId('')
      setRecentlyCreatedDog(null)
    }
  }, [open, ownerId])

  useEffect(() => {
    if (!open) {
      setRecentlyCreatedDog(null)
      return
    }
    if (recentlyCreatedDog && recentlyCreatedDog.ownerId !== ownerId) {
      setRecentlyCreatedDog(null)
    }
  }, [open, ownerId, recentlyCreatedDog])

  useEffect(() => {
    if (!open || !ownerId || !dogId) return
    const global = dogs.find((d) => d.id === dogId)
    if (global && global.ownerId !== ownerId) {
      setDogId('')
    }
  }, [open, ownerId, dogId, dogs])

  const dogsForOwner = useMemo(() => {
    if (!ownerId) return []
    const ownerDogs = dogs.filter((dog) => dog.ownerId === ownerId)
    if (
      recentlyCreatedDog &&
      recentlyCreatedDog.ownerId === ownerId &&
      !ownerDogs.some((dog) => dog.id === recentlyCreatedDog.id)
    ) {
      ownerDogs.push(recentlyCreatedDog)
    }
    return ownerDogs.sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  }, [dogs, ownerId, recentlyCreatedDog])

  function applyPresetFields(preset: { durationMinutes: number | null; price: number | null }) {
    if (preset.durationMinutes !== null) {
      setDurationMinutes(String(preset.durationMinutes))
    }
    if (preset.price !== null) {
      setPrice(String(preset.price))
    }
  }

  const handlePresetChange = (presetId: string) => {
    setServicePresetId(presetId)
    const preset = getServicePresetById(presetId)
    if (!preset) return

    if (preset.id === CUSTOM_SERVICE_PRESET_ID) {
      return
    }

    applyPresetFields(preset)
  }

  const resolveServiceNameForSubmit = (): string | null => {
    if (servicePresetId === CUSTOM_SERVICE_PRESET_ID) {
      const trimmed = customServiceName.trim()
      return trimmed ? trimmed : null
    }
    const preset = getServicePresetById(servicePresetId)
    if (!preset) return null
    return t(preset.labelKey)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!appointmentTagsLoaded) {
      setError(t('validationError'))
      return
    }

    if (!ownerId) {
      setError(t('errorOwnerRequired'))
      return
    }

    if (!dogId) {
      setError(t('errorDogRequired'))
      return
    }

    const selectedDog = dogs.find((d) => d.id === dogId)
      ?? (recentlyCreatedDog?.id === dogId ? recentlyCreatedDog : undefined)
    if (!selectedDog) {
      setError(t('errorDogNotFound'))
      return
    }

    if (selectedDog.ownerId !== ownerId) {
      setError(t('errorDogMustBelongToOwner'))
      return
    }

    if (!owners.some((ownerRow) => ownerRow.id === ownerId)) {
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
        serviceName: resolveServiceNameForSubmit(),
        price: parsedPrice,
        status,
        notes: notes.trim() || null,
        paid,
        cameDirty,
      }

      let savedAppointmentId: string
      if (appointment) {
        const updated = await updateAppointment(appointment.id, input)
        savedAppointmentId = updated.id
      } else {
        const created = await createAppointment(input)
        savedAppointmentId = created.id
      }

      await setTagApplicationsForEntity('appointment', savedAppointmentId, selectedTagIds)

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
      setDogFormOpen(false)
      setRecentlyCreatedDog(null)
      setSelectedTagIds([])
      setTagsExpanded(false)
      setAppointmentTagsLoaded(false)
      setAppointmentTagsLoadError(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{appointment ? t('dialogEditAppointment') : t('dialogAddAppointment')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <OwnerSearchSelect owners={owners} value={ownerId} onChange={setOwnerId} />
              {ownerId && <EntityTagChips entityType="owner" entityId={ownerId} />}

              {ownerId !== '' &&
                (dogsForOwner.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('ownerHasNoDogs')}</p>
                    <Button type="button" variant="outline" className="mt-3" onClick={() => setDogFormOpen(true)}>
                      {t('addDogForOwner')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <OwnerDogSelect dogs={dogsForOwner} value={dogId} onChange={setDogId} />
                    {dogId && <EntityTagChips entityType="dog" entityId={dogId} />}
                  </>
                ))}

              {!ownerId && <p className="text-xs text-muted-foreground">{t('selectOwnerFirst')}</p>}

              <div className="grid gap-2">
                <Label htmlFor="service-preset">{t('labelServicePreset')}</Label>
                <Select value={servicePresetId} onValueChange={handlePresetChange}>
                  <SelectTrigger id="service-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {t(preset.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {servicePresetId === CUSTOM_SERVICE_PRESET_ID && (
                <div className="grid gap-2">
                  <Label htmlFor="appointment-service">{t('labelService')}</Label>
                  <Input
                    id="appointment-service"
                    value={customServiceName}
                    onChange={(event) => setCustomServiceName(event.target.value)}
                    placeholder={t('labelService')}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="appointment-date">{t('labelDate')} *</Label>
                  <Input id="appointment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appointment-time">{t('labelTime')} *</Label>
                  <Input id="appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
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

              {!tagsExpanded ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTagsExpanded(true)}
                  disabled={isSaving || !appointmentTagsLoaded}
                >
                  {t('buttonAppointmentTags')}
                  {selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ''}
                </Button>
              ) : (
                <div className="grid gap-2 border-t border-border pt-3">
                  <Label>{t('appointmentTags')}</Label>
                  <ScopedTagSelector
                    scope="appointment"
                    selectedTagIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                    disabled={isSaving || !appointmentTagsLoaded}
                  />
                </div>
              )}

              {appointmentTagsLoadError && <p className="text-sm text-red-500">{t('validationError')}</p>}

              <div className="grid gap-2">
                <Label htmlFor="appointment-notes">{t('labelNotes')}</Label>
                <Textarea
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
              <Button type="submit" disabled={isSaving || !appointmentTagsLoaded}>
                {isSaving ? t('buttonSaving') : t('buttonSave')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DogFormDialog
        open={dogFormOpen}
        onOpenChange={setDogFormOpen}
        owners={owners}
        defaultOwnerId={ownerId || undefined}
        lockOwner
        onDogCreated={(created) => {
          setRecentlyCreatedDog(created)
          setDogId(created.id)
          setDogFormOpen(false)
        }}
      />
    </>
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
    case DB_ERROR.TAG_DEFINITION_NOT_FOUND:
      return t('errorTagNotFound')
    case DB_ERROR.INVALID_TAG_SCOPE:
      return t('errorInvalidTagScope')
    case DB_ERROR.TAG_TARGET_NOT_FOUND:
      return t('errorTagTargetNotFound')
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
