import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptCounterProposal, cancelPublicTurnRequest, getPublicTurnRequest } from '@/turnRequests/turnRequestApi';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';
import { PushOptInCard } from '@/notifications/PushOptInCard';
import { usePushNotifications } from '@/notifications/PushNotificationsProvider';
import { useI18n } from '@/i18n/I18nProvider';

export default function RequestStatusScreen() {
  const { locale, t } = useI18n();
  const params = useLocalSearchParams<{ slug: string; requestId: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [lookupToken, setLookupToken] = useState<string | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const push = usePushNotifications();
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    if (!requestId) return;
    publicRequestStore.read(requestId).then(setLookupToken).catch(() => setLookupToken(null));
  }, [requestId]);

  const queryKey = ['public-turn-request', slug, requestId];
  const requestQuery = useQuery({
    queryKey,
    queryFn: () => getPublicTurnRequest(slug!, requestId!, lookupToken!),
    enabled: Boolean(slug && requestId && lookupToken),
    refetchInterval: query => query.state.data?.status === 'Pending' || query.state.data?.status === 'CounterProposed' ? 15_000 : false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptCounterProposal(slug!, requestId!, lookupToken!),
    onSuccess: data => queryClient.setQueryData(queryKey, data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPublicTurnRequest(slug!, requestId!, lookupToken!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    const current = requestQuery.data;
    if (!slug || !requestId || !lookupToken || !current) return;
    if (current.status === 'Pending' || current.status === 'CounterProposed') return;
    push.disableForRequest(slug, requestId, lookupToken).catch(() => undefined);
  }, [lookupToken, push.disableForRequest, requestId, requestQuery.data, slug]);

  if (lookupToken === undefined || requestQuery.isLoading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>;
  }

  if (!lookupToken) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>{t('requestStatus.missingCredential')}</Text><Text style={styles.body}>{t('requestStatus.missingCredentialText')}</Text></View></SafeAreaView>;
  }

  const request = requestQuery.data;
  if (!request) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>{t('requestStatus.loadError')}</Text><Pressable onPress={() => requestQuery.refetch()} style={styles.secondary}><Text style={styles.secondaryText}>{t('requestStatus.retry')}</Text></Pressable></View></SafeAreaView>;
  }

  const actionable = request.status === 'Pending' || request.status === 'CounterProposed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={requestQuery.isRefetching} onRefresh={() => requestQuery.refetch()} />}
      >
        <Text style={styles.eyebrow}>{t('requestStatus.eyebrow')}</Text>
        <Text style={styles.title}>{t(`requestStatus.${request.status}`)}</Text>
        <View style={styles.statusCard}>
          <Text style={styles.service}>{request.serviceName}</Text>
          <Text style={styles.barber}>{t('requestStatus.withBarber', { barber: request.barberName })}</Text>
          <Text style={styles.time}>{t('requestStatus.requestedAt', { date: dateFormatter.format(new Date(request.requestedStartsAtUtc)) })}</Text>
          {request.counterProposedStartsAtUtc ? <Text style={styles.counter}>{t('requestStatus.counterAt', { date: dateFormatter.format(new Date(request.counterProposedStartsAtUtc)) })}</Text> : null}
          {request.notes ? <Text style={styles.notes}>“{request.notes}”</Text> : null}
        </View>

        {actionable ? (
          <PushOptInCard
            status={push.status}
            message={push.message}
            title={t('requestStatus.pushTitle')}
            body={t('requestStatus.pushBody')}
            onEnable={() => push.enableForRequest(slug!, requestId!, lookupToken)}
          />
        ) : null}

        {request.status === 'CounterProposed' ? (
          <Pressable disabled={acceptMutation.isPending} onPress={() => acceptMutation.mutate()} style={styles.primary}>
            <Text style={styles.primaryText}>{acceptMutation.isPending ? t('requestStatus.confirming') : t('requestStatus.acceptNewTime')}</Text>
          </Pressable>
        ) : null}

        {request.status === 'Accepted' && request.appointmentId ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>{t('requestStatus.appointmentCreated')}</Text>
            <Text style={styles.body}>{t('requestStatus.secureTracking')}</Text>
          </View>
        ) : null}

        {actionable ? (
          <Pressable disabled={cancelMutation.isPending} onPress={() => cancelMutation.mutate()} style={styles.secondary}>
            <Text style={styles.secondaryText}>{cancelMutation.isPending ? t('requestStatus.cancelling') : t('requestStatus.cancel')}</Text>
          </Pressable>
        ) : null}

        {acceptMutation.error || cancelMutation.error ? <Text accessibilityRole="alert" style={styles.error}>{t('requestStatus.operationError')}</Text> : null}
        <Text style={styles.hint}>{t('requestStatus.autoRefresh')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: '900', color: '#686861' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#111' },
  body: { fontSize: 16, lineHeight: 23, color: '#55554f' },
  statusCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 18, padding: 20, gap: 7 },
  service: { fontSize: 22, fontWeight: '900', color: '#111' },
  barber: { fontSize: 17, fontWeight: '700', color: '#44443f' },
  time: { marginTop: 8, color: '#55554f' },
  counter: { fontWeight: '900', fontSize: 16, color: '#111' },
  notes: { marginTop: 6, color: '#686861', fontStyle: 'italic' },
  primary: { minHeight: 54, borderRadius: 14, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '800', color: '#111' },
  success: { padding: 16, borderRadius: 14, backgroundColor: '#ecece5', gap: 5 },
  successTitle: { fontWeight: '900', fontSize: 17 },
  error: { color: '#a21414', fontWeight: '700' },
  hint: { textAlign: 'center', color: '#77776f', fontSize: 13 },
});
