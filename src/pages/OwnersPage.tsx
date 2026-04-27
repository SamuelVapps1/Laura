import { t } from "@/i18n/sk"

export function OwnersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("pageOwnersTitle")}</h1>
      <p className="text-gray-600 mt-2">Stránka majiteľov</p>
    </div>
  )
}
