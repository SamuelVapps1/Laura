import { useLiveQuery } from 'dexie-react-hooks'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/db/db'
import { t } from '@/i18n/sk'
import { formatAppointmentPrice } from '@/lib/appointments'

type OwnerStatsCardProps = {
  ownerId: string
}

export function OwnerStatsCard({ ownerId }: OwnerStatsCardProps) {
  const stats = useLiveQuery(
    async () => {
      const appointments = await db.appointments.where('ownerId').equals(ownerId).toArray()
      let totalTips = 0
      let appointmentsWithTips = 0

      for (const appointment of appointments) {
        const tip = appointment.tipAmount ?? 0
        if (tip > 0) {
          totalTips += tip
          appointmentsWithTips += 1
        }
      }

      return { totalTips, appointmentsWithTips }
    },
    [ownerId],
    { totalTips: 0, appointmentsWithTips: 0 }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('totalTips')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
          <span className="text-muted-foreground">{t('totalTips')}</span>
          <span className="font-medium text-gray-900">{formatAppointmentPrice(stats.totalTips)}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
          <span className="text-muted-foreground">{t('appointmentsWithTips')}</span>
          <span className="font-medium text-gray-900">{stats.appointmentsWithTips}</span>
        </div>
      </CardContent>
    </Card>
  )
}
