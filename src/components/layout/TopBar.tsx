import { t } from "@/i18n/sk"
import { Search } from "lucide-react"

export function TopBar() {
  return (
    <header className="bg-slate-900 text-white h-14 flex items-center px-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="font-bold text-lg">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 w-64">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder={t("navCalendar")}
            className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 w-full"
          />
        </div>
      </div>
    </header>
  )
}
