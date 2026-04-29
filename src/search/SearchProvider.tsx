/* eslint-disable react-refresh/only-export-components */
// This file intentionally exports provider and hook helpers together for its public API.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  getSearchIndexState,
  initSearchIndex,
  subscribeSearchIndexState,
  subscribeSearchIndexToDexie,
  type SearchIndexState,
} from '@/search'

const SearchContext = createContext<SearchIndexState>(getSearchIndexState())

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchIndexState>(getSearchIndexState())

  useEffect(() => {
    const unsubscribeState = subscribeSearchIndexState(setState)
    void initSearchIndex().catch(() => undefined)
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
