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

const adminPageIdSet = new Set<string>(adminPageIds)

export function adminPageHref(page: AdminPageId) {
  return `#/app/${page}`
}

export function readAdminPage(hash = window.location.hash): AdminPageId {
  if (hash === '#billing-section') return 'billing'

  const match = hash.match(/^#\/app\/([^/?#]+)/)
  const candidate = match?.[1]
  return candidate && adminPageIdSet.has(candidate) ? candidate as AdminPageId : 'overview'
}

export function isAdminAppHash(hash = window.location.hash) {
  return hash.startsWith('#/app/') || hash === '#billing-section'
}
