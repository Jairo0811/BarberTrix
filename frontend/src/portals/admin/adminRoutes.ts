export const adminPageIds = [
  'overview',
  'queue',
  'appointments',
  'barbers',
  'services',
  'customers',
  'payments',
  'reports',
  'tv',
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
  'tv',
  'team',
  'locations',
  'billing',
] as const satisfies readonly AdminPageId[]

export type BusinessPageId = typeof businessPageIds[number]

const adminPageIdSet = new Set<string>(adminPageIds)
const businessPageIdSet = new Set<string>(businessPageIds)

export function adminPagePath(page: AdminPageId) {
  return `/app/${page}`
}

export function adminPageHref(page: AdminPageId) {
  return `#${adminPagePath(page)}`
}

export function parseAdminPagePath(pathname: string): AdminPageId | null {
  if (pathname === '/app' || pathname === '/app/') return 'overview'

  const match = pathname.match(/^\/app\/([^/?#]+)\/?$/)
  const candidate = match?.[1]
  return candidate && adminPageIdSet.has(candidate) ? candidate as AdminPageId : null
}

export function isAdminAppPath(pathname: string) {
  return pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/')
}

export function isBusinessPage(page: AdminPageId): page is BusinessPageId {
  return businessPageIdSet.has(page)
}
