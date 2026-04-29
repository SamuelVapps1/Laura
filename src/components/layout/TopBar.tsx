import { Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/AuthProvider"
import { GlobalSearch } from "@/components/search/GlobalSearch"
import { useSalonName } from "@/hooks/useSalonName"
import { t } from "@/i18n/sk"

export function TopBar() {
  const { passwordEnabled, lock } = useAuth()
  const salonName = useSalonName()
  const navigate = useNavigate()

  const handleLock = () => {
    lock()
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 flex bg-slate-900 px-4 py-3 text-white sm:min-h-14 sm:items-center sm:py-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="text-lg font-bold">{salonName}</span>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <GlobalSearch />
          {passwordEnabled && (
            <button
              type="button"
              onClick={handleLock}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>{t("buttonLock")}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
