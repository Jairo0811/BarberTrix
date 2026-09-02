import type { Dictionary } from './types';

const d = (title: string, email: string, password: string, submit: string, hello: string, requests: string, signOut: string, enable: string): Dictionary => ({
  'login.title': title,
  'login.email': email,
  'login.password': password,
  'login.submit': submit,
  'home.hello': hello,
  'home.requests': requests,
  'home.signOut': signOut,
  'push.enable': enable,
});

export const oceaniaMobile: Record<string, Dictionary> = {
  mi: d('Tō toa kutikuti makawe, kei tō pūkoro hoki.', 'Īmēra', 'Kupuhipa', 'Takiuru', 'Kia ora, {{name}}.', 'Ngā tono tūranga', 'Takiputa', 'Whakahohea ngā whakamōhiotanga'),
  sm: d('O lau barbershop, o loo foʻi i lau taga.', 'Imeli', 'Upu faataga', 'Saini i totonu', 'Talofa, {{name}}.', 'Talosaga mo le laina', 'Saini i fafo', 'Faagaoioi faasilasilaga'),
  to: d('Ko hoʻo falekosi ʻulu, ʻoku ʻi hoʻo kato foki.', 'ʻĪmeili', 'Lea fufū', 'Hū ki loto', 'Mālō e lelei, {{name}}.', 'Ngaahi kole ki he fakahokohoko', 'Hū ki tuʻa', 'Fakamoʻui ʻa e ngaahi fanongonongo'),
  fj: d('Na nomu valenivucu, e tiko tale ga ena nomu taga.', 'Imeli', 'Vosavuni', 'Curu', 'Bula, {{name}}.', 'Kerekere ni gauna', 'Curu tani', 'Vakatara na notisi'),
  bi: d('Barbershop blong yu, i stap long poket blong yu tu.', 'Imel', 'Paswod', 'Saen in', 'Halo, {{name}}.', 'Ol rikwest blong taem', 'Saen aot', 'Onem notifikasen'),
};
