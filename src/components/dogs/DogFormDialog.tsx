import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { DogTagSelector } from '@/components/dogs/DogTagSelector'
import { OwnerSearchSelect } from '@/components/dogs/OwnerSearchSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Dog, NewDogInput, Owner } from '@/db/db'
import { createDog, updateDog } from '@/db/repositories/dogs'
import { getTagApplicationsForEntity, setTagApplicationsForEntity } from '@/db/repositories/tags'
import { t } from '@/i18n/sk'

interface DogFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dog?: Dog
  owners: Owner[]
  /** When creating a dog, pre-fill owner. */
  defaultOwnerId?: string
  /** Hide owner picker (e.g. add dog from owner detail or appointment). */
  lockOwner?: boolean
  onSuccess?: () => void
  onDogCreated?: (dog: Dog) => void
}

export function DogFormDialog({
  open,
  onOpenChange,
  dog,
  owners,
  defaultOwnerId,
  lockOwner = false,
  onSuccess,
  onDogCreated,
}: DogFormDialogProps) {
  const [ownerId, setOwnerId] = useState('')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>('unknown')
  const [color, setColor] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [behaviorNotes, setBehaviorNotes] = useState('')
  const [healthNotes, setHealthNotes] = useState('')
  const [groomingNotes, setGroomingNotes] = useState('')
  const [priceNotes, setPriceNotes] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    const loadTags = async (entityId: string) => {
      const applications = await getTagApplicationsForEntity('dog', entityId)
      setSelectedTagIds(applications.map((application) => application.tagId))
    }

    if (dog) {
      setOwnerId(dog.ownerId)
      setName(dog.name ?? '')
      setBreed(dog.breed ?? '')
      setAge(dog.age ?? '')
      setSex(dog.sex ?? 'unknown')
      setColor(dog.color ?? '')
      setWeightKg(dog.weightKg?.toString() ?? '')
      setBehaviorNotes(dog.behaviorNotes ?? '')
      setHealthNotes(dog.healthNotes ?? '')
      setGroomingNotes(dog.groomingNotes ?? '')
      setPriceNotes(dog.priceNotes ?? '')
      void loadTags(dog.id)
    } else {
      setOwnerId(defaultOwnerId ?? '')
      setName('')
      setBreed('')
      setAge('')
      setSex('unknown')
      setColor('')
      setWeightKg('')
      setBehaviorNotes('')
      setHealthNotes('')
      setGroomingNotes('')
      setPriceNotes('')
      setSelectedTagIds([])
    }

    setError(null)
  }, [open, dog, defaultOwnerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('errorDogNameRequired'))
      return
    }

    const resolvedOwnerId = dog?.ownerId ?? (lockOwner && defaultOwnerId ? defaultOwnerId : ownerId)

    if (!resolvedOwnerId) {
      setError(t('errorOwnerRequired'))
      return
    }

    const ownerExists = owners.find((o) => o.id === resolvedOwnerId)
    if (!ownerExists) {
      setError(t('errorOwnerNotFound'))
      return
    }

    const parsedWeight = weightKg.trim() ? Number(weightKg) : null
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
      setError(t('errorInvalidWeight'))
      return
    }

    setIsSaving(true)
    try {
      const input: NewDogInput = {
        ownerId: resolvedOwnerId,
        name: name.trim(),
        breed: breed.trim() || null,
        age: age.trim() || null,
        sex,
        color: color.trim() || null,
        weightKg: parsedWeight,
        behaviorNotes: behaviorNotes.trim() || null,
        healthNotes: healthNotes.trim() || null,
        groomingNotes: groomingNotes.trim() || null,
        priceNotes: priceNotes.trim() || null,
      }

      if (dog) {
        await updateDog(dog.id, input)
        await setTagApplicationsForEntity('dog', dog.id, selectedTagIds)
      } else {
        const created = await createDog(input)
        await setTagApplicationsForEntity('dog', created.id, selectedTagIds)
        onDogCreated?.(created)
      }

      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch {
      setError(t('validationError'))
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setOwnerId('')
    setName('')
    setBreed('')
    setAge('')
    setSex('unknown')
    setColor('')
    setWeightKg('')
    setBehaviorNotes('')
    setHealthNotes('')
    setGroomingNotes('')
    setPriceNotes('')
    setSelectedTagIds([])
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const displayOwnerId = ownerId || defaultOwnerId || ''
  const ownerPickerLocked = lockOwner
  const displayOwner = owners.find((o) => o.id === displayOwnerId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dog ? t('dialogEditDog') : t('dialogAddDog')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {ownerPickerLocked ? (
              <div className="grid gap-2">
                <Label>{t('labelOwner')} *</Label>
                <p className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">{displayOwner?.fullName ?? '—'}</p>
              </div>
            ) : (
              <OwnerSearchSelect owners={owners} value={ownerId} onChange={setOwnerId} />
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">{t('labelName')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('labelName')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="breed">{t('labelBreed')}</Label>
              <Input
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={t('labelBreed')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="age">{t('labelAge')}</Label>
              <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} placeholder={t('labelAge')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sex">{t('labelSex')}</Label>
              <Select value={sex} onValueChange={(value: 'male' | 'female' | 'unknown') => setSex(value)}>
                <SelectTrigger id="sex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('labelSexMale')}</SelectItem>
                  <SelectItem value="female">{t('labelSexFemale')}</SelectItem>
                  <SelectItem value="unknown">{t('labelSexUnknown')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">{t('labelColor')}</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder={t('labelColor')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">{t('labelWeight')}</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder={t('labelWeight')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="behaviorNotes">{t('labelBehaviorNotes')}</Label>
              <Textarea
                id="behaviorNotes"
                value={behaviorNotes}
                onChange={(e) => setBehaviorNotes(e.target.value)}
                placeholder={t('labelBehaviorNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="healthNotes">{t('labelHealthNotes')}</Label>
              <Textarea
                id="healthNotes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder={t('labelHealthNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="groomingNotes">{t('labelGroomingNotes')}</Label>
              <Textarea
                id="groomingNotes"
                value={groomingNotes}
                onChange={(e) => setGroomingNotes(e.target.value)}
                placeholder={t('labelGroomingNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priceNotes">{t('labelPriceNotes')}</Label>
              <Textarea
                id="priceNotes"
                value={priceNotes}
                onChange={(e) => setPriceNotes(e.target.value)}
                placeholder={t('labelPriceNotes')}
              />
            </div>

            <div className="grid gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('labelDogTags')}</Label>
                <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                  <Link to="/tags">{t('manageTags')}</Link>
                </Button>
              </div>
              <DogTagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} disabled={isSaving} />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
