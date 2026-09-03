import type { Dictionary } from './types'

const make = (languageLabel: string, language: string, signIn: string, hello: string, requests: string, signOut: string, notifications: string): Dictionary => ({
  'language.label': languageLabel,
  'login.welcome': signIn,
  'login.submit': signIn,
  'home.hero.title1': language,
  'dashboard': language,
  'queueLive': requests,
  'logout': signOut,
  'home.support.title': notifications,
  'common.login': signIn,
  'home.nav.home': hello,
})

export const africaWave2: Record<string, Dictionary> = {
  wo: make('Làkk', 'BarberTrix', 'Dugg', 'Dalal ak jàmm', 'Rëdd', 'Génn', 'Yëgle yi'),
  ln: make('Lokóta', 'BarberTrix', 'Kokɔta', 'Mbote', 'Molɔngɔ', 'Kobima', 'Mayebisi'),
  rw: make('Ururimi', 'BarberTrix', 'Injira', 'Muraho', 'Umurongo', 'Sohoka', 'Imenyesha'),
  rn: make('Ururimi', 'BarberTrix', 'Injira', 'Bwakeye', 'Umurongo', 'Sohoka', 'Amatangazo'),
  st: make('Puo', 'BarberTrix', 'Kena', 'Lumela', 'Mola', 'Tsoa', 'Ditsebiso'),
  tn: make('Puo', 'BarberTrix', 'Tsena', 'Dumela', 'Mola', 'Tswa', 'Dikitsiso'),
  sn: make('Mutauro', 'BarberTrix', 'Pinda', 'Mhoro', 'Mutsetse', 'Buda', 'Zviziviso'),
  ny: make('Chilankhulo', 'BarberTrix', 'Lowani', 'Moni', 'Mzere', 'Tulukani', 'Zidziwitso'),
  mg: make('Fiteny', 'BarberTrix', 'Hiditra', 'Salama', 'Filaharana', 'Hivoaka', 'Fampandrenesana'),
  ti: make('ቋንቋ', 'BarberTrix', 'እቶ', 'ሰላም', 'ተራ', 'ውጻእ', 'ምልክታታት'),
  om: make('Afaan', 'BarberTrix', 'Seeni', 'Akkam', 'Hiriira', 'Ba’i', 'Beeksisa'),
  ak: make('Kasa', 'BarberTrix', 'Kɔ mu', 'Maakye', 'Ntoatoaso', 'Pue', 'Nkaebɔ'),
}
