import { t } from "@/i18n/sk"

export function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("pageSettingsTitle")}</h1>
      <p className="text-gray-600 mt-2">{t("pageSettingsDescription")}</p>
    </div>
  )
}
