import { t } from "@/i18n/sk"

export function CalendarPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("pageCalendarTitle")}</h1>
      <p className="text-gray-600 mt-2">Stránka kalendára</p>
    </div>
  )
}
