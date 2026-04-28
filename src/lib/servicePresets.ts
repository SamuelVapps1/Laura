import type { TranslationKey } from '@/i18n/sk'

export type ServicePresetDef = {
  id: string
  labelKey: TranslationKey
  durationMinutes: number | null
  price: number | null
}

/** Fixed local service presets (no DB). Last entry must be custom / “Iná služba”. */
export const SERVICE_PRESETS = [
  {
    id: 'small_grooming',
    labelKey: 'servicePresetSmallGrooming',
    durationMinutes: 60,
    price: 25,
  },
  {
    id: 'medium_grooming',
    labelKey: 'servicePresetMediumGrooming',
    durationMinutes: 90,
    price: 35,
  },
  {
    id: 'large_grooming',
    labelKey: 'servicePresetLargeGrooming',
    durationMinutes: 120,
    price: 45,
  },
  {
    id: 'bath',
    labelKey: 'servicePresetBath',
    durationMinutes: 60,
    price: 25,
  },
  {
    id: 'nails',
    labelKey: 'servicePresetNails',
    durationMinutes: 20,
    price: 8,
  },
  {
    id: 'custom',
    labelKey: 'serviceCustom',
    durationMinutes: null,
    price: null,
  },
] as const satisfies readonly ServicePresetDef[]

export type ServicePresetId = (typeof SERVICE_PRESETS)[number]['id']

export const CUSTOM_SERVICE_PRESET_ID = 'custom' as const satisfies ServicePresetId

export function getServicePresetById(id: string): ServicePresetDef | undefined {
  return SERVICE_PRESETS.find((preset) => preset.id === id)
}

/** Resolve which preset is selected from a stored service name (exact label match). */
export function findServicePresetIdForStoredName(
  serviceName: string | null | undefined,
  resolveLabel: (key: TranslationKey) => string
): string {
  const trimmed = serviceName?.trim()
  if (!trimmed) {
    return 'custom'
  }

  for (const preset of SERVICE_PRESETS) {
    if (preset.id === 'custom') continue
    if (resolveLabel(preset.labelKey) === trimmed) {
      return preset.id
    }
  }

  return 'custom'
}
