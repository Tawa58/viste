import 'server-only'

import { forbidden } from '@/server/errors'
import type { SessionContext } from '@/server/auth/session'
import {
  hasPermission,
  listPermissions,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  type Permission,
} from '@/server/authorization/rbac-map'

export {
  hasPermission,
  listPermissions,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  type Permission,
}

export function requirePermission(session: SessionContext, permission: Permission): void {
  if (!hasPermission(session.role, permission)) {
    throw forbidden(`Missing permission: ${permission}`)
  }
}
