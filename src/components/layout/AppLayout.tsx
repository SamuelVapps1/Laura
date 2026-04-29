import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppBusyOverlay } from '@/components/AppBusyOverlay'
import { BackupWarningBanner } from '@/components/backup/BackupWarningBanner'
import { SearchProvider } from '@/search/SearchProvider'
import { requestPersistentStorageOnce } from '@/lib/storagePersistence'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const location = useLocation()
  const showBackupWarning =
    location.pathname === '/' ||
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/calendar')

  useEffect(() => {
    void requestPersistentStorageOnce().catch(() => undefined)
  }, [])

  return (
    <SearchProvider>
      <div className="min-h-screen bg-gray-50">
        <AppBusyOverlay />
        <TopBar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            {showBackupWarning && <BackupWarningBanner />}
            <Outlet />
          </main>
        </div>
      </div>
    </SearchProvider>
  )
}
