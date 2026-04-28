import { db, type EntityId, type PhotoAsset, type PhotoKind, type PhotoSession } from '../db'
import { DB_ERROR } from '../errors'
import { generateId } from '../ids'

const PHOTO_KINDS = ['before', 'after'] as const satisfies readonly PhotoKind[]

export type PhotoBlobInput = {
  blob: Blob
  width: number | null
  height: number | null
  sizeBytes: number
}

export type ReplaceSessionPhotoInput = {
  sessionId: EntityId
  kind: PhotoKind
  full: PhotoBlobInput
  thumb: PhotoBlobInput
}

export type SessionPhotos = {
  before: {
    full: PhotoAsset | null
    thumb: PhotoAsset | null
  }
  after: {
    full: PhotoAsset | null
    thumb: PhotoAsset | null
  }
}

export async function getOrCreatePhotoSessionForAppointment(appointmentId: EntityId): Promise<PhotoSession> {
  return db.transaction('rw', db.appointments, db.photoSessions, async () => {
    const appointment = await db.appointments.get(appointmentId)
    if (!appointment) {
      throw new Error(DB_ERROR.APPOINTMENT_NOT_FOUND)
    }

    const existing = await db.photoSessions.get(appointment.id)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const session: PhotoSession = {
      id: appointment.id,
      appointmentId: appointment.id,
      dogId: appointment.dogId,
      createdAt: now,
      updatedAt: now,
    }

    await db.photoSessions.add(session)
    return session
  })
}

export async function replaceSessionPhoto(input: ReplaceSessionPhotoInput): Promise<void> {
  const kind = validatePhotoKind(input.kind)

  await db.transaction('rw', db.photoSessions, db.photos, async () => {
    const session = await db.photoSessions.get(input.sessionId)
    if (!session) {
      throw new Error(DB_ERROR.PHOTO_SESSION_NOT_FOUND)
    }

    const now = new Date().toISOString()
    const groupId = generateId()

    await db.photos.where('[sessionId+kind]').equals([session.id, kind]).delete()
    await db.photos.bulkAdd([
      buildPhotoAsset(session, groupId, kind, 'full', input.full, now),
      buildPhotoAsset(session, groupId, kind, 'thumb', input.thumb, now),
    ])
    await db.photoSessions.update(session.id, { updatedAt: now })
  })
}

export async function getSessionPhotos(sessionId: EntityId): Promise<SessionPhotos> {
  const rows = await db.photos.where('sessionId').equals(sessionId).toArray()

  return rows.reduce<SessionPhotos>(
    (photos, photo) => {
      photos[photo.kind][photo.variant] = photo
      return photos
    },
    {
      before: { full: null, thumb: null },
      after: { full: null, thumb: null },
    }
  )
}

export async function getSessionComparison(sessionId: EntityId): Promise<SessionPhotos> {
  return getSessionPhotos(sessionId)
}

export async function getDogPhotoSessions(dogId: EntityId): Promise<PhotoSession[]> {
  const sessions = await db.photoSessions.where('dogId').equals(dogId).toArray()
  return sessions.sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
}

export async function deleteSessionPhoto(sessionId: EntityId, kind: PhotoKind): Promise<void> {
  const validatedKind = validatePhotoKind(kind)

  await db.transaction('rw', db.photoSessions, db.photos, async () => {
    const session = await db.photoSessions.get(sessionId)
    if (!session) {
      throw new Error(DB_ERROR.PHOTO_SESSION_NOT_FOUND)
    }

    await db.photos.where('[sessionId+kind]').equals([sessionId, validatedKind]).delete()
    await db.photoSessions.update(sessionId, { updatedAt: new Date().toISOString() })
  })
}

function buildPhotoAsset(
  session: PhotoSession,
  groupId: EntityId,
  kind: PhotoKind,
  variant: PhotoAsset['variant'],
  input: PhotoBlobInput,
  createdAt: string
): PhotoAsset {
  return {
    id: generateId(),
    sessionId: session.id,
    appointmentId: session.appointmentId,
    dogId: session.dogId,
    groupId,
    kind,
    variant,
    blob: input.blob,
    mimeType: 'image/webp',
    width: input.width,
    height: input.height,
    sizeBytes: input.sizeBytes,
    createdAt,
  }
}

function validatePhotoKind(kind: PhotoKind): PhotoKind {
  if (!PHOTO_KINDS.includes(kind)) {
    throw new Error(DB_ERROR.INVALID_PHOTO_KIND)
  }

  return kind
}
