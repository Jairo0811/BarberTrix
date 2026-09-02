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
  wo: make('Làkk', 'BarberTurn', 'Dugg', 'Dalal ak jàmm', 'Rëdd', 'Génn', 'Yëgle yi'),
  ln: make('Lokóta', 'BarberTurn', 'Kokɔta', 'Mbote', 'Molɔngɔ', 'Kobima', 'Mayebisi'),
  rw: make('Ururimi', 'BarberTurn', 'Injira', 'Muraho', 'Umurongo', 'Sohoka', 'Imenyesha'),
  rn: make('Ururimi', 'BarberTurn', 'Injira', 'Bwakeye', 'Umurongo', 'Sohoka', 'Amatangazo'),
  st: make('Puo', 'BarberTurn', 'Kena', 'Lumela', 'Mola', 'Tsoa', 'Ditsebiso'),
  tn: make('Puo', 'BarberTurn', 'Tsena', 'Dumela', 'Mola', 'Tswa', 'Dikitsiso'),
  sn: make('Mutauro', 'BarberTurn', 'Pinda', 'Mhoro', 'Mutsetse', 'Buda', 'Zviziviso'),
  ny: make('Chilankhulo', 'BarberTurn', 'Lowani', 'Moni', 'Mzere', 'Tulukani', 'Zidziwitso'),
  mg: make('Fiteny', 'BarberTurn', 'Hiditra', 'Salama', 'Filaharana', 'Hivoaka', 'Fampandrenesana'),
  ti: make('ቋንቋ', 'BarberTurn', 'እቶ', 'ሰላም', 'ተራ', 'ውጻእ', 'ምልክታታት'),
  om: make('Afaan', 'BarberTurn', 'Seeni', 'Akkam', 'Hiriira', 'Ba’i', 'Beeksisa'),
  ak: make('Kasa', 'BarberTurn', 'Kɔ mu', 'Maakye', 'Ntoatoaso', 'Pue', 'Nkaebɔ'),
}
