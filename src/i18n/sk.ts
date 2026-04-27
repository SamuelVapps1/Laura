export const sk = {
  appName: "Salón pre psov",
  navCalendar: "Kalendár",
  navOwners: "Majitelia",
  navDogs: "Psíky",
  navTags: "Štítky",
  navSettings: "Nastavenia",
  pageCalendarTitle: "Kalendár",
  pageCalendarDescription: "Správa termínov a kalendár",
  pageOwnersTitle: "Majitelia",
  pageOwnersDescription: "Správa majiteľov psov",
  pageDogsTitle: "Psíky",
  pageDogsDescription: "Správa psíkov",
  pageTagsTitle: "Štítky",
  pageTagsDescription: "Správa štítkov",
  pageSettingsTitle: "Nastavenia",
  pageSettingsDescription: "Nastavenia aplikácie",
} as const

export type TranslationKey = keyof typeof sk

export function t(key: TranslationKey): string {
  return sk[key]
}
