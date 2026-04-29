import { liveQuery, type Subscription } from 'dexie'
import { Document, type Id } from 'flexsearch'

import type { Appointment, Dog, Owner, TagApplication, TagDefinition } from '@/db/db'
import { db } from '@/db/db'
import { normalizeSearchText } from '@/db/search'
import { formatAppointmentDateTime, getAppointmentStatusLabel, toDateInputValue } from '@/lib/appointments'
import { t } from '@/i18n/sk'
import { isTagDefinitionActive } from '@/lib/tags'

export type SearchEntityType = 'owner' | 'dog' | 'appointment' | 'tag'

export type SearchResult =
  | {
      type: 'owner'
      id: string
      title: string
      subtitle: string
      path: string
    }
  | {
      type: 'dog'
      id: string
      title: string
      subtitle: string
      path: string
    }
  | {
      type: 'appointment'
      id: string
      title: string
      subtitle: string
      path: string
    }
  | {
      type: 'tag'
      id: string
      tagId: string
      entityType: 'appointment' | 'owner' | 'dog'
      entityId: string
      title: string
      subtitle: string
      path: string
    }

export type GroupedSearchResults = {
  owners: Extract<SearchResult, { type: 'owner' }>[]
  dogs: Extract<SearchResult, { type: 'dog' }>[]
  appointments: Extract<SearchResult, { type: 'appointment' }>[]
  tags: Extract<SearchResult, { type: 'tag' }>[]
}

export type SearchIndexState = {
  ready: boolean
  building: boolean
  version: number
}

type SearchDocument = {
  id: string
  title: string
  subtitle: string
  text: string
}

type IndexedResult = {
  result: SearchResult
  searchText: string
  tagSearchText: string
  sortText: string
  sortTime: number
}

type SearchSnapshot = {
  owners: Owner[]
  dogs: Dog[]
  appointments: Appointment[]
  tagDefinitions: TagDefinition[]
  tagApplications: TagApplication[]
}

type FlexSearchResults = Array<{
  field?: string
  result: Id[]
}>

const EMPTY_RESULTS: GroupedSearchResults = {
  owners: [],
  dogs: [],
  appointments: [],
  tags: [],
}

const SEARCH_LIMITS = {
  owners: 5,
  dogs: 5,
  appointments: 5,
  tags: 8,
}

const REBUILD_DEBOUNCE_MS = 200

export let searchIndex = createSearchIndex()

let resultMap = new Map<string, IndexedResult>()
let state: SearchIndexState = {
  ready: false,
  building: false,
  version: 0,
}
let dexieSubscription: Subscription | null = null
let rebuildTimer: number | null = null
let latestSnapshot: SearchSnapshot | null = null
let initialBuildPromise: Promise<void> | null = null
let rebuilding = false
let rebuildQueued = false

const stateSubscribers = new Set<(state: SearchIndexState) => void>()

export function getSearchIndexState(): SearchIndexState {
  return state
}

export function subscribeSearchIndexState(callback: (state: SearchIndexState) => void): () => void {
  stateSubscribers.add(callback)
  callback(state)

  return () => {
    stateSubscribers.delete(callback)
  }
}

export function initSearchIndex(): Promise<void> {
  if (state.ready) return Promise.resolve()
  if (initialBuildPromise) return initialBuildPromise

  initialBuildPromise = rebuildSearchIndex().finally(() => {
    initialBuildPromise = null
  })

  return initialBuildPromise
}

export async function rebuildSearchIndex(snapshot?: SearchSnapshot): Promise<void> {
  if (rebuilding) {
    rebuildQueued = true
    return
  }

  rebuilding = true
  setState({ building: true })

  try {
    const nextSnapshot = snapshot ?? await loadSearchSnapshot()
    buildSearchIndex(nextSnapshot)
    setState({ ready: true, building: false, version: state.version + 1 })
  } catch (error) {
    setState({ building: false })
    throw error
  } finally {
    rebuilding = false

    if (rebuildQueued) {
      rebuildQueued = false
      scheduleRebuild(latestSnapshot)
    }
  }
}

export function subscribeSearchIndexToDexie(): () => void {
  if (dexieSubscription) {
    return disposeSearchIndexSubscriptions
  }

  dexieSubscription = liveQuery(loadSearchSnapshot).subscribe({
    next(snapshot) {
      latestSnapshot = snapshot
      scheduleRebuild(snapshot)
    },
    error() {
      setState({ building: false })
    },
  })

  return disposeSearchIndexSubscriptions
}

export function disposeSearchIndexSubscriptions(): void {
  if (rebuildTimer) {
    window.clearTimeout(rebuildTimer)
    rebuildTimer = null
  }

  dexieSubscription?.unsubscribe()
  dexieSubscription = null
}

export function searchAll(query: string): GroupedSearchResults {
  const normalizedQuery = normalizeQuery(query)
  if (!state.ready || normalizedQuery.length < 2) return EMPTY_RESULTS

  const matchedIds = new Set<string>()
  const flexResults = searchIndex.search(normalizedQuery, { limit: 80 }) as FlexSearchResults

  for (const fieldResult of flexResults) {
    for (const id of fieldResult.result) {
      matchedIds.add(String(id))
    }
  }

  for (const [id, indexed] of Array.from(resultMap.entries())) {
    if (matchesIndexedResult(indexed, normalizedQuery)) {
      matchedIds.add(id)
    }
  }

  const matchedResults = Array.from(matchedIds)
    .map((id) => resultMap.get(id))
    .filter((result): result is IndexedResult => !!result)

  return {
    owners: sortAndLimit(
      matchedResults.filter((result) => result.result.type === 'owner'),
      normalizedQuery,
      SEARCH_LIMITS.owners
    ).map((result) => result.result as Extract<SearchResult, { type: 'owner' }>),
    dogs: sortAndLimit(
      matchedResults.filter((result) => result.result.type === 'dog'),
      normalizedQuery,
      SEARCH_LIMITS.dogs
    ).map((result) => result.result as Extract<SearchResult, { type: 'dog' }>),
    appointments: sortAndLimit(
      matchedResults.filter((result) => result.result.type === 'appointment'),
      normalizedQuery,
      SEARCH_LIMITS.appointments
    ).map((result) => result.result as Extract<SearchResult, { type: 'appointment' }>),
    tags: sortAndLimit(
      matchedResults.filter((result) => result.result.type === 'tag'),
      normalizedQuery,
      SEARCH_LIMITS.tags
    ).map((result) => result.result as Extract<SearchResult, { type: 'tag' }>),
  }
}

function createSearchIndex(): Document<SearchDocument> {
  return new Document<SearchDocument>({
    tokenize: 'forward',
    encoder: 'Normalize',
    document: {
      id: 'id',
      index: ['title', 'subtitle', 'text'],
    },
  })
}

function buildSearchIndex(snapshot: SearchSnapshot): void {
  const nextIndex = createSearchIndex()
  const nextResultMap = new Map<string, IndexedResult>()
  const ownerMap = new Map(snapshot.owners.map((owner) => [owner.id, owner]))
  const dogMap = new Map(snapshot.dogs.map((dog) => [dog.id, dog]))
  const appointmentMap = new Map(snapshot.appointments.map((appointment) => [appointment.id, appointment]))
  const tagMap = new Map(snapshot.tagDefinitions.map((tag) => [tag.id, tag]))

  for (const owner of snapshot.owners) {
    addIndexedResult(nextIndex, nextResultMap, buildOwnerResult(owner))
  }

  for (const dog of snapshot.dogs) {
    addIndexedResult(nextIndex, nextResultMap, buildDogResult(dog, ownerMap.get(dog.ownerId)))
  }

  for (const appointment of snapshot.appointments) {
    const dog = dogMap.get(appointment.dogId)
    const owner = ownerMap.get(appointment.ownerId)
    if (!dog || !owner) continue

    addIndexedResult(nextIndex, nextResultMap, buildAppointmentResult(appointment, dog, owner))
  }

  for (const application of snapshot.tagApplications) {
    const tag = tagMap.get(application.tagId)
    if (!tag || !isTagDefinitionActive(tag)) continue

    const tagResult = buildTagResult(application, tag, ownerMap, dogMap, appointmentMap)
    if (tagResult) {
      addIndexedResult(nextIndex, nextResultMap, tagResult)
    }
  }

  searchIndex = nextIndex
  resultMap = nextResultMap
}

function addIndexedResult(
  index: Document<SearchDocument>,
  map: Map<string, IndexedResult>,
  indexed: IndexedResult
): void {
  map.set(indexed.result.id, indexed)
  index.add({
    id: indexed.result.id,
    title: normalizeSearchText(indexed.result.title),
    subtitle: normalizeSearchText(indexed.result.subtitle),
    text: indexed.result.type === 'tag' ? indexed.tagSearchText : indexed.searchText,
  })
}

function buildOwnerResult(owner: Owner): IndexedResult {
  const subtitle = [owner.phone, owner.email].filter(Boolean).join(' • ')
  const searchText = combineSearchText([
    owner.fullName,
    owner.phone,
    compactPhone(owner.phone),
    owner.email,
    owner.notes,
    owner._search,
  ])

  return {
    result: {
      type: 'owner',
      id: `owner:${owner.id}`,
      title: owner.fullName,
      subtitle,
      path: `/owners/${owner.id}`,
    },
    searchText,
    tagSearchText: '',
    sortText: normalizeSearchText(owner.fullName),
    sortTime: 0,
  }
}

function buildDogResult(dog: Dog, owner?: Owner): IndexedResult {
  const subtitle = [dog.breed, owner?.fullName].filter(Boolean).join(' • ')
  const searchText = combineSearchText([
    dog.name,
    dog.breed,
    dog.color,
    dog._search,
    owner?.fullName,
    owner?.phone,
    compactPhone(owner?.phone),
    owner?.email,
  ])

  return {
    result: {
      type: 'dog',
      id: `dog:${dog.id}`,
      title: dog.name,
      subtitle,
      path: `/dogs/${dog.id}`,
    },
    searchText,
    tagSearchText: '',
    sortText: normalizeSearchText(`${dog.name} ${owner?.fullName ?? ''}`),
    sortTime: 0,
  }
}

function buildAppointmentResult(appointment: Appointment, dog: Dog, owner: Owner): IndexedResult {
  const dateInput = toDateInputValue(new Date(appointment.startsAt))
  const readableDate = formatAppointmentDateTime(appointment)
  const statusLabel = getAppointmentStatusLabel(appointment.status)
  const service = appointment.serviceName ?? t('appointmentNoService')
  const searchText = combineSearchText([
    dog.name,
    dog.breed,
    owner.fullName,
    owner.phone,
    compactPhone(owner.phone),
    appointment.serviceName,
    appointment.status,
    statusLabel,
    dateInput,
    readableDate,
    appointment._search,
  ])

  return {
    result: {
      type: 'appointment',
      id: `appointment:${appointment.id}`,
      title: `${dog.name} • ${readableDate}`,
      subtitle: [owner.fullName, service, statusLabel].filter(Boolean).join(' • '),
      path: `/calendar/appt/${appointment.id}`,
    },
    searchText,
    tagSearchText: '',
    sortText: normalizeSearchText(`${dog.name} ${readableDate}`),
    sortTime: new Date(appointment.startsAt).getTime(),
  }
}

function buildTagResult(
  application: TagApplication,
  tag: TagDefinition,
  ownerMap: Map<string, Owner>,
  dogMap: Map<string, Dog>,
  appointmentMap: Map<string, Appointment>
): IndexedResult | null {
  const tagId = `tagentity:${application.entityType}:${application.entityId}:${application.tagId}`
  const tagSearchText = combineSearchText([tag.label, tag._search])
  const base = {
    type: 'tag' as const,
    id: tagId,
    tagId: tag.id,
    entityType: application.entityType,
    entityId: application.entityId,
    title: tag.label,
  }

  if (application.entityType === 'owner') {
    const owner = ownerMap.get(application.entityId)
    if (!owner) return null

    const subtitle = `${t('searchResultOwner')}: ${owner.fullName}`
    return {
      result: {
        ...base,
        subtitle,
        path: `/owners/${owner.id}`,
      },
      searchText: tagSearchText,
      tagSearchText,
      sortText: normalizeSearchText(`${tag.label} ${subtitle}`),
      sortTime: 0,
    }
  }

  if (application.entityType === 'dog') {
    const dog = dogMap.get(application.entityId)
    if (!dog) return null

    const subtitle = `${t('searchResultDog')}: ${dog.name}`
    return {
      result: {
        ...base,
        subtitle,
        path: `/dogs/${dog.id}`,
      },
      searchText: tagSearchText,
      tagSearchText,
      sortText: normalizeSearchText(`${tag.label} ${subtitle}`),
      sortTime: 0,
    }
  }

  const appointment = appointmentMap.get(application.entityId)
  if (!appointment) return null

  const dog = dogMap.get(appointment.dogId)
  if (!dog) return null

  const subtitle = `${t('searchResultAppointment')}: ${dog.name} • ${formatAppointmentDateTime(appointment)}`
  return {
    result: {
      ...base,
      subtitle,
      path: `/calendar/appt/${appointment.id}`,
    },
    searchText: tagSearchText,
    tagSearchText,
    sortText: normalizeSearchText(`${tag.label} ${subtitle}`),
    sortTime: new Date(appointment.startsAt).getTime(),
  }
}

function matchesIndexedResult(indexed: IndexedResult, query: string): boolean {
  const searchText = indexed.result.type === 'tag' ? indexed.tagSearchText : indexed.searchText
  if (searchText.includes(query)) return true

  const queryParts = query.split(' ').filter(Boolean)
  return queryParts.length > 1 && queryParts.every((part) => searchText.includes(part))
}

function sortAndLimit(results: IndexedResult[], query: string, limit: number): IndexedResult[] {
  return results
    .sort((first, second) => {
      const firstScore = getMatchScore(first, query)
      const secondScore = getMatchScore(second, query)
      if (firstScore !== secondScore) return firstScore - secondScore

      if (first.result.type === 'appointment' && second.result.type === 'appointment') {
        return second.sortTime - first.sortTime
      }

      return first.sortText.localeCompare(second.sortText, 'sk')
    })
    .slice(0, limit)
}

function getMatchScore(indexed: IndexedResult, query: string): number {
  const title = normalizeSearchText(indexed.result.title)
  const searchText = indexed.result.type === 'tag' ? indexed.tagSearchText : indexed.searchText

  if (title === query) return 0
  if (title.startsWith(query)) return 1
  if (searchText.split(' ').some((part) => part.startsWith(query))) return 2
  if (searchText.includes(query)) return 3
  return 4
}

async function loadSearchSnapshot(): Promise<SearchSnapshot> {
  const [owners, dogs, appointments, tagDefinitions, tagApplications] = await Promise.all([
    db.owners.toArray(),
    db.dogs.toArray(),
    db.appointments.toArray(),
    db.tagDefinitions.toArray(),
    db.tagApplications.toArray(),
  ])

  return {
    owners,
    dogs,
    appointments,
    tagDefinitions,
    tagApplications,
  }
}

function scheduleRebuild(snapshot: SearchSnapshot | null): void {
  if (rebuildTimer) {
    window.clearTimeout(rebuildTimer)
  }

  rebuildTimer = window.setTimeout(() => {
    rebuildTimer = null
    void rebuildSearchIndex(snapshot ?? undefined).catch(() => undefined)
  }, REBUILD_DEBOUNCE_MS)
}

function setState(patch: Partial<SearchIndexState>): void {
  state = {
    ...state,
    ...patch,
  }

  for (const callback of Array.from(stateSubscribers)) {
    callback(state)
  }
}

function combineSearchText(parts: Array<string | null | undefined>): string {
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

function normalizeQuery(query: string): string {
  return normalizeSearchText(query)
}

function compactPhone(value: string | null | undefined): string {
  return value?.replace(/\D/g, '') ?? ''
}
