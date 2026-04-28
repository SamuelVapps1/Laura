import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { TagDefinition } from '@/db/db'
import { t } from '@/i18n/sk'
import { getTagScopeLabel } from '@/lib/tags'

interface TagDefinitionsListProps {
  tags: TagDefinition[]
  onEdit: (tag: TagDefinition) => void
  onDelete: (tag: TagDefinition) => void
}

export function TagDefinitionsList({ tags, onEdit, onDelete }: TagDefinitionsListProps) {
  if (tags.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          {t('emptyTagDefinitions')}
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
              <TableHead>{t('labelTagLabel')}</TableHead>
              <TableHead>{t('labelTagDescription')}</TableHead>
              <TableHead>{t('labelTagColor')}</TableHead>
              <TableHead>{t('labelTagScopes')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.label}</TableCell>
                <TableCell>{tag.description || '-'}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex h-5 w-5 rounded-full border"
                    style={{ backgroundColor: tag.color }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {tag.scopes.map((scope) => (
                      <span key={scope} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {getTagScopeLabel(scope)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(tag)}>
                      {t('buttonEdit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(tag)}>
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
