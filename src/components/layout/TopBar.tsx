import { GlobalSearch } from "@/components/search/GlobalSearch"
import { t } from "@/i18n/sk"

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 flex bg-slate-900 px-4 py-3 text-white sm:min-h-14 sm:items-center sm:py-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="text-lg font-bold">{t("appName")}</span>
        </div>
        <GlobalSearch />
      </div>
    </header>
  )
}
