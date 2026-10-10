import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function TodayScreen() {
  const { session, refresh } = useAuth();
  const { t, locale } = useI18n();

  const withToken = async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    if (!session) throw new MobileApiError('', 401);
    try {
      return await fn(session.accessToken);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        const token = await refresh();
        if (token) return fn(token);
      }
      throw error;
    }
  };

  const query = useQuery({
    queryKey: ['today', session?.user.id, session?.user.barberShopId],
    queryFn: () => withToken(getToday),
    enabled: !!session,
    refetchInterval: 30_000,
  });
  const realtime = useQueueRealtime(session?.accessToken, `${session?.user.id}:${session?.user.barberShopId}`, () => { void query.refetch(); });
  const mutation = useMutation({
    mutationFn: (fn: (token: string) => Promise<unknown>) => withToken(fn),
    onSuccess: () => { void query.refetch(); },
  });
  const [shareError, setShareError] = useState<unknown>(null);
  const data = query.data;
  const canManage = session?.user.role === 'Owner' || session?.user.role === 'Administrator';

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} tintColor={colors.primaryGlow} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}><BrandLogo compact /></View>

          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <ScreenHeader title={t('operations.today')} context={data?.shopName} realtime={realtime} />
            <Text style={styles.heroRole}>{session?.user.name} · {session?.user.role}</Text>
          </View>

          {query.isLoading && <ActivityIndicator color={colors.primaryGlow} />}
          {query.error && <ErrorState error={query.error} retry={() => { void query.refetch(); }} />}
          {mutation.error && <ErrorState error={mutation.error} />}
          {shareError != null && <ErrorState error={shareError} />}

          {data && (
            <>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(data.estimatedWaitMinutes)}</Text>
                  <Text style={styles.kpiLabel}>{t('operations.wait')}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{data.pendingRequests}</Text>
                  <Text style={styles.kpiLabel}>{t('home.requests')}</Text>
                </View>
              </View>

              <View style={styles.quickCard}>
                <Text style={styles.sectionKicker}>BARBERTRIX MOBILE</Text>
                <Text style={styles.sectionTitle}>{t('operations.today')}</Text>
                <View style={styles.quickActions}>
                  <Action label={`${t('home.requests')} · ${data.pendingRequests}`} onPress={() => router.push('/(app)/turn-requests')} />
                  {canManage && <Action label={t('operations.team')} onPress={() => router.push('/(app)/team')} />}
                  {session?.user.role === 'Owner' && <Action label={t('marketplace.title')} onPress={() => router.push('/(app)/marketplace-profile')} />}
                  {canManage && (
                    <Action
                      label={t('operations.share')}
                      onPress={() => {
                        const web = (process.env.EXPO_PUBLIC_WEB_URL || 'https://barbertrixrd.netlify.app').replace(/\/$/, '');
                        setShareError(null);
                        void Share.share({ message: `${web}/#/book?shop=${encodeURIComponent(data.shopSlug)}` }).catch(setShareError);
                      }}
                    />
                  )}
                </View>
              </View>

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionKicker}>OPERACIÓN EN VIVO</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{t('operations.queue')}</Text>
              </View>

              {!data.turns.length && <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('operations.empty')}</Text></View>}
              {data.turns.map(turn => (
                <Card key={turn.id}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle}>{turn.ticketNumber} · {turn.customerName}</Text>
                      <Text style={styles.cardMeta}>{turn.serviceName} · {t(`operations.${turn.status}`)}</Text>
                    </View>
                    <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{t(`operations.${turn.status}`)}</Text></View>
                  </View>

                  {turn.status === 'Waiting' && data.barbers
                    .filter(barber => barber.status === 'Available' && (!turn.barberId || barber.id === turn.barberId))
                    .map(barber => <Action key={barber.id} disabled={mutation.isPending} label={`${t('operations.call')} · ${barber.name}`} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, `call/${barber.id}`))} />)}

                  {turn.status === 'Called' && (
                    <>
                      <Action disabled={mutation.isPending} label={t('operations.start')} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, 'start'))} />
                      <Action
                        disabled={mutation.isPending}
                        label={t('operations.noShow')}
                        onPress={() => Alert.alert(
                          t('operations.noShow'),
                          t('operations.noShowConfirm'),
                          [
                            { text: t('team.cancel'), style: 'cancel' },
                            { text: t('operations.noShow'), style: 'destructive', onPress: () => mutation.mutate(token => operateTurn(token, turn.id, 'no-show')) },
                          ],
                        )}
                      />
                    </>
                  )}

                  {turn.status === 'InService' && <Action disabled={mutation.isPending} label={t('operations.complete')} onPress={() => mutation.mutate(token => operateTurn(token, turn.id, 'complete'))} />}
                </Card>
              ))}

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionKicker}>AGENDA</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{t('operations.appointments')}</Text>
              </View>

              {!data.appointments.length && <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('operations.empty')}</Text></View>}
              {data.appointments.map(item => (
                <Card key={item.id}>
                  <Text style={styles.cardTitle}>{new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: data.timeZoneId }).format(new Date(item.startsAtUtc))} · {item.customerName}</Text>
                  <Text style={styles.cardMeta}>{item.serviceName}</Text>
                </Card>
              ))}

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionKicker}>EQUIPO</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{t('operations.team')}</Text>
              </View>

              {data.barbers.map(barber => (
                <Card key={barber.id}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle}>{barber.name}</Text>
                      <Text style={styles.cardMeta}>{t(`operations.${barber.status}`)}</Text>
                    </View>
                    <View style={[styles.statusBadge, barber.status === 'Available' && styles.statusBadgeAvailable]}>
                      <Text style={[styles.statusBadgeText, barber.status === 'Available' && styles.statusBadgeTextAvailable]}>{t(`operations.${barber.status}`)}</Text>
                    </View>
                  </View>
                  {barber.status !== 'Busy' && (['Available', 'Break', 'Offline'] as const)
                    .filter(status => status !== barber.status)
                    .map(status => <Action key={status} label={t(`operations.${status}`)} disabled={mutation.isPending} onPress={() => mutation.mutate(token => changeAvailability(token, barber.id, status))} />)}
                </Card>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.navWrap}><MobileBottomNav active="home" /></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.lg },
  topbar: { minHeight: 58, justifyContent: 'center' },
  hero: { position: 'relative', overflow: 'hidden', padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(9,18,34,0.92)' },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -130, right: -80, backgroundColor: colors.primarySoft },
  heroRole: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1, minHeight: 92, justifyContent: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  kpiValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  kpiLabel: { color: colors.textSubtle, fontSize: 12, fontWeight: '800', marginTop: 4 },
  quickCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  quickActions: { gap: spacing.sm },
  sectionHeading: { gap: 4, marginTop: spacing.sm },
  sectionKicker: { ...typography.eyebrow, color: colors.primaryGlow },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'space-between' },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  cardMeta: { color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  statusBadgeText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  statusBadgeAvailable: { backgroundColor: colors.successSoft, borderColor: 'rgba(88,219,145,.24)' },
  statusBadgeTextAvailable: { color: colors.success },
  navWrap: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, backgroundColor: 'rgba(5, 9, 18, 0.92)' },
});
