import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { officialLocales } from '@/i18n/officialLocales';
import { usePushNotifications } from '@/notifications/PushNotificationsProvider';
import { PushOptInCard } from '@/notifications/PushOptInCard';
import { getToday } from '@/operations/api';
import { apiRequest } from '@/api/httpClient';
import { Action, Card } from '@/ui/OperationalUI';
import { useQueueRealtime } from '@/realtime/useQueueRealtime';
import { MobileBottomNav } from '@/ui/MobileBottomNav';
import { colors } from '@/theme/tokens';

export default function SettingsScreen() {
 const { status, session, signOut } = useAuth(); const { t, locale, setLocalePreference } = useI18n(); const push = usePushNotifications();
 const [deletingAccount, setDeletingAccount] = useState(false);
 const reachable = useQuery({ queryKey: ['api-reachable'], queryFn: () => apiRequest('/api'), retry: false, staleTime: 0 });
 const shop = useQuery({ queryKey: ['settings-shop', session?.user.id, session?.user.barberShopId], queryFn: () => getToday(session!.accessToken), enabled: !!session && session.user.role !== 'Client', retry: false });
 const realtime = useQueueRealtime(session?.user.role !== 'Client' ? session?.accessToken : undefined, session?.user.id ?? '', () => {});
 if (status === 'loading') return <ActivityIndicator />;
 if (!session) return <Redirect href="/(auth)/login" />;
 const web = (process.env.EXPO_PUBLIC_WEB_URL || 'https://barbertrixrd.netlify.app').replace(/\/$/, '');
 const spanish = locale.toLowerCase().startsWith('es');
 const deletionCopy = spanish ? {
   title: 'Eliminar cuenta',
   body: session.user.role === 'Owner'
     ? 'Eliminar tu cuenta cerrará también el espacio de trabajo de la barbería, revocará el acceso del equipo y cancelará una suscripción activa. Los registros que deban conservarse por motivos operativos o legales quedarán separados de tu identidad.'
     : 'Tu identidad personal será anonimizada y se cerrarán todas tus sesiones. Los registros que deban conservarse por motivos operativos o legales quedarán separados de tu identidad.',
   action: 'Eliminar mi cuenta',
   confirmTitle: '¿Eliminar permanentemente tu cuenta?',
   confirmBody: 'Esta acción no se puede deshacer.',
   cancel: 'Cancelar',
   confirm: 'Eliminar',
   deleting: 'Eliminando…',
   error: 'No se pudo eliminar la cuenta',
 } : {
   title: 'Delete account',
   body: session.user.role === 'Owner'
     ? 'Deleting your account will also close the barbershop workspace, revoke team access and cancel an active subscription. Records that must be retained for operational or legal reasons will be detached from your identity.'
     : 'Your personal identity will be anonymized and all sessions will be closed. Records that must be retained for operational or legal reasons will be detached from your identity.',
   action: 'Delete my account',
   confirmTitle: 'Permanently delete your account?',
   confirmBody: 'This action cannot be undone.',
   cancel: 'Cancel',
   confirm: 'Delete',
   deleting: 'Deleting…',
   error: 'Account deletion failed',
 };

 const deleteAccount = async () => {
   if (deletingAccount) return;
   setDeletingAccount(true);
   try {
     await apiRequest('/api/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE' }) }, session.accessToken);
     await signOut();
   } catch (error) {
     Alert.alert(deletionCopy.error, error instanceof Error && error.message ? error.message : deletionCopy.error);
   } finally {
     setDeletingAccount(false);
   }
 };

 const confirmDeletion = () => Alert.alert(
   deletionCopy.confirmTitle,
   deletionCopy.confirmBody,
   [
     { text: deletionCopy.cancel, style: 'cancel' },
     { text: deletionCopy.confirm, style: 'destructive', onPress: () => { void deleteAccount(); } },
   ],
 );

 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={{ padding: 20, gap: 18, width: '100%', maxWidth: 780, alignSelf: 'center' }}>
   <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{t('operations.settings')}</Text>
   <Card><Text style={{ color: colors.text }}>{t('operations.account')}: {session.user.name}</Text><Text style={{ color: colors.textMuted }}>{t(`mobile.role.${session.user.role}`)}</Text>{shop.data && <Text style={{ color: colors.textMuted }}>{shop.data.shopName}</Text>}</Card>
   <Card><Text accessibilityRole="header" style={{ color: colors.text }}>{t('operations.language')}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{officialLocales.map(item => <Action key={item} disabled={locale === item} label={item} onPress={() => setLocalePreference(item)} />)}</View></Card>
   {session.user.role !== 'Client' && <PushOptInCard status={push.status} message={push.message} title={t('operations.notifications')} body={t('home.pushBody')} onEnable={() => { void push.enableForStaff(); }} />}
   <Card><Text accessibilityRole="header" style={{ color: colors.text }}>{t('operations.diagnostics')}</Text>
     <Text style={{ color: colors.textMuted }}>{t(reachable.isPending ? 'realtime.Connecting' : reachable.isSuccess ? 'operations.apiUp' : 'operations.apiDown')}</Text>
     <Text style={{ color: colors.textMuted }}>{t(`realtime.${realtime}`)}</Text>
     <Text style={{ color: colors.textMuted }}>{t('operations.notifications')}: {t(`operations.push.${push.status}`)}</Text>
     <Text style={{ color: colors.textMuted }}>{t('operations.version')}: {Constants.expoConfig?.version} ({(Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode) ?? '1'})</Text>
     <Text style={{ color: colors.textMuted }}>{t('operations.environment')}: {Constants.expoConfig?.extra?.environment ?? 'Development'}</Text>
     <Action label={t('common.retry')} onPress={() => { void reachable.refetch(); }} />
   </Card>
   <Action label={t('operations.privacy')} onPress={() => { void Linking.openURL(`${web}/#/privacy`); }} />
   <Action label={t('operations.terms')} onPress={() => { void Linking.openURL(`${web}/#/terms`); }} />
   <Card>
     <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '800' }}>{deletionCopy.title}</Text>
     <Text style={{ color: colors.textMuted }}>{deletionCopy.body}</Text>
     <Action disabled={deletingAccount} label={deletingAccount ? deletionCopy.deleting : deletionCopy.action} onPress={confirmDeletion} />
   </Card>
   <Action label={t('home.signOut')} onPress={() => { void signOut(); }} />
 </ScrollView><View style={{ padding: 12 }}><MobileBottomNav active="settings" /></View></SafeAreaView>;
}
