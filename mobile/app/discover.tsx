import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileBottomNav } from '@/ui/MobileBottomNav';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { getLoginExtrasCopy } from '@/auth/loginExtras';
import { getDiscoveryCopy, type DiscoveryCopy } from '@/discovery/discoveryCopy';
import { sortShops, type ShopSort } from '@/discovery/sortShops';
import { ErrorState } from '@/ui/ErrorState';
import { Action } from '@/ui/OperationalUI';
import { searchShops, type DiscoveryShopCard } from '@/discovery/discoveryApi';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, control, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function DiscoverScreen() {
  const { session, signOut } = useAuth();
  const { locale, t } = useI18n();
  const copy = getDiscoveryCopy(locale);
  const authCopy = getLoginExtrasCopy(locale);
  const [query, setQuery] = useState('');
  const [normalizedQuery, setNormalizedQuery] = useState('');
  const [sort, setSort] = useState<ShopSort>('wait');

  useEffect(() => {
    const timer = setTimeout(() => setNormalizedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const isClient = session?.user.role === 'Client' || session?.user.sessionScope === 'Client';
  const shopsQuery = useQuery({
    queryKey: ['discovery', normalizedQuery],
    queryFn: () => searchShops(normalizedQuery),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
  const results = useMemo(() => sortShops(shopsQuery.data ?? [], sort), [shopsQuery.data, sort]);

  return (
    <SafeAreaView style={styles.screen}>
      <BrandedBackground />
      <FlatList
        contentContainerStyle={styles.content}
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        refreshing={shopsQuery.isRefetching}
        onRefresh={() => shopsQuery.refetch()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}><BrandLogo compact /></View>

            {isClient && (
              <View style={styles.clientBar}>
                <View style={styles.clientIdentity}>
                  <Text style={styles.clientEyebrow}>{t('operations.account')}</Text>
                  <Text style={styles.clientName}>{session?.user.name}</Text>
                  <Text style={styles.clientHint}>{authCopy.customerMessage}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.clientAction, pressed && styles.pressed]}>
                  <Text style={styles.clientActionText}>{t('home.signOut')}</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            {!isClient && (
              <View style={styles.authNotice}>
                <View style={styles.noticeIcon}><Text style={styles.noticeIconText}>i</Text></View>
                <Text style={styles.authNoticeText}>{authCopy.customerMessage}</Text>
              </View>
            )}

            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel={copy.searchPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={copy.searchPlaceholder}
                placeholderTextColor={colors.textSubtle}
                style={styles.search}
                value={query}
              />
            </View>

            <View style={styles.sortRow}>
              <Action disabled={sort === 'wait'} label={t('discovery.sortWait')} onPress={() => setSort('wait')} />
              <Action disabled={sort === 'availability'} label={t('discovery.sortAvailable')} onPress={() => setSort('availability')} />
            </View>

            {shopsQuery.isError && <ErrorState error={shopsQuery.error} retry={() => { void shopsQuery.refetch(); }} />}
          </View>
        }
        renderItem={({ item }) => <ShopCard item={item} copy={copy} canBook={isClient} signInToBook={authCopy.signInToBook} />}
        ListEmptyComponent={shopsQuery.isLoading
          ? <ActivityIndicator color={colors.primaryGlow} size="large" style={styles.state} />
          : shopsQuery.isError
            ? null
            : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{copy.empty}</Text></View>}
        ListFooterComponent={session
          ? (!isClient
              ? <Pressable accessibilityRole="button" onPress={() => router.push('/(app)')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>{t('operations.today')}</Text></Pressable>
              : null)
          : <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>{copy.staffLogin}</Text></Pressable>}
      />
      {isClient && <View style={styles.navWrap}><MobileBottomNav active="discover" /></View>}
    </SafeAreaView>
  );
}

function ShopCard({ item, copy, canBook, signInToBook }: { item: DiscoveryShopCard; copy: DiscoveryCopy; canBook: boolean; signInToBook: string }) {
  const { t, locale } = useI18n();
  const waitText = item.availableBarbers === 0
    ? t('discovery.noBarbers')
    : item.estimatedWaitMinutes == null
      ? copy.unavailable
      : item.estimatedWaitMinutes <= 0
        ? copy.noWait
        : t('common.minutes', { value: new Intl.NumberFormat(locale).format(item.estimatedWaitMinutes) });
  const noWait = item.availableBarbers > 0 && item.estimatedWaitMinutes != null && item.estimatedWaitMinutes <= 0;

  const openBooking = () => {
    if (!canBook) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/request/[slug]', params: { slug: item.slug } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIdentity}>
          <View style={styles.shopInitial}><Text style={styles.shopInitialText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.shopCopy}>
            <Text style={styles.shopName}>{item.name}</Text>
            {!!item.address && <Text numberOfLines={2} style={styles.address}>{item.address}</Text>}
          </View>
        </View>
        <View style={[styles.waitBadge, noWait && styles.waitBadgeLive]}>
          <Text style={styles.waitLabel}>{copy.liveWait}</Text>
          <Text style={styles.waitValue}>{waitText}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.waitingCount}</Text><Text style={styles.metricLabel}>{copy.waiting}</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.availableBarbers}</Text><Text style={styles.metricLabel}>{copy.availableBarbers}</Text></View>
      </View>

      {item.startingPrice != null && (
        <Text style={styles.address}>
          {copy.from} {new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.startingPrice)}
        </Text>
      )}

      <Pressable accessibilityRole="button" onPress={openBooking} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>{canBook ? copy.request : signInToBook}</Text>
        <Text style={styles.primaryArrow}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  brandRow: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  clientBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.md },
  clientIdentity: { flex: 1 },
  clientEyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  clientName: { color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 3 },
  clientHint: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  clientAction: { minWidth: 72, minHeight: control.minTouch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  clientActionText: { color: colors.textMuted, fontWeight: '900', fontSize: 12 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.display, color: colors.text, maxWidth: 620 },
  subtitle: { ...typography.body, color: colors.textMuted, maxWidth: 660 },
  authNotice: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noticeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  noticeIconText: { color: colors.primaryGlow, fontWeight: '900' },
  authNoticeText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  searchWrap: { marginTop: spacing.md, minHeight: control.inputHeight, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: colors.surfaceStrong, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  searchIcon: { color: colors.primaryGlow, fontSize: 22, marginRight: 8 },
  search: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIdentity: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  shopInitial: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  shopInitialText: { color: colors.primaryGlow, fontSize: 20, fontWeight: '900' },
  shopCopy: { flex: 1, gap: spacing.xs },
  shopName: { ...typography.sectionTitle, color: colors.text },
  address: { ...typography.caption, color: colors.textMuted },
  waitBadge: { minWidth: 118, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceStrong, alignItems: 'flex-end', borderWidth: 1, borderColor: colors.border },
  waitBadgeLive: { backgroundColor: colors.successSoft, borderColor: 'rgba(88,219,145,.24)' },
  waitLabel: { ...typography.caption, color: colors.textMuted },
  waitValue: { fontSize: 17, fontWeight: '900', color: colors.success },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.surfaceStrong, padding: spacing.md, borderWidth: 1, borderColor: colors.divider },
  metricValue: { fontSize: 24, fontWeight: '900', color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  primaryButton: { minHeight: control.buttonHeight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, borderRadius: radius.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.lg },
  primaryButtonText: { fontWeight: '900', color: colors.white, fontSize: 15 },
  primaryArrow: { fontWeight: '900', color: colors.white, fontSize: 18 },
  staffButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  staffButtonText: { fontWeight: '800', color: colors.primaryGlow },
  pressed: { opacity: 0.82 },
  state: { marginVertical: spacing.xxxl },
  emptyCard: { padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', gap: 6, marginVertical: spacing.xl },
  emptyTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  navWrap: { padding: spacing.sm, paddingTop: 0 },
});
