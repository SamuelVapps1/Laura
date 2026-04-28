import { db, type EntityId, type EntityNote, type NoteScope } from '../db'
import { DB_ERROR } from '../errors'
import { normalizeSearchText } from '../search'

const noteScopes = ['appointment', 'owner', 'dog'] as const satisfies readonly NoteScope[]

export async function getNote(scope: NoteScope, entityId: EntityId): Promise<EntityNote | undefined> {
  validateScope(scope)
  return db.notes.get([scope, entityId])
}

export async function upsertNote(scope: NoteScope, entityId: EntityId, text: string): Promise<EntityNote> {
  validateScope(scope)

  return db.transaction('rw', db.notes, db.appointments, db.owners, db.dogs, async () => {
    await validateEntityExists(scope, entityId)

    const existing = await db.notes.get([scope, entityId])
    const now = new Date().toISOString()
    const note: EntityNote = {
      scope,
      entityId,
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      _search: normalizeSearchText(text),
    }

    await db.notes.put(note)
    return note
  })
}

export async function deleteNote(scope: NoteScope, entityId: EntityId): Promise<void> {
  validateScope(scope)
  await db.notes.delete([scope, entityId])
}

function validateScope(scope: NoteScope): void {
  if (!noteScopes.includes(scope)) {
    throw new Error(DB_ERROR.INVALID_NOTE_SCOPE)
  }
}

async function validateEntityExists(scope: NoteScope, entityId: EntityId): Promise<void> {
  switch (scope) {
    case 'appointment': {
      const appointment = await db.appointments.get(entityId)
      if (!appointment) throw new Error(DB_ERROR.APPOINTMENT_NOT_FOUND)
      return
    }
    case 'owner': {
      const owner = await db.owners.get(entityId)
      if (!owner) throw new Error(DB_ERROR.OWNER_NOT_FOUND)
      return
    }
    case 'dog': {
      const dog = await db.dogs.get(entityId)
      if (!dog) throw new Error(DB_ERROR.DOG_NOT_FOUND)
      return
    }
  }
}
