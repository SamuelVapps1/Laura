import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BACKUP_VERSION,
  BackupError,
  exportBackup,
  parseBackupFile,
  restoreBackup as restoreParsedBackup,
  type BackupCounts,
  type BackupProgress,
  type ParsedBackupPreview,
} from '@/lib/backup'
import { t, type TranslationKey } from '@/i18n/sk'

type StorageInfo = {
  supported: boolean
  usage?: number
  quota?: number
}

type MessageState = {
  key: TranslationKey
  tone: 'success' | 'error'
} | null

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedBackup, setParsedBackup] = useState<ParsedBackupPreview | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [progress, setProgress] = useState<BackupProgress | null>(null)
  const [message, setMessage] = useState<MessageState>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ supported: true })

  const refreshStorageEstimate = useCallback(async () => {
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
      setStorageInfo({ supported: false })
      return
    }

    try {
      const estimate = await navigator.storage.estimate()
      setStorageInfo({
        supported: true,
        usage: estimate.usage,
        quota: estimate.quota,
      })
    } catch {
      setStorageInfo({ supported: false })
    }
  }, [])

  useEffect(() => {
    void refreshStorageEstimate()
  }, [refreshStorageEstimate])

  const handleExport = async () => {
    setIsBusy(true)
    setMessage(null)
    setProgress({ stage: 'reading' })

    try {
      await exportBackup(setProgress)
      setMessage({ key: 'backupExportDone', tone: 'success' })
      await refreshStorageEstimate()
    } catch {
      setMessage({ key: 'backupExportError', tone: 'error' })
      setProgress({ stage: 'error' })
    } finally {
      setIsBusy(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    setSelectedFile(file)
    setParsedBackup(null)
    setIsConfirmOpen(false)
    setMessage(null)
    setProgress(null)
  }

  const handleParseSelectedFile = async () => {
    if (!selectedFile) return

    setIsBusy(true)
    setMessage(null)
    setProgress({ stage: 'parsing' })

    try {
      const parsed = await parseBackupFile(selectedFile)
      setParsedBackup(parsed)
      setIsConfirmOpen(true)
      setProgress(null)
    } catch (error) {
      setMessage({ key: getBackupErrorKey(error, 'backupInvalidFile'), tone: 'error' })
      setProgress({ stage: 'error' })
      resetSelectedFile()
    } finally {
      setIsBusy(false)
    }
  }

  const handleCancelRestore = () => {
    setIsConfirmOpen(false)
    setParsedBackup(null)
    resetSelectedFile()
  }

  const handleConfirmRestore = async () => {
    if (!parsedBackup) return

    setIsConfirmOpen(false)
    setIsBusy(true)
    setMessage(null)
    setProgress({ stage: 'restoring', current: 0, total: parsedBackup.counts.photos + 12 })

    try {
      await restoreParsedBackup(parsedBackup, setProgress)
      setMessage({ key: 'backupRestoreDone', tone: 'success' })
      await refreshStorageEstimate()
    } catch (error) {
      setMessage({ key: getBackupErrorKey(error, 'backupRestoreError'), tone: 'error' })
      setProgress({ stage: 'error' })
    } finally {
      setIsBusy(false)
      setParsedBackup(null)
      resetSelectedFile()
    }
  }

  const resetSelectedFile = () => {
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const statusText = message ? t(message.key) : getProgressText(progress)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('pageSettingsTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('pageSettingsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsBackupTitle')}</CardTitle>
          <CardDescription>{t('aboutOfflineFirst')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleExport} disabled={isBusy}>
              {t('downloadBackup')}
            </Button>
          </div>

          <div className="grid gap-3 sm:max-w-lg">
            <Label htmlFor="backup-file">{t('chooseBackupFile')}</Label>
            <Input
              ref={fileInputRef}
              id="backup-file"
              type="file"
              accept=".zip,application/zip"
              disabled={isBusy}
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-sm text-gray-600">
                {t('backupSelectedFile')}: {selectedFile.name}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={!selectedFile || isBusy}
              onClick={handleParseSelectedFile}
            >
              {t('restoreBackup')}
            </Button>
          </div>

          {statusText && (
            <div className={getMessageClassName(message?.tone)}>
              <p className="text-sm font-medium">{statusText}</p>
              <ProgressBar progress={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPasswordTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{t('passwordNotEnabled')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsStorageTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StorageUsage storageInfo={storageInfo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsAboutTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>{t('appName')}</p>
          <p>
            {t('backupFormatVersion')}: {BACKUP_VERSION}
          </p>
          <p>{t('aboutOfflineFirst')}</p>
        </CardContent>
      </Card>

      <RestoreConfirmationDialog
        open={isConfirmOpen}
        parsedBackup={parsedBackup}
        onCancel={handleCancelRestore}
        onConfirm={handleConfirmRestore}
      />
    </div>
  )
}

function RestoreConfirmationDialog({
  open,
  parsedBackup,
  onCancel,
  onConfirm,
}: {
  open: boolean
  parsedBackup: ParsedBackupPreview | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const counts = parsedBackup?.counts

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmRestoreTitle')}</DialogTitle>
          <DialogDescription>{t('confirmRestoreDescription')}</DialogDescription>
        </DialogHeader>

        {counts && (
          <div className="space-y-4">
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">
              {t('backupCurrentDataWillBeReplaced')}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {getRestoreCountRows(counts).map((row) => (
                <div key={row.label} className="rounded-md border bg-gray-50 p-3">
                  <div className="text-gray-600">{row.label}</div>
                  <div className="text-lg font-semibold text-gray-900">{row.value}</div>
                </div>
              ))}
            </div>

            {parsedBackup.warnings.length > 0 && (
              <p className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                {t('backupCountWarning')}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('buttonCancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {t('restoreConfirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StorageUsage({ storageInfo }: { storageInfo: StorageInfo }) {
  if (!storageInfo.supported) {
    return <p className="text-sm text-gray-600">{t('storageEstimateUnavailable')}</p>
  }

  const usage = storageInfo.usage ?? 0
  const quota = storageInfo.quota
  const percentage = quota && quota > 0 ? Math.min(100, Math.max(0, (usage / quota) * 100)) : null

  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="font-medium text-gray-900">{t('storageUsed')}: </span>
          <span className="text-gray-600">{formatBytes(usage)}</span>
        </div>
        {quota !== undefined && (
          <div>
            <span className="font-medium text-gray-900">{t('storageAvailable')}: </span>
            <span className="text-gray-600">{formatBytes(quota)}</span>
          </div>
        )}
      </div>
      {percentage !== null && (
        <progress className="h-2 w-full overflow-hidden rounded-full" value={percentage} max={100} />
      )}
    </div>
  )
}

function ProgressBar({ progress }: { progress: BackupProgress | null }) {
  if (
    !progress ||
    typeof progress.current !== 'number' ||
    typeof progress.total !== 'number' ||
    progress.total <= 0
  ) {
    return null
  }

  const percentage = Math.min(100, Math.max(0, (progress.current / progress.total) * 100))

  return (
    <progress className="mt-3 h-2 w-full overflow-hidden rounded-full" value={percentage} max={100} />
  )
}

function getProgressText(progress: BackupProgress | null): string | null {
  if (!progress) return null

  switch (progress.stage) {
    case 'reading':
    case 'preparing':
    case 'packing':
    case 'downloading':
      return t('backupExporting')
    case 'parsing':
      return t('backupParsing')
    case 'restoring':
      return t('backupRestoreProgress')
    default:
      return null
  }
}

function getRestoreCountRows(counts: BackupCounts): { label: string; value: number }[] {
  return [
    { label: t('backupCountOwners'), value: counts.owners },
    { label: t('backupCountDogs'), value: counts.dogs },
    { label: t('backupCountAppointments'), value: counts.appointments },
    { label: t('backupCountNotes'), value: counts.notes },
    { label: t('backupCountTags'), value: counts.tags + counts.tagDefinitions },
    { label: t('backupCountPhotos'), value: counts.photos },
    { label: t('backupCountPhotoSessions'), value: counts.photoSessions },
  ]
}

function getBackupErrorKey(error: unknown, fallback: TranslationKey): TranslationKey {
  if (error instanceof BackupError) {
    if (error.code === 'unsupported_version') {
      return 'backupUnsupportedVersion'
    }

    if (error.code === 'invalid_file') {
      return 'backupInvalidFile'
    }
  }

  return fallback
}

function getMessageClassName(tone: 'success' | 'error' | undefined): string {
  if (tone === 'success') {
    return 'rounded-md border border-green-200 bg-green-50 p-3 text-green-900'
  }

  if (tone === 'error') {
    return 'rounded-md border border-red-200 bg-red-50 p-3 text-red-900'
  }

  return 'rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900'
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} ${t('storageUnitGb')}`
  }

  return `${mb.toFixed(1)} ${t('storageUnitMb')}`
}
