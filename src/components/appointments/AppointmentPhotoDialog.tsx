import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Appointment } from '@/db/db'
import { t } from '@/i18n/sk'
import { AppointmentPhotoSection } from '@/components/photos/AppointmentPhotoSection'

type AppointmentPhotoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
}

export function AppointmentPhotoDialog({ open, onOpenChange, appointment }: AppointmentPhotoDialogProps) {
  if (!appointment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('appointmentPhotosDialogTitle')}</DialogTitle>
          <DialogDescription>{t('appointmentPhotosDialogDescription')}</DialogDescription>
        </DialogHeader>

        <AppointmentPhotoSection appointmentId={appointment.id} dogId={appointment.dogId} />
      </DialogContent>
    </Dialog>
  )
}
