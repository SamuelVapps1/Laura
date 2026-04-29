import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TagDefinition, TagScope } from '@/db/db'
import { DB_ERROR } from '@/db/errors'
import {
  createTagDefinition,
  updateTagDefinition,
  type NewTagDefinitionInput,
} from '@/db/repositories/tags'
import { t } from '@/i18n/sk'
import { TAG_COLOR_PALETTE, getTagScopeLabel, tagScopes } from '@/lib/tags'
import { cn } from '@/lib/utils'

interface TagDefinitionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: TagDefinition
  defaultScopes?: TagScope[]
  createTitle?: string
  onSaved?: (tag: TagDefinition) => void
}

export function TagDefinitionFormDialog({
  open,
  onOpenChange,
  tag,
  defaultScopes,
  createTitle,
  onSaved,
}: TagDefinitionFormDialogProps) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(TAG_COLOR_PALETTE[0])
  const [scopes, setScopes] = useState<TagScope[]>(() => [...(defaultScopes ?? tagScopes)])
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setLabel(tag?.label ?? '')
    setDescription(tag?.description ?? '')
    setColor(tag?.color ?? TAG_COLOR_PALETTE[0])
    setScopes(tag ? tag.scopes : [...(defaultScopes ?? tagScopes)])
    setIsActive(tag?.isActive !== false)
    setError(null)
  }, [open, tag, defaultScopes])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const input: NewTagDefinitionInput = {
      label,
      description,
      color,
      scopes,
      isActive,
    }

    setIsSaving(true)
    try {
      let savedTag: TagDefinition
      if (tag) {
        savedTag = await updateTagDefinition(tag.id, input)
      } else {
        savedTag = await createTagDefinition(input)
      }

      onSaved?.(savedTag)
      onOpenChange(false)
    } catch (err) {
      setError(getTagFormError(err))
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

  const toggleScope = (scope: TagScope) => {
    setScopes((currentScopes) => {
      if (currentScopes.includes(scope)) {
        return currentScopes.filter((currentScope) => currentScope !== scope)
      }

      return [...currentScopes, scope]
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{tag ? t('dialogEditTag') : (createTitle ?? t('dialogAddTag'))}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tag-label">{t('labelTagLabel')} *</Label>
              <Input
                id="tag-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={t('labelTagLabel')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tag-description">{t('labelTagDescription')}</Label>
              <Textarea
                id="tag-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('labelTagDescription')}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('labelTagColor')} *</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_PALETTE.map((paletteColor) => (
                  <button
                    key={paletteColor}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      color === paletteColor ? "border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: paletteColor }}
                    aria-label={t('labelTagColor')}
                    onClick={() => setColor(paletteColor)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('labelTagScopes')} *</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {tagScopes.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    {getTagScopeLabel(scope)}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                {t('labelTagActive')}
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

function getTagFormError(error: unknown): string {
  if (!(error instanceof Error)) return t('validationError')

  switch (error.message) {
    case DB_ERROR.TAG_LABEL_REQUIRED:
      return t('errorTagLabelRequired')
    case DB_ERROR.TAG_SCOPES_REQUIRED:
      return t('errorTagScopesRequired')
    case DB_ERROR.TAG_DEFINITION_NOT_FOUND:
      return t('errorTagNotFound')
    case DB_ERROR.INVALID_TAG_SCOPE:
      return t('errorInvalidTagScope')
    case DB_ERROR.INVALID_TAG_COLOR:
      return t('errorInvalidTagColor')
    default:
      return t('validationError')
  }
}
