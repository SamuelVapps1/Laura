export const sk = {
  appName: "Salón pre psov",
  navCalendar: "Kalendár",
  navOwners: "Majitelia",
  navDogs: "Psíky",
  navTags: "Štítky",
  navSettings: "Nastavenia",
  pageCalendarTitle: "Kalendár",
  pageOwnersTitle: "Majitelia",
  pageDogsTitle: "Psíky",
  pageTagsTitle: "Štítky",
  pageSettingsTitle: "Nastavenia",
} as const

export type TranslationKey = keyof typeof sk

export function t(key: TranslationKey): string {
  return sk[key]
}
