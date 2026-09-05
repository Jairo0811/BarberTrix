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
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const push = usePushNotifications();
  const role = session?.user.role;
  const roleLabel = role ? t(`mobile.role.${role}`) : '';
  const canManageTeam = role === 'Owner' || role === 'Administrator';

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <BrandLogo compact />
            <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
              <Text style={styles.logoutText}>{t('home.signOut')}</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <Text style={styles.eyebrow}>BARBERTRIX MOBILE</Text>
            <Text style={styles.title}>{t('home.hello', { name: session?.user.name ?? t('home.team') })}</Text>
            <Text style={styles.body}>{t('home.body')}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>ACCESOS RÁPIDOS</Text>
            <Text style={styles.sectionTitle}>¿Qué quieres hacer?</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/turn-requests')} style={({ pressed }) => [styles.actionCard, styles.primaryCard, pressed && styles.pressed]}>
            <View style={[styles.actionIcon, styles.actionIconPrimary]}><Text style={styles.actionIconText}>↻</Text></View>
            <View style={styles.actionCopy}>
              <Text style={styles.cardKicker}>OPERACIÓN EN VIVO</Text>
              <Text style={styles.cardTitle}>{t('home.requests')}</Text>
              <Text style={styles.cardText}>{t('home.requestsText')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {canManageTeam && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/team')} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
              <View style={styles.actionIcon}><Text style={styles.actionIconText}>♟</Text></View>
              <View style={styles.actionCopy}>
                <Text style={styles.cardKicker}>EQUIPO</Text>
                <Text style={styles.cardTitle}>Empleados y vinculaciones</Text>
                <Text style={styles.cardText}>Invita, aprueba y administra tu equipo desde un solo lugar.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}

          {role === 'Owner' && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/marketplace-profile')} style={({ pressed }) => [styles.actionCard, styles.marketplaceCard, pressed && styles.pressed]}>
              <View style={[styles.actionIcon, styles.actionIconMarketplace]}><Text style={styles.actionIconText}>⌖</Text></View>
              <View style={styles.actionCopy}>
                <Text style={styles.cardKicker}>MARKETPLACE</Text>
                <Text style={styles.cardTitle}>Perfil público de tu barbería</Text>
                <Text style={styles.cardText}>Actualiza tu ficha y controla cuándo apareces en Discovery.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}

          <View style={styles.statusStrip}>
            <View style={styles.statusItem}>
              <View style={styles.statusDot} />
              <View>
                <Text style={styles.statusValue}>Listo</Text>
                <Text style={styles.statusLabel}>Sesión activa</Text>
              </View>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{roleLabel || '—'}</Text>
              <Text style={styles.statusLabel}>Perfil actual</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>NOTIFICACIONES</Text>
            <Text style={styles.sectionTitle}>{t('home.pushTitle')}</Text>
          </View>
          <PushOptInCard status={push.status} message={push.message} title={t('home.pushTitle')} body={t('home.pushBody')} onEnable={() => push.enableForStaff()} />

          <View style={styles.footerCard}>
            <View style={styles.footerLine} />
            <Text style={styles.footerBrand}>BarberTrix</Text>
            <Text style={styles.footerText}>Tu operación, contigo.</Text>
          </View>
        </ScrollView>

        <View style={styles.navWrap}><MobileBottomNav active="home" /></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  topbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logout: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(10,18,33,0.72)' },
  logoutText: { color: colors.textMuted, fontWeight: '800', fontSize: 12 },
  heroCard: { position: 'relative', overflow: 'hidden', gap: 10, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: 'rgba(9,18,34,0.92)', borderWidth: 1, borderColor: colors.borderStrong },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -70, top: -100, backgroundColor: colors.primarySoft },
  eyebrow: { color: colors.primaryGlow, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.6 },
  body: { color: colors.textMuted, lineHeight: 21, maxWidth: 560 },
  roleBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryGlow },
  roleText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  sectionHeader: { gap: 3, marginTop: 2 },
  sectionEyebrow: { color: colors.primaryGlow, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  actionCard: { minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  primaryCard: { borderColor: colors.borderStrong, backgroundColor: 'rgba(10, 27, 51, 0.94)' },
  marketplaceCard: { borderColor: colors.primaryGlow },
  actionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  actionIconPrimary: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  actionIconMarketplace: { backgroundColor: 'rgba(69, 150, 255, 0.12)', borderColor: colors.primaryGlow },
  actionIconText: { color: colors.primaryGlow, fontSize: 22, fontWeight: '900' },
  actionCopy: { flex: 1, gap: 4 },
  cardKicker: { color: colors.primaryGlow, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  cardTitle: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  cardText: { color: colors.textMuted, lineHeight: 19, fontSize: 13 },
  chevron: { color: colors.primaryGlow, fontSize: 30, fontWeight: '300', marginLeft: 4 },
  statusStrip: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(8,17,31,0.78)', borderWidth: 1, borderColor: colors.border },
  statusItem: { flex: 1, minHeight: 44, justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginBottom: 5 },
  statusValue: { color: colors.text, fontWeight: '900', fontSize: 14 },
  statusLabel: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  statusDivider: { width: 1, height: 38, backgroundColor: colors.border, marginHorizontal: spacing.md },
  footerCard: { alignItems: 'center', gap: 5, paddingVertical: 16 },
  footerLine: { width: 36, height: 2, backgroundColor: colors.border },
  footerBrand: { color: colors.text, fontWeight: '900' },
  footerText: { color: colors.textMuted, fontSize: 12 },
  navWrap: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
});
