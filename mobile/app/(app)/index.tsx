import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { PushOptInCard } from '@/notifications/PushOptInCard';
import { usePushNotifications } from '@/notifications/PushNotificationsProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const push = usePushNotifications();
  const role = session?.user.role;
  const roleLabel = role ? t(`mobile.role.${role}`) : '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundDecor}>
        <View style={styles.glow} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <BrandLogo compact />

          <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
            <Text style={styles.logoutText}>{t('home.signOut')}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('mobile.homeEyebrow')}</Text>
          <Text style={styles.title}>{t('home.hello', { name: session?.user.name ?? t('home.team') })}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
          <Text style={styles.body}>{t('home.body')}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/turn-requests')}
          style={({ pressed }) => [styles.primaryCard, pressed && styles.primaryCardPressed]}
        >
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>↻</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{t('home.requests')}</Text>
          <Text style={styles.cardText}>{t('home.requestsText')}</Text>
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>{t('home.requests')}</Text>
            <Text style={styles.cardArrow}>→</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>BARBERTRIX</Text>
          <Text style={styles.sectionTitle}>{t('home.pushTitle')}</Text>
        </View>

        <PushOptInCard
          status={push.status}
          message={push.message}
          title={t('home.pushTitle')}
          body={t('home.pushBody')}
          onEnable={() => push.enableForStaff()}
        />

        <View style={styles.footerCard}>
          <View style={styles.footerLine} />
          <Text style={styles.footerBrand}>BarberTrix</Text>
          <Text style={styles.footerText}>Mobile workspace</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backgroundDecor: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -250,
    right: -190,
    backgroundColor: 'rgba(22, 135, 255, 0.12)',
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    gap: spacing.xl,
  },
  topbar: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  logout: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  logoutPressed: { backgroundColor: colors.surfaceSoft },
  logoutText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  hero: { gap: spacing.sm, paddingTop: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  roleText: { color: colors.primaryGlow, fontSize: 11, fontWeight: '900' },
  body: { ...typography.body, color: colors.textMuted, maxWidth: 620 },
  primaryCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.xl,
    minHeight: 236,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  primaryCardPressed: { transform: [{ scale: 0.995 }], backgroundColor: colors.surfaceStrong },
  cardGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    top: -110,
    right: -70,
    backgroundColor: 'rgba(22, 135, 255, 0.12)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cardIconText: { color: colors.primaryGlow, fontSize: 24, fontWeight: '900' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(84, 214, 138, 0.22)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { marginTop: spacing.xl, color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  cardText: { marginTop: 7, color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 540 },
  cardAction: { marginTop: 'auto', paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActionText: { color: colors.primaryGlow, fontSize: 13, fontWeight: '900' },
  cardArrow: { color: colors.primaryGlow, fontSize: 24, fontWeight: '600' },
  sectionHeader: { marginTop: spacing.sm },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textSubtle },
  sectionTitle: { marginTop: 4, ...typography.sectionTitle, color: colors.text },
  footerCard: { alignItems: 'center', gap: 5, paddingTop: spacing.lg },
  footerLine: { width: 48, height: 2, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 4 },
  footerBrand: { color: colors.textMuted, fontWeight: '900', fontSize: 12 },
  footerText: { color: colors.textSubtle, fontSize: 10, letterSpacing: 1 },
});
