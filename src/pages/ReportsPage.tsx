import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { sk as skLocale } from 'date-fns/locale'
import { BarChart3, Printer, RefreshCw } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { db, type Appointment, type Dog, type Owner } from '@/db/db'
import { t } from '@/i18n/sk'
import {
  formatAppointmentPrice,
  formatAppointmentTime,
  getAppointmentDurationMinutes,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'

type ReportRange = 'day' | 'week' | 'month'

type ReportAppointmentRow = {
  appointment: Appointment
  dog?: Dog
  owner?: Owner
}

type ServiceBreakdownRow = {
  service: string
  count: number
  revenue: number
  tips: number
  totalMinutes: number
}

type ReportMetrics = {
  completedCount: number
  revenue: number
  tips: number
  totalWithTips: number
  averageRevenue: number
  averageTip: number
  paidCount: number
  unpaidCount: number
  paidRevenue: number
  unpaidRevenue: number
  totalMinutes: number
  dirtyCount: number
  uniqueDogCount: number
  uniqueOwnerCount: number
  scheduledCount: number
  cancelledCount: number
  noShowCount: number
  services: ServiceBreakdownRow[]
}

const RANGE_OPTIONS = [
  { value: 'day', labelKey: 'reportRangeDay' },
  { value: 'week', labelKey: 'reportRangeWeek' },
  { value: 'month', labelKey: 'reportRangeMonth' },
] as const

const EMPTY_REPORT_DATA = {
  appointments: [] as Appointment[],
  dogsById: new Map<string, Dog>(),
  ownersById: new Map<string, Owner>(),
}

export function ReportsPage() {
  const [range, setRange] = useState<ReportRange>('day')
  const [generatedAt, setGeneratedAt] = useState(() => new Date())
  const { start, end } = getReportRange(range, generatedAt)
  const rangeStartIso = start.toISOString()
  const rangeEndIso = end.toISOString()

  const reportData = useLiveQuery(
    async () => {
      const appointments = await db.appointments
        .where('startsAt')
        .between(rangeStartIso, rangeEndIso, true, true)
        .toArray()

      appointments.sort((first, second) => first.startsAt.localeCompare(second.startsAt))

      const dogIds = Array.from(new Set(appointments.map((appointment) => appointment.dogId)))
      const ownerIds = Array.from(new Set(appointments.map((appointment) => appointment.ownerId)))
      const [dogs, owners] = await Promise.all([
        db.dogs.bulkGet(dogIds),
        db.owners.bulkGet(ownerIds),
      ])

      return {
        appointments,
        dogsById: new Map(dogs.filter(isDefined).map((dog) => [dog.id, dog])),
        ownersById: new Map(owners.filter(isDefined).map((owner) => [owner.id, owner])),
      }
    },
    [rangeStartIso, rangeEndIso],
    EMPTY_REPORT_DATA
  )

  const completedRows = useMemo(
    () =>
      reportData.appointments
        .filter((appointment) => appointment.status === 'done')
        .map((appointment): ReportAppointmentRow => ({
          appointment,
          dog: reportData.dogsById.get(appointment.dogId),
          owner: reportData.ownersById.get(appointment.ownerId),
        })),
    [reportData]
  )
  const metrics = useMemo(
    () => buildReportMetrics(reportData.appointments),
    [reportData.appointments]
  )
  const periodLabel = `${formatReportDateTime(start)} - ${formatReportDateTime(end)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('pageReportsTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('pageReportsDescription')}</p>
        </div>
        <Button type="button" variant="outline" data-print-hidden="true" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t('printReport')}
        </Button>
      </div>

      <Card data-print-hidden="true">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={range === option.value ? 'default' : 'outline'}
                onClick={() => setRange(option.value)}
              >
                {t(option.labelKey)}
              </Button>
            ))}
          </div>

          <Button type="button" onClick={() => setGeneratedAt(new Date())}>
            <RefreshCw className="h-4 w-4" />
            {t('generateReport')}
          </Button>
        </CardContent>
      </Card>

      <section data-print-section="business-report" className="space-y-6">
        <header className="rounded-md border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                {t('reportPeriod')}
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{periodLabel}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('reportGeneratedAt')}: {formatReportDateTime(generatedAt)}
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label={t('reportCompletedAppointments')} value={String(metrics.completedCount)} />
          <SummaryCard label={t('reportRevenue')} value={formatAppointmentPrice(metrics.revenue)} />
          <SummaryCard label={t('reportTips')} value={formatAppointmentPrice(metrics.tips)} />
          <SummaryCard label={t('reportTotalWithTips')} value={formatAppointmentPrice(metrics.totalWithTips)} />
          <SummaryCard label={t('reportAverageRevenue')} value={formatAppointmentPrice(metrics.averageRevenue)} />
          <SummaryCard
            label={t('reportUnpaid')}
            value={`${metrics.unpaidCount} / ${formatAppointmentPrice(metrics.unpaidRevenue)}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reportRevenue')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ReportRow label={t('reportRevenue')} value={formatAppointmentPrice(metrics.revenue)} />
              <ReportRow label={t('reportTips')} value={formatAppointmentPrice(metrics.tips)} />
              <ReportRow label={t('reportTotalWithTips')} value={formatAppointmentPrice(metrics.totalWithTips)} />
              <ReportRow label={t('reportAverageRevenue')} value={formatAppointmentPrice(metrics.averageRevenue)} />
              <ReportRow label={t('reportAverageTip')} value={formatAppointmentPrice(metrics.averageTip)} />
              <ReportRow
                label={t('reportPaidRevenue')}
                value={`${metrics.paidCount} / ${formatAppointmentPrice(metrics.paidRevenue)}`}
              />
              <ReportRow
                label={t('reportUnpaidRevenue')}
                value={`${metrics.unpaidCount} / ${formatAppointmentPrice(metrics.unpaidRevenue)}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reportWorkload')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ReportRow label={t('reportCompletedAppointments')} value={String(metrics.completedCount)} />
              <ReportRow label={t('reportTotalTime')} value={formatDurationMinutes(metrics.totalMinutes)} />
              <ReportRow label={t('reportUniqueDogs')} value={String(metrics.uniqueDogCount)} />
              <ReportRow label={t('reportUniqueOwners')} value={String(metrics.uniqueOwnerCount)} />
              <ReportRow label={t('reportDirtyDogs')} value={String(metrics.dirtyCount)} />
              <ReportRow label={t('reportContextScheduled')} value={String(metrics.scheduledCount)} />
              <ReportRow label={t('reportContextCancelled')} value={String(metrics.cancelledCount)} />
              <ReportRow label={t('reportContextNoShow')} value={String(metrics.noShowCount)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reportServiceBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reportNoCompletedAppointments')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reportService')}</TableHead>
                    <TableHead>{t('reportCount')}</TableHead>
                    <TableHead>{t('reportTime')}</TableHead>
                    <TableHead>{t('reportRevenue')}</TableHead>
                    <TableHead>{t('reportTips')}</TableHead>
                    <TableHead>{t('reportTotalWithTips')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.services.map((service) => (
                    <TableRow key={service.service}>
                      <TableCell className="font-medium">{service.service}</TableCell>
                      <TableCell>{service.count}</TableCell>
                      <TableCell>{formatDurationMinutes(service.totalMinutes)}</TableCell>
                      <TableCell>{formatAppointmentPrice(service.revenue)}</TableCell>
                      <TableCell>{formatAppointmentPrice(service.tips)}</TableCell>
                      <TableCell>{formatAppointmentPrice(service.revenue + service.tips)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reportAppointmentsList')}</CardTitle>
          </CardHeader>
          <CardContent>
            {completedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reportNoCompletedAppointments')}</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reportTime')}</TableHead>
                        <TableHead>{t('labelDog')}</TableHead>
                        <TableHead>{t('labelOwner')}</TableHead>
                        <TableHead>{t('reportService')}</TableHead>
                        <TableHead>{t('labelPrice')}</TableHead>
                        <TableHead>{t('labelTip')}</TableHead>
                        <TableHead>{t('reportPaid')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedRows.map(({ appointment, dog, owner }) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{formatAppointmentTime(appointment)}</TableCell>
                          <TableCell className="font-medium">{dog?.name ?? t('appointmentUnknownDog')}</TableCell>
                          <TableCell>{owner?.fullName ?? t('appointmentUnknownOwner')}</TableCell>
                          <TableCell>
                            {appointment.serviceName ?? t('appointmentNoService')}
                            {appointment.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {truncateText(appointment.notes, 90)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{formatAppointmentPrice(appointment.price ?? 0)}</TableCell>
                          <TableCell>{formatAppointmentPrice(appointment.tipAmount ?? 0)}</TableCell>
                          <TableCell>{appointment.paid ? t('yes') : t('no')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {completedRows.map((row) => (
                    <AppointmentReportCard key={row.appointment.id} row={row} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}

function AppointmentReportCard({ row }: { row: ReportAppointmentRow }) {
  const { appointment, dog, owner } = row

  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">
            {formatAppointmentTime(appointment)} - {dog?.name ?? t('appointmentUnknownDog')}
          </p>
          <p className="mt-1 text-muted-foreground">{owner?.fullName ?? t('appointmentUnknownOwner')}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-1 text-xs font-medium',
            appointment.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          {appointment.paid ? t('yes') : t('no')}
        </span>
      </div>
      <div className="mt-3 grid gap-1">
        <ReportRow label={t('reportService')} value={appointment.serviceName ?? t('appointmentNoService')} />
        <ReportRow label={t('labelPrice')} value={formatAppointmentPrice(appointment.price ?? 0)} />
        <ReportRow label={t('labelTip')} value={formatAppointmentPrice(appointment.tipAmount ?? 0)} />
      </div>
      {appointment.notes && (
        <p className="mt-3 text-xs text-muted-foreground">{truncateText(appointment.notes, 120)}</p>
      )}
    </div>
  )
}

function getReportRange(range: ReportRange, generatedAt: Date): { start: Date; end: Date } {
  if (range === 'week') {
    return {
      start: startOfWeek(generatedAt, { weekStartsOn: 1 }),
      end: generatedAt,
    }
  }

  if (range === 'month') {
    return {
      start: startOfMonth(generatedAt),
      end: generatedAt,
    }
  }

  return {
    start: startOfDay(generatedAt),
    end: generatedAt,
  }
}

function buildReportMetrics(appointments: Appointment[]): ReportMetrics {
  const completedAppointments = appointments.filter((appointment) => appointment.status === 'done')
  const completedCount = completedAppointments.length
  const revenue = sumAppointments(completedAppointments, (appointment) => appointment.price ?? 0)
  const tips = sumAppointments(completedAppointments, (appointment) => appointment.tipAmount ?? 0)
  const paidAppointments = completedAppointments.filter((appointment) => appointment.paid)
  const unpaidAppointments = completedAppointments.filter((appointment) => !appointment.paid)

  return {
    completedCount,
    revenue,
    tips,
    totalWithTips: revenue + tips,
    averageRevenue: completedCount > 0 ? revenue / completedCount : 0,
    averageTip: completedCount > 0 ? tips / completedCount : 0,
    paidCount: paidAppointments.length,
    unpaidCount: unpaidAppointments.length,
    paidRevenue: sumAppointments(paidAppointments, (appointment) => appointment.price ?? 0),
    unpaidRevenue: sumAppointments(unpaidAppointments, (appointment) => appointment.price ?? 0),
    totalMinutes: sumAppointments(completedAppointments, getAppointmentDurationMinutes),
    dirtyCount: completedAppointments.filter((appointment) => appointment.cameDirty).length,
    uniqueDogCount: new Set(completedAppointments.map((appointment) => appointment.dogId)).size,
    uniqueOwnerCount: new Set(completedAppointments.map((appointment) => appointment.ownerId)).size,
    scheduledCount: appointments.filter((appointment) => appointment.status === 'scheduled').length,
    cancelledCount: appointments.filter((appointment) => appointment.status === 'cancelled').length,
    noShowCount: appointments.filter((appointment) => appointment.status === 'no_show').length,
    services: buildServiceBreakdown(completedAppointments),
  }
}

function buildServiceBreakdown(appointments: Appointment[]): ServiceBreakdownRow[] {
  const services = new Map<string, ServiceBreakdownRow>()

  appointments.forEach((appointment) => {
    const serviceName = appointment.serviceName ?? t('appointmentNoService')
    const current = services.get(serviceName) ?? {
      service: serviceName,
      count: 0,
      revenue: 0,
      tips: 0,
      totalMinutes: 0,
    }

    current.count += 1
    current.revenue += appointment.price ?? 0
    current.tips += appointment.tipAmount ?? 0
    current.totalMinutes += getAppointmentDurationMinutes(appointment)
    services.set(serviceName, current)
  })

  return Array.from(services.values()).sort((first, second) => {
    const revenueDelta = second.revenue + second.tips - (first.revenue + first.tips)
    return revenueDelta || first.service.localeCompare(second.service, 'sk')
  })
}

function sumAppointments(
  appointments: Appointment[],
  getValue: (appointment: Appointment) => number
): number {
  return appointments.reduce((sum, appointment) => sum + getValue(appointment), 0)
}

function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) return `${hours} h`
  return `${hours} h ${remainingMinutes} min`
}

function formatReportDateTime(date: Date): string {
  return format(date, 'd. MMMM yyyy, HH:mm', { locale: skLocale })
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
