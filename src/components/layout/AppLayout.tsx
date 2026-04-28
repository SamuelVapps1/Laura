import { Outlet, useLocation } from "react-router-dom"
import { BackupWarningBanner } from "@/components/backup/BackupWarningBanner"
import { TopBar } from "./TopBar"
import { Sidebar } from "./Sidebar"
import { SearchProvider } from "@/search/SearchProvider"

export function AppLayout() {
  const location = useLocation()
  const showBackupWarning = location.pathname === "/" || location.pathname.startsWith("/calendar")

  return (
    <SearchProvider>
      <div className="min-h-screen bg-gray-50">
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
