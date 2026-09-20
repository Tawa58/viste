import type { FileAccessContext, StoredFileMetadata } from './types'

const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'REGISTRAR',
])

/**
 * Client-side authorization helper. Firestore Security Rules must enforce the same policy.
 */
export function canAccessFile(meta: StoredFileMetadata, ctx: FileAccessContext): boolean {
  if (meta.status === 'deleted') {
    return ADMIN_ROLES.has(ctx.role)
  }
  if (ADMIN_ROLES.has(ctx.role)) return true
  if (meta.uploadedBy === ctx.userId) return true

  if (meta.ownerType === 'user' && meta.ownerId === ctx.userId) return true

  if (meta.ownerType === 'staff') {
    if (ctx.staffId && meta.ownerId === ctx.staffId) return true
    if (ctx.role === 'TEACHER' && ctx.staffId === meta.ownerId) return true
    return ADMIN_ROLES.has(ctx.role)
  }

  if (meta.ownerType === 'student') {
    if (ctx.studentId && meta.ownerId === ctx.studentId) return true
    if (ctx.role === 'PARENT' || ctx.role === 'STUDENT') {
      return Boolean(ctx.linkedStudentIds?.includes(meta.ownerId) || ctx.studentId === meta.ownerId)
    }
    if (ctx.role === 'TEACHER') {
      // Teachers may view student files for assigned classes when linkedStudentIds provided by caller.
      return Boolean(ctx.linkedStudentIds?.includes(meta.ownerId))
    }
    if (ctx.role === 'ACCOUNTANT' || ctx.role === 'FINANCE_OFFICER') {
      return meta.fileType === 'report_pdf' || meta.fileType === 'school_document'
    }
  }

  if (meta.ownerType === 'school') {
    return ctx.role !== 'STUDENT' && ctx.role !== 'PARENT'
  }

  return false
}

export function assertCanAccessFile(meta: StoredFileMetadata, ctx: FileAccessContext) {
  if (!canAccessFile(meta, ctx)) {
    throw new Error('You do not have permission to access this file.')
  }
}

export function assertCanUpload(
  ctx: FileAccessContext,
  ownerType: StoredFileMetadata['ownerType'],
  ownerId: string,
  fileType: StoredFileMetadata['fileType'],
) {
  if (ADMIN_ROLES.has(ctx.role)) return

  if (fileType === 'staff_photo' || ownerType === 'staff') {
    if (ctx.role === 'TEACHER' && ctx.staffId === ownerId) return
    throw new Error('Only admins or the staff member can upload staff photos.')
  }

  if (fileType === 'profile_photo' || ownerType === 'student') {
    if (ctx.role === 'TEACHER') return
    if (ctx.role === 'PARENT' && ctx.linkedStudentIds?.includes(ownerId)) return
    if (ctx.studentId === ownerId) return
    throw new Error('Not allowed to upload this student file.')
  }

  if (ctx.role === 'TEACHER' || ctx.role === 'LIBRARIAN') return

  throw new Error('Not allowed to upload this file type.')
}
