import type { Dictionary } from './types'
import type { OfficialLocale } from './officialLocales'

const es: Dictionary = {
  'commercial.unexpected': 'Error inesperado',
  'commercial.operationError': 'No se pudo completar la operación',
  'commercial.edit': 'Editar',
  'commercial.activate': 'Activar',
  'commercial.deactivate': 'Desactivar',
  'commercial.active': 'Activo',
  'commercial.inactive': 'Inactivo',
  'commercial.close': 'Cerrar',
  'commercial.save': 'Guardar',
  'commercial.all': 'Todos',
  'commercial.unlimited': 'ilimitados',
  'commercial.unlimitedFeminine': 'ilimitadas',
  'shell.demoTitle': 'BarberTurn Demo',
  'shell.adminTitle': 'BarberTurn Admin',
  'shell.demoBadge': 'DEMO',
  'shell.adminBadge': 'ADMIN',
  'role.receptionist': 'Recepcionista',
  'role.barber': 'Barbero',
  'barbers.promptName': 'Nombre del barbero',
  'barbers.promptChair': 'Número de silla',
  'barbers.updated': 'Barbero actualizado',
  'services.promptName': 'Nombre del servicio',
  'services.promptPrice': 'Precio',
  'services.promptDuration': 'Duración estimada (min)',
  'services.updated': 'Servicio actualizado',
  'team.eyebrow': 'EQUIPO Y PERMISOS',
  'team.title': 'Usuarios',
  'team.lockedTitle': 'Equipo y permisos',
  'team.lockedText': 'Las invitaciones y cuentas de empleados están bloqueadas en la demostración.',
  'team.name': 'Nombre',
  'team.email': 'Correo',
  'team.noBarberLink': 'Sin vínculo de barbero',
  'team.invite': 'Invitar',
  'team.invitationCreated': 'Invitación creada',
  'team.userDeactivated': 'Usuario desactivado',
  'team.deactivateError': 'No se pudo desactivar el usuario',
  'locations.eyebrow': 'CONFIGURACIÓN Y SUCURSALES',
  'locations.title': 'Mi barbería',
  'locations.lockedTitle': 'Configuración comercial y sucursales',
  'locations.lockedText': 'La demo usa una barbería temporal y no permite alterar su configuración comercial.',
  'locations.saveSettings': 'Guardar configuración',
  'locations.settingsUpdated': 'Configuración actualizada',
  'locations.updateError': 'No se pudo actualizar la barbería',
  'locations.locations': 'Ubicaciones',
  'locations.name': 'Nombre',
  'locations.slug': 'Identificador (ej. centro)',
  'locations.address': 'Dirección',
  'locations.add': 'Agregar',
  'locations.added': 'Sucursal agregada',
  'billing.eyebrow': 'SUSCRIPCIÓN',
  'billing.lockedTitle': 'Planes y suscripción',
  'billing.lockedText': 'La demostración no permite iniciar pagos. Crea una cuenta real para elegir un plan.',
  'billing.systemAdminTitle': 'Administrador del sistema · Acceso total',
  'billing.systemAdminText': 'Esta cuenta no está sujeta a planes, límites de barberos ni límites de sucursales.',
  'billing.openTv': 'Abrir BarberTurn TV',
  'billing.loadingUsage': 'Cargando uso…',
  'billing.activeBarbers': '{{active}} de {{limit}} barberos activos',
  'billing.activeServices': '{{active}} de {{limit}} servicios activos',
  'billing.turnsExpanded': '{{used}} turnos este mes · uso ampliado',
  'billing.turnsIncluded': '{{used}} de {{limit}} turnos incluidos este mes',
  'billing.graceUntil': ' · tolerancia hasta {{grace}}',
  'billing.activeLocations': '{{active}} de {{limit}} sucursales activas',
  'billing.cancel': 'Cancelar suscripción',
  'billing.cancelled': 'Suscripción cancelada',
  'billing.cancelError': 'No se pudo cancelar la suscripción',
  'billing.paypalError': 'No se pudo iniciar PayPal',
}

const en: Dictionary = {
  'commercial.unexpected': 'Unexpected error', 'commercial.operationError': 'The operation could not be completed', 'commercial.edit': 'Edit', 'commercial.activate': 'Activate', 'commercial.deactivate': 'Deactivate', 'commercial.active': 'Active', 'commercial.inactive': 'Inactive', 'commercial.close': 'Close', 'commercial.save': 'Save', 'commercial.all': 'All', 'commercial.unlimited': 'unlimited', 'commercial.unlimitedFeminine': 'unlimited',
  'shell.demoTitle': 'BarberTurn Demo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DEMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Receptionist', 'role.barber': 'Barber',
  'barbers.promptName': 'Barber name', 'barbers.promptChair': 'Chair number', 'barbers.updated': 'Barber updated',
  'services.promptName': 'Service name', 'services.promptPrice': 'Price', 'services.promptDuration': 'Estimated duration (min)', 'services.updated': 'Service updated',
  'team.eyebrow': 'TEAM AND PERMISSIONS', 'team.title': 'Users', 'team.lockedTitle': 'Team and permissions', 'team.lockedText': 'Employee invitations and accounts are locked in the demo.', 'team.name': 'Name', 'team.email': 'Email', 'team.noBarberLink': 'No barber linked', 'team.invite': 'Invite', 'team.invitationCreated': 'Invitation created', 'team.userDeactivated': 'User deactivated', 'team.deactivateError': 'Could not deactivate the user',
  'locations.eyebrow': 'SETTINGS AND LOCATIONS', 'locations.title': 'My barbershop', 'locations.lockedTitle': 'Business settings and locations', 'locations.lockedText': 'The demo uses a temporary barbershop and does not allow changing its business settings.', 'locations.saveSettings': 'Save settings', 'locations.settingsUpdated': 'Settings updated', 'locations.updateError': 'Could not update the barbershop', 'locations.locations': 'Locations', 'locations.name': 'Name', 'locations.slug': 'Identifier (e.g. downtown)', 'locations.address': 'Address', 'locations.add': 'Add', 'locations.added': 'Location added',
  'billing.eyebrow': 'SUBSCRIPTION', 'billing.lockedTitle': 'Plans and subscription', 'billing.lockedText': 'The demo does not allow payments. Create a real account to choose a plan.', 'billing.systemAdminTitle': 'System administrator · Full access', 'billing.systemAdminText': 'This account is not subject to plans, barber limits, or location limits.', 'billing.openTv': 'Open BarberTurn TV', 'billing.loadingUsage': 'Loading usage…', 'billing.activeBarbers': '{{active}} of {{limit}} active barbers', 'billing.activeServices': '{{active}} of {{limit}} active services', 'billing.turnsExpanded': '{{used}} turns this month · expanded usage', 'billing.turnsIncluded': '{{used}} of {{limit}} turns included this month', 'billing.graceUntil': ' · grace up to {{grace}}', 'billing.activeLocations': '{{active}} of {{limit}} active locations', 'billing.cancel': 'Cancel subscription', 'billing.cancelled': 'Subscription cancelled', 'billing.cancelError': 'Could not cancel the subscription', 'billing.paypalError': 'Could not start PayPal',
}

const pt: Dictionary = {
  'commercial.unexpected': 'Erro inesperado', 'commercial.operationError': 'Não foi possível concluir a operação', 'commercial.edit': 'Editar', 'commercial.activate': 'Ativar', 'commercial.deactivate': 'Desativar', 'commercial.active': 'Ativo', 'commercial.inactive': 'Inativo', 'commercial.close': 'Fechar', 'commercial.save': 'Salvar', 'commercial.all': 'Todos', 'commercial.unlimited': 'ilimitados', 'commercial.unlimitedFeminine': 'ilimitadas',
  'shell.demoTitle': 'BarberTurn Demo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DEMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Recepcionista', 'role.barber': 'Barbeiro',
  'barbers.promptName': 'Nome do barbeiro', 'barbers.promptChair': 'Número da cadeira', 'barbers.updated': 'Barbeiro atualizado', 'services.promptName': 'Nome do serviço', 'services.promptPrice': 'Preço', 'services.promptDuration': 'Duração estimada (min)', 'services.updated': 'Serviço atualizado',
  'team.eyebrow': 'EQUIPE E PERMISSÕES', 'team.title': 'Usuários', 'team.lockedTitle': 'Equipe e permissões', 'team.lockedText': 'Convites e contas de funcionários ficam bloqueados na demonstração.', 'team.name': 'Nome', 'team.email': 'E-mail', 'team.noBarberLink': 'Sem vínculo com barbeiro', 'team.invite': 'Convidar', 'team.invitationCreated': 'Convite criado', 'team.userDeactivated': 'Usuário desativado', 'team.deactivateError': 'Não foi possível desativar o usuário',
  'locations.eyebrow': 'CONFIGURAÇÃO E UNIDADES', 'locations.title': 'Minha barbearia', 'locations.lockedTitle': 'Configuração comercial e unidades', 'locations.lockedText': 'A demonstração usa uma barbearia temporária e não permite alterar sua configuração comercial.', 'locations.saveSettings': 'Salvar configuração', 'locations.settingsUpdated': 'Configuração atualizada', 'locations.updateError': 'Não foi possível atualizar a barbearia', 'locations.locations': 'Unidades', 'locations.name': 'Nome', 'locations.slug': 'Identificador (ex. centro)', 'locations.address': 'Endereço', 'locations.add': 'Adicionar', 'locations.added': 'Unidade adicionada',
  'billing.eyebrow': 'ASSINATURA', 'billing.lockedTitle': 'Planos e assinatura', 'billing.lockedText': 'A demonstração não permite iniciar pagamentos. Crie uma conta real para escolher um plano.', 'billing.systemAdminTitle': 'Administrador do sistema · Acesso total', 'billing.systemAdminText': 'Esta conta não está sujeita a planos, limites de barbeiros ou limites de unidades.', 'billing.openTv': 'Abrir BarberTurn TV', 'billing.loadingUsage': 'Carregando uso…', 'billing.activeBarbers': '{{active}} de {{limit}} barbeiros ativos', 'billing.activeServices': '{{active}} de {{limit}} serviços ativos', 'billing.turnsExpanded': '{{used}} atendimentos neste mês · uso ampliado', 'billing.turnsIncluded': '{{used}} de {{limit}} atendimentos incluídos neste mês', 'billing.graceUntil': ' · tolerância até {{grace}}', 'billing.activeLocations': '{{active}} de {{limit}} unidades ativas', 'billing.cancel': 'Cancelar assinatura', 'billing.cancelled': 'Assinatura cancelada', 'billing.cancelError': 'Não foi possível cancelar a assinatura', 'billing.paypalError': 'Não foi possível iniciar o PayPal',
}

const fr: Dictionary = {
  'commercial.unexpected': 'Erreur inattendue', 'commercial.operationError': 'Impossible de terminer l’opération', 'commercial.edit': 'Modifier', 'commercial.activate': 'Activer', 'commercial.deactivate': 'Désactiver', 'commercial.active': 'Actif', 'commercial.inactive': 'Inactif', 'commercial.close': 'Fermer', 'commercial.save': 'Enregistrer', 'commercial.all': 'Tous', 'commercial.unlimited': 'illimités', 'commercial.unlimitedFeminine': 'illimitées',
  'shell.demoTitle': 'BarberTurn Démo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DÉMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Réceptionniste', 'role.barber': 'Barbier',
  'barbers.promptName': 'Nom du barbier', 'barbers.promptChair': 'Numéro du fauteuil', 'barbers.updated': 'Barbier mis à jour', 'services.promptName': 'Nom du service', 'services.promptPrice': 'Prix', 'services.promptDuration': 'Durée estimée (min)', 'services.updated': 'Service mis à jour',
  'team.eyebrow': 'ÉQUIPE ET AUTORISATIONS', 'team.title': 'Utilisateurs', 'team.lockedTitle': 'Équipe et autorisations', 'team.lockedText': 'Les invitations et comptes employés sont bloqués dans la démonstration.', 'team.name': 'Nom', 'team.email': 'E-mail', 'team.noBarberLink': 'Aucun barbier lié', 'team.invite': 'Inviter', 'team.invitationCreated': 'Invitation créée', 'team.userDeactivated': 'Utilisateur désactivé', 'team.deactivateError': 'Impossible de désactiver l’utilisateur',
  'locations.eyebrow': 'PARAMÈTRES ET ÉTABLISSEMENTS', 'locations.title': 'Mon barbershop', 'locations.lockedTitle': 'Paramètres commerciaux et établissements', 'locations.lockedText': 'La démonstration utilise un barbershop temporaire et ne permet pas de modifier ses paramètres commerciaux.', 'locations.saveSettings': 'Enregistrer les paramètres', 'locations.settingsUpdated': 'Paramètres mis à jour', 'locations.updateError': 'Impossible de mettre à jour le barbershop', 'locations.locations': 'Établissements', 'locations.name': 'Nom', 'locations.slug': 'Identifiant (ex. centre)', 'locations.address': 'Adresse', 'locations.add': 'Ajouter', 'locations.added': 'Établissement ajouté',
  'billing.eyebrow': 'ABONNEMENT', 'billing.lockedTitle': 'Forfaits et abonnement', 'billing.lockedText': 'La démonstration ne permet pas de lancer des paiements. Créez un compte réel pour choisir un forfait.', 'billing.systemAdminTitle': 'Administrateur système · Accès total', 'billing.systemAdminText': 'Ce compte n’est soumis à aucun forfait ni limite de barbiers ou d’établissements.', 'billing.openTv': 'Ouvrir BarberTurn TV', 'billing.loadingUsage': 'Chargement de l’utilisation…', 'billing.activeBarbers': '{{active}} sur {{limit}} barbiers actifs', 'billing.activeServices': '{{active}} sur {{limit}} services actifs', 'billing.turnsExpanded': '{{used}} passages ce mois · usage étendu', 'billing.turnsIncluded': '{{used}} sur {{limit}} passages inclus ce mois', 'billing.graceUntil': ' · tolérance jusqu’à {{grace}}', 'billing.activeLocations': '{{active}} sur {{limit}} établissements actifs', 'billing.cancel': 'Annuler l’abonnement', 'billing.cancelled': 'Abonnement annulé', 'billing.cancelError': 'Impossible d’annuler l’abonnement', 'billing.paypalError': 'Impossible de démarrer PayPal',
}

const ht: Dictionary = {
  'commercial.unexpected': 'Erè inatandi', 'commercial.operationError': 'Nou pa t kapab fini operasyon an', 'commercial.edit': 'Modifye', 'commercial.activate': 'Aktive', 'commercial.deactivate': 'Dezaktive', 'commercial.active': 'Aktif', 'commercial.inactive': 'Inaktif', 'commercial.close': 'Fèmen', 'commercial.save': 'Sove', 'commercial.all': 'Tout', 'commercial.unlimited': 'san limit', 'commercial.unlimitedFeminine': 'san limit',
  'shell.demoTitle': 'BarberTurn Demo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DEMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Resepsyonis', 'role.barber': 'Babè',
  'barbers.promptName': 'Non babè a', 'barbers.promptChair': 'Nimewo chèz', 'barbers.updated': 'Babè mete ajou', 'services.promptName': 'Non sèvis la', 'services.promptPrice': 'Pri', 'services.promptDuration': 'Dire estime (min)', 'services.updated': 'Sèvis mete ajou',
  'team.eyebrow': 'EKIP AK PÈMISYON', 'team.title': 'Itilizatè', 'team.lockedTitle': 'Ekip ak pèmisyon', 'team.lockedText': 'Envitasyon ak kont anplwaye yo bloke nan demo a.', 'team.name': 'Non', 'team.email': 'Imèl', 'team.noBarberLink': 'Pa gen babè ki lye', 'team.invite': 'Envite', 'team.invitationCreated': 'Envitasyon kreye', 'team.userDeactivated': 'Itilizatè dezaktive', 'team.deactivateError': 'Nou pa t kapab dezaktive itilizatè a',
  'locations.eyebrow': 'KONFIGIRASYON AK LOKAL', 'locations.title': 'Babèshop mwen', 'locations.lockedTitle': 'Konfigirasyon komèsyal ak lokal', 'locations.lockedText': 'Demo a sèvi ak yon babèshop tanporè epi li pa pèmèt chanje konfigirasyon komèsyal li.', 'locations.saveSettings': 'Sove konfigirasyon', 'locations.settingsUpdated': 'Konfigirasyon mete ajou', 'locations.updateError': 'Nou pa t kapab mete babèshop la ajou', 'locations.locations': 'Lokal', 'locations.name': 'Non', 'locations.slug': 'Idantifyan (eg. sant)', 'locations.address': 'Adrès', 'locations.add': 'Ajoute', 'locations.added': 'Lokal ajoute',
  'billing.eyebrow': 'ABÒNMAN', 'billing.lockedTitle': 'Plan ak abònman', 'billing.lockedText': 'Demo a pa pèmèt kòmanse peman. Kreye yon kont reyèl pou chwazi yon plan.', 'billing.systemAdminTitle': 'Administratè sistèm · Aksè total', 'billing.systemAdminText': 'Kont sa a pa soumèt ak plan ni limit babè oswa lokal.', 'billing.openTv': 'Louvri BarberTurn TV', 'billing.loadingUsage': 'Ap chaje itilizasyon…', 'billing.activeBarbers': '{{active}} sou {{limit}} babè aktif', 'billing.activeServices': '{{active}} sou {{limit}} sèvis aktif', 'billing.turnsExpanded': '{{used}} sèvis mwa sa a · itilizasyon elaji', 'billing.turnsIncluded': '{{used}} sou {{limit}} sèvis enkli mwa sa a', 'billing.graceUntil': ' · tolerans jiska {{grace}}', 'billing.activeLocations': '{{active}} sou {{limit}} lokal aktif', 'billing.cancel': 'Anile abònman', 'billing.cancelled': 'Abònman anile', 'billing.cancelError': 'Nou pa t kapab anile abònman an', 'billing.paypalError': 'Nou pa t kapab kòmanse PayPal',
}

const de: Dictionary = {
  'commercial.unexpected': 'Unerwarteter Fehler', 'commercial.operationError': 'Der Vorgang konnte nicht abgeschlossen werden', 'commercial.edit': 'Bearbeiten', 'commercial.activate': 'Aktivieren', 'commercial.deactivate': 'Deaktivieren', 'commercial.active': 'Aktiv', 'commercial.inactive': 'Inaktiv', 'commercial.close': 'Schließen', 'commercial.save': 'Speichern', 'commercial.all': 'Alle', 'commercial.unlimited': 'unbegrenzt', 'commercial.unlimitedFeminine': 'unbegrenzt',
  'shell.demoTitle': 'BarberTurn Demo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DEMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Rezeption', 'role.barber': 'Barbier',
  'barbers.promptName': 'Name des Barbiers', 'barbers.promptChair': 'Stuhlnummer', 'barbers.updated': 'Barbier aktualisiert', 'services.promptName': 'Name der Dienstleistung', 'services.promptPrice': 'Preis', 'services.promptDuration': 'Geschätzte Dauer (Min.)', 'services.updated': 'Dienstleistung aktualisiert',
  'team.eyebrow': 'TEAM UND BERECHTIGUNGEN', 'team.title': 'Benutzer', 'team.lockedTitle': 'Team und Berechtigungen', 'team.lockedText': 'Mitarbeitereinladungen und -konten sind in der Demo gesperrt.', 'team.name': 'Name', 'team.email': 'E-Mail', 'team.noBarberLink': 'Kein Barbier verknüpft', 'team.invite': 'Einladen', 'team.invitationCreated': 'Einladung erstellt', 'team.userDeactivated': 'Benutzer deaktiviert', 'team.deactivateError': 'Benutzer konnte nicht deaktiviert werden',
  'locations.eyebrow': 'EINSTELLUNGEN UND STANDORTE', 'locations.title': 'Mein Barbershop', 'locations.lockedTitle': 'Geschäftseinstellungen und Standorte', 'locations.lockedText': 'Die Demo verwendet einen temporären Barbershop und erlaubt keine Änderung der Geschäftseinstellungen.', 'locations.saveSettings': 'Einstellungen speichern', 'locations.settingsUpdated': 'Einstellungen aktualisiert', 'locations.updateError': 'Barbershop konnte nicht aktualisiert werden', 'locations.locations': 'Standorte', 'locations.name': 'Name', 'locations.slug': 'Kennung (z. B. zentrum)', 'locations.address': 'Adresse', 'locations.add': 'Hinzufügen', 'locations.added': 'Standort hinzugefügt',
  'billing.eyebrow': 'ABONNEMENT', 'billing.lockedTitle': 'Tarife und Abonnement', 'billing.lockedText': 'In der Demo können keine Zahlungen gestartet werden. Erstelle ein echtes Konto, um einen Tarif zu wählen.', 'billing.systemAdminTitle': 'Systemadministrator · Vollzugriff', 'billing.systemAdminText': 'Dieses Konto unterliegt keinen Tarifen, Barbier- oder Standortlimits.', 'billing.openTv': 'BarberTurn TV öffnen', 'billing.loadingUsage': 'Nutzung wird geladen…', 'billing.activeBarbers': '{{active}} von {{limit}} aktiven Barbieren', 'billing.activeServices': '{{active}} von {{limit}} aktiven Dienstleistungen', 'billing.turnsExpanded': '{{used}} Vorgänge diesen Monat · erweiterte Nutzung', 'billing.turnsIncluded': '{{used}} von {{limit}} Vorgängen diesen Monat enthalten', 'billing.graceUntil': ' · Toleranz bis {{grace}}', 'billing.activeLocations': '{{active}} von {{limit}} aktiven Standorten', 'billing.cancel': 'Abonnement kündigen', 'billing.cancelled': 'Abonnement gekündigt', 'billing.cancelError': 'Abonnement konnte nicht gekündigt werden', 'billing.paypalError': 'PayPal konnte nicht gestartet werden',
}

const it: Dictionary = {
  'commercial.unexpected': 'Errore imprevisto', 'commercial.operationError': 'Impossibile completare l’operazione', 'commercial.edit': 'Modifica', 'commercial.activate': 'Attiva', 'commercial.deactivate': 'Disattiva', 'commercial.active': 'Attivo', 'commercial.inactive': 'Inattivo', 'commercial.close': 'Chiudi', 'commercial.save': 'Salva', 'commercial.all': 'Tutti', 'commercial.unlimited': 'illimitati', 'commercial.unlimitedFeminine': 'illimitate',
  'shell.demoTitle': 'BarberTurn Demo', 'shell.adminTitle': 'BarberTurn Admin', 'shell.demoBadge': 'DEMO', 'shell.adminBadge': 'ADMIN', 'role.receptionist': 'Receptionist', 'role.barber': 'Barbiere',
  'barbers.promptName': 'Nome del barbiere', 'barbers.promptChair': 'Numero poltrona', 'barbers.updated': 'Barbiere aggiornato', 'services.promptName': 'Nome del servizio', 'services.promptPrice': 'Prezzo', 'services.promptDuration': 'Durata stimata (min)', 'services.updated': 'Servizio aggiornato',
  'team.eyebrow': 'TEAM E PERMESSI', 'team.title': 'Utenti', 'team.lockedTitle': 'Team e permessi', 'team.lockedText': 'Inviti e account dei dipendenti sono bloccati nella demo.', 'team.name': 'Nome', 'team.email': 'E-mail', 'team.noBarberLink': 'Nessun barbiere collegato', 'team.invite': 'Invita', 'team.invitationCreated': 'Invito creato', 'team.userDeactivated': 'Utente disattivato', 'team.deactivateError': 'Impossibile disattivare l’utente',
  'locations.eyebrow': 'IMPOSTAZIONI E SEDI', 'locations.title': 'Il mio barbershop', 'locations.lockedTitle': 'Impostazioni commerciali e sedi', 'locations.lockedText': 'La demo usa un barbershop temporaneo e non consente di modificarne le impostazioni commerciali.', 'locations.saveSettings': 'Salva impostazioni', 'locations.settingsUpdated': 'Impostazioni aggiornate', 'locations.updateError': 'Impossibile aggiornare il barbershop', 'locations.locations': 'Sedi', 'locations.name': 'Nome', 'locations.slug': 'Identificatore (es. centro)', 'locations.address': 'Indirizzo', 'locations.add': 'Aggiungi', 'locations.added': 'Sede aggiunta',
  'billing.eyebrow': 'ABBONAMENTO', 'billing.lockedTitle': 'Piani e abbonamento', 'billing.lockedText': 'La demo non consente di avviare pagamenti. Crea un account reale per scegliere un piano.', 'billing.systemAdminTitle': 'Amministratore di sistema · Accesso completo', 'billing.systemAdminText': 'Questo account non è soggetto a piani né a limiti di barbieri o sedi.', 'billing.openTv': 'Apri BarberTurn TV', 'billing.loadingUsage': 'Caricamento utilizzo…', 'billing.activeBarbers': '{{active}} di {{limit}} barbieri attivi', 'billing.activeServices': '{{active}} di {{limit}} servizi attivi', 'billing.turnsExpanded': '{{used}} turni questo mese · utilizzo esteso', 'billing.turnsIncluded': '{{used}} di {{limit}} turni inclusi questo mese', 'billing.graceUntil': ' · tolleranza fino a {{grace}}', 'billing.activeLocations': '{{active}} di {{limit}} sedi attive', 'billing.cancel': 'Annulla abbonamento', 'billing.cancelled': 'Abbonamento annullato', 'billing.cancelError': 'Impossibile annullare l’abbonamento', 'billing.paypalError': 'Impossibile avviare PayPal',
}

const ja: Dictionary = {
  'commercial.unexpected': '予期しないエラー', 'commercial.operationError': '操作を完了できませんでした', 'commercial.edit': '編集', 'commercial.activate': '有効化', 'commercial.deactivate': '無効化', 'commercial.active': '有効', 'commercial.inactive': '無効', 'commercial.close': '閉じる', 'commercial.save': '保存', 'commercial.all': 'すべて', 'commercial.unlimited': '無制限', 'commercial.unlimitedFeminine': '無制限',
  'shell.demoTitle': 'BarberTurn デモ', 'shell.adminTitle': 'BarberTurn 管理', 'shell.demoBadge': 'デモ', 'shell.adminBadge': '管理', 'role.receptionist': '受付', 'role.barber': '理容師',
  'barbers.promptName': '理容師名', 'barbers.promptChair': 'チェア番号', 'barbers.updated': '理容師を更新しました', 'services.promptName': 'サービス名', 'services.promptPrice': '料金', 'services.promptDuration': '予定時間（分）', 'services.updated': 'サービスを更新しました',
  'team.eyebrow': 'チームと権限', 'team.title': 'ユーザー', 'team.lockedTitle': 'チームと権限', 'team.lockedText': 'デモでは従業員の招待とアカウント管理は利用できません。', 'team.name': '名前', 'team.email': 'メール', 'team.noBarberLink': '理容師との紐付けなし', 'team.invite': '招待', 'team.invitationCreated': '招待を作成しました', 'team.userDeactivated': 'ユーザーを無効化しました', 'team.deactivateError': 'ユーザーを無効化できませんでした',
  'locations.eyebrow': '設定と店舗', 'locations.title': 'マイバーバーショップ', 'locations.lockedTitle': '店舗設定と拠点', 'locations.lockedText': 'デモでは一時的な店舗を使用するため、事業設定を変更できません。', 'locations.saveSettings': '設定を保存', 'locations.settingsUpdated': '設定を更新しました', 'locations.updateError': 'バーバーショップを更新できませんでした', 'locations.locations': '店舗', 'locations.name': '名前', 'locations.slug': '識別子（例：central）', 'locations.address': '住所', 'locations.add': '追加', 'locations.added': '店舗を追加しました',
  'billing.eyebrow': 'サブスクリプション', 'billing.lockedTitle': 'プランとサブスクリプション', 'billing.lockedText': 'デモでは支払いを開始できません。実際のアカウントを作成してプランを選択してください。', 'billing.systemAdminTitle': 'システム管理者 · フルアクセス', 'billing.systemAdminText': 'このアカウントにはプラン、理容師数、店舗数の制限がありません。', 'billing.openTv': 'BarberTurn TV を開く', 'billing.loadingUsage': '利用状況を読み込み中…', 'billing.activeBarbers': '有効な理容師 {{active}} / {{limit}}', 'billing.activeServices': '有効なサービス {{active}} / {{limit}}', 'billing.turnsExpanded': '今月 {{used}} 件 · 拡張利用', 'billing.turnsIncluded': '今月 {{used}} / {{limit}} 件利用', 'billing.graceUntil': ' · 猶予 {{grace}} 件まで', 'billing.activeLocations': '有効な店舗 {{active}} / {{limit}}', 'billing.cancel': 'サブスクリプションを解約', 'billing.cancelled': 'サブスクリプションを解約しました', 'billing.cancelError': 'サブスクリプションを解約できませんでした', 'billing.paypalError': 'PayPal を開始できませんでした',
}

const ko: Dictionary = {
  'commercial.unexpected': '예기치 않은 오류', 'commercial.operationError': '작업을 완료할 수 없습니다', 'commercial.edit': '수정', 'commercial.activate': '활성화', 'commercial.deactivate': '비활성화', 'commercial.active': '활성', 'commercial.inactive': '비활성', 'commercial.close': '닫기', 'commercial.save': '저장', 'commercial.all': '전체', 'commercial.unlimited': '무제한', 'commercial.unlimitedFeminine': '무제한',
  'shell.demoTitle': 'BarberTurn 데모', 'shell.adminTitle': 'BarberTurn 관리', 'shell.demoBadge': '데모', 'shell.adminBadge': '관리', 'role.receptionist': '접수 담당자', 'role.barber': '바버',
  'barbers.promptName': '바버 이름', 'barbers.promptChair': '의자 번호', 'barbers.updated': '바버가 업데이트되었습니다', 'services.promptName': '서비스 이름', 'services.promptPrice': '가격', 'services.promptDuration': '예상 소요 시간(분)', 'services.updated': '서비스가 업데이트되었습니다',
  'team.eyebrow': '팀 및 권한', 'team.title': '사용자', 'team.lockedTitle': '팀 및 권한', 'team.lockedText': '데모에서는 직원 초대와 계정 관리가 잠겨 있습니다.', 'team.name': '이름', 'team.email': '이메일', 'team.noBarberLink': '연결된 바버 없음', 'team.invite': '초대', 'team.invitationCreated': '초대가 생성되었습니다', 'team.userDeactivated': '사용자가 비활성화되었습니다', 'team.deactivateError': '사용자를 비활성화할 수 없습니다',
  'locations.eyebrow': '설정 및 지점', 'locations.title': '내 바버샵', 'locations.lockedTitle': '사업 설정 및 지점', 'locations.lockedText': '데모는 임시 바버샵을 사용하며 사업 설정을 변경할 수 없습니다.', 'locations.saveSettings': '설정 저장', 'locations.settingsUpdated': '설정이 업데이트되었습니다', 'locations.updateError': '바버샵을 업데이트할 수 없습니다', 'locations.locations': '지점', 'locations.name': '이름', 'locations.slug': '식별자(예: central)', 'locations.address': '주소', 'locations.add': '추가', 'locations.added': '지점이 추가되었습니다',
  'billing.eyebrow': '구독', 'billing.lockedTitle': '요금제 및 구독', 'billing.lockedText': '데모에서는 결제를 시작할 수 없습니다. 실제 계정을 만들어 요금제를 선택하세요.', 'billing.systemAdminTitle': '시스템 관리자 · 전체 액세스', 'billing.systemAdminText': '이 계정에는 요금제, 바버 수 또는 지점 수 제한이 적용되지 않습니다.', 'billing.openTv': 'BarberTurn TV 열기', 'billing.loadingUsage': '사용량 불러오는 중…', 'billing.activeBarbers': '활성 바버 {{active}} / {{limit}}', 'billing.activeServices': '활성 서비스 {{active}} / {{limit}}', 'billing.turnsExpanded': '이번 달 {{used}}건 · 확장 사용', 'billing.turnsIncluded': '이번 달 포함 {{used}} / {{limit}}건', 'billing.graceUntil': ' · 허용 한도 {{grace}}건', 'billing.activeLocations': '활성 지점 {{active}} / {{limit}}', 'billing.cancel': '구독 취소', 'billing.cancelled': '구독이 취소되었습니다', 'billing.cancelError': '구독을 취소할 수 없습니다', 'billing.paypalError': 'PayPal을 시작할 수 없습니다',
}

const zh: Dictionary = {
  'commercial.unexpected': '发生意外错误', 'commercial.operationError': '无法完成此操作', 'commercial.edit': '编辑', 'commercial.activate': '启用', 'commercial.deactivate': '停用', 'commercial.active': '启用', 'commercial.inactive': '停用', 'commercial.close': '关闭', 'commercial.save': '保存', 'commercial.all': '全部', 'commercial.unlimited': '不限', 'commercial.unlimitedFeminine': '不限',
  'shell.demoTitle': 'BarberTurn 演示', 'shell.adminTitle': 'BarberTurn 管理', 'shell.demoBadge': '演示', 'shell.adminBadge': '管理', 'role.receptionist': '前台', 'role.barber': '理发师',
  'barbers.promptName': '理发师姓名', 'barbers.promptChair': '座椅编号', 'barbers.updated': '理发师已更新', 'services.promptName': '服务名称', 'services.promptPrice': '价格', 'services.promptDuration': '预计时长（分钟）', 'services.updated': '服务已更新',
  'team.eyebrow': '团队与权限', 'team.title': '用户', 'team.lockedTitle': '团队与权限', 'team.lockedText': '演示模式下无法使用员工邀请和账户管理。', 'team.name': '姓名', 'team.email': '邮箱', 'team.noBarberLink': '未关联理发师', 'team.invite': '邀请', 'team.invitationCreated': '邀请已创建', 'team.userDeactivated': '用户已停用', 'team.deactivateError': '无法停用该用户',
  'locations.eyebrow': '设置与门店', 'locations.title': '我的理发店', 'locations.lockedTitle': '业务设置与门店', 'locations.lockedText': '演示模式使用临时理发店，因此无法修改业务设置。', 'locations.saveSettings': '保存设置', 'locations.settingsUpdated': '设置已更新', 'locations.updateError': '无法更新理发店', 'locations.locations': '门店', 'locations.name': '名称', 'locations.slug': '标识符（例如 central）', 'locations.address': '地址', 'locations.add': '添加', 'locations.added': '门店已添加',
  'billing.eyebrow': '订阅', 'billing.lockedTitle': '方案与订阅', 'billing.lockedText': '演示模式无法发起付款。请创建正式账户后选择方案。', 'billing.systemAdminTitle': '系统管理员 · 完整权限', 'billing.systemAdminText': '此账户不受方案、理发师数量或门店数量限制。', 'billing.openTv': '打开 BarberTurn TV', 'billing.loadingUsage': '正在加载用量…', 'billing.activeBarbers': '活跃理发师 {{active}} / {{limit}}', 'billing.activeServices': '活跃服务 {{active}} / {{limit}}', 'billing.turnsExpanded': '本月 {{used}} 个排队 · 扩展用量', 'billing.turnsIncluded': '本月已用 {{used}} / {{limit}} 个排队', 'billing.graceUntil': ' · 宽限至 {{grace}}', 'billing.activeLocations': '活跃门店 {{active}} / {{limit}}', 'billing.cancel': '取消订阅', 'billing.cancelled': '订阅已取消', 'billing.cancelError': '无法取消订阅', 'billing.paypalError': '无法启动 PayPal',
}

export const commercialCoreSupplement: Record<OfficialLocale, Dictionary> = {
  'es-419': es, en, 'pt-BR': pt, fr, ht, de, it, ja, ko, 'zh-CN': zh,
}
