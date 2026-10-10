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
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

function statusTone(status: string) {
  switch (status) {
    case 'Accepted':
      return {
        accent: colors.success,
        background: 'rgba(84, 214, 138, 0.10)',
        border: 'rgba(84, 214, 138, 0.28)',
      };
    case 'CounterProposed':
      return {
        accent: colors.warning,
        background: 'rgba(255, 178, 74, 0.10)',
        border: 'rgba(255, 178, 74, 0.28)',
      };
    case 'Rejected':
    case 'Cancelled':
    case 'Expired':
      return {
        accent: colors.danger,
        background: colors.dangerSoft,
        border: 'rgba(255, 122, 122, 0.26)',
      };
    default:
      return {
        accent: colors.primaryGlow,
        background: colors.primarySoft,
        border: colors.borderStrong,
      };
  }
}

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
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <ActivityIndicator color={colors.primaryGlow} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!lookupToken) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <Text style={styles.stateTitle}>{t('requestStatus.missingCredential')}</Text>
          <Text style={styles.body}>{t('requestStatus.missingCredentialText')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const request = requestQuery.data;

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <Text style={styles.stateTitle}>{t('requestStatus.loadError')}</Text>
          <Pressable accessibilityRole="button" onPress={() => requestQuery.refetch()} style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}>
            <Text style={styles.secondaryText}>{t('requestStatus.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const actionable = request.status === 'Pending' || request.status === 'CounterProposed';
  const tone = statusTone(request.status);

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground />

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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandHeader}>
          <BrandLogo />
          <Text style={styles.eyebrow}>{t('requestStatus.eyebrow')}</Text>
        </View>

        <View style={[styles.statusHero, { backgroundColor: tone.background, borderColor: tone.border }]}>
          <View style={[styles.statusPulse, { backgroundColor: tone.accent }]} />
          <View style={styles.statusCopy}>
            <Text style={[styles.statusLabel, { color: tone.accent }]}>BARBERTRIX</Text>
            <Text style={styles.title}>{t(`requestStatus.${request.status}`)}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.cardTopLine}>
            <View style={styles.serviceIcon}><Text style={styles.serviceIconText}>BT</Text></View>
            <View style={styles.serviceCopy}>
              <Text style={styles.service}>{request.serviceName}</Text>
              <Text style={styles.barber}>{t('requestStatus.withBarber', { barber: request.barberName })}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>◷</Text>
            <Text style={styles.time}>{t('requestStatus.requestedAt', { date: dateFormatter.format(new Date(request.requestedStartsAtUtc)) })}</Text>
          </View>

          {request.counterProposedStartsAtUtc ? (
            <View style={styles.counterBox}>
              <Text style={styles.counterLabel}>↻</Text>
              <Text style={styles.counter}>{t('requestStatus.counterAt', { date: dateFormatter.format(new Date(request.counterProposedStartsAtUtc)) })}</Text>
            </View>
          ) : null}

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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: acceptMutation.isPending }}
            disabled={acceptMutation.isPending}
            onPress={() => acceptMutation.mutate()}
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, acceptMutation.isPending && styles.disabled]}
          >
            <Text style={styles.primaryText}>{acceptMutation.isPending ? t('requestStatus.confirming') : t('requestStatus.acceptNewTime')}</Text>
            <Text style={styles.primaryArrow}>→</Text>
          </Pressable>
        ) : null}

        {request.status === 'Accepted' && request.appointmentId ? (
          <View style={styles.success}>
            <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>{t('requestStatus.appointmentCreated')}</Text>
              <Text style={styles.body}>{t('requestStatus.secureTracking')}</Text>
            </View>
          </View>
        ) : null}

        {actionable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: cancelMutation.isPending }}
            disabled={cancelMutation.isPending}
            onPress={() => cancelMutation.mutate()}
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed, cancelMutation.isPending && styles.disabled]}
          >
            <Text style={styles.secondaryText}>{cancelMutation.isPending ? t('requestStatus.cancelling') : t('requestStatus.cancel')}</Text>
          </Pressable>
        ) : null}

        {acceptMutation.error || cancelMutation.error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>{t('requestStatus.operationError')}</Text>
          </View>
        ) : null}

        <View style={styles.autoRefreshCard}>
          <View style={styles.autoRefreshDot} />
          <Text style={styles.hint}>{t('requestStatus.autoRefresh')}</Text>
        </View>

        <Text style={styles.footer}>{t('common.secureTracking')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centerState: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.xl,
    paddingBottom: 60,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  brandHeader: { alignItems: 'center', gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.textSubtle, textAlign: 'center' },
  stateTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  statusHero: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  statusPulse: { width: 12, height: 12, borderRadius: 6 },
  statusCopy: { flex: 1, gap: 5 },
  statusLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5 },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTopLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  serviceIconText: { color: colors.primaryGlow, fontSize: 14, fontWeight: '900' },
  serviceCopy: { flex: 1, gap: 4 },
  service: { fontSize: 22, fontWeight: '900', color: colors.text },
  barber: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIcon: { color: colors.primaryGlow, fontSize: 16, fontWeight: '900' },
  time: { flex: 1, color: colors.textMuted, lineHeight: 21 },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 178, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 74, 0.18)',
  },
  counterLabel: { color: colors.warning, fontSize: 16, fontWeight: '900' },
  counter: { flex: 1, fontWeight: '900', fontSize: 15, lineHeight: 21, color: colors.warning },
  notes: { color: colors.textSubtle, fontStyle: 'italic', lineHeight: 20 },
  primary: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryAction,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  primaryText: { color: colors.white, fontWeight: '900' },
  primaryArrow: { position: 'absolute', right: 20, color: colors.white, fontSize: 21, fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryPressed: { opacity: 0.76 },
  secondaryText: { fontWeight: '900', color: colors.primaryGlow },
  success: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(84, 214, 138, 0.24)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  successIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(84, 214, 138, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(84, 214, 138, 0.24)',
  },
  successIconText: { color: colors.success, fontSize: 18, fontWeight: '900' },
  successCopy: { flex: 1, gap: 4 },
  successTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  disabled: { opacity: 0.48 },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.22)',
  },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
  autoRefreshCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(10, 18, 33, 0.62)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoRefreshDot: { width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: colors.success },
  hint: { flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 19 },
  footer: { textAlign: 'center', color: colors.textSubtle, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
});
