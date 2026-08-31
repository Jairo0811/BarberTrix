export const adminPageIds = [
  'overview',
  'queue',
  'appointments',
  'barbers',
  'services',
  'customers',
  'payments',
  'reports',
  'team',
  'locations',
  'billing',
] as const

export type AdminPageId = typeof adminPageIds[number]

export const businessPageIds = [
  'appointments',
  'customers',
  'payments',
  'reports',
  'team',
  'locations',
  'billing',
] as const satisfies readonly AdminPageId[]

export type BusinessPageId = typeof businessPageIds[number]

const adminPageIdSet = new Set<string>(adminPageIds)
const businessPageIdSet = new Set<string>(businessPageIds)

export function adminPageHref(page: AdminPageId) {
  return `#/app/${page}`
}

export function readAdminPage(hash = window.location.hash): AdminPageId {
  if (hash === '#billing-section') return 'billing'
  if (hash === '#/app' || hash === '#/app/') return 'overview'

  const match = hash.match(/^#\/app\/([^/?#]+)/)
  const candidate = match?.[1]
  return candidate && adminPageIdSet.has(candidate) ? candidate as AdminPageId : 'overview'
}

export function isBusinessPage(page: AdminPageId): page is BusinessPageId {
  return businessPageIdSet.has(page)
}

export function isAdminAppHash(hash = window.location.hash) {
  return hash === '#/app' || hash.startsWith('#/app/') || hash === '#billing-section'
}
