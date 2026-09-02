import type { Dictionary } from './types'

const d = (language: string, signIn: string, email: string, password: string, demo: string, dashboard: string, logout: string): Dictionary => ({
  'language.label': language,
  'nav.demo': demo,
  'nav.dashboard': dashboard,
  'auth.login.title': signIn,
  'auth.login.email': email,
  'auth.login.password': password,
  'auth.login.submit': signIn,
  'auth.logout': logout,
})

export const oceania: Record<string, Dictionary> = {
  mi: d('Reo', 'Takiuru', 'Īmēra', 'Kupuhipa', 'Whakaaturanga', 'Papatohu', 'Takiputa'),
  sm: d('Gagana', 'Saini i totonu', 'Imeli', 'Upu faataga', 'Faataʻitaʻiga', 'Laupapa autū', 'Saini i fafo'),
  to: d('Lea', 'Hū ki loto', 'ʻĪmeili', 'Lea fufū', 'Fakahā', 'Pēnolo pule', 'Hū ki tuʻa'),
  fj: d('Vosa', 'Curu', 'Imeli', 'Vosavuni', 'Vakaraitaki', 'Matabose', 'Curu tani'),
  bi: d('Lanwis', 'Saen in', 'Imel', 'Paswod', 'Demo', 'Daesbod', 'Saen aot'),
}
