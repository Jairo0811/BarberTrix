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
      { name: 'Free', price: 'US$0', description: 'Para empezar a operar BarberTrix sin tarjeta y probar la cola con clientes reales.', features: ['100 turnos/mes + 10 de tolerancia', 'Hasta 3 barberos', 'Hasta 5 servicios', 'QR y enlace público', 'Notificaciones esenciales', 'Historial de 7 días'] },
      { name: 'Starter', price: 'US$20.00', description: 'Para barberías pequeñas que ya usan BarberTrix todos los días.', features: ['1,000 turnos/mes', 'Hasta 5 barberos', 'Servicios ilimitados', 'Historial de 90 días', 'Cola y métricas operativas'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Citas y reservas online', 'BarberTrix TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para operaciones con varias sucursales, analítica y control empresarial.', features: ['Hasta 3 sucursales', 'Barberos ilimitados', 'Todo lo de Pro', 'Reportes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
    ],
    supportSubject: '[BarberTrix] Solicitud de soporte', slogan: 'Tu turno. Tu estilo. Tu tiempo.', terms: 'Términos', privacy: 'Privacidad',
  },
  en: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Start operating BarberTrix without a card and try the queue with real customers.', features: ['100 turns/month + 10 grace', 'Up to 3 barbers', 'Up to 5 services', 'Public QR and link', 'Essential notifications', '7-day history'] },
      { name: 'Starter', price: 'US$20.00', description: 'For small barbershops that already use BarberTrix every day.', features: ['1,000 turns/month', 'Up to 5 barbers', 'Unlimited services', '90-day history', 'Queue and operational metrics'] },
      { name: 'Pro', price: 'US$40.00', description: 'Automate operations, appointments and the customer experience.', features: ['High-volume turns', 'Up to 10 barbers', 'Appointments and online booking', 'BarberTrix TV', 'CRM and cash management', 'Advanced automations'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'For multi-location operations, analytics and enterprise control.', features: ['Up to 3 locations', 'Unlimited barbers', 'Everything in Pro', 'Advanced reports', 'Advanced roles and audit', 'Priority support'] },
    ],
    supportSubject: '[BarberTrix] Support request', slogan: 'Your turn. Your style. Your time.', terms: 'Terms', privacy: 'Privacy',
  },
  'es-ES': {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Para empezar a operar BarberTrix sin tarjeta y probar la cola con clientes reales.', features: ['100 turnos/mes + 10 de tolerancia', 'Hasta 3 barberos', 'Hasta 5 servicios', 'QR y enlace público', 'Notificaciones esenciales', 'Historial de 7 días'] },
      { name: 'Starter', price: 'US$20.00', description: 'Para barberías pequeñas que ya utilizan BarberTrix cada día.', features: ['1.000 turnos/mes', 'Hasta 5 barberos', 'Servicios ilimitados', 'Historial de 90 días', 'Cola y métricas operativas'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Citas y reservas online', 'BarberTrix TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para negocios con varios locales, analítica y control empresarial.', features: ['Hasta 3 locales', 'Barberos ilimitados', 'Todo lo de Pro', 'Informes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
    ],
    supportSubject: '[BarberTrix] Solicitud de soporte', slogan: 'Tu turno. Tu estilo. Tu tiempo.', terms: 'Términos', privacy: 'Privacidad',
  },
  'pt-BR': {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Comece a operar o BarberTrix sem cartão e teste a fila com clientes reais.', features: ['100 atendimentos/mês + 10 de tolerância', 'Até 3 barbeiros', 'Até 5 serviços', 'QR e link público', 'Notificações essenciais', 'Histórico de 7 dias'] },
      { name: 'Starter', price: 'US$20.00', description: 'Para barbearias pequenas que já usam o BarberTrix todos os dias.', features: ['1.000 atendimentos/mês', 'Até 5 barbeiros', 'Serviços ilimitados', 'Histórico de 90 dias', 'Fila e métricas operacionais'] },
      { name: 'Pro', price: 'US$40.00', description: 'Para automatizar a operação, os agendamentos e a experiência do cliente.', features: ['Alto volume de atendimentos', 'Até 10 barbeiros', 'Agendamentos e reservas online', 'BarberTrix TV', 'CRM e caixa', 'Automações avançadas'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Para operações com várias unidades, análise e controle empresarial.', features: ['Até 3 unidades', 'Barbeiros ilimitados', 'Tudo do Pro', 'Relatórios avançados', 'Funções e auditoria avançadas', 'Suporte prioritário'] },
    ],
    supportSubject: '[BarberTrix] Solicitação de suporte', slogan: 'Seu turno. Seu estilo. Seu tempo.', terms: 'Termos', privacy: 'Privacidade',
  },
  fr: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Commencez à utiliser BarberTrix sans carte et testez la file avec de vrais clients.', features: ['100 passages/mois + 10 de tolérance', 'Jusqu’à 3 barbiers', 'Jusqu’à 5 services', 'QR et lien public', 'Notifications essentielles', 'Historique de 7 jours'] },
      { name: 'Starter', price: 'US$20.00', description: 'Pour les petits barbershops qui utilisent déjà BarberTrix au quotidien.', features: ['1 000 passages/mois', 'Jusqu’à 5 barbiers', 'Services illimités', 'Historique de 90 jours', 'File et indicateurs opérationnels'] },
      { name: 'Pro', price: 'US$40.00', description: 'Pour automatiser les opérations, les rendez-vous et l’expérience client.', features: ['Volume élevé de passages', 'Jusqu’à 10 barbiers', 'Rendez-vous et réservation en ligne', 'BarberTrix TV', 'CRM et caisse', 'Automatisations avancées'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Pour les opérations multi-sites, l’analyse et le contrôle de l’entreprise.', features: ['Jusqu’à 3 établissements', 'Barbiers illimités', 'Tout le plan Pro', 'Rapports avancés', 'Rôles et audit avancés', 'Support prioritaire'] },
    ],
    supportSubject: '[BarberTrix] Demande d’assistance', slogan: 'Votre tour. Votre style. Votre temps.', terms: 'Conditions', privacy: 'Confidentialité',
  },
  de: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Starte BarberTrix ohne Karte und teste die Warteschlange mit echten Kunden.', features: ['100 Vorgänge/Monat + 10 Toleranz', 'Bis zu 3 Barbiere', 'Bis zu 5 Dienstleistungen', 'Öffentlicher QR-Code und Link', 'Wichtige Benachrichtigungen', '7 Tage Verlauf'] },
      { name: 'Starter', price: 'US$20.00', description: 'Für kleine Barbershops, die BarberTrix bereits täglich nutzen.', features: ['1.000 Vorgänge/Monat', 'Bis zu 5 Barbiere', 'Unbegrenzte Dienstleistungen', '90 Tage Verlauf', 'Warteschlange und Betriebskennzahlen'] },
      { name: 'Pro', price: 'US$40.00', description: 'Für automatisierte Abläufe, Termine und ein besseres Kundenerlebnis.', features: ['Hohes Vorgangsvolumen', 'Bis zu 10 Barbiere', 'Termine und Online-Buchung', 'BarberTrix TV', 'CRM und Kasse', 'Erweiterte Automatisierungen'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Für mehrere Standorte, Analysen und unternehmensweite Kontrolle.', features: ['Bis zu 3 Standorte', 'Unbegrenzte Barbiere', 'Alles aus Pro', 'Erweiterte Berichte', 'Erweiterte Rollen und Audit', 'Priorisierter Support'] },
    ],
    supportSubject: '[BarberTrix] Supportanfrage', slogan: 'Dein Termin. Dein Stil. Deine Zeit.', terms: 'Bedingungen', privacy: 'Datenschutz',
  },
  it: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Inizia a usare BarberTrix senza carta e prova la coda con clienti reali.', features: ['100 turni/mese + 10 di tolleranza', 'Fino a 3 barbieri', 'Fino a 5 servizi', 'QR e link pubblico', 'Notifiche essenziali', 'Cronologia di 7 giorni'] },
      { name: 'Starter', price: 'US$20.00', description: 'Per piccoli barbershop che usano già BarberTrix ogni giorno.', features: ['1.000 turni/mese', 'Fino a 5 barbieri', 'Servizi illimitati', 'Cronologia di 90 giorni', 'Coda e metriche operative'] },
      { name: 'Pro', price: 'US$40.00', description: 'Per automatizzare operazioni, appuntamenti ed esperienza del cliente.', features: ['Alto volume di turni', 'Fino a 10 barbieri', 'Appuntamenti e prenotazioni online', 'BarberTrix TV', 'CRM e cassa', 'Automazioni avanzate'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Per attività con più sedi, analisi e controllo aziendale.', features: ['Fino a 3 sedi', 'Barbieri illimitati', 'Tutto il piano Pro', 'Report avanzati', 'Ruoli e audit avanzati', 'Supporto prioritario'] },
    ],
    supportSubject: '[BarberTrix] Richiesta di assistenza', slogan: 'Il tuo turno. Il tuo stile. Il tuo tempo.', terms: 'Termini', privacy: 'Privacy',
  },
  nl: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Start BarberTrix zonder kaart en test de wachtrij met echte klanten.', features: ['100 beurten/maand + 10 marge', 'Tot 3 barbiers', 'Tot 5 diensten', 'Openbare QR-code en link', 'Essentiële meldingen', '7 dagen geschiedenis'] },
      { name: 'Starter', price: 'US$20.00', description: 'Voor kleine barbershops die BarberTrix al dagelijks gebruiken.', features: ['1.000 beurten/maand', 'Tot 5 barbiers', 'Onbeperkte diensten', '90 dagen geschiedenis', 'Wachtrij en operationele statistieken'] },
      { name: 'Pro', price: 'US$40.00', description: 'Voor het automatiseren van de operatie, afspraken en klantervaring.', features: ['Hoog volume aan beurten', 'Tot 10 barbiers', 'Afspraken en online boeken', 'BarberTrix TV', 'CRM en kassa', 'Geavanceerde automatiseringen'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Voor meerdere vestigingen, analyses en bedrijfsbrede controle.', features: ['Tot 3 vestigingen', 'Onbeperkte barbiers', 'Alles uit Pro', 'Geavanceerde rapporten', 'Geavanceerde rollen en audit', 'Prioritaire ondersteuning'] },
    ],
    supportSubject: '[BarberTrix] Ondersteuningsverzoek', slogan: 'Jouw beurt. Jouw stijl. Jouw tijd.', terms: 'Voorwaarden', privacy: 'Privacy',
  },
  ht: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'Kòmanse sèvi ak BarberTrix san kat epi teste liy lan ak kliyan reyèl.', features: ['100 sèvis/mwa + 10 tolerans', 'Jiska 3 babè', 'Jiska 5 sèvis', 'QR ak lyen piblik', 'Notifikasyon esansyèl', 'Istwa 7 jou'] },
      { name: 'Starter', price: 'US$20.00', description: 'Pou ti babèshop ki deja sèvi ak BarberTrix chak jou.', features: ['1,000 sèvis/mwa', 'Jiska 5 babè', 'Sèvis san limit', 'Istwa 90 jou', 'Liy ak mezi operasyon'] },
      { name: 'Pro', price: 'US$40.00', description: 'Pou otomatize operasyon, randevou ak eksperyans kliyan an.', features: ['Gwo volim sèvis', 'Jiska 10 babè', 'Randevou ak rezèvasyon sou entènèt', 'BarberTrix TV', 'CRM ak kès', 'Otomatizasyon avanse'], featured: true },
      { name: 'Business', price: 'US$70.00', description: 'Pou plizyè lokal, analiz ak kontwòl antrepriz.', features: ['Jiska 3 lokal', 'Babè san limit', 'Tout sa ki nan Pro', 'Rapò avanse', 'Wòl ak odit avanse', 'Sipò priyoritè'] },
    ],
    supportSubject: '[BarberTrix] Demann sipò', slogan: 'Tou pa w. Stil pa w. Tan pa w.', terms: 'Kondisyon', privacy: 'Vi prive',
  },
  ja: {
    plans: [
      { name: 'Free', price: 'US$0', description: 'カード登録なしで BarberTrix を始め、実際のお客様でキュー運用を試せます。', features: ['月100件 + 10件の猶予', '理容師3名まで', 'サービス5件まで', '公開QRとリンク', '基本通知', '7日間の履歴'] },
      { name: 'Starter', price: 'US$20.00', description: 'BarberTrix を日常的に利用する小規模バーバーショップ向けです。', features: ['月1,000件', '理容師5名まで', 'サービス数無制限', '90日間の履歴', 'キューと運営指標'] },
      { name: 'Pro', price: 'US$40.00', description: '運営、予約、顧客体験をさらに自動化したい店舗向けです。', features: ['大規模な順番待ち対応', '理容師10名まで', '予約とオンライン予約', 'BarberTrix TV', 'CRMとレジ管理', '高度な自動化'], featured: true },
      { name: 'Business', price: 'US$70.00', description: '複数店舗、分析、企業レベルの管理が必要な運営向けです。', features: ['3店舗まで', '理容師数無制限', 'Pro の全機能', '高度なレポート', '高度な権限と監査', '優先サポート'] },
    ],
    supportSubject: '[BarberTrix] サポート依頼', slogan: 'あなたの順番。あなたのスタイル。あなたの時間。', terms: '利用規約', privacy: 'プライバシー',
  },
}

export function getHomeAuxCopy(locale: Locale): HomeAuxCopy {
  return homeAuxCopy[locale as CompleteHomeLocale] ?? homeAuxCopy.en
}
