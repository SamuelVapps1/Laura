import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { EmptyState } from '@/components/EmptyState'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OwnerTipBadge } from '@/components/owners/OwnerTipBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Owner } from '@/db/db'
import { getOwnerTipStatsMap, type OwnerTipStats } from '@/db/repositories/ownerStats'

interface OwnersListProps {
  owners: Owner[]
  onEdit: (owner: Owner) => void
  onDelete: (owner: Owner) => void
  onCreate?: () => void
  isSearchActive?: boolean
  hasAnyOwners?: boolean
}

export function OwnersList({
  owners,
  onEdit,
  onDelete,
  onCreate,
  isSearchActive = false,
  hasAnyOwners = false,
}: OwnersListProps) {
  const ownerIds = useMemo(() => owners.map((owner) => owner.id), [owners])
  const ownerIdsKey = useMemo(() => ownerIds.join('|'), [ownerIds])
  const emptyStatsMap = useMemo(() => new Map<string, OwnerTipStats>(), [])

  const tipStatsMap = useLiveQuery(
    async () => getOwnerTipStatsMap(ownerIds),
    [ownerIdsKey],
    emptyStatsMap
  )

  if (owners.length === 0) {
    if (hasAnyOwners && isSearchActive) {
      return (
        <EmptyState
          title={t('emptyOwnersSearchTitle')}
          description={t('emptySearchDescription')}
        />
      )
    }

    return (
      <EmptyState
        title={t('emptyOwnersTitle')}
        description={t('emptyOwnersDescription')}
        actionLabel={onCreate ? t('addFirstOwner') : undefined}
        onAction={onCreate}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('labelFullName')}</TableHead>
              <TableHead>{t('labelPhone')}</TableHead>
              <TableHead>{t('labelEmail')}</TableHead>
              <TableHead className="text-right">{t('labelNotes')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{owner.fullName}</span>
                    <OwnerTipBadge totalTips={tipStatsMap.get(owner.id)?.totalTips ?? 0} compact />
                  </div>
                </TableCell>
                <TableCell>{owner.phone || '-'}</TableCell>
                <TableCell>{owner.email || '-'}</TableCell>
                <TableCell className="text-right">{owner.notes || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/owners/${owner.id}#dogs`}>{t('buttonDogs')}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/owners/${owner.id}`}>{t('buttonDetail')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(owner)}>
                      {t('buttonEdit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(owner)}>
                      {t('buttonDelete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
