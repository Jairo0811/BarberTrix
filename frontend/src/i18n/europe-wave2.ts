import type { Dictionary } from './types'

const core = (languageLabel: string, signIn: string, email: string, password: string, home: string, dashboard: string, logout: string): Dictionary => ({
  'language.label': languageLabel,
  'common.login': signIn,
  'common.email': email,
  'common.password': password,
  'route.home': home,
  'route.login': signIn,
  'login.welcome': signIn,
  'login.submit': signIn,
  'dashboard': dashboard,
  'logout': logout,
})

export const europeWave2: Record<string, Dictionary> = {
  et: core('Keel', 'Logi sisse', 'E-post', 'Parool', 'Avaleht', 'Töölaud', 'Logi välja'),
  lv: core('Valoda', 'Pieteikties', 'E-pasts', 'Parole', 'Sākums', 'Informācijas panelis', 'Izrakstīties'),
  lt: core('Kalba', 'Prisijungti', 'El. paštas', 'Slaptažodis', 'Pradžia', 'Valdymo skydas', 'Atsijungti'),
  sk: core('Jazyk', 'Prihlásiť sa', 'E-mail', 'Heslo', 'Domov', 'Panel', 'Odhlásiť sa'),
  sl: core('Jezik', 'Prijava', 'E-pošta', 'Geslo', 'Domov', 'Nadzorna plošča', 'Odjava'),
  hr: core('Jezik', 'Prijava', 'E-pošta', 'Lozinka', 'Početna', 'Nadzorna ploča', 'Odjava'),
  sr: core('Језик', 'Пријави се', 'Е-пошта', 'Лозинка', 'Почетна', 'Контролна табла', 'Одјави се'),
  bs: core('Jezik', 'Prijavi se', 'E-pošta', 'Lozinka', 'Početna', 'Kontrolna tabla', 'Odjavi se'),
  bg: core('Език', 'Вход', 'Имейл', 'Парола', 'Начало', 'Табло', 'Изход'),
  sq: core('Gjuha', 'Hyr', 'Email', 'Fjalëkalimi', 'Kreu', 'Paneli', 'Dil'),
  mk: core('Јазик', 'Најави се', 'Е-пошта', 'Лозинка', 'Почетна', 'Контролна табла', 'Одјави се'),
  hu: core('Nyelv', 'Bejelentkezés', 'E-mail', 'Jelszó', 'Kezdőlap', 'Irányítópult', 'Kijelentkezés'),
  is: core('Tungumál', 'Skrá inn', 'Netfang', 'Lykilorð', 'Heim', 'Stjórnborð', 'Skrá út'),
  ga: core('Teanga', 'Sínigh isteach', 'Ríomhphost', 'Focal faire', 'Baile', 'Painéal', 'Sínigh amach'),
  mt: core('Lingwa', 'Idħol', 'Email', 'Password', 'Bidu', 'Dashboard', 'Oħroġ'),
  ca: core('Idioma', 'Inicia sessió', 'Correu electrònic', 'Contrasenya', 'Inici', 'Tauler', 'Tanca sessió'),
  ka: core('ენა', 'შესვლა', 'ელფოსტა', 'პაროლი', 'მთავარი', 'სამართავი პანელი', 'გასვლა'),
  hy: core('Լեզու', 'Մուտք գործել', 'Էլ. փոստ', 'Գաղտնաբառ', 'Գլխավոր', 'Վահանակ', 'Դուրս գալ'),
  az: core('Dil', 'Daxil ol', 'E-poçt', 'Şifrə', 'Ana səhifə', 'İdarə paneli', 'Çıxış'),
}
