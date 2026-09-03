import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { PushOptInCard } from '@/notifications/PushOptInCard';
import { usePushNotifications } from '@/notifications/PushNotificationsProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';
import { MobileBottomNav } from '@/ui/MobileBottomNav';

export default function HomeScreen() {
  const { session, signOut } = useAuth(); const { t } = useI18n(); const push = usePushNotifications();
  const role = session?.user.role; const roleLabel = role ? t(`mobile.role.${role}`) : '';
  const canManageTeam = role === 'Owner' || role === 'Administrator';
  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><View style={styles.shell}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><BrandLogo compact /><Pressable accessibilityRole="button" onPress={signOut} style={styles.logout}><Text style={styles.logoutText}>{t('home.signOut')}</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>BARBERTRIX MOBILE</Text><Text style={styles.title}>{t('home.hello', { name: session?.user.name ?? t('home.team') })}</Text><View style={styles.roleBadge}><View style={styles.roleDot}/><Text style={styles.roleText}>{roleLabel}</Text></View><Text style={styles.body}>{t('home.body')}</Text></View>
    <View style={styles.metricsRow}><View style={styles.metricCard}><Text style={styles.metricValue}>LIVE</Text><Text style={styles.metricLabel}>{t('home.requests')}</Text></View><View style={styles.metricCard}><Text style={styles.metricValue}>{roleLabel || '—'}</Text><Text style={styles.metricLabel}>BarberTrix</Text></View></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/turn-requests')} style={styles.primaryCard}><Text style={styles.cardKicker}>OPERACIÓN EN VIVO</Text><Text style={styles.cardTitle}>{t('home.requests')}</Text><Text style={styles.cardText}>{t('home.requestsText')}</Text><Text style={styles.cardActionText}>{t('home.requests')}  →</Text></Pressable>
    {canManageTeam && <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/team')} style={styles.teamCard}><Text style={styles.cardKicker}>EQUIPO</Text><Text style={styles.cardTitle}>Empleados y vinculaciones</Text><Text style={styles.cardText}>Invita personal, aprueba solicitudes de barberos independientes y administra miembros activos.</Text><Text style={styles.cardActionText}>Administrar equipo  →</Text></Pressable>}
    {role === 'Owner' && <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/marketplace-profile')} style={styles.marketplaceCard}><Text style={styles.cardKicker}>MARKETPLACE</Text><Text style={styles.cardTitle}>Perfil público de tu barbería</Text><Text style={styles.cardText}>Completa tu ficha comercial y decide cuándo aparecer en BarberTrix Discovery.</Text><Text style={styles.marketplaceAction}>Administrar publicación  →</Text></Pressable>}
    <View style={styles.sectionHeader}><Text style={styles.sectionEyebrow}>BARBERTRIX</Text><Text style={styles.sectionTitle}>{t('home.pushTitle')}</Text></View>
    <PushOptInCard status={push.status} message={push.message} title={t('home.pushTitle')} body={t('home.pushBody')} onEnable={() => push.enableForStaff()} />
    <View style={styles.footerCard}><View style={styles.footerLine}/><Text style={styles.footerBrand}>BarberTrix</Text><Text style={styles.footerText}>Mobile workspace</Text></View>
  </ScrollView><View style={styles.navWrap}><MobileBottomNav active="home" /></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},shell:{flex:1},content:{width:'100%',maxWidth:760,alignSelf:'center',paddingHorizontal:spacing.xl,paddingTop:spacing.lg,paddingBottom:spacing.xl,gap:spacing.xl},topbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},logout:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:9},logoutText:{color:colors.textMuted,fontWeight:'700'},hero:{gap:10},eyebrow:{color:colors.primaryGlow,fontSize:12,fontWeight:'900',letterSpacing:2},title:{color:colors.text,fontSize:30,fontWeight:'900'},body:{color:colors.textMuted,lineHeight:21},roleBadge:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:10,paddingVertical:6,borderRadius:99,backgroundColor:colors.surface},roleDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.primaryGlow},roleText:{color:colors.text,fontWeight:'700'},metricsRow:{flexDirection:'row',gap:12},metricCard:{flex:1,padding:16,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},metricValue:{color:colors.text,fontSize:17,fontWeight:'900'},metricLabel:{color:colors.textMuted,marginTop:4},primaryCard:{padding:spacing.xl,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:8},teamCard:{padding:spacing.xl,borderRadius:radius.lg,backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.borderStrong,gap:8},marketplaceCard:{padding:spacing.xl,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primaryGlow,gap:8},cardKicker:{color:colors.primaryGlow,fontSize:11,fontWeight:'900',letterSpacing:1.5},cardTitle:{color:colors.text,fontSize:21,fontWeight:'900'},cardText:{color:colors.textMuted,lineHeight:20},cardActionText:{color:colors.primaryGlow,fontWeight:'800',marginTop:5},marketplaceAction:{color:colors.primaryGlow,fontWeight:'900',marginTop:5},sectionHeader:{gap:4},sectionEyebrow:{color:colors.primaryGlow,fontSize:11,fontWeight:'900',letterSpacing:1.5},sectionTitle:{color:colors.text,fontSize:20,fontWeight:'900'},footerCard:{alignItems:'center',gap:6,paddingVertical:20},footerLine:{width:40,height:2,backgroundColor:colors.border},footerBrand:{color:colors.text,fontWeight:'900'},footerText:{color:colors.textMuted},navWrap:{width:'100%',maxWidth:760,alignSelf:'center'}
});
