import { Link } from 'react-router-dom'

import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Owner } from '@/db/db'

interface OwnersListProps {
  owners: Owner[]
  onEdit: (owner: Owner) => void
  onDelete: (owner: Owner) => void
}

export function OwnersList({ owners, onEdit, onDelete }: OwnersListProps) {
  if (owners.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          {t('emptyOwners')}
        </CardContent>
      </Card>
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
                <TableCell className="font-medium">{owner.fullName}</TableCell>
                <TableCell>{owner.phone || '-'}</TableCell>
                <TableCell>{owner.email || '-'}</TableCell>
                <TableCell className="text-right">{owner.notes || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
