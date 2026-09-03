import type { Locale } from '@/i18n/types';

type DiscoveryCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  liveWait: string;
  noWait: string;
  unavailable: string;
  waiting: string;
  availableBarbers: string;
  from: string;
  request: string;
  staffLogin: string;
  empty: string;
  error: string;
};

export const discoveryCopy: Record<Locale, DiscoveryCopy> = {
  'es-419': { eyebrow: 'DESCUBRE', title: 'Tu próximo corte, sin perder tiempo.', subtitle: 'Compara barberías por demanda real, barberos disponibles y espera estimada.', searchPlaceholder: 'Buscar barbería', liveWait: 'Espera estimada', noWait: 'Sin fila ahora', unavailable: 'Sin estimación', waiting: 'en espera', availableBarbers: 'barberos disponibles', from: 'Desde', request: 'Ver disponibilidad', staffLogin: 'Acceso para profesionales', empty: 'No encontramos barberías con ese nombre.', error: 'No pudimos cargar las barberías. Intenta nuevamente.' },
  en: { eyebrow: 'DISCOVER', title: 'Your next cut, without wasting time.', subtitle: 'Compare barbershops by live demand, available barbers and estimated wait.', searchPlaceholder: 'Search barbershops', liveWait: 'Estimated wait', noWait: 'No line right now', unavailable: 'No estimate', waiting: 'waiting', availableBarbers: 'barbers available', from: 'From', request: 'View availability', staffLogin: 'Professional sign in', empty: 'No barbershops matched your search.', error: 'We could not load barbershops. Please try again.' },
  'pt-BR': { eyebrow: 'DESCUBRA', title: 'Seu próximo corte, sem perder tempo.', subtitle: 'Compare barbearias por demanda ao vivo, barbeiros disponíveis e espera estimada.', searchPlaceholder: 'Buscar barbearia', liveWait: 'Espera estimada', noWait: 'Sem fila agora', unavailable: 'Sem estimativa', waiting: 'aguardando', availableBarbers: 'barbeiros disponíveis', from: 'A partir de', request: 'Ver disponibilidade', staffLogin: 'Acesso profissional', empty: 'Nenhuma barbearia encontrada.', error: 'Não foi possível carregar as barbearias.' },
  fr: { eyebrow: 'DÉCOUVRIR', title: 'Votre prochaine coupe, sans perdre de temps.', subtitle: 'Comparez les salons selon la demande en direct, les barbiers disponibles et l’attente estimée.', searchPlaceholder: 'Rechercher un salon', liveWait: 'Attente estimée', noWait: 'Aucune file', unavailable: 'Indisponible', waiting: 'en attente', availableBarbers: 'barbiers disponibles', from: 'À partir de', request: 'Voir les disponibilités', staffLogin: 'Accès professionnel', empty: 'Aucun salon trouvé.', error: 'Impossible de charger les salons.' },
  ht: { eyebrow: 'DEKOUVRI', title: 'Pwochen koupe ou, san pèdi tan.', subtitle: 'Konpare babè yo selon demann aktyèl, babè disponib ak tan tann estime.', searchPlaceholder: 'Chèche babè', liveWait: 'Tan tann estime', noWait: 'Pa gen liy kounye a', unavailable: 'Pa gen estimasyon', waiting: 'ap tann', availableBarbers: 'babè disponib', from: 'Apati', request: 'Gade disponiblite', staffLogin: 'Aksè pwofesyonèl', empty: 'Nou pa jwenn okenn babè.', error: 'Nou pa t kapab chaje babè yo.' },
  de: { eyebrow: 'ENTDECKEN', title: 'Dein nächster Schnitt, ohne Zeit zu verlieren.', subtitle: 'Vergleiche Barbershops nach Live-Auslastung, verfügbaren Barbieren und geschätzter Wartezeit.', searchPlaceholder: 'Barbershop suchen', liveWait: 'Geschätzte Wartezeit', noWait: 'Keine Warteschlange', unavailable: 'Keine Schätzung', waiting: 'wartend', availableBarbers: 'Barbiere verfügbar', from: 'Ab', request: 'Verfügbarkeit ansehen', staffLogin: 'Profi-Anmeldung', empty: 'Keine Barbershops gefunden.', error: 'Barbershops konnten nicht geladen werden.' },
  it: { eyebrow: 'SCOPRI', title: 'Il tuo prossimo taglio, senza perdere tempo.', subtitle: 'Confronta i barber shop per domanda in tempo reale, barbieri disponibili e attesa stimata.', searchPlaceholder: 'Cerca barber shop', liveWait: 'Attesa stimata', noWait: 'Nessuna fila', unavailable: 'Nessuna stima', waiting: 'in attesa', availableBarbers: 'barbieri disponibili', from: 'Da', request: 'Vedi disponibilità', staffLogin: 'Accesso professionisti', empty: 'Nessun barber shop trovato.', error: 'Impossibile caricare i barber shop.' },
  ja: { eyebrow: '見つける', title: '待ち時間を減らして、次のカットへ。', subtitle: 'リアルタイムの混雑状況、空いている理容師、推定待ち時間で比較できます。', searchPlaceholder: 'バーバーショップを検索', liveWait: '推定待ち時間', noWait: '待ち時間なし', unavailable: '推定なし', waiting: '人待ち', availableBarbers: '人の理容師が対応可能', from: '料金', request: '空き状況を見る', staffLogin: 'プロ向けログイン', empty: '該当する店舗がありません。', error: '店舗を読み込めませんでした。' },
  ko: { eyebrow: '둘러보기', title: '기다림을 줄이고 다음 커트를 만나세요.', subtitle: '실시간 대기 수요, 이용 가능한 바버, 예상 대기 시간으로 비교하세요.', searchPlaceholder: '바버샵 검색', liveWait: '예상 대기', noWait: '현재 대기 없음', unavailable: '예상 없음', waiting: '명 대기', availableBarbers: '명 이용 가능', from: '최저', request: '예약 가능 시간 보기', staffLogin: '전문가 로그인', empty: '검색 결과가 없습니다.', error: '바버샵을 불러오지 못했습니다.' },
  'zh-CN': { eyebrow: '发现', title: '少等待，更快开始下一次理发。', subtitle: '按实时客流、可用理发师和预计等待时间比较理发店。', searchPlaceholder: '搜索理发店', liveWait: '预计等待', noWait: '当前无需排队', unavailable: '暂无预计', waiting: '人等待', availableBarbers: '位理发师可用', from: '起价', request: '查看可用时间', staffLogin: '专业人员登录', empty: '没有找到匹配的理发店。', error: '无法加载理发店，请重试。' },
};
