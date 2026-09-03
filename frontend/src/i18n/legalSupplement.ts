import type { Dictionary } from './types'

type CompleteCoreLocale = 'es-419' | 'en' | 'es-ES' | 'pt-BR' | 'fr' | 'de' | 'it' | 'nl' | 'ht' | 'ja'

const es419: Dictionary = {
  'legal.backHome': 'Volver al inicio',
  'legal.privacyTitle': 'Aviso de privacidad',
  'legal.termsTitle': 'Términos de servicio',
  'legal.lastUpdated': 'Última actualización: {{date}}.',
  'legal.privacy.p1': 'BarberTrix procesa los datos necesarios para administrar usuarios, clientes, turnos, citas y pagos registrados. Esto puede incluir nombre, correo, teléfono, actividad operativa, dirección IP y metadatos técnicos de sesión.',
  'legal.privacy.p2': 'La información se usa para prestar y proteger el servicio, autenticar usuarios, enviar comunicaciones transaccionales y generar reportes. Los datos de tarjeta son procesados por PayPal y no deben almacenarse en BarberTrix.',
  'legal.privacy.p3': 'Aplicamos aislamiento por barbería, permisos por rol, controles de sesión y auditoría. Los datos se conservan durante la vigencia de la cuenta y cuando sea necesario por seguridad u obligaciones legales. Las sesiones demo se eliminan automáticamente.',
  'legal.privacy.p4': 'El titular puede solicitar acceso, corrección, exportación o eliminación mediante el canal de soporte publicado por el operador.',
  'legal.terms.p1': 'BarberTrix ofrece software para administrar filas, citas, clientes, equipo, caja y reportes. La barbería conserva la responsabilidad sobre sus servicios, precios, personal, impuestos y uso lícito de los datos.',
  'legal.terms.p2': 'El titular debe proporcionar información veraz, proteger credenciales y asignar permisos adecuados. Está prohibido interferir con el servicio, acceder a otros tenants o usar la plataforma para actividades ilícitas.',
  'legal.terms.p3': 'Los planes y límites se muestran antes de contratar. Las suscripciones se procesan mediante PayPal y pueden cancelarse desde el panel. La falta de pago puede limitar o suspender funciones.',
  'legal.terms.p4': 'El servicio puede cambiar por seguridad o mejora operativa y no se garantiza disponibilidad ininterrumpida donde la ley permita esa limitación.',
  'legal.draftNotice': 'Este texto es un borrador operativo y debe adaptarse con asesoría legal antes del lanzamiento público.',
}

const en: Dictionary = {
  'legal.backHome': 'Back to home',
  'legal.privacyTitle': 'Privacy notice',
  'legal.termsTitle': 'Terms of service',
  'legal.lastUpdated': 'Last updated: {{date}}.',
  'legal.privacy.p1': 'BarberTrix processes the data needed to manage users, customers, queue tickets, appointments and recorded payments. This may include name, email, phone number, operational activity, IP address and technical session metadata.',
  'legal.privacy.p2': 'The information is used to provide and protect the service, authenticate users, send transactional communications and generate reports. Card data is processed by PayPal and must not be stored by BarberTrix.',
  'legal.privacy.p3': 'We apply barbershop isolation, role-based permissions, session controls and auditing. Data is retained while the account is active and when required for security or legal obligations. Demo sessions are deleted automatically.',
  'legal.privacy.p4': 'The data subject may request access, correction, export or deletion through the support channel published by the operator.',
  'legal.terms.p1': 'BarberTrix provides software to manage queues, appointments, customers, teams, cash operations and reports. The barbershop remains responsible for its services, prices, staff, taxes and lawful use of data.',
  'legal.terms.p2': 'The account holder must provide accurate information, protect credentials and assign appropriate permissions. Interfering with the service, accessing other tenants or using the platform for unlawful activities is prohibited.',
  'legal.terms.p3': 'Plans and limits are shown before purchase. Subscriptions are processed through PayPal and can be cancelled from the dashboard. Non-payment may limit or suspend features.',
  'legal.terms.p4': 'The service may change for security or operational improvement, and uninterrupted availability is not guaranteed where the law permits that limitation.',
  'legal.draftNotice': 'This text is an operational draft and must be adapted with legal advice before public launch.',
}

const esES: Dictionary = {
  ...es419,
  'legal.privacy.p1': 'BarberTrix trata los datos necesarios para gestionar usuarios, clientes, turnos, citas y pagos registrados. Esto puede incluir nombre, correo electrónico, teléfono, actividad operativa, dirección IP y metadatos técnicos de sesión.',
  'legal.privacy.p2': 'La información se utiliza para prestar y proteger el servicio, autenticar usuarios, enviar comunicaciones transaccionales y generar informes. Los datos de tarjeta son tratados por PayPal y no deben almacenarse en BarberTrix.',
  'legal.privacy.p3': 'Aplicamos aislamiento por barbería, permisos por rol, controles de sesión y auditoría. Los datos se conservan mientras la cuenta esté vigente y cuando sea necesario por seguridad u obligaciones legales. Las sesiones de demostración se eliminan automáticamente.',
  'legal.terms.p1': 'BarberTrix ofrece software para gestionar colas, citas, clientes, equipo, caja e informes. La barbería conserva la responsabilidad sobre sus servicios, precios, personal, impuestos y uso lícito de los datos.',
}

const ptBR: Dictionary = {
  'legal.backHome': 'Voltar ao início', 'legal.privacyTitle': 'Aviso de privacidade', 'legal.termsTitle': 'Termos de serviço', 'legal.lastUpdated': 'Última atualização: {{date}}.',
  'legal.privacy.p1': 'O BarberTrix processa os dados necessários para gerenciar usuários, clientes, atendimentos, agendamentos e pagamentos registrados. Isso pode incluir nome, e-mail, telefone, atividade operacional, endereço IP e metadados técnicos da sessão.',
  'legal.privacy.p2': 'As informações são usadas para fornecer e proteger o serviço, autenticar usuários, enviar comunicações transacionais e gerar relatórios. Os dados de cartão são processados pelo PayPal e não devem ser armazenados pelo BarberTrix.',
  'legal.privacy.p3': 'Aplicamos isolamento por barbearia, permissões por função, controles de sessão e auditoria. Os dados são mantidos enquanto a conta estiver ativa e quando necessário por segurança ou obrigações legais. Sessões de demonstração são excluídas automaticamente.',
  'legal.privacy.p4': 'O titular pode solicitar acesso, correção, exportação ou exclusão por meio do canal de suporte publicado pelo operador.',
  'legal.terms.p1': 'O BarberTrix oferece software para gerenciar filas, agendamentos, clientes, equipe, caixa e relatórios. A barbearia continua responsável por seus serviços, preços, equipe, impostos e uso legal dos dados.',
  'legal.terms.p2': 'O titular deve fornecer informações verdadeiras, proteger credenciais e atribuir permissões adequadas. É proibido interferir no serviço, acessar outros tenants ou usar a plataforma para atividades ilícitas.',
  'legal.terms.p3': 'Planos e limites são exibidos antes da contratação. As assinaturas são processadas pelo PayPal e podem ser canceladas pelo painel. A falta de pagamento pode limitar ou suspender funcionalidades.',
  'legal.terms.p4': 'O serviço pode mudar por segurança ou melhoria operacional, e a disponibilidade ininterrupta não é garantida quando a legislação permitir essa limitação.',
  'legal.draftNotice': 'Este texto é um rascunho operacional e deve ser adaptado com assessoria jurídica antes do lançamento público.',
}

const fr: Dictionary = {
  'legal.backHome': 'Retour à l’accueil', 'legal.privacyTitle': 'Avis de confidentialité', 'legal.termsTitle': 'Conditions d’utilisation', 'legal.lastUpdated': 'Dernière mise à jour : {{date}}.',
  'legal.privacy.p1': 'BarberTrix traite les données nécessaires à la gestion des utilisateurs, clients, tickets de file, rendez-vous et paiements enregistrés. Cela peut inclure le nom, l’e-mail, le téléphone, l’activité opérationnelle, l’adresse IP et les métadonnées techniques de session.',
  'legal.privacy.p2': 'Les informations servent à fournir et protéger le service, authentifier les utilisateurs, envoyer des communications transactionnelles et générer des rapports. Les données de carte sont traitées par PayPal et ne doivent pas être stockées par BarberTrix.',
  'legal.privacy.p3': 'Nous appliquons un cloisonnement par barbershop, des autorisations par rôle, des contrôles de session et un audit. Les données sont conservées pendant la durée du compte et lorsque la sécurité ou la loi l’exige. Les sessions de démonstration sont supprimées automatiquement.',
  'legal.privacy.p4': 'La personne concernée peut demander l’accès, la rectification, l’exportation ou la suppression via le canal d’assistance publié par l’opérateur.',
  'legal.terms.p1': 'BarberTrix fournit un logiciel de gestion des files, rendez-vous, clients, équipes, caisse et rapports. Le barbershop reste responsable de ses services, tarifs, personnel, taxes et de l’utilisation licite des données.',
  'legal.terms.p2': 'Le titulaire du compte doit fournir des informations exactes, protéger ses identifiants et attribuer les autorisations appropriées. Il est interdit de perturber le service, d’accéder à d’autres tenants ou d’utiliser la plateforme à des fins illicites.',
  'legal.terms.p3': 'Les forfaits et limites sont affichés avant la souscription. Les abonnements sont traités par PayPal et peuvent être annulés depuis le tableau de bord. Un défaut de paiement peut limiter ou suspendre des fonctionnalités.',
  'legal.terms.p4': 'Le service peut évoluer pour des raisons de sécurité ou d’amélioration opérationnelle et une disponibilité ininterrompue n’est pas garantie lorsque la loi autorise cette limitation.',
  'legal.draftNotice': 'Ce texte est un brouillon opérationnel et doit être adapté avec un conseil juridique avant le lancement public.',
}

const de: Dictionary = {
  'legal.backHome': 'Zurück zur Startseite', 'legal.privacyTitle': 'Datenschutzhinweis', 'legal.termsTitle': 'Nutzungsbedingungen', 'legal.lastUpdated': 'Zuletzt aktualisiert: {{date}}.',
  'legal.privacy.p1': 'BarberTrix verarbeitet die Daten, die zur Verwaltung von Benutzern, Kunden, Wartetickets, Terminen und erfassten Zahlungen erforderlich sind. Dazu können Name, E-Mail, Telefonnummer, betriebliche Aktivität, IP-Adresse und technische Sitzungsmetadaten gehören.',
  'legal.privacy.p2': 'Die Informationen werden verwendet, um den Dienst bereitzustellen und zu schützen, Benutzer zu authentifizieren, transaktionale Mitteilungen zu senden und Berichte zu erstellen. Kartendaten werden von PayPal verarbeitet und dürfen nicht in BarberTrix gespeichert werden.',
  'legal.privacy.p3': 'Wir setzen Barbershop-Isolierung, rollenbasierte Berechtigungen, Sitzungskontrollen und Auditing ein. Daten werden während der Laufzeit des Kontos und bei Sicherheits- oder gesetzlichen Anforderungen aufbewahrt. Demo-Sitzungen werden automatisch gelöscht.',
  'legal.privacy.p4': 'Betroffene Personen können über den veröffentlichten Supportkanal des Betreibers Auskunft, Berichtigung, Export oder Löschung beantragen.',
  'legal.terms.p1': 'BarberTrix bietet Software zur Verwaltung von Warteschlangen, Terminen, Kunden, Teams, Kasse und Berichten. Der Barbershop bleibt für Leistungen, Preise, Personal, Steuern und die rechtmäßige Datennutzung verantwortlich.',
  'legal.terms.p2': 'Der Kontoinhaber muss richtige Angaben machen, Zugangsdaten schützen und angemessene Berechtigungen vergeben. Eingriffe in den Dienst, der Zugriff auf andere Tenants oder die Nutzung der Plattform für rechtswidrige Aktivitäten sind untersagt.',
  'legal.terms.p3': 'Tarife und Grenzen werden vor dem Kauf angezeigt. Abonnements werden über PayPal verarbeitet und können im Dashboard gekündigt werden. Bei Nichtzahlung können Funktionen eingeschränkt oder gesperrt werden.',
  'legal.terms.p4': 'Der Dienst kann sich aus Sicherheitsgründen oder zur betrieblichen Verbesserung ändern; eine unterbrechungsfreie Verfügbarkeit wird nicht garantiert, soweit das Gesetz eine solche Einschränkung zulässt.',
  'legal.draftNotice': 'Dieser Text ist ein betrieblicher Entwurf und muss vor dem öffentlichen Start mit rechtlicher Beratung angepasst werden.',
}

const it: Dictionary = {
  'legal.backHome': 'Torna alla home', 'legal.privacyTitle': 'Informativa sulla privacy', 'legal.termsTitle': 'Termini di servizio', 'legal.lastUpdated': 'Ultimo aggiornamento: {{date}}.',
  'legal.privacy.p1': 'BarberTrix tratta i dati necessari per gestire utenti, clienti, turni, appuntamenti e pagamenti registrati. Possono essere inclusi nome, e-mail, telefono, attività operativa, indirizzo IP e metadati tecnici della sessione.',
  'legal.privacy.p2': 'Le informazioni vengono utilizzate per fornire e proteggere il servizio, autenticare gli utenti, inviare comunicazioni transazionali e generare report. I dati delle carte sono elaborati da PayPal e non devono essere memorizzati da BarberTrix.',
  'legal.privacy.p3': 'Applichiamo isolamento per barbershop, autorizzazioni per ruolo, controlli di sessione e audit. I dati vengono conservati finché l’account è attivo e quando necessario per sicurezza o obblighi di legge. Le sessioni demo vengono eliminate automaticamente.',
  'legal.privacy.p4': 'L’interessato può richiedere accesso, rettifica, esportazione o cancellazione tramite il canale di supporto pubblicato dall’operatore.',
  'legal.terms.p1': 'BarberTrix offre software per gestire code, appuntamenti, clienti, team, cassa e report. Il barbershop resta responsabile dei propri servizi, prezzi, personale, imposte e uso lecito dei dati.',
  'legal.terms.p2': 'Il titolare dell’account deve fornire informazioni corrette, proteggere le credenziali e assegnare autorizzazioni adeguate. È vietato interferire con il servizio, accedere ad altri tenant o usare la piattaforma per attività illecite.',
  'legal.terms.p3': 'Piani e limiti vengono mostrati prima dell’acquisto. Gli abbonamenti sono elaborati tramite PayPal e possono essere annullati dal pannello. Il mancato pagamento può limitare o sospendere le funzionalità.',
  'legal.terms.p4': 'Il servizio può cambiare per sicurezza o miglioramento operativo e la disponibilità ininterrotta non è garantita dove la legge consente tale limitazione.',
  'legal.draftNotice': 'Questo testo è una bozza operativa e deve essere adattato con consulenza legale prima del lancio pubblico.',
}

const nl: Dictionary = {
  'legal.backHome': 'Terug naar start', 'legal.privacyTitle': 'Privacyverklaring', 'legal.termsTitle': 'Servicevoorwaarden', 'legal.lastUpdated': 'Laatst bijgewerkt: {{date}}.',
  'legal.privacy.p1': 'BarberTrix verwerkt de gegevens die nodig zijn om gebruikers, klanten, wachtrijtickets, afspraken en geregistreerde betalingen te beheren. Dit kan naam, e-mail, telefoonnummer, operationele activiteit, IP-adres en technische sessiemetadata omvatten.',
  'legal.privacy.p2': 'De informatie wordt gebruikt om de dienst te leveren en te beveiligen, gebruikers te authenticeren, transactionele communicatie te versturen en rapporten te maken. Kaartgegevens worden door PayPal verwerkt en mogen niet door BarberTrix worden opgeslagen.',
  'legal.privacy.p3': 'We passen isolatie per barbershop, rolgebaseerde rechten, sessiecontroles en auditing toe. Gegevens worden bewaard zolang het account actief is en wanneer dat nodig is voor beveiliging of wettelijke verplichtingen. Demosessies worden automatisch verwijderd.',
  'legal.privacy.p4': 'De betrokkene kan via het gepubliceerde supportkanaal van de beheerder inzage, correctie, export of verwijdering aanvragen.',
  'legal.terms.p1': 'BarberTrix biedt software voor het beheren van wachtrijen, afspraken, klanten, teams, kassa en rapporten. De barbershop blijft verantwoordelijk voor diensten, prijzen, personeel, belastingen en rechtmatig gebruik van gegevens.',
  'legal.terms.p2': 'De accounthouder moet juiste informatie verstrekken, inloggegevens beschermen en passende rechten toewijzen. Het verstoren van de dienst, toegang tot andere tenants of gebruik van het platform voor illegale activiteiten is verboden.',
  'legal.terms.p3': 'Plannen en limieten worden vóór aankoop getoond. Abonnementen worden via PayPal verwerkt en kunnen vanuit het dashboard worden opgezegd. Niet-betaling kan functies beperken of opschorten.',
  'legal.terms.p4': 'De dienst kan wijzigen om veiligheidsredenen of voor operationele verbetering en ononderbroken beschikbaarheid wordt niet gegarandeerd waar de wet deze beperking toestaat.',
  'legal.draftNotice': 'Deze tekst is een operationeel concept en moet vóór de publieke lancering met juridisch advies worden aangepast.',
}

const ht: Dictionary = {
  'legal.backHome': 'Retounen nan kòmansman', 'legal.privacyTitle': 'Avi sou konfidansyalite', 'legal.termsTitle': 'Kondisyon sèvis', 'legal.lastUpdated': 'Dènye mizajou: {{date}}.',
  'legal.privacy.p1': 'BarberTrix trete done ki nesesè pou jere itilizatè, kliyan, plas nan liy, randevou ak peman ki anrejistre. Sa ka gen ladan non, imèl, telefòn, aktivite operasyonèl, adrès IP ak metadone teknik sesyon.',
  'legal.privacy.p2': 'Nou itilize enfòmasyon yo pou bay ak pwoteje sèvis la, verifye itilizatè, voye kominikasyon tranzaksyonèl epi kreye rapò. PayPal trete done kat yo epi BarberTrix pa dwe estoke yo.',
  'legal.privacy.p3': 'Nou aplike izolasyon pa babèshop, pèmisyon selon wòl, kontwòl sesyon ak odit. Done yo konsève pandan kont lan aktif ak lè sa nesesè pou sekirite oswa obligasyon legal. Sesyon demo yo efase otomatikman.',
  'legal.privacy.p4': 'Moun done yo konsène a ka mande aksè, koreksyon, ekspòtasyon oswa efasman atravè chanèl sipò operatè a pibliye.',
  'legal.terms.p1': 'BarberTrix bay lojisyèl pou jere liy, randevou, kliyan, ekip, kès ak rapò. Babèshop la rete responsab pou sèvis li, pri, pèsonèl, taks ak itilizasyon legal done yo.',
  'legal.terms.p2': 'Moun ki gen kont lan dwe bay enfòmasyon ki kòrèk, pwoteje enfòmasyon koneksyon epi bay pèmisyon ki apwopriye. Li entèdi pou deranje sèvis la, antre nan lòt tenant oswa itilize platfòm la pou aktivite ilegal.',
  'legal.terms.p3': 'Plan ak limit yo parèt anvan acha. PayPal trete abònman yo epi yo ka anile nan panèl la. Si peman pa fèt, kèk fonksyon ka limite oswa sispann.',
  'legal.terms.p4': 'Sèvis la ka chanje pou sekirite oswa amelyorasyon operasyonèl, epi disponiblite san entèripsyon pa garanti kote lalwa pèmèt limit sa a.',
  'legal.draftNotice': 'Tèks sa a se yon bouyon operasyonèl epi li dwe adapte avèk konsèy legal anvan lansman piblik.',
}

const ja: Dictionary = {
  'legal.backHome': 'ホームに戻る', 'legal.privacyTitle': 'プライバシー通知', 'legal.termsTitle': '利用規約', 'legal.lastUpdated': '最終更新：{{date}}',
  'legal.privacy.p1': 'BarberTrix は、ユーザー、顧客、順番待ち、予約、登録された支払いを管理するために必要なデータを処理します。これには氏名、メールアドレス、電話番号、運用履歴、IPアドレス、技術的なセッションメタデータが含まれる場合があります。',
  'legal.privacy.p2': '情報は、サービスの提供と保護、ユーザー認証、取引に関する通知、レポート作成に使用されます。カード情報は PayPal が処理し、BarberTrix では保存しません。',
  'legal.privacy.p3': '店舗ごとのデータ分離、ロール別権限、セッション制御、監査を適用します。データはアカウントの有効期間中、およびセキュリティや法的義務のために必要な期間保持されます。デモセッションは自動的に削除されます。',
  'legal.privacy.p4': '本人は、運営者が公開するサポート窓口を通じて、アクセス、訂正、エクスポート、削除を請求できます。',
  'legal.terms.p1': 'BarberTrix は、順番待ち、予約、顧客、チーム、レジ、レポートを管理するソフトウェアを提供します。各バーバーショップは、自社のサービス、価格、スタッフ、税務、適法なデータ利用について責任を負います。',
  'legal.terms.p2': 'アカウント所有者は正確な情報を提供し、認証情報を保護し、適切な権限を設定する必要があります。サービスの妨害、他テナントへのアクセス、違法行為への利用は禁止されています。',
  'legal.terms.p3': 'プランと上限は契約前に表示されます。サブスクリプションは PayPal を通じて処理され、ダッシュボードから解約できます。未払いの場合、機能が制限または停止されることがあります。',
  'legal.terms.p4': 'サービスはセキュリティや運用改善のために変更される場合があり、法律で許容される範囲では中断のない可用性を保証しません。',
  'legal.draftNotice': 'この文書は運用上の草案であり、一般公開前に法的助言を受けて調整する必要があります。',
}

export const legalSupplement: Record<CompleteCoreLocale, Dictionary> = {
  'es-419': es419,
  en,
  'es-ES': esES,
  'pt-BR': ptBR,
  fr,
  de,
  it,
  nl,
  ht,
  ja,
}
