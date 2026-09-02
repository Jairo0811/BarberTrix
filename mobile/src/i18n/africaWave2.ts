import type { Dictionary } from './types';

const make = (signIn: string, hello: string, requests: string, signOut: string, notifications: string): Dictionary => ({
  'login.title': signIn,
  'login.submit': signIn,
  'home.hello': `${hello}, {{name}}.`,
  'home.requests': requests,
  'home.signOut': signOut,
  'push.enabledTitle': notifications,
  'push.enable': notifications,
});

export const africaWave2Mobile: Record<string, Dictionary> = {
  wo: make('Dugg', 'Dalal ak jàmm', 'Rëdd', 'Génn', 'Yëgle yi'),
  ln: make('Kokɔta', 'Mbote', 'Molɔngɔ', 'Kobima', 'Mayebisi'),
  rw: make('Injira', 'Muraho', 'Umurongo', 'Sohoka', 'Imenyesha'),
  rn: make('Injira', 'Bwakeye', 'Umurongo', 'Sohoka', 'Amatangazo'),
  st: make('Kena', 'Lumela', 'Mola', 'Tsoa', 'Ditsebiso'),
  tn: make('Tsena', 'Dumela', 'Mola', 'Tswa', 'Dikitsiso'),
  sn: make('Pinda', 'Mhoro', 'Mutsetse', 'Buda', 'Zviziviso'),
  ny: make('Lowani', 'Moni', 'Mzere', 'Tulukani', 'Zidziwitso'),
  mg: make('Hiditra', 'Salama', 'Filaharana', 'Hivoaka', 'Fampandrenesana'),
  ti: make('እቶ', 'ሰላም', 'ተራ', 'ውጻእ', 'ምልክታታት'),
  om: make('Seeni', 'Akkam', 'Hiriira', 'Ba’i', 'Beeksisa'),
  ak: make('Kɔ mu', 'Maakye', 'Ntoatoaso', 'Pue', 'Nkaebɔ'),
};
