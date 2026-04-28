import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Input } from '@/components/ui/input'
import { t } from '@/i18n/sk'
import { searchAll, type GroupedSearchResults, type SearchResult } from '@/search'
import { useSearchIndexState } from '@/search/SearchProvider'
import { cn } from '@/lib/utils'

type SearchSection = {
  key: keyof GroupedSearchResults
  label: string
  results: SearchResult[]
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 200

export function GlobalSearch() {
  const navigate = useNavigate()
  const { ready, building, version } = useSearchIndexState()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const queryIsSearchable = debouncedQuery.trim().length >= MIN_QUERY_LENGTH
  const groupedResults = useMemo(
    () => queryIsSearchable ? searchAll(debouncedQuery) : emptyResults(),
    [debouncedQuery, queryIsSearchable, version]
  )
  const sections = useMemo(() => buildSections(groupedResults), [groupedResults])
  const flatResults = useMemo(() => sections.flatMap((section) => section.results), [sections])
  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH
  const waitingForDebounce = query.trim() !== debouncedQuery.trim()
  const loading = showDropdown && (!ready || (building && !ready) || waitingForDebounce)

  useEffect(() => {
    setActiveIndex(0)
  }, [debouncedQuery, version])

  function openResult(result: SearchResult): void {
    navigate(result.path)
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    if (!showDropdown || flatResults.length === 0) {
      if (event.key === 'Enter' && flatResults[0]) {
        openResult(flatResults[0])
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % flatResults.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + flatResults.length) % flatResults.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      openResult(flatResults[activeIndex] ?? flatResults[0])
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(event.target.value.trim().length >= MIN_QUERY_LENGTH)
        }}
        onFocus={() => setOpen(query.trim().length >= MIN_QUERY_LENGTH)}
        onKeyDown={handleKeyDown}
        placeholder={t('globalSearchPlaceholder')}
        className="h-9 border-slate-700 bg-slate-800 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-slate-400 focus-visible:ring-offset-slate-900"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
      />

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-full min-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-slate-200 bg-white py-2 text-slate-900 shadow-lg"
        >
          {loading ? (
            <SearchMessage>{t('globalSearchLoading')}</SearchMessage>
          ) : flatResults.length === 0 ? (
            <SearchMessage>{t('globalSearchNoResults')}</SearchMessage>
          ) : (
            <div className="grid gap-2">
              {sections.map((section) => (
                <SearchResultSection
                  key={section.key}
                  section={section}
                  activeIndex={activeIndex}
                  flatResults={flatResults}
                  onOpenResult={openResult}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchResultSection({
  section,
  activeIndex,
  flatResults,
  onOpenResult,
}: {
  section: SearchSection
  activeIndex: number
  flatResults: SearchResult[]
  onOpenResult: (result: SearchResult) => void
}) {
  return (
    <section>
      <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {section.label}
      </h2>
      <div className="grid">
        {section.results.map((result) => {
          const resultIndex = flatResults.findIndex((candidate) => candidate.id === result.id)
          const active = resultIndex === activeIndex

          return (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected={active}
              aria-label={t('globalSearchOpenResult')}
              className={cn(
                'grid gap-0.5 px-3 py-2 text-left transition-colors',
                active ? 'bg-slate-100' : 'hover:bg-slate-50'
              )}
              onClick={() => onOpenResult(result)}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <span className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                  {getResultTypeLabel(result)}
                </span>
                <span className="min-w-0 truncate">{result.title}</span>
              </span>
              {result.subtitle && (
                <span className="truncate text-xs text-slate-500">{result.subtitle}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function SearchMessage({ children }: { children: string }) {
  return <p className="px-3 py-4 text-sm text-slate-500">{children}</p>
}

function buildSections(results: GroupedSearchResults): SearchSection[] {
  const sections: SearchSection[] = [
    { key: 'owners', label: t('globalSearchOwners'), results: results.owners },
    { key: 'dogs', label: t('globalSearchDogs'), results: results.dogs },
    { key: 'appointments', label: t('globalSearchAppointments'), results: results.appointments },
    { key: 'tags', label: t('globalSearchTags'), results: results.tags },
  ]

  return sections.filter((section) => section.results.length > 0)
}

function getResultTypeLabel(result: SearchResult): string {
  if (result.type === 'owner') return t('searchResultOwner')
  if (result.type === 'dog') return t('searchResultDog')
  if (result.type === 'appointment') return t('searchResultAppointment')
  return t('searchResultTag')
}

function emptyResults(): GroupedSearchResults {
  return {
    owners: [],
    dogs: [],
    appointments: [],
    tags: [],
  }
}
