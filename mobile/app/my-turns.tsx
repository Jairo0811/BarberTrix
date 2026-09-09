import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { readRecentRequests } from '@/turnRequests/recentRequests';
import { rebookParams } from '@/turnRequests/rebook';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';
import { getPublicTurnRequest } from '@/turnRequests/turnRequestApi';
import { apiRequest, MobileApiError } from '@/api/httpClient';
import { Card, Action, ScreenHeader } from '@/ui/OperationalUI';
import { ErrorState } from '@/ui/ErrorState';
import { MobileBottomNav } from '@/ui/MobileBottomNav';
import { colors } from '@/theme/tokens';
export default function MyTurnsScreen() {
 const { session, status } = useAuth(); const { t, locale } = useI18n();
 const query = useQuery({ queryKey: ['my-turns', session?.user.id], enabled: !!session, refetchInterval: 30_000, queryFn: async () => {
   const references = await readRecentRequests(session!.user.id);
   return Promise.all(references.map(async reference => {
     try {
       const token = await publicRequestStore.read(reference.id);
       if (!token) return { reference, error: new MobileApiError('', 404) };
       const request = await getPublicTurnRequest(reference.slug, reference.id, token);
       const appointment = request.appointmentId ? await apiRequest<{ status: string }>(`/api/public/shops/${encodeURIComponent(reference.slug)}/appointments/${request.appointmentId}?token=${encodeURIComponent(token)}`) : null;
       return { reference, request, appointment };
     } catch (error) { return { reference, error }; }
   }));
 } });
 useFocusEffect(useCallback(() => { if (session) void query.refetch(); }, [session?.user.id]));
 if (status === 'loading') return <ActivityIndicator />;
 if (!session) return <Redirect href="/(auth)/login" />;
 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} />}>
   <ScreenHeader title={t('operations.myTurns')} context={t('operations.deviceHistory')} />
   {query.isLoading && <ActivityIndicator />}{query.error && <ErrorState error={query.error} retry={() => { void query.refetch(); }} />}
   {!query.isLoading && !query.error && !query.data?.length && <Text style={{ color: colors.textMuted }}>{t('operations.empty')}</Text>}
   {query.data?.map(row => <Card key={row.reference.id}>{row.error ? <ErrorState error={row.error} retry={() => { void query.refetch(); }} /> : row.request && <>
     <Text style={{ color: colors.text, fontWeight: '800' }}>{row.request.serviceName} · {row.request.barberName}</Text>
     <Text style={{ color: colors.textMuted }}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.request.effectiveStartsAtUtc))}</Text>
     <Text style={{ color: colors.textMuted }}>{row.appointment && ['Completed','Cancelled','NoShow'].includes(row.appointment.status) ? t(`operations.${row.appointment.status}`) : t(`staffRequests.status.${row.request.status}`)}</Text>
     <Action label={t('operations.details')} onPress={() => router.push({ pathname: '/request-status/[slug]/[requestId]', params: { slug: row.reference.slug, requestId: row.reference.id } })} />
     <Action label={t('operations.rebook')} onPress={() => router.push({ pathname: '/request/[slug]', params: rebookParams(row.reference) })} />
   </>}</Card>)}
 </ScrollView><View style={{ padding: 12 }}><MobileBottomNav active="history" /></View></SafeAreaView>;
}
