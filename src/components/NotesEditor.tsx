import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { Textarea } from '@/components/ui/textarea'
import type { NoteScope } from '@/db/db'
import { db } from '@/db/db'
import { upsertNote } from '@/db/repositories/notes'
import { t } from '@/i18n/sk'
import { cn } from '@/lib/utils'

interface NotesEditorProps {
  scope: NoteScope
  entityId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type QueuedSave = {
  scope: NoteScope
  entityId: string
  text: string
  silent: boolean
}

export function NotesEditor({ scope, entityId }: NotesEditorProps) {
  const queryKey = useMemo(() => `${scope}:${entityId}`, [scope, entityId])
  const note = useLiveQuery(
    () => db.notes.get([scope, entityId]),
    [scope, entityId],
    undefined
  )

  const [text, setText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const latestTextRef = useRef(text)
  const latestSavedTextRef = useRef(savedText)
  const latestDirtyRef = useRef(isDirty)
  const latestScopeRef = useRef(scope)
  const latestEntityIdRef = useRef(entityId)
  const saveTimerRef = useRef<number>()
  const savedIndicatorTimerRef = useRef<number>()
  const isSavingRef = useRef(false)
  const queuedSaveRef = useRef<QueuedSave | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    latestTextRef.current = text
  }, [text])

  useEffect(() => {
    latestSavedTextRef.current = savedText
  }, [savedText])

  useEffect(() => {
    latestDirtyRef.current = isDirty
  }, [isDirty])

  const setTextValue = (nextText: string) => {
    latestTextRef.current = nextText
    setText(nextText)
  }

  const setSavedTextValue = useCallback((nextSavedText: string) => {
    latestSavedTextRef.current = nextSavedText
    if (isMountedRef.current) {
      setSavedText(nextSavedText)
    }
  }, [])

  const setDirtyValue = useCallback((nextDirty: boolean) => {
    latestDirtyRef.current = nextDirty
    if (isMountedRef.current) {
      setIsDirty(nextDirty)
    }
  }, [])

  const saveNow = useCallback(async (
    nextText: string,
    options: { silent?: boolean; scope?: NoteScope; entityId?: string } = {}
  ): Promise<void> => {
    const targetScope = options.scope ?? latestScopeRef.current
    const targetEntityId = options.entityId ?? latestEntityIdRef.current
    const silent = options.silent ?? false

    if (isSavingRef.current) {
      queuedSaveRef.current = {
        scope: targetScope,
        entityId: targetEntityId,
        text: nextText,
        silent,
      }
      return
    }

    isSavingRef.current = true

    if (!silent && isMountedRef.current) {
      setStatus('saving')
    }

    try {
      const saved = await upsertNote(targetScope, targetEntityId, nextText)
      const isCurrentEntity =
        latestScopeRef.current === targetScope &&
        latestEntityIdRef.current === targetEntityId

      if (isCurrentEntity) {
        const hasPendingChanges = latestTextRef.current !== saved.text
        setSavedTextValue(saved.text)
        setDirtyValue(hasPendingChanges)

        window.clearTimeout(savedIndicatorTimerRef.current)
        if (!silent && isMountedRef.current) {
          if (hasPendingChanges) {
            setStatus('idle')
          } else {
            setStatus('saved')
            savedIndicatorTimerRef.current = window.setTimeout(() => {
              setStatus((currentStatus) => currentStatus === 'saved' ? 'idle' : currentStatus)
            }, 1600)
          }
        }
      }
    } catch {
      if (!silent && isMountedRef.current) {
        setStatus('error')
      }
    } finally {
      isSavingRef.current = false

      const queuedSave = queuedSaveRef.current
      queuedSaveRef.current = null

      if (queuedSave) {
        const isCurrentQueuedEntity =
          latestScopeRef.current === queuedSave.scope &&
          latestEntityIdRef.current === queuedSave.entityId
        const queuedTextChanged = isCurrentQueuedEntity
          ? queuedSave.text !== latestSavedTextRef.current
          : true

        if (queuedTextChanged) {
          await saveNow(queuedSave.text, {
            scope: queuedSave.scope,
            entityId: queuedSave.entityId,
            silent: queuedSave.silent,
          })
        }
      }
    }
  }, [setDirtyValue, setSavedTextValue])

  useEffect(() => {
    latestScopeRef.current = scope
    latestEntityIdRef.current = entityId

    return () => {
      window.clearTimeout(saveTimerRef.current)

      const pendingText = latestTextRef.current
      if (latestDirtyRef.current && pendingText !== latestSavedTextRef.current) {
        void saveNow(pendingText, { scope, entityId, silent: true })
      }
    }
  }, [entityId, saveNow, scope])

  useEffect(() => {
    if (note === undefined && loadedKey === queryKey) return

    const nextText = note?.text ?? ''
    if (loadedKey !== queryKey || !isDirty) {
      setTextValue(nextText)
      setSavedTextValue(nextText)
      setLoadedKey(queryKey)
      setDirtyValue(false)
      setStatus('idle')
    }
  }, [isDirty, loadedKey, note, queryKey, setDirtyValue, setSavedTextValue])

  useEffect(() => {
    if (!isDirty || text === savedText) return

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow(text)
    }, 400)

    return () => window.clearTimeout(saveTimerRef.current)
  }, [isDirty, saveNow, savedText, text])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      window.clearTimeout(saveTimerRef.current)
      window.clearTimeout(savedIndicatorTimerRef.current)
    }
  }, [])

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(event.target.value)
    setDirtyValue(true)
    if (status === 'saved') {
      setStatus('idle')
    }
  }

  const handleBlur = () => {
    window.clearTimeout(saveTimerRef.current)

    const pendingText = latestTextRef.current
    if (!latestDirtyRef.current || pendingText === latestSavedTextRef.current) return

    void saveNow(pendingText)
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={t('labelNotes')}
        className="min-h-[120px]"
      />
      <p
        className={cn(
          "min-h-5 text-sm text-muted-foreground",
          status === 'error' && "text-red-500"
        )}
        aria-live="polite"
      >
        {status === 'saving' && t('notesSaving')}
        {status === 'saved' && t('notesSaved')}
        {status === 'error' && t('notesSaveError')}
      </p>
    </div>
  )
}
