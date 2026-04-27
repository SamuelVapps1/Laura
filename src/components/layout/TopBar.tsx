import { t } from "@/i18n/sk"

export function TopBar() {
  return (
    <header className="bg-slate-900 text-white h-14 flex items-center px-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="font-bold text-lg">{t("appName")}</span>
        </div>
      </div>
    </header>
  )
}
