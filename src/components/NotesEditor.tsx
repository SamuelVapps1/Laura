import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
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
  const savedIndicatorTimerRef = useRef<number>()

  useEffect(() => {
    latestTextRef.current = text
  }, [text])

  useEffect(() => {
    if (note === undefined && loadedKey === queryKey) return

    const nextText = note?.text ?? ''
    if (loadedKey !== queryKey || !isDirty) {
      setText(nextText)
      setSavedText(nextText)
      setLoadedKey(queryKey)
      setIsDirty(false)
      setStatus('idle')
    }
  }, [isDirty, loadedKey, note, queryKey])

  useEffect(() => {
    if (!isDirty || text === savedText) return

    const pendingText = text
    const saveTimer = window.setTimeout(async () => {
      setStatus('saving')

      try {
        const saved = await upsertNote(scope, entityId, pendingText)
        const hasPendingChanges = latestTextRef.current !== saved.text
        setSavedText(saved.text)
        setIsDirty(hasPendingChanges)

        window.clearTimeout(savedIndicatorTimerRef.current)
        if (hasPendingChanges) {
          setStatus('idle')
        } else {
          setStatus('saved')
          savedIndicatorTimerRef.current = window.setTimeout(() => {
            setStatus((currentStatus) => currentStatus === 'saved' ? 'idle' : currentStatus)
          }, 1600)
        }
      } catch {
        setStatus('error')
      }
    }, 400)

    return () => window.clearTimeout(saveTimer)
  }, [entityId, isDirty, savedText, scope, text])

  useEffect(() => {
    return () => window.clearTimeout(savedIndicatorTimerRef.current)
  }, [])

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
    setIsDirty(true)
    if (status === 'saved') {
      setStatus('idle')
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={handleChange}
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
