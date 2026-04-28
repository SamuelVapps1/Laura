import { Outlet } from "react-router-dom"
import { TopBar } from "./TopBar"
import { Sidebar } from "./Sidebar"
import { SearchProvider } from "@/search/SearchProvider"

export function AppLayout() {
  return (
    <SearchProvider>
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SearchProvider>
  )
}
