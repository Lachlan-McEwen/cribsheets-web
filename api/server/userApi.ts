import type { UserRow } from './db.js'
import { signatureUpdatedAtMs, userHasSignature } from './signatures.js'

export type ApiUser = UserRow & {
  hasSignature: boolean
  signatureUpdatedAt: number | null
  profileIsComplete: boolean
  emailVerified: boolean
}

export function profileIsComplete(user: Pick<UserRow, 'name' | 'employeeNumber' | 'unitStation'>, hasSignature: boolean): boolean {
  return (
    user.name.trim() !== '' &&
    user.employeeNumber.trim() !== '' &&
    user.unitStation.trim() !== '' &&
    hasSignature
  )
}

export function toApiUser(user: UserRow): ApiUser {
  const hasSignature = userHasSignature(user.id)
  return {
    ...user,
    hasSignature,
    signatureUpdatedAt: hasSignature ? signatureUpdatedAtMs(user.id) : null,
    profileIsComplete: profileIsComplete(user, hasSignature),
    emailVerified: user.emailVerifiedAt != null,
  }
}
