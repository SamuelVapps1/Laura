import {
  db,
  type EntityId,
  type EntityNote,
  type NoteScope,
  type PhotoAsset,
  type PhotoSession,
  type TagApplication,
  type TagScope,
} from '@/db/db'

export type OrphanCleanupCounts = {
  notes: number
  tagApplications: number
  legacyDogTags: number
  photoSessions: number
  photos: number
}

export async function cleanupDanglingReferences(): Promise<OrphanCleanupCounts> {
  return db.transaction(
    'rw',
    [
      db.owners,
      db.dogs,
      db.appointments,
      db.tags,
      db.dogTags,
      db.notes,
      db.tagDefinitions,
      db.tagApplications,
      db.photoSessions,
      db.photos,
    ],
    async () => {
      const [
        owners,
        dogs,
        appointments,
        legacyTags,
        legacyDogTags,
        notes,
        tagDefinitions,
        tagApplications,
        photoSessions,
        photos,
      ] = await Promise.all([
        db.owners.toArray(),
        db.dogs.toArray(),
        db.appointments.toArray(),
        db.tags.toArray(),
        db.dogTags.toArray(),
        db.notes.toArray(),
        db.tagDefinitions.toArray(),
        db.tagApplications.toArray(),
        db.photoSessions.toArray(),
        db.photos.toArray(),
      ])

      const counts: OrphanCleanupCounts = {
        notes: 0,
        tagApplications: 0,
        legacyDogTags: 0,
        photoSessions: 0,
        photos: 0,
      }

      const ownerIds = new Set(owners.map((owner) => owner.id))
      const dogIds = new Set(dogs.map((dog) => dog.id))
      const appointmentIds = new Set(appointments.map((appointment) => appointment.id))
      const legacyTagIds = new Set(legacyTags.map((tag) => tag.id))
      const tagDefinitionIds = new Set(tagDefinitions.map((tag) => tag.id))
      const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]))
      const photoSessionsById = new Map(photoSessions.map((session) => [session.id, session]))
      const invalidPhotoSessionIds = new Set<EntityId>()

      for (const note of notes) {
        if (!noteTargetExists(note, ownerIds, dogIds, appointmentIds)) {
          await db.notes.delete([note.scope, note.entityId])
          counts.notes += 1
        }
      }

      for (const application of tagApplications) {
        if (
          !tagDefinitionIds.has(application.tagId) ||
          !tagApplicationTargetExists(application, ownerIds, dogIds, appointmentIds)
        ) {
          await db.tagApplications.delete([
            application.tagId,
            application.entityType,
            application.entityId,
          ])
          counts.tagApplications += 1
        }
      }

      for (const dogTag of legacyDogTags) {
        if (!dogIds.has(dogTag.dogId) || !legacyTagIds.has(dogTag.tagId)) {
          await db.dogTags.delete(dogTag.id)
          counts.legacyDogTags += 1
        }
      }

      for (const session of photoSessions) {
        if (!photoSessionTargetIsValid(session, dogIds, appointmentsById)) {
          invalidPhotoSessionIds.add(session.id)
          await db.photoSessions.delete(session.id)
          counts.photoSessions += 1
        }
      }

      for (const photo of photos) {
        const session = invalidPhotoSessionIds.has(photo.sessionId)
          ? undefined
          : photoSessionsById.get(photo.sessionId)

        if (!photoTargetIsValid(photo, session, dogIds, appointmentIds)) {
          await db.photos.delete(photo.id)
          counts.photos += 1
        }
      }

      return counts
    }
  )
}

function noteTargetExists(
  note: EntityNote,
  ownerIds: Set<EntityId>,
  dogIds: Set<EntityId>,
  appointmentIds: Set<EntityId>
): boolean {
  return entityExists(note.scope, note.entityId, ownerIds, dogIds, appointmentIds)
}

function tagApplicationTargetExists(
  application: TagApplication,
  ownerIds: Set<EntityId>,
  dogIds: Set<EntityId>,
  appointmentIds: Set<EntityId>
): boolean {
  return entityExists(application.entityType, application.entityId, ownerIds, dogIds, appointmentIds)
}

function entityExists(
  scope: NoteScope | TagScope,
  entityId: EntityId,
  ownerIds: Set<EntityId>,
  dogIds: Set<EntityId>,
  appointmentIds: Set<EntityId>
): boolean {
  if (scope === 'owner') return ownerIds.has(entityId)
  if (scope === 'dog') return dogIds.has(entityId)
  return appointmentIds.has(entityId)
}

function photoSessionTargetIsValid(
  session: PhotoSession,
  dogIds: Set<EntityId>,
  appointmentsById: Map<EntityId, { dogId: EntityId }>
): boolean {
  const appointment = appointmentsById.get(session.appointmentId)
  return !!appointment && dogIds.has(session.dogId) && appointment.dogId === session.dogId
}

function photoTargetIsValid(
  photo: PhotoAsset,
  session: PhotoSession | undefined,
  dogIds: Set<EntityId>,
  appointmentIds: Set<EntityId>
): boolean {
  return (
    !!session &&
    appointmentIds.has(photo.appointmentId) &&
    dogIds.has(photo.dogId) &&
    photo.appointmentId === session.appointmentId &&
    photo.dogId === session.dogId
  )
}
