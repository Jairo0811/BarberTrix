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
import { colors, radius, spacing, typography } from '@/theme/tokens';
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
  useEffect(() => { const timer = setTimeout(() => setNormalizedQuery(query.trim()), 350); return () => clearTimeout(timer); }, [query]);
  const isClient = session?.user.role === 'Client';

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
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <BrandLogo compact />
            </View>
            {isClient && <View style={styles.clientBar}><View><Text style={styles.clientEyebrow}>{t('operations.account')}</Text><Text style={styles.clientName}>{session?.user.name}</Text></View><Pressable onPress={signOut} style={styles.clientAction}><Text style={styles.clientActionText}>{t('home.signOut')}</Text></Pressable></View>}
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
            {!isClient && <View style={styles.authNotice}><Text style={styles.authNoticeText}>{authCopy.customerMessage}</Text></View>}
            <TextInput accessibilityLabel={copy.searchPlaceholder} autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder={copy.searchPlaceholder} placeholderTextColor={colors.textSubtle} style={styles.search} value={query} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Action disabled={sort === 'wait'} label={t('discovery.sortWait')} onPress={() => setSort('wait')} /><Action disabled={sort === 'availability'} label={t('discovery.sortAvailable')} onPress={() => setSort('availability')} /></View>
            {shopsQuery.isError && <ErrorState error={shopsQuery.error} retry={() => { void shopsQuery.refetch(); }} />}
          </View>
        }
        renderItem={({ item }) => <ShopCard item={item} copy={copy} canBook={isClient} signInToBook={authCopy.signInToBook} />}
        ListEmptyComponent={shopsQuery.isLoading
          ? <ActivityIndicator color={colors.primaryGlow} size="large" style={styles.state} />
          : shopsQuery.isError ? null : <Text style={styles.stateText}>{copy.empty}</Text>}
        ListFooterComponent={session
          ? (!isClient ? <Pressable accessibilityRole="button" onPress={() => router.push('/(app)')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>{t('operations.today')}</Text></Pressable> : null)
          : <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>{copy.staffLogin}</Text></Pressable>}
      />
      {isClient && <View style={{ padding: 12 }}><MobileBottomNav active="discover" /></View>}
    </SafeAreaView>
  );
}

function ShopCard({ item, copy, canBook, signInToBook }: { item: DiscoveryShopCard; copy: DiscoveryCopy; canBook: boolean; signInToBook: string }) {
  const { t, locale } = useI18n();
  const waitText = item.availableBarbers === 0 ? t('discovery.noBarbers') : item.estimatedWaitMinutes == null ? copy.unavailable : item.estimatedWaitMinutes <= 0 ? copy.noWait : t('common.minutes', { value: new Intl.NumberFormat(locale).format(item.estimatedWaitMinutes) });
  const openBooking = () => {
    if (!canBook) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/request/[slug]', params: { slug: item.slug } });
  };

  return <View style={styles.card}>
    <View style={styles.cardTop}><View style={styles.cardIdentity}><Text style={styles.shopName}>{item.name}</Text>{!!item.address && <Text numberOfLines={2} style={styles.address}>{item.address}</Text>}</View><View style={styles.waitBadge}><Text style={styles.waitLabel}>{copy.liveWait}</Text><Text style={styles.waitValue}>{waitText}</Text></View></View>
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricValue}>{item.waitingCount}</Text><Text style={styles.metricLabel}>{copy.waiting}</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{item.availableBarbers}</Text><Text style={styles.metricLabel}>{copy.availableBarbers}</Text></View></View>
    {item.startingPrice != null && <Text style={styles.address}>{copy.from} {new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.startingPrice)}</Text>}
    <Pressable accessibilityRole="button" onPress={openBooking} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{canBook ? copy.request : signInToBook}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:spacing.lg,paddingTop:spacing.lg,paddingBottom:spacing.xxxl,gap:spacing.md},header:{gap:spacing.sm,marginBottom:spacing.lg},brandRow:{marginBottom:spacing.sm,alignItems:'flex-start'},clientBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:colors.borderStrong,borderRadius:radius.md,backgroundColor:colors.surface,padding:spacing.md,marginBottom:spacing.md},clientEyebrow:{...typography.eyebrow,color:colors.primaryGlow},clientName:{color:colors.text,fontWeight:'900',fontSize:16,marginTop:2},clientAction:{paddingHorizontal:10,paddingVertical:8},clientActionText:{color:colors.textMuted,fontWeight:'800',fontSize:12},eyebrow:{...typography.eyebrow,color:colors.primaryGlow},title:{...typography.sectionTitle,fontSize:28,color:colors.text,maxWidth:620},subtitle:{...typography.body,color:colors.textMuted,maxWidth:660},authNotice:{marginTop:spacing.sm,padding:spacing.md,borderRadius:radius.md,borderWidth:1,borderColor:colors.borderStrong,backgroundColor:colors.surface},authNoticeText:{...typography.caption,color:colors.textMuted},search:{marginTop:spacing.md,minHeight:52,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radius.md,backgroundColor:colors.surface,color:colors.text,paddingHorizontal:spacing.lg,fontSize:16},card:{borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,backgroundColor:colors.surface,padding:spacing.lg,gap:spacing.lg},cardTop:{flexDirection:'row',gap:spacing.md,alignItems:'flex-start',justifyContent:'space-between'},cardIdentity:{flex:1,gap:spacing.xs},shopName:{...typography.sectionTitle,color:colors.text},address:{...typography.caption,color:colors.textMuted},waitBadge:{minWidth:116,borderRadius:radius.md,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,backgroundColor:colors.successSoft,alignItems:'flex-end'},waitLabel:{...typography.caption,color:colors.textMuted},waitValue:{fontSize:18,fontWeight:'900',color:colors.success},metrics:{flexDirection:'row',gap:spacing.sm},metric:{flex:1,borderRadius:radius.md,backgroundColor:colors.surfaceStrong,padding:spacing.md},metricValue:{fontSize:22,fontWeight:'900',color:colors.text},metricLabel:{...typography.caption,color:colors.textMuted},primaryButton:{minHeight:50,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primary,paddingHorizontal:spacing.lg},primaryButtonText:{fontWeight:'900',color:colors.white},staffButton:{minHeight:48,alignItems:'center',justifyContent:'center',marginTop:spacing.xl,borderRadius:radius.md,borderWidth:1,borderColor:colors.borderStrong},staffButtonText:{fontWeight:'800',color:colors.primaryGlow},pressed:{opacity:.82},state:{marginVertical:spacing.xxxl},stateText:{...typography.body,color:colors.textMuted,textAlign:'center',marginVertical:spacing.xxxl}
});
