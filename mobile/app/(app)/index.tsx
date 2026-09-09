import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { changeAvailability, getToday, operateTurn } from '@/operations/api';
import { MobileApiError } from '@/api/httpClient';
import { useQueueRealtime } from '@/realtime/useQueueRealtime';
import { Card, Action, ScreenHeader } from '@/ui/OperationalUI';
import { ErrorState } from '@/ui/ErrorState';
import { MobileBottomNav } from '@/ui/MobileBottomNav';
import { colors } from '@/theme/tokens';

export default function TodayScreen() {
 const { session, refresh } = useAuth(); const { t, locale } = useI18n();
 const withToken = async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
   if (!session) throw new MobileApiError('', 401);
   try { return await fn(session.accessToken); } catch (error) {
     if (error instanceof MobileApiError && error.status === 401) { const token = await refresh(); if (token) return fn(token); }
     throw error;
   }
 };
 const query = useQuery({ queryKey: ['today', session?.user.id, session?.user.barberShopId], queryFn: () => withToken(getToday), enabled: !!session, refetchInterval: 30_000 });
 const realtime = useQueueRealtime(session?.accessToken, `${session?.user.id}:${session?.user.barberShopId}`, () => { void query.refetch(); });
 const mutation = useMutation({ mutationFn: (fn: (token: string) => Promise<unknown>) => withToken(fn), onSuccess: () => { void query.refetch(); } });
 const data = query.data;
 const canManage = session?.user.role === 'Owner' || session?.user.role === 'Administrator';
 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={{ padding: 20, gap: 18, width: '100%', maxWidth: 780, alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} />}>
   <ScreenHeader title={t('operations.today')} context={data?.shopName} realtime={realtime} />
   {query.isLoading && <ActivityIndicator color={colors.primaryGlow} />}
   {query.error && <ErrorState error={query.error} retry={() => { void query.refetch(); }} />}
   {mutation.error && <ErrorState error={mutation.error} />}
   {data && <>
     <Card><Text style={{ color: colors.text }}>{t('operations.wait')}: {new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(data.estimatedWaitMinutes)}</Text><Action label={`${t('home.requests')} · ${data.pendingRequests}`} onPress={() => router.push('/(app)/turn-requests')} />{canManage && <Action label={t('operations.team')} onPress={() => router.push('/(app)/team')} />}{session?.user.role === 'Owner' && <Action label="Marketplace" onPress={() => router.push('/(app)/marketplace-profile')} />}</Card>
     <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('operations.queue')}</Text>
     {!data.turns.length && <Text style={{ color: colors.textMuted }}>{t('operations.empty')}</Text>}
     {data.turns.map(turn => <Card key={turn.id}><Text style={{ color: colors.text, fontWeight: '800' }}>{turn.ticketNumber} · {turn.customerName}</Text><Text style={{ color: colors.textMuted }}>{turn.serviceName} · {t(`operations.${turn.status}`)}</Text>
       {turn.status === 'Waiting' && data.barbers.filter(barber => barber.status === 'Available' && (!turn.barberId || barber.id === turn.barberId)).map(barber => <Action key={barber.id} disabled={mutation.isPending} label={`${t('operations.call')} · ${barber.name}`} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, `call/${barber.id}`))} />)}
       {turn.status === 'Called' && <><Action disabled={mutation.isPending} label={t('operations.start')} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, 'start'))} /><Action disabled={mutation.isPending} label={t('operations.noShow')} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, 'no-show'))} /></>}
       {turn.status === 'InService' && <Action disabled={mutation.isPending} label={t('operations.complete')} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, 'complete'))} />}
     </Card>)}
     <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('operations.appointments')}</Text>
     {!data.appointments.length && <Text style={{ color: colors.textMuted }}>{t('operations.empty')}</Text>}
     {data.appointments.map(item => <Card key={item.id}><Text style={{ color: colors.text }}>{new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: data.timeZoneId }).format(new Date(item.startsAtUtc))} · {item.customerName}</Text><Text style={{ color: colors.textMuted }}>{item.serviceName}</Text></Card>)}
     {data.barbers.map(barber => <Card key={barber.id}><Text style={{ color: colors.text }}>{barber.name} · {t(`operations.${barber.status}`)}</Text>{barber.status !== 'Busy' && (['Available', 'Break', 'Offline'] as const).filter(status => status !== barber.status).map(status => <Action key={status} label={t(`operations.${status}`)} disabled={mutation.isPending} onPress={() => mutation.mutate(token => changeAvailability(token, barber.id, status))} />)}</Card>)}
   </>}
 </ScrollView><View style={{ padding: 12 }}><MobileBottomNav active="home" /></View></SafeAreaView>;
}
