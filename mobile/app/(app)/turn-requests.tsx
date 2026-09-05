import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { createTurnRequestRealtimeConnection } from '@/realtime/turnRequestRealtime';
import { acceptTurnRequest, counterProposeTurnRequest, getStaffTurnRequests, rejectTurnRequest } from '@/turnRequests/turnRequestApi';
import type { TurnRequest } from '@/turnRequests/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';
import { MobileBottomNav } from '@/ui/MobileBottomNav';

export default function StaffTurnRequestsScreen() {
  const { session, refresh } = useAuth();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = ['staff-turn-requests', session?.user.barberShopId];
  const [realtimeState, setRealtimeState] = useState<HubConnectionState>(HubConnectionState.Disconnected);

  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const statusLabel = (request: TurnRequest) => t(`staffRequests.status.${request.status}`);

  const withToken = async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    const token = session?.accessToken;
    if (!token) throw new Error(t('staffRequests.sessionUnavailable'));
    try { return await operation(token); }
    catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        const renewed = await refresh();
        if (renewed) return operation(renewed);
      }
      throw error;
    }
  };

  const requestQuery = useQuery({ queryKey, queryFn: () => withToken(token => getStaffTurnRequests(token)), enabled: Boolean(session?.accessToken), refetchInterval: 60_000 });

  useEffect(() => {
    if (!session?.accessToken) return;
    const connection = createTurnRequestRealtimeConnection(() => session.accessToken, () => { void queryClient.invalidateQueries({ queryKey }); });
    connection.onreconnecting(() => setRealtimeState(HubConnectionState.Reconnecting));
    connection.onreconnected(() => setRealtimeState(HubConnectionState.Connected));
    connection.onclose(() => setRealtimeState(HubConnectionState.Disconnected));
    void connection.start().then(() => setRealtimeState(HubConnectionState.Connected)).catch(() => setRealtimeState(HubConnectionState.Disconnected));
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
  const isLive = realtimeState === HubConnectionState.Connected;
  const realtimeLabel = isLive ? 'EN VIVO' : realtimeState === HubConnectionState.Reconnecting ? 'RECONECTANDO' : 'SIN CONEXIÓN';

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={requestQuery.isRefetching} onRefresh={() => requestQuery.refetch()} tintColor={colors.primaryGlow} colors={[colors.primary]} progressBackgroundColor={colors.surfaceStrong} />} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}><BrandLogo compact /><View style={[styles.liveBadge, !isLive && styles.liveBadgeOffline]}><View style={[styles.liveDot, !isLive && styles.liveDotOffline]} /><Text style={[styles.liveText, !isLive && styles.liveTextOffline]}>{realtimeLabel}</Text></View></View>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>{t('staffRequests.eyebrow')}</Text><Text style={styles.title}>{t('staffRequests.title')}</Text><Text style={styles.subtitle}>{t('staffRequests.subtitle')}</Text></View>
          <View style={styles.summaryRow}><View style={styles.summaryCard}><Text style={styles.summaryValue}>{actionable.length}</Text><Text style={styles.summaryLabel}>{t('staffRequests.status.Pending')}</Text></View><View style={styles.summaryCard}><Text style={styles.summaryValue}>{history.length}</Text><Text style={styles.summaryLabel}>{t('staffRequests.recent')}</Text></View></View>
          {!isLive ? <View style={styles.realtimeNotice}><Text style={styles.realtimeNoticeTitle}>{realtimeState === HubConnectionState.Reconnecting ? 'Recuperando tiempo real…' : 'Actualización automática temporalmente desconectada'}</Text><Text style={styles.realtimeNoticeText}>Puedes seguir usando la pantalla. BarberTrix mantiene el refresco periódico mientras vuelve la conexión.</Text></View> : null}
          {requestQuery.isLoading ? <ActivityIndicator color={colors.primaryGlow} size="large" /> : null}
          {requestQuery.error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{t('staffRequests.loadError')}</Text></View> : null}
          {!requestQuery.isLoading && actionable.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✓</Text></View><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>{t('staffRequests.emptyTitle')}</Text><Text style={styles.subtitle}>{t('staffRequests.emptyText')}</Text></View></View> : null}
          {actionable.map(request => <View key={request.id} style={styles.card}><View style={styles.cardAccent} /><View style={styles.cardTop}><View style={styles.cardCopy}><Text style={styles.customer}>{request.customerName}</Text><Text style={styles.service}>{request.serviceName} · {request.barberName}</Text></View><View style={styles.badge}><View style={styles.badgeDot} /><Text style={styles.badgeText}>{statusLabel(request)}</Text></View></View><View style={styles.timeRow}><Text style={styles.timeIcon}>◷</Text><Text style={styles.time}>{formatDate(request.effectiveStartsAtUtc)}</Text></View>{request.notes ? <Text style={styles.notes}>“{request.notes}”</Text> : null}{request.status === 'CounterProposed' ? <Text style={styles.counter}>{t('staffRequests.counterWaiting')}</Text> : null}{request.status === 'Pending' ? <View style={styles.actions}><Pressable accessibilityRole="button" disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'accept', id: request.id })} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, mutate.isPending && styles.disabled]}><Text style={styles.primaryText}>{t('staffRequests.accept')}</Text></Pressable><Pressable accessibilityRole="button" disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'reject', id: request.id })} style={({ pressed }) => [styles.danger, pressed && styles.dangerPressed, mutate.isPending && styles.disabled]}><Text style={styles.dangerText}>{t('staffRequests.reject')}</Text></Pressable></View> : null}{request.status === 'Pending' ? <View style={styles.counterActions}>{[30, 60, 90].map(minutes => { const proposed = new Date(new Date(request.requestedStartsAtUtc).getTime() + minutes * 60_000).toISOString(); return <Pressable accessibilityRole="button" key={minutes} disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'counter', id: request.id, startsAt: proposed })} style={({ pressed }) => [styles.counterButton, pressed && styles.counterButtonPressed, mutate.isPending && styles.disabled]}><Text style={styles.counterButtonText}>+{minutes} min</Text></Pressable>; })}</View> : null}</View>)}
          {mutate.error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{t('staffRequests.actionError')}</Text></View> : null}
          {history.length > 0 ? <View style={styles.sectionHeading}><Text style={styles.sectionEyebrow}>BARBERTRIX</Text><Text style={styles.sectionTitle}>{t('staffRequests.recent')}</Text></View> : null}
          {history.map(request => <View key={request.id} style={styles.historyCard}><View style={styles.historyMarker} /><View style={styles.cardCopy}><Text style={styles.historyTitle}>{request.customerName} · {request.serviceName}</Text><Text style={styles.subtitle}>{formatDate(request.effectiveStartsAtUtc)}</Text></View><View style={styles.historyBadge}><Text style={styles.historyBadgeText}>{statusLabel(request)}</Text></View></View>)}
        </ScrollView>
        <View style={styles.navWrap}><MobileBottomNav active="requests" /></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},shell:{flex:1},content:{width:'100%',maxWidth:780,alignSelf:'center',padding:spacing.xl,paddingBottom:spacing.xl,gap:spacing.md},topbar:{minHeight:66,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md,marginBottom:spacing.sm},
  liveBadge:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:6,borderRadius:radius.pill,backgroundColor:colors.successSoft,borderWidth:1,borderColor:'rgba(84,214,138,.22)'},liveBadgeOffline:{backgroundColor:'rgba(255,178,74,.10)',borderColor:'rgba(255,178,74,.24)'},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},liveDotOffline:{backgroundColor:colors.warning},liveText:{color:colors.success,fontSize:9,fontWeight:'900',letterSpacing:1},liveTextOffline:{color:colors.warning},
  headerCopy:{gap:6,marginBottom:spacing.sm},eyebrow:{...typography.eyebrow,color:colors.primaryGlow},title:{...typography.title,color:colors.text},subtitle:{...typography.body,color:colors.textMuted},summaryRow:{flexDirection:'row',gap:spacing.sm,marginBottom:spacing.sm},summaryCard:{flex:1,minHeight:88,justifyContent:'center',gap:4,paddingHorizontal:spacing.md,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:'rgba(10,18,33,.84)'},summaryValue:{color:colors.text,fontSize:26,fontWeight:'900'},summaryLabel:{color:colors.textSubtle,fontSize:11,fontWeight:'800'},
  realtimeNotice:{padding:spacing.md,borderRadius:radius.md,borderWidth:1,borderColor:'rgba(255,178,74,.22)',backgroundColor:'rgba(255,178,74,.08)',gap:4},realtimeNoticeTitle:{color:colors.warning,fontWeight:'900',fontSize:13},realtimeNoticeText:{color:colors.textMuted,fontSize:12,lineHeight:18},
  empty:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},emptyIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.successSoft,borderWidth:1,borderColor:'rgba(84,214,138,.24)'},emptyIconText:{color:colors.success,fontWeight:'900',fontSize:18},emptyCopy:{flex:1,gap:3},emptyTitle:{fontSize:18,fontWeight:'900',color:colors.text},
  card:{position:'relative',overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:spacing.md},cardAccent:{position:'absolute',left:0,top:18,bottom:18,width:3,borderRadius:3,backgroundColor:colors.primary},cardTop:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},cardCopy:{flex:1},customer:{fontSize:20,fontWeight:'900',color:colors.text,letterSpacing:-.3},service:{marginTop:4,color:colors.textMuted,fontWeight:'700'},badge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong,paddingHorizontal:10,paddingVertical:6,borderRadius:radius.pill},badgeDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.primaryGlow},badgeText:{color:colors.primaryGlow,fontSize:11,fontWeight:'900'},timeRow:{flexDirection:'row',alignItems:'center',gap:8},timeIcon:{color:colors.primaryGlow,fontSize:16,fontWeight:'900'},time:{color:colors.text,fontSize:16,fontWeight:'900'},notes:{color:colors.textSubtle,fontStyle:'italic',lineHeight:20},counter:{color:colors.warning,fontWeight:'700'},actions:{flexDirection:'row',gap:10},primary:{flex:1,minHeight:48,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},primaryPressed:{backgroundColor:colors.primaryPressed},primaryText:{color:colors.white,fontWeight:'900'},danger:{flex:1,minHeight:48,borderRadius:radius.md,borderWidth:1,borderColor:'rgba(255,122,122,.36)',backgroundColor:colors.dangerSoft,alignItems:'center',justifyContent:'center'},dangerPressed:{backgroundColor:'rgba(255,90,90,.16)'},dangerText:{color:colors.danger,fontWeight:'900'},counterActions:{flexDirection:'row',gap:8},counterButton:{flex:1,minHeight:42,borderRadius:radius.sm,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceStrong,alignItems:'center',justifyContent:'center'},counterButtonPressed:{borderColor:colors.borderStrong,backgroundColor:colors.primarySoft},counterButtonText:{color:colors.textMuted,fontSize:12,fontWeight:'800'},sectionHeading:{gap:3,marginTop:spacing.sm},sectionEyebrow:{...typography.eyebrow,color:colors.primaryGlow},sectionTitle:{...typography.sectionTitle,color:colors.text},historyCard:{flexDirection:'row',alignItems:'center',gap:10,padding:spacing.md,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},historyMarker:{width:4,height:34,borderRadius:2,backgroundColor:colors.borderStrong},historyTitle:{color:colors.text,fontWeight:'800'},historyBadge:{paddingHorizontal:9,paddingVertical:5,borderRadius:radius.pill,backgroundColor:colors.surfaceStrong},historyBadgeText:{color:colors.textSubtle,fontSize:10,fontWeight:'900'},errorBox:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.dangerSoft,borderWidth:1,borderColor:'rgba(255,122,122,.22)'},error:{color:colors.danger,fontWeight:'800'},disabled:{opacity:.55},navWrap:{width:'100%',maxWidth:780,alignSelf:'center'}
});