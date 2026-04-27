export const DB_ERROR = {
  OWNER_NOT_FOUND: 'OWNER_NOT_FOUND',
  DOG_NOT_FOUND: 'DOG_NOT_FOUND',
  OWNER_HAS_DOGS: 'OWNER_HAS_DOGS',
} as const

export type DatabaseErrorCode = (typeof DB_ERROR)[keyof typeof DB_ERROR]
