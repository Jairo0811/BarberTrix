import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { getMyJoinRequests, requestJoin, searchShops, withdrawJoinRequest, type BarberJoinRequest, type BarberShopDirectoryItem } from '@/onboarding/onboardingApi';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function OnboardingScreen() {
  const { status, session, signOut, refresh } = useAuth();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<BarberShopDirectoryItem[]>([]);
  const [requests, setRequests] = useState<BarberJoinRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const requestStatusLabel = (requestStatus: string) => {
    const supported = new Set(['Pending', 'Approved', 'Rejected', 'Withdrawn']);
    return supported.has(requestStatus) ? t(`onboarding.status.${requestStatus}`) : requestStatus;
  };

  const load = useCallback(async (search = query) => {
    if (!session) return;
    setBusy(true);
    setError('');

    try {
      const [shopResults, joinRequests] = await Promise.all([
        searchShops(session.accessToken, search),
        getMyJoinRequests(session.accessToken),
      ]);

      setShops(shopResults);
      setRequests(joinRequests);

      if (joinRequests.some(item => item.status === 'Approved')) {
        const token = await refresh();
        if (token) router.replace('/(app)');
      }
    } catch {
      setError(t('onboarding.loadError'));
    } finally {
      setBusy(false);
    }
  }, [query, refresh, session, t]);

  useEffect(() => { void load(''); }, [load]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryGlow} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated') return <Redirect href="/(app)" />;

  const pendingByShop = new Map(requests.filter(item => item.status === 'Pending').map(item => [item.barberShopId, item]));

  async function join(shop: BarberShopDirectoryItem) {
    if (!session) return;
    setBusy(true);
    setError('');

    try {
      await requestJoin(session.accessToken, shop.id);
      await load(query);
      Alert.alert(t('onboarding.sentTitle'), t('onboarding.sentText', { shop: shop.name }));
    } catch {
      setError(t('onboarding.sendError'));
      setBusy(false);
    }
  }

  async function withdraw(request: BarberJoinRequest) {
    if (!session) return;
    setBusy(true);
    setError('');

    try {
      await withdrawJoinRequest(session.accessToken, request.id);
      await load(query);
    } catch {
      setError(t('onboarding.withdrawError'));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <BrandLogo compact />
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]} onPress={() => void signOut()}>
            <Text style={styles.signOutText}>{t('onboarding.signOut')}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('common.barberContext')}</Text>
          <Text style={styles.title}>{t('onboarding.title')}</Text>
          <Text style={styles.body}>{t('onboarding.body', { name: session?.user.name ?? '' })}</Text>
        </View>

        <View style={styles.searchPanel}>
          <View style={styles.searchCopy}>
            <Text style={styles.panelEyebrow}>{t('common.barberNetwork')}</Text>
            <Text style={styles.panelTitle}>{t('onboarding.availableShops')}</Text>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel={t('onboarding.searchPlaceholder')}
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder={t('onboarding.searchPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={query}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void load(query)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed, busy && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>{t('onboarding.search')}</Text>
            </Pressable>
          </View>
        </View>

        {busy ? <ActivityIndicator color={colors.primaryGlow} /> : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>{t('common.directory')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.availableShops')}</Text>
        </View>

        {shops.length === 0 && !busy ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyDot} />
            <Text style={styles.muted}>{t('onboarding.searchPlaceholder')}</Text>
          </View>
        ) : null}

        {shops.map(shop => {
          const pending = pendingByShop.get(shop.id);

          return (
            <View key={shop.id} style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{shop.name}</Text>
                <Text style={styles.meta}>@{shop.slug}</Text>
                <Text style={styles.timeZone}>{shop.timeZoneId}</Text>
              </View>

              {pending ? (
                <View style={styles.pendingArea}>
                  <View style={styles.pendingBadge}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>{t('onboarding.status.Pending')}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void withdraw(pending)}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed, busy && styles.disabled]}
                  >
                    <Text style={styles.secondaryButtonText}>{t('onboarding.withdraw')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void join(shop)}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed, busy && styles.disabled]}
                >
                  <Text style={styles.primaryButtonText}>{t('onboarding.requestJoin')}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>{t('common.access')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.myRequests')}</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyDot} />
            <Text style={styles.muted}>{t('onboarding.noRequests')}</Text>
          </View>
        ) : requests.map(request => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.cardTitle}>{request.barberShopName}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{requestStatusLabel(request.status)}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{t('onboarding.status', { status: requestStatusLabel(request.status) })}</Text>
            {request.reviewNote ? <Text style={styles.reviewNote}>{t('onboarding.note', { note: request.reviewNote })}</Text> : null}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void load(query)}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed, busy && styles.disabled]}
        >
          <Text style={styles.refreshText}>↻  {t('onboarding.refresh')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    padding: spacing.xl,
    paddingBottom: 56,
    gap: spacing.lg,
    flexGrow: 1,
  },
  topbar: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  signOutButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  signOutText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  hero: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, maxWidth: 680 },
  searchPanel: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(10, 18, 33, 0.94)',
  },
  searchCopy: { gap: 4 },
  panelEyebrow: { ...typography.eyebrow, color: colors.textSubtle },
  panelTitle: { ...typography.sectionTitle, color: colors.text },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#08111F',
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 50,
    minWidth: 138,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  sectionHeader: { gap: 4, marginTop: spacing.md },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textSubtle },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  card: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardAccent: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  requestCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 18, 33, 0.82)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardCopy: { gap: 4 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  timeZone: { color: colors.textSubtle, fontSize: 11, fontWeight: '700' },
  pendingArea: { gap: spacing.sm },
  pendingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 178, 74, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 74, 0.22)',
  },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  pendingText: { color: colors.warning, fontSize: 11, fontWeight: '900' },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primaryGlow, fontWeight: '900' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  statusText: { color: colors.primaryGlow, fontSize: 10, fontWeight: '900' },
  reviewNote: { color: colors.textSubtle, fontStyle: 'italic', lineHeight: 19 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 18, 33, 0.62)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSubtle },
  muted: { flex: 1, color: colors.textMuted, lineHeight: 20 },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.22)',
  },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
  refreshButton: {
    minHeight: 50,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { color: colors.textMuted, fontWeight: '900' },
  buttonPressed: { opacity: 0.74 },
  disabled: { opacity: 0.48 },
});
