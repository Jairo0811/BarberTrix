import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { discoveryCopy } from '@/discovery/discoveryCopy';
import { searchShops, type DiscoveryShopCard } from '@/discovery/discoveryApi';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function DiscoverScreen() {
  const { locale } = useI18n();
  const copy = discoveryCopy[locale];
  const [query, setQuery] = useState('');
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const shopsQuery = useQuery({
    queryKey: ['discovery', normalizedQuery],
    queryFn: () => searchShops(normalizedQuery),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  return (
    <View style={styles.screen}>
      <BrandedBackground />
      <FlatList
        contentContainerStyle={styles.content}
        data={shopsQuery.data ?? []}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        refreshing={shopsQuery.isRefetching}
        onRefresh={() => shopsQuery.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
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
        }
        renderItem={({ item }) => <ShopCard item={item} copy={copy} />}
        ListEmptyComponent={
          shopsQuery.isLoading
            ? <ActivityIndicator color={colors.primaryGlow} size="large" style={styles.state} />
            : <Text style={styles.stateText}>{shopsQuery.isError ? copy.error : copy.empty}</Text>
        }
        ListFooterComponent={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}
          >
            <Text style={styles.staffButtonText}>{copy.staffLogin}</Text>
          </Pressable>
        }
      />
    </View>
  );
}

function ShopCard({ item, copy }: { item: DiscoveryShopCard; copy: (typeof discoveryCopy)[keyof typeof discoveryCopy] }) {
  const waitText = item.estimatedWaitMinutes == null
    ? copy.unavailable
    : item.estimatedWaitMinutes <= 0
      ? copy.noWait
      : `${item.estimatedWaitMinutes} min`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIdentity}>
          <Text style={styles.shopName}>{item.name}</Text>
          {!!item.address && <Text numberOfLines={2} style={styles.address}>{item.address}</Text>}
        </View>
        <View style={styles.waitBadge}>
          <Text style={styles.waitLabel}>{copy.liveWait}</Text>
          <Text style={styles.waitValue}>{waitText}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.waitingCount}</Text>
          <Text style={styles.metricLabel}>{copy.waiting}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.availableBarbers}</Text>
          <Text style={styles.metricLabel}>{copy.availableBarbers}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/request/[slug]', params: { slug: item.slug } })}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{copy.request}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl + spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text, maxWidth: 620 },
  subtitle: { ...typography.body, color: colors.textMuted, maxWidth: 660 },
  search: { marginTop: spacing.md, minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.lg, fontSize: 16 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIdentity: { flex: 1, gap: spacing.xs },
  shopName: { ...typography.sectionTitle, color: colors.text },
  address: { ...typography.caption, color: colors.textMuted },
  waitBadge: { minWidth: 116, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.successSoft, alignItems: 'flex-end' },
  waitLabel: { ...typography.caption, color: colors.textMuted },
  waitValue: { fontSize: 18, fontWeight: '900', color: colors.success },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, borderRadius: radius.md, backgroundColor: colors.surfaceStrong, padding: spacing.md },
  metricValue: { fontSize: 22, fontWeight: '900', color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg },
  primaryButtonText: { fontWeight: '900', color: colors.white },
  staffButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong },
  staffButtonText: { fontWeight: '800', color: colors.primaryGlow },
  pressed: { opacity: 0.82 },
  state: { marginVertical: spacing.xxxl },
  stateText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.xxxl },
});
