import type { TranslationValues } from './types'

type Translate = (key: string, values?: TranslationValues) => string

const turnStatusKeys: Record<string, string> = {
  Waiting: 'waiting',
  Called: 'status.called',
  InService: 'inService',
  Completed: 'completed',
  Cancelled: 'status.cancelled',
  NoShow: 'noShow',
}

const barberStatusKeys: Record<string, string> = {
  Available: 'available',
  Busy: 'busy',
  Break: 'break',
  Offline: 'offline',
}

export function turnStatusLabel(t: Translate, status?: string | null) {
  return t(status ? turnStatusKeys[status] ?? 'status.unknown' : 'status.unknown')
}

export function barberStatusLabel(t: Translate, status?: string | null) {
  return t(status ? barberStatusKeys[status] ?? 'status.unknown' : 'status.unknown')
}
