import { db } from '@/db/db'

export type OwnerTipStats = {
  ownerId: string
  totalTips: number
  appointmentsWithTips: number
}

export async function getOwnerTipStats(ownerId: string): Promise<OwnerTipStats> {
  const appointments = await db.appointments.where('ownerId').equals(ownerId).toArray()
  return computeOwnerTipStats(ownerId, appointments)
}

export async function getOwnerTipStatsMap(ownerIds: string[]): Promise<Map<string, OwnerTipStats>> {
  const uniqueOwnerIds = Array.from(new Set(ownerIds.filter(Boolean)))
  const statsMap = new Map<string, OwnerTipStats>(
    uniqueOwnerIds.map((ownerId) => [ownerId, { ownerId, totalTips: 0, appointmentsWithTips: 0 }])
  )

  if (uniqueOwnerIds.length === 0) {
    return statsMap
  }

  const appointments = await db.appointments.where('ownerId').anyOf(uniqueOwnerIds).toArray()
  for (const appointment of appointments) {
    const tip = appointment.tipAmount ?? 0
    if (tip <= 0) continue

    const current = statsMap.get(appointment.ownerId)
    if (!current) continue

    current.totalTips += tip
    current.appointmentsWithTips += 1
  }

  return statsMap
}

function computeOwnerTipStats(
  ownerId: string,
  appointments: Array<{ tipAmount: number | null }>
): OwnerTipStats {
  let totalTips = 0
  let appointmentsWithTips = 0

  for (const appointment of appointments) {
    const tip = appointment.tipAmount ?? 0
    if (tip <= 0) continue
    totalTips += tip
    appointmentsWithTips += 1
  }

  return {
    ownerId,
    totalTips,
    appointmentsWithTips,
  }
}
