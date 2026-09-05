import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { getLoginExtrasCopy } from '@/auth/loginExtras';
import { getDiscoveryCopy, type DiscoveryCopy } from '@/discovery/discoveryCopy';
import { searchShops, type DiscoveryShopCard } from '@/discovery/discoveryApi';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, control, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function DiscoverScreen() {
  const { session, signOut } = useAuth();
  const { locale } = useI18n();
  const copy = getDiscoveryCopy(locale);
  const authCopy = getLoginExtrasCopy(locale);
  const [query, setQuery] = useState('');
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const isClient = session?.user.role === 'Client';

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
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}><BrandLogo compact /></View>
            {isClient && <View style={styles.clientBar}>
              <View style={styles.clientIdentity}><Text style={styles.clientEyebrow}>TU CUENTA</Text><Text style={styles.clientName}>{session?.user.name}</Text><Text style={styles.clientHint}>Encuentra tu próxima barbería y solicita tu turno.</Text></View>
              <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.clientAction, pressed && styles.pressed]}><Text style={styles.clientActionText}>Salir</Text></Pressable>
            </View>}
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
            {!isClient && <View style={styles.authNotice}><View style={styles.noticeIcon}><Text style={styles.noticeIconText}>i</Text></View><Text style={styles.authNoticeText}>{authCopy.customerMessage}</Text></View>}
            <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel={copy.searchPlaceholder} autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder={copy.searchPlaceholder} placeholderTextColor={colors.textSubtle} style={styles.search} value={query} /></View>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Barberías cerca de ti</Text><Text style={styles.sectionMeta}>{(shopsQuery.data ?? []).length} disponibles</Text></View>
          </View>
        }
        renderItem={({ item }) => <ShopCard item={item} copy={copy} canBook={isClient} signInToBook={authCopy.signInToBook} />}
        ListEmptyComponent={shopsQuery.isLoading
          ? <ActivityIndicator color={colors.primaryGlow} size="large" style={styles.state} />
          : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No encontramos barberías</Text><Text style={styles.stateText}>{shopsQuery.isError ? copy.error : copy.empty}</Text></View>}
        ListFooterComponent={session
          ? (!isClient ? <Pressable accessibilityRole="button" onPress={() => router.push('/(app)')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>← Volver al espacio profesional</Text></Pressable> : null)
          : <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [styles.staffButton, pressed && styles.pressed]}><Text style={styles.staffButtonText}>{copy.staffLogin}</Text></Pressable>}
      />
    </View>
  );
}

function ShopCard({ item, copy, canBook, signInToBook }: { item: DiscoveryShopCard; copy: DiscoveryCopy; canBook: boolean; signInToBook: string }) {
  const waitText = item.estimatedWaitMinutes == null ? copy.unavailable : item.estimatedWaitMinutes <= 0 ? copy.noWait : `${item.estimatedWaitMinutes} min`;
  const noWait = item.estimatedWaitMinutes != null && item.estimatedWaitMinutes <= 0;
  const openBooking = () => {
    if (!canBook) { router.push('/(auth)/login'); return; }
    router.push({ pathname: '/request/[slug]', params: { slug: item.slug } });
  };

  return <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.cardIdentity}><View style={styles.shopInitial}><Text style={styles.shopInitialText}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.shopCopy}><Text style={styles.shopName}>{item.name}</Text>{!!item.address && <Text numberOfLines={2} style={styles.address}>{item.address}</Text>}</View></View>
      <View style={[styles.waitBadge, noWait && styles.waitBadgeLive]}><Text style={styles.waitLabel}>{copy.liveWait}</Text><Text style={styles.waitValue}>{waitText}</Text></View>
    </View>
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricValue}>{item.waitingCount}</Text><Text style={styles.metricLabel}>{copy.waiting}</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{item.availableBarbers}</Text><Text style={styles.metricLabel}>{copy.availableBarbers}</Text></View></View>
    <Pressable accessibilityRole="button" onPress={openBooking} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{canBook ? copy.request : signInToBook}</Text><Text style={styles.primaryArrow}>→</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},content:{paddingHorizontal:spacing.lg,paddingTop:spacing.xxxl + spacing.md,paddingBottom:spacing.huge,gap:spacing.md},header:{gap:spacing.sm,marginBottom:spacing.lg},brandRow:{marginBottom:spacing.sm,alignItems:'flex-start'},
  clientBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radius.xl,backgroundColor:colors.surface,padding:spacing.lg,marginBottom:spacing.md},clientIdentity:{flex:1},clientEyebrow:{...typography.eyebrow,color:colors.primaryGlow},clientName:{color:colors.text,fontWeight:'900',fontSize:18,marginTop:3},clientHint:{...typography.caption,color:colors.textMuted,marginTop:3},clientAction:{minWidth:64,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border},clientActionText:{color:colors.textMuted,fontWeight:'900',fontSize:12},
  eyebrow:{...typography.eyebrow,color:colors.primaryGlow},title:{...typography.display,color:colors.text,maxWidth:620},subtitle:{...typography.body,color:colors.textMuted,maxWidth:660},
  authNotice:{marginTop:spacing.sm,padding:spacing.md,borderRadius:radius.lg,borderWidth:1,borderColor:colors.borderStrong,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:spacing.sm},noticeIcon:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},noticeIconText:{color:colors.primaryGlow,fontWeight:'900'},authNoticeText:{...typography.caption,color:colors.textMuted,flex:1},
  searchWrap:{marginTop:spacing.md,minHeight:control.inputHeight,borderWidth:1,borderColor:colors.borderStrong,borderRadius:radius.lg,backgroundColor:colors.surfaceStrong,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md},searchIcon:{color:colors.primaryGlow,fontSize:22,marginRight:8},search:{flex:1,color:colors.text,fontSize:16,paddingVertical:0},
  sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',gap:spacing.md,marginTop:spacing.md},sectionTitle:{...typography.sectionTitle,color:colors.text},sectionMeta:{...typography.caption,color:colors.textSubtle},
  card:{borderWidth:1,borderColor:colors.border,borderRadius:radius.xl,backgroundColor:colors.surface,padding:spacing.lg,gap:spacing.lg},cardTop:{flexDirection:'row',gap:spacing.md,alignItems:'flex-start',justifyContent:'space-between'},cardIdentity:{flex:1,flexDirection:'row',gap:spacing.sm,alignItems:'center'},shopInitial:{width:46,height:46,borderRadius:16,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong,alignItems:'center',justifyContent:'center'},shopInitialText:{color:colors.primaryGlow,fontSize:20,fontWeight:'900'},shopCopy:{flex:1,gap:spacing.xs},shopName:{...typography.sectionTitle,color:colors.text},address:{...typography.caption,color:colors.textMuted},waitBadge:{minWidth:118,borderRadius:radius.lg,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,backgroundColor:colors.surfaceStrong,alignItems:'flex-end',borderWidth:1,borderColor:colors.border},waitBadgeLive:{backgroundColor:colors.successSoft,borderColor:'rgba(88,219,145,.24)'},waitLabel:{...typography.caption,color:colors.textMuted},waitValue:{fontSize:17,fontWeight:'900',color:colors.success},
  metrics:{flexDirection:'row',gap:spacing.sm},metric:{flex:1,borderRadius:radius.lg,backgroundColor:colors.surfaceStrong,padding:spacing.md,borderWidth:1,borderColor:colors.divider},metricValue:{fontSize:24,fontWeight:'900',color:colors.text},metricLabel:{...typography.caption,color:colors.textMuted},
  primaryButton:{minHeight:control.buttonHeight,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10,borderRadius:radius.lg,backgroundColor:colors.primary,paddingHorizontal:spacing.lg},primaryButtonText:{fontWeight:'900',color:colors.white,fontSize:15},primaryArrow:{fontWeight:'900',color:colors.white,fontSize:18},
  staffButton:{minHeight:50,alignItems:'center',justifyContent:'center',marginTop:spacing.xl,borderRadius:radius.lg,borderWidth:1,borderColor:colors.borderStrong,backgroundColor:colors.surface},staffButtonText:{fontWeight:'800',color:colors.primaryGlow},pressed:{opacity:.82},state:{marginVertical:spacing.xxxl},emptyCard:{padding:spacing.xl,borderRadius:radius.xl,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',gap:6,marginVertical:spacing.xl},emptyTitle:{...typography.sectionTitle,color:colors.text},stateText:{...typography.body,color:colors.textMuted,textAlign:'center'}
});
