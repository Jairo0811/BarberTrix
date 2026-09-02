import type { Dictionary } from './types';

const core = (title: string, email: string, password: string, submit: string, hello: string, requests: string, signOut: string, notifications: string): Dictionary => ({
  'login.title': title,
  'login.email': email,
  'login.password': password,
  'login.submit': submit,
  'home.hello': hello,
  'home.requests': requests,
  'home.signOut': signOut,
  'push.enabledTitle': notifications,
});

export const europeWave2Mobile: Record<string, Dictionary> = {
  et: core('Sinu barbershop, alati taskus.', 'E-post', 'Parool', 'Logi sisse', 'Tere, {{name}}.', 'Järjekorrataotlused', 'Logi välja', 'Teavitused lubatud'),
  lv: core('Tavs barbershop vienmēr līdzi.', 'E-pasts', 'Parole', 'Pieteikties', 'Sveiki, {{name}}.', 'Rindas pieprasījumi', 'Izrakstīties', 'Paziņojumi ieslēgti'),
  lt: core('Tavo barbershop visada kišenėje.', 'El. paštas', 'Slaptažodis', 'Prisijungti', 'Sveiki, {{name}}.', 'Eilės užklausos', 'Atsijungti', 'Pranešimai įjungti'),
  sk: core('Tvoj barbershop vždy poruke.', 'E-mail', 'Heslo', 'Prihlásiť sa', 'Ahoj, {{name}}.', 'Žiadosti o poradie', 'Odhlásiť sa', 'Upozornenia zapnuté'),
  sl: core('Tvoj barbershop vedno pri roki.', 'E-pošta', 'Geslo', 'Prijava', 'Živjo, {{name}}.', 'Zahteve za čakalno vrsto', 'Odjava', 'Obvestila omogočena'),
  hr: core('Tvoj barbershop uvijek pri ruci.', 'E-pošta', 'Lozinka', 'Prijava', 'Bok, {{name}}.', 'Zahtjevi za red', 'Odjava', 'Obavijesti uključene'),
  sr: core('Твој barbershop увек при руци.', 'Е-пошта', 'Лозинка', 'Пријави се', 'Здраво, {{name}}.', 'Захтеви за ред', 'Одјави се', 'Обавештења су укључена'),
  bs: core('Tvoj barbershop uvijek pri ruci.', 'E-pošta', 'Lozinka', 'Prijavi se', 'Zdravo, {{name}}.', 'Zahtjevi za red', 'Odjavi se', 'Obavijesti uključene'),
  bg: core('Твоят barbershop винаги е с теб.', 'Имейл', 'Парола', 'Вход', 'Здравей, {{name}}.', 'Заявки за опашка', 'Изход', 'Известията са включени'),
  sq: core('Barbershop-i yt gjithmonë me vete.', 'Email', 'Fjalëkalimi', 'Hyr', 'Përshëndetje, {{name}}.', 'Kërkesa për radhë', 'Dil', 'Njoftimet janë aktive'),
  mk: core('Твојот barbershop секогаш со тебе.', 'Е-пошта', 'Лозинка', 'Најави се', 'Здраво, {{name}}.', 'Барања за редица', 'Одјави се', 'Известувањата се вклучени'),
  hu: core('A barbershopod mindig veled.', 'E-mail', 'Jelszó', 'Bejelentkezés', 'Szia, {{name}}.', 'Sorbanállási kérelmek', 'Kijelentkezés', 'Értesítések bekapcsolva'),
  is: core('Barbershopið þitt alltaf með þér.', 'Netfang', 'Lykilorð', 'Skrá inn', 'Halló, {{name}}.', 'Biðraðarbeiðnir', 'Skrá út', 'Tilkynningar virkar'),
  ga: core('Do barbershop i do phóca.', 'Ríomhphost', 'Focal faire', 'Sínigh isteach', 'Dia duit, {{name}}.', 'Iarratais scuaine', 'Sínigh amach', 'Fógraí cumasaithe'),
  mt: core('Il-barbershop tiegħek dejjem miegħek.', 'Email', 'Password', 'Idħol', 'Bonġu, {{name}}.', 'Talbiet tal-kju', 'Oħroġ', 'Notifiki attivati'),
  ca: core('La teva barberia, també a la butxaca.', 'Correu electrònic', 'Contrasenya', 'Inicia sessió', 'Hola, {{name}}.', 'Sol·licituds de torn', 'Tanca sessió', 'Notificacions activades'),
  ka: core('თქვენი ბარბერშოპი ყოველთვის თქვენთანაა.', 'ელფოსტა', 'პაროლი', 'შესვლა', 'გამარჯობა, {{name}}.', 'რიგის მოთხოვნები', 'გასვლა', 'შეტყობინებები ჩართულია'),
  hy: core('Ձեր barbershop-ը միշտ ձեզ հետ է։', 'Էլ. փոստ', 'Գաղտնաբառ', 'Մուտք գործել', 'Բարև, {{name}}։', 'Հերթի հարցումներ', 'Դուրս գալ', 'Ծանուցումները միացված են'),
  az: core('Barbershop-unuz həmişə yanınızdadır.', 'E-poçt', 'Şifrə', 'Daxil ol', 'Salam, {{name}}.', 'Növbə sorğuları', 'Çıxış', 'Bildirişlər aktivdir'),
};
