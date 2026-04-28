import { useEffect, useState } from 'react'
import { t } from '@/i18n/sk'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dog, Owner, NewDogInput } from '@/db/db'
import { createDog, updateDog } from '@/db/repositories/dogs'
import { OwnerSearchSelect } from './OwnerSearchSelect'

interface DogFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dog?: Dog
  owners: Owner[]
  onSuccess?: () => void
}

export function DogFormDialog({ open, onOpenChange, dog, owners, onSuccess }: DogFormDialogProps) {
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
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setOwnerId(dog?.ownerId ?? '')
    setName(dog?.name ?? '')
    setBreed(dog?.breed ?? '')
    setAge(dog?.age ?? '')
    setSex(dog?.sex ?? 'unknown')
    setColor(dog?.color ?? '')
    setWeightKg(dog?.weightKg?.toString() ?? '')
    setBehaviorNotes(dog?.behaviorNotes ?? '')
    setHealthNotes(dog?.healthNotes ?? '')
    setGroomingNotes(dog?.groomingNotes ?? '')
    setPriceNotes(dog?.priceNotes ?? '')
    setError(null)
  }, [open, dog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('errorDogNameRequired'))
      return
    }

    if (!ownerId) {
      setError(t('errorOwnerRequired'))
      return
    }

    const ownerExists = owners.find(o => o.id === ownerId)
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
        ownerId,
        name: name.trim(),
        breed: breed.trim() || null,
        age: age.trim() || null,
        sex,
        color: color.trim() || null,
        weightKg: parsedWeight,
        behaviorNotes: behaviorNotes.trim() || null,
        healthNotes: healthNotes.trim() || null,
        groomingNotes: groomingNotes.trim() || null,
        priceNotes: priceNotes.trim() || null
      }

      if (dog) {
        await updateDog(dog.id, input)
      } else {
        await createDog(input)
      }

      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (err) {
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
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dog ? t('dialogEditDog') : t('dialogAddDog')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <OwnerSearchSelect owners={owners} value={ownerId} onChange={setOwnerId} />
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
              <Input
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('labelAge')}
              />
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
              <Input
                id="behaviorNotes"
                value={behaviorNotes}
                onChange={(e) => setBehaviorNotes(e.target.value)}
                placeholder={t('labelBehaviorNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="healthNotes">{t('labelHealthNotes')}</Label>
              <Input
                id="healthNotes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder={t('labelHealthNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="groomingNotes">{t('labelGroomingNotes')}</Label>
              <Input
                id="groomingNotes"
                value={groomingNotes}
                onChange={(e) => setGroomingNotes(e.target.value)}
                placeholder={t('labelGroomingNotes')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priceNotes">{t('labelPriceNotes')}</Label>
              <Input
                id="priceNotes"
                value={priceNotes}
                onChange={(e) => setPriceNotes(e.target.value)}
                placeholder={t('labelPriceNotes')}
              />
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
