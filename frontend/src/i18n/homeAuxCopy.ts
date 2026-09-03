import type { Locale } from './types'

export type LocalizedPlan = {
  name: string
  price: string
  description: string
  features: string[]
  featured?: boolean
}

type HomeAuxCopy = {
  plans: LocalizedPlan[]
  supportSubject: string
  slogan: string
  terms: string
  privacy: string
}

type CompleteHomeLocale = 'es-419' | 'en' | 'es-ES' | 'pt-BR' | 'fr' | 'de' | 'it' | 'nl' | 'ht' | 'ja'

export const homeAuxCopy: Record<CompleteHomeLocale, HomeAuxCopy> = {
  'es-419': {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Para barberías pequeñas que quieren operar BarberTrix todos los días sin tarjeta.', features: ['1,000 turnos/mes + 50 de tolerancia', 'Hasta 3 barberos', 'Servicios ilimitados', 'Citas y reservas online', 'Notificaciones esenciales', 'Historial de 1 mes calendario (28–31 días)', 'QR y enlace público'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Historial completo', 'BarberTrix TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para operaciones con varias sucursales, analítica y control empresarial.', features: ['Hasta 3 sucursales', 'Barberos ilimitados', 'Todo lo de Pro', 'Reportes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
    ],
    supportSubject: '[BarberTrix] Solicitud de soporte', slogan: 'Tu turno. Tu estilo. Tu tiempo.', terms: 'Términos', privacy: 'Privacidad',
  },
  en: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'For small barbershops that want to run BarberTrix every day without a card.', features: ['1,000 turns/month + 50 grace', 'Up to 3 barbers', 'Unlimited services', 'Appointments and online booking', 'Essential notifications', '1 calendar month of history (28–31 days)', 'Public QR and link'] },
      { name: 'Pro', price: 'US$40.00', description: 'Automate operations, appointments and the customer experience.', features: ['High-volume turns', 'Up to 10 barbers', 'Complete history', 'BarberTrix TV', 'CRM and cash management', 'Advanced automations'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'For multi-location operations, analytics and enterprise control.', features: ['Up to 3 locations', 'Unlimited barbers', 'Everything in Pro', 'Advanced reports', 'Advanced roles and audit', 'Priority support'] },
    ],
    supportSubject: '[BarberTrix] Support request', slogan: 'Your turn. Your style. Your time.', terms: 'Terms', privacy: 'Privacy',
  },
  'es-ES': {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Para barberías pequeñas que quieren utilizar BarberTrix cada día sin tarjeta.', features: ['1.000 turnos/mes + 50 de tolerancia', 'Hasta 3 barberos', 'Servicios ilimitados', 'Citas y reservas online', 'Notificaciones esenciales', 'Historial de 1 mes natural (28–31 días)', 'QR y enlace público'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Historial completo', 'BarberTrix TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para negocios con varios locales, analítica y control empresarial.', features: ['Hasta 3 locales', 'Barberos ilimitados', 'Todo lo de Pro', 'Informes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
    ],
    supportSubject: '[BarberTrix] Solicitud de soporte', slogan: 'Tu turno. Tu estilo. Tu tiempo.', terms: 'Términos', privacy: 'Privacidad',
  },
  'pt-BR': {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Para barbearias pequenas que querem operar o BarberTrix todos os dias sem cartão.', features: ['1.000 atendimentos/mês + 50 de tolerância', 'Até 3 barbeiros', 'Serviços ilimitados', 'Agendamentos e reservas online', 'Notificações essenciais', 'Histórico de 1 mês do calendário (28–31 dias)', 'QR e link público'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar a operação, os agendamentos e a experiência do cliente.', features: ['Alto volume de atendimentos', 'Até 10 barbeiros', 'Histórico completo', 'BarberTrix TV', 'CRM e caixa', 'Automações avançadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para operações com várias unidades, análise e controle empresarial.', features: ['Até 3 unidades', 'Barbeiros ilimitados', 'Tudo do Pro', 'Relatórios avançados', 'Funções e auditoria avançadas', 'Suporte prioritário'] },
    ],
    supportSubject: '[BarberTrix] Solicitação de suporte', slogan: 'Seu turno. Seu estilo. Seu tempo.', terms: 'Termos', privacy: 'Privacidade',
  },
  fr: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Pour les petits barbershops qui veulent utiliser BarberTrix chaque jour sans carte.', features: ['1 000 passages/mois + 50 de tolérance', 'Jusqu’à 3 barbiers', 'Services illimités', 'Rendez-vous et réservation en ligne', 'Notifications essentielles', '1 mois calendaire d’historique (28–31 jours)', 'QR et lien public'] },
      { name: 'Pro', price: 'US$40.00', description: 'Pour automatiser les opérations, les rendez-vous et l’expérience client.', features: ['Volume élevé de passages', 'Jusqu’à 10 barbiers', 'Historique complet', 'BarberTrix TV', 'CRM et caisse', 'Automatisations avancées'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Pour les opérations multi-sites, l’analyse et le contrôle de l’entreprise.', features: ['Jusqu’à 3 établissements', 'Barbiers illimités', 'Tout le plan Pro', 'Rapports avancés', 'Rôles et audit avancés', 'Support prioritaire'] },
    ],
    supportSubject: '[BarberTrix] Demande d’assistance', slogan: 'Votre tour. Votre style. Votre temps.', terms: 'Conditions', privacy: 'Confidentialité',
  },
  de: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Für kleine Barbershops, die BarberTrix täglich ohne Karte nutzen möchten.', features: ['1.000 Vorgänge/Monat + 50 Toleranz', 'Bis zu 3 Barbiere', 'Unbegrenzte Dienstleistungen', 'Termine und Online-Buchung', 'Wichtige Benachrichtigungen', '1 Kalendermonat Verlauf (28–31 Tage)', 'Öffentlicher QR-Code und Link'] },
      { name: 'Pro', price: 'US$40.00', description: 'Für automatisierte Abläufe, Termine und ein besseres Kundenerlebnis.', features: ['Hohes Vorgangsvolumen', 'Bis zu 10 Barbiere', 'Vollständiger Verlauf', 'BarberTrix TV', 'CRM und Kasse', 'Erweiterte Automatisierungen'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Für mehrere Standorte, Analysen und unternehmensweite Kontrolle.', features: ['Bis zu 3 Standorte', 'Unbegrenzte Barbiere', 'Alles aus Pro', 'Erweiterte Berichte', 'Erweiterte Rollen und Audit', 'Priorisierter Support'] },
    ],
    supportSubject: '[BarberTrix] Supportanfrage', slogan: 'Dein Termin. Dein Stil. Deine Zeit.', terms: 'Bedingungen', privacy: 'Datenschutz',
  },
  it: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Per piccoli barbershop che vogliono usare BarberTrix ogni giorno senza carta.', features: ['1.000 turni/mese + 50 di tolleranza', 'Fino a 3 barbieri', 'Servizi illimitati', 'Appuntamenti e prenotazioni online', 'Notifiche essenziali', '1 mese di calendario di cronologia (28–31 giorni)', 'QR e link pubblico'] },
      { name: 'Pro', price: 'US$40.00', description: 'Per automatizzare operazioni, appuntamenti ed esperienza del cliente.', features: ['Alto volume di turni', 'Fino a 10 barbieri', 'Cronologia completa', 'BarberTrix TV', 'CRM e cassa', 'Automazioni avanzate'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Per attività con più sedi, analisi e controllo aziendale.', features: ['Fino a 3 sedi', 'Barbieri illimitati', 'Tutto il piano Pro', 'Report avanzati', 'Ruoli e audit avanzati', 'Supporto prioritario'] },
    ],
    supportSubject: '[BarberTrix] Richiesta di assistenza', slogan: 'Il tuo turno. Il tuo stile. Il tuo tempo.', terms: 'Termini', privacy: 'Privacy',
  },
  nl: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Voor kleine barbershops die BarberTrix dagelijks zonder kaart willen gebruiken.', features: ['1.000 beurten/maand + 50 marge', 'Tot 3 barbiers', 'Onbeperkte diensten', 'Afspraken en online boeken', 'Essentiële meldingen', '1 kalendermaand geschiedenis (28–31 dagen)', 'Openbare QR-code en link'] },
      { name: 'Pro', price: 'US$40.00', description: 'Voor het automatiseren van de operatie, afspraken en klantervaring.', features: ['Hoog volume aan beurten', 'Tot 10 barbiers', 'Volledige geschiedenis', 'BarberTrix TV', 'CRM en kassa', 'Geavanceerde automatiseringen'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Voor meerdere vestigingen, analyses en bedrijfsbrede controle.', features: ['Tot 3 vestigingen', 'Onbeperkte barbiers', 'Alles uit Pro', 'Geavanceerde rapporten', 'Geavanceerde rollen en audit', 'Prioritaire ondersteuning'] },
    ],
    supportSubject: '[BarberTrix] Ondersteuningsverzoek', slogan: 'Jouw beurt. Jouw stijl. Jouw tijd.', terms: 'Voorwaarden', privacy: 'Privacy',
  },
  ht: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Pou ti babèshop ki vle sèvi ak BarberTrix chak jou san kat.', features: ['1,000 sèvis/mwa + 50 tolerans', 'Jiska 3 babè', 'Sèvis san limit', 'Randevou ak rezèvasyon sou entènèt', 'Notifikasyon esansyèl', 'Istwa pou 1 mwa kalandriye (28–31 jou)', 'QR ak lyen piblik'] },
      { name: 'Pro', price: 'US$40.00', description: 'Pou otomatize operasyon, randevou ak eksperyans kliyan an.', features: ['Gwo volim sèvis', 'Jiska 10 babè', 'Istwa konplè', 'BarberTrix TV', 'CRM ak kès', 'Otomatizasyon avanse'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Pou plizyè lokal, analiz ak kontwòl antrepriz.', features: ['Jiska 3 lokal', 'Babè san limit', 'Tout sa ki nan Pro', 'Rapò avanse', 'Wòl ak odit avanse', 'Sipò priyoritè'] },
    ],
    supportSubject: '[BarberTrix] Demann sipò', slogan: 'Tou pa w. Stil pa w. Tan pa w.', terms: 'Kondisyon', privacy: 'Vi prive',
  },
  ja: {
    plans: [
      { name: 'Free', price: 'US$0', description: '小規模なバーバーショップがカード登録なしで BarberTrix を毎日運用できます。', features: ['月1,000件 + 50件の猶予', '理容師3名まで', 'サービス数無制限', '予約とオンライン予約', '基本通知', '1暦月の履歴（28～31日）', '公開QRとリンク'] },
      { name: 'Pro', price: 'US$40.00', description: '運営、予約、顧客体験をさらに自動化したい店舗向けです。', features: ['大規模な順番待ち対応', '理容師10名まで', '完全な履歴', 'BarberTrix TV', 'CRMとレジ管理', '高度な自動化'], featured: true },
      { name: 'Business', price: 'US$70.00', description: '複数店舗、分析、企業レベルの管理が必要な運営向けです。', features: ['3店舗まで', '理容師数無制限', 'Pro の全機能', '高度なレポート', '高度な権限と監査', '優先サポート'] },
    ],
    supportSubject: '[BarberTrix] サポート依頼', slogan: 'あなたの順番。あなたのスタイル。あなたの時間。', terms: '利用規約', privacy: 'プライバシー',
  },
}

export function getHomeAuxCopy(locale: Locale): HomeAuxCopy {
  return homeAuxCopy[locale as CompleteHomeLocale] ?? homeAuxCopy.en
}
