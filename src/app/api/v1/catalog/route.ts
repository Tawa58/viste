import { requireSession } from '@/server/auth/session'
import { jsonOk, withApiHandler } from '@/server/http/handler'
import { getCatalogSnapshot } from '@/server/services/catalog-service'

export const GET = withApiHandler(async (request) => {
  const session = await requireSession(request)
  const snap = await getCatalogSnapshot(session)
  return jsonOk({
    years: snap.academicYears,
    terms: snap.terms,
    classes: snap.classes,
    streams: snap.streams,
    subjects: snap.subjects,
    sports: snap.sports ?? [],
    clubs: snap.clubs ?? [],
    houses: snap.houses ?? [],
  })
})
