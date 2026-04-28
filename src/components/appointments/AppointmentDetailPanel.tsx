import { useState } from 'react'
import { CalendarClock, Pencil, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { DisclosureSection } from '@/components/DisclosureSection'
import { NotesEditor } from '@/components/NotesEditor'
import { TagPicker } from '@/components/TagPicker'
import { AppointmentFormDialog } from '@/components/appointments/AppointmentFormDialog'
import { DeleteAppointmentDialog } from '@/components/appointments/DeleteAppointmentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Appointment, Dog, Owner } from '@/db/db'
import { db } from '@/db/db'
import { t, type TranslationKey } from '@/i18n/sk'
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

const placeholderCards: TranslationKey[] = [
  'appointmentPhotos',
  'appointmentDogHistory',
]

export function AppointmentDetailPanel({ appointmentId, onClose }: AppointmentDetailPanelProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
              <DetailRow label={t('labelStatus')} value={getAppointmentStatusLabel(appointment.status)} />
            </div>

            <div className="flex flex-wrap gap-2">
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

              {placeholderCards.map((key) => (
                <Card key={key}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{t(key)}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
