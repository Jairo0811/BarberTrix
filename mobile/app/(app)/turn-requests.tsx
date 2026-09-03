import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { createTurnRequestRealtimeConnection } from '@/realtime/turnRequestRealtime';
import { acceptTurnRequest, counterProposeTurnRequest, getStaffTurnRequests, rejectTurnRequest } from '@/turnRequests/turnRequestApi';
import type { TurnRequest } from '@/turnRequests/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';

export default function StaffTurnRequestsScreen() {
  const { session, refresh } = useAuth();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = ['staff-turn-requests', session?.user.barberShopId];

  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const statusLabel = (request: TurnRequest) => t(`staffRequests.status.${request.status}`);

  const withToken = async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    const token = session?.accessToken;
    if (!token) throw new Error(t('staffRequests.sessionUnavailable'));

    try {
      return await operation(token);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        const renewed = await refresh();
        if (renewed) return operation(renewed);
      }
      throw error;
    }
  };

  const requestQuery = useQuery({
    queryKey,
    queryFn: () => withToken(token => getStaffTurnRequests(token)),
    enabled: Boolean(session?.accessToken),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!session?.accessToken) return;

    const connection = createTurnRequestRealtimeConnection(
      () => session.accessToken,
      () => { void queryClient.invalidateQueries({ queryKey }); },
    );

    void connection.start().catch(() => undefined);
    return () => { void connection.stop(); };
  }, [queryClient, session?.accessToken, session?.user.barberShopId]);

  const mutate = useMutation({
    mutationFn: async (action: { kind: 'accept' | 'reject' | 'counter'; id: string; startsAt?: string }) => withToken(token => {
      if (action.kind === 'accept') return acceptTurnRequest(action.id, token);
      if (action.kind === 'reject') return rejectTurnRequest(action.id, token);
      return counterProposeTurnRequest(action.id, action.startsAt!, token);
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const items = useMemo(() => requestQuery.data ?? [], [requestQuery.data]);
  const actionable = items.filter(x => x.status === 'Pending' || x.status === 'CounterProposed');
  const history = items.filter(x => x.status !== 'Pending' && x.status !== 'CounterProposed').slice(0, 20);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundDecor}>
        <View style={styles.glow} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={requestQuery.isRefetching}
            onRefresh={() => requestQuery.refetch()}
            tintColor={colors.primaryGlow}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceStrong}
          />
        )}
      >
        <View style={styles.brandBar}>
          <BrandLogo compact />
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>{t('staffRequests.back')}</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t('staffRequests.eyebrow')}</Text>
            <Text style={styles.title}>{t('staffRequests.title')}</Text>
            <Text style={styles.subtitle}>{t('staffRequests.subtitle')}</Text>
          </View>
        </View>

        {requestQuery.isLoading ? <ActivityIndicator color={colors.primaryGlow} size="large" /> : null}

        {requestQuery.error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>{t('staffRequests.loadError')}</Text>
          </View>
        ) : null}

        {!requestQuery.isLoading && actionable.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✓</Text></View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>{t('staffRequests.emptyTitle')}</Text>
              <Text style={styles.subtitle}>{t('staffRequests.emptyText')}</Text>
            </View>
          </View>
        ) : null}

        {actionable.map(request => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <Text style={styles.customer}>{request.customerName}</Text>
                <Text style={styles.service}>{request.serviceName} · {request.barberName}</Text>
              </View>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{statusLabel(request)}</Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeIcon}>◷</Text>
              <Text style={styles.time}>{formatDate(request.effectiveStartsAtUtc)}</Text>
            </View>

            {request.notes ? <Text style={styles.notes}>“{request.notes}”</Text> : null}
            {request.status === 'CounterProposed' ? <Text style={styles.counter}>{t('staffRequests.counterWaiting')}</Text> : null}

            {request.status === 'Pending' ? (
              <View style={styles.actions}>
                <Pressable
                  disabled={mutate.isPending}
                  onPress={() => mutate.mutate({ kind: 'accept', id: request.id })}
                  style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, mutate.isPending && styles.disabled]}
                >
                  <Text style={styles.primaryText}>{t('staffRequests.accept')}</Text>
                </Pressable>
                <Pressable
                  disabled={mutate.isPending}
                  onPress={() => mutate.mutate({ kind: 'reject', id: request.id })}
                  style={({ pressed }) => [styles.danger, pressed && styles.dangerPressed, mutate.isPending && styles.disabled]}
                >
                  <Text style={styles.dangerText}>{t('staffRequests.reject')}</Text>
                </Pressable>
              </View>
            ) : null}

            {request.status === 'Pending' ? (
              <View style={styles.counterActions}>
                {[30, 60, 90].map(minutes => {
                  const proposed = new Date(new Date(request.requestedStartsAtUtc).getTime() + minutes * 60_000).toISOString();
                  return (
                    <Pressable
                      key={minutes}
                      disabled={mutate.isPending}
                      onPress={() => mutate.mutate({ kind: 'counter', id: request.id, startsAt: proposed })}
                      style={({ pressed }) => [styles.counterButton, pressed && styles.counterButtonPressed, mutate.isPending && styles.disabled]}
                    >
                      <Text style={styles.counterButtonText}>+{minutes} min</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}

        {mutate.error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>{t('staffRequests.actionError')}</Text>
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>BARBERTRIX</Text>
            <Text style={styles.sectionTitle}>{t('staffRequests.recent')}</Text>
          </View>
        ) : null}

        {history.map(request => (
          <View key={request.id} style={styles.historyCard}>
            <View style={styles.historyMarker} />
            <View style={styles.cardCopy}>
              <Text style={styles.historyTitle}>{request.customerName} · {request.serviceName}</Text>
              <Text style={styles.subtitle}>{formatDate(request.effectiveStartsAtUtc)}</Text>
            </View>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{statusLabel(request)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backgroundDecor: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -200,
    right: -160,
    backgroundColor: 'rgba(22, 135, 255, 0.10)',
  },
  content: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    padding: spacing.xl,
    paddingBottom: 54,
    gap: spacing.md,
  },
  brandBar: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  headerCopy: { gap: 6 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  back: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  backPressed: { backgroundColor: colors.surfaceSoft },
  backArrow: { color: colors.primaryGlow, fontSize: 18, fontWeight: '800' },
  backText: { color: colors.textMuted, fontWeight: '800', fontSize: 12 },
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(84, 214, 138, 0.24)',
  },
  emptyIconText: { color: colors.success, fontWeight: '900', fontSize: 18 },
  emptyCopy: { flex: 1, gap: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardAccent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderRadius: 3, backgroundColor: colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardCopy: { flex: 1 },
  customer: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  service: { marginTop: 4, color: colors.textMuted, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryGlow },
  badgeText: { color: colors.primaryGlow, fontSize: 11, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeIcon: { color: colors.primaryGlow, fontSize: 16, fontWeight: '900' },
  time: { color: colors.text, fontSize: 16, fontWeight: '900' },
  notes: { color: colors.textSubtle, fontStyle: 'italic', lineHeight: 20 },
  counter: { color: colors.warning, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  primaryText: { color: colors.white, fontWeight: '900' },
  danger: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.36)',
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerPressed: { backgroundColor: 'rgba(255, 90, 90, 0.16)' },
  dangerText: { color: colors.danger, fontWeight: '900' },
  counterActions: { flexDirection: 'row', gap: 8 },
  counterButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonPressed: { borderColor: colors.borderStrong, backgroundColor: colors.primarySoft },
  counterButtonText: { color: colors.textMuted, fontWeight: '800' },
  disabled: { opacity: 0.48 },
  sectionHeading: { marginTop: spacing.lg, gap: 4 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textSubtle },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  historyCard: {
    backgroundColor: 'rgba(10, 18, 33, 0.76)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(126, 157, 205, 0.12)',
    padding: spacing.md,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  historyMarker: { width: 3, height: 34, borderRadius: 2, backgroundColor: colors.textSubtle },
  historyTitle: { color: colors.text, fontWeight: '800', marginBottom: 3 },
  historyBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong },
  historyBadgeText: { color: colors.textSubtle, fontSize: 10, fontWeight: '800' },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.22)',
  },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
});
