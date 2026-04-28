import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  getSearchIndexState,
  subscribeSearchIndexState,
  subscribeSearchIndexToDexie,
  type SearchIndexState,
} from '@/search'

const SearchContext = createContext<SearchIndexState>(getSearchIndexState())

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchIndexState>(getSearchIndexState())

  useEffect(() => {
    const unsubscribeState = subscribeSearchIndexState(setState)
    const unsubscribeDexie = subscribeSearchIndexToDexie()

    return () => {
      unsubscribeState()
      unsubscribeDexie()
    }
  }, [])

  return (
    <SearchContext.Provider value={state}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchIndexState(): SearchIndexState {
  return useContext(SearchContext)
}
