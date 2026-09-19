import { useAuth } from '@/auth/AuthProvider';
import { rememberRequest } from '@/turnRequests/recentRequests';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n/I18nProvider';
import { createPublicTurnRequest, getAvailability, getPublicShop } from '@/turnRequests/turnRequestApi';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

function localDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateFromValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

export default function RequestTurnScreen() {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const { slug: slugParam, serviceId: initialService, barberId: initialBarber } = useLocalSearchParams<{ slug: string; serviceId?: string; barberId?: string }>();
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const [serviceId, setServiceId] = useState(initialService ?? '');
  const [barberId, setBarberId] = useState(initialBarber ?? '');
  const [date, setDate] = useState(localDate(1));
  const [startsAt, setStartsAt] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const slotFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
    [locale],
  );
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
    [locale],
  );

  const shopQuery = useQuery({
    queryKey: ['public-shop', slug],
    queryFn: () => getPublicShop(slug!),
    enabled: Boolean(slug),
  });

  const shop = shopQuery.data;
  const activeServices = useMemo(() => shop?.services.filter(x => x.isActive) ?? [], [shop]);
  const activeBarbers = useMemo(() => shop?.barbers.filter(x => x.isActive) ?? [], [shop]);

  const availabilityQuery = useQuery({
    queryKey: ['availability', slug, serviceId, date, barberId],
    queryFn: () => getAvailability(slug!, serviceId, date, barberId),
    enabled: Boolean(slug && serviceId && barberId),
  });

  const createMutation = useMutation({
    mutationFn: () => createPublicTurnRequest(slug!, {
      serviceId,
      barberId,
      requestedStartsAt: startsAt,
      customerName: name.trim(),
      customerPhone: phone.trim() || undefined,
      customerEmail: email.trim() || undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: async response => {
      await publicRequestStore.save(response.request.id, response.lookupToken);
      if (session && slug) await rememberRequest(session.user.id, { id: response.request.id, slug, serviceId: response.request.serviceId, barberId: response.request.barberId });
      router.replace({ pathname: '/request-status/[slug]/[requestId]', params: { slug: slug!, requestId: response.request.id } });
    },
  });

  if (!slug) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <Text style={styles.stateTitle}>{t('publicRequest.invalidLink')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (shopQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <ActivityIndicator color={colors.primaryGlow} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (shopQuery.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <Text style={styles.stateTitle}>{t('publicRequest.loadError')}</Text>
          <Pressable accessibilityRole="button" onPress={() => shopQuery.refetch()} style={({ pressed }) => [styles.retry, pressed && styles.secondaryPressed]}>
            <Text style={styles.retryText}>{t('publicRequest.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.safe}>
        <BrandedBackground />
        <View style={styles.centerState}>
          <BrandLogo />
          <Text style={styles.stateTitle}>{t('publicRequest.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = Boolean(serviceId && barberId && startsAt && name.trim()) && !createMutation.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <BrandLogo />
          <View style={styles.shopBadge}>
            <View style={styles.shopDot} />
            <Text style={styles.shopBadgeText}>@{shop.slug}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>BARBERTRIX</Text>
          <Text style={styles.title}>{t('publicRequest.title', { shop: shop.name })}</Text>
          <Text style={styles.subtitle}>{t('publicRequest.subtitle')}</Text>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.sectionTitle}>{t('publicRequest.serviceStep')}</Text>
          </View>
          <View style={styles.wrap}>
            {activeServices.map(service => {
              const selected = serviceId === service.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={service.id}
                  onPress={() => { setServiceId(service.id); setStartsAt(''); }}
                  style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.choicePressed]}
                >
                  <View style={styles.choiceTopLine}>
                    <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{service.name}</Text>
                    {selected ? <Text style={styles.selectedGlyph}>✓</Text> : null}
                  </View>
                  <Text style={styles.choiceMeta}>{t('publicRequest.duration', { minutes: service.estimatedDurationMinutes })} · {service.price}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.sectionTitle}>{t('publicRequest.barberStep')}</Text>
          </View>
          <View style={styles.wrap}>
            {activeBarbers.map(barber => {
              const selected = barberId === barber.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={barber.id}
                  onPress={() => { setBarberId(barber.id); setStartsAt(''); }}
                  style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.choicePressed]}
                >
                  <View style={styles.choiceTopLine}>
                    <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{barber.name}</Text>
                    {selected ? <Text style={styles.selectedGlyph}>✓</Text> : null}
                  </View>
                  <Text style={styles.choiceMeta}>{t('publicRequest.chair', { chair: barber.chairNumber })}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.sectionTitle}>{t('publicRequest.dayStep')}</Text>
          </View>
          <View style={styles.row}>
            {[1, 2, 3].map(offset => {
              const value = localDate(offset);
              const selected = date === value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={value}
                  onPress={() => { setDate(value); setStartsAt(''); }}
                  style={({ pressed }) => [styles.day, selected && styles.choiceSelected, pressed && styles.choicePressed]}
                >
                  <Text style={[styles.dayText, selected && styles.choiceTitleSelected]}>{dayFormatter.format(localDateFromValue(value))}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
            <Text style={styles.sectionTitle}>{t('publicRequest.timeStep')}</Text>
          </View>

          {availabilityQuery.isFetching ? <ActivityIndicator color={colors.primaryGlow} /> : null}

          <View style={styles.wrap}>
            {(availabilityQuery.data ?? []).map(slot => {
              const selected = startsAt === slot.startsAtUtc;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={slot.startsAtUtc}
                  onPress={() => setStartsAt(slot.startsAtUtc)}
                  style={({ pressed }) => [styles.slot, selected && styles.choiceSelected, pressed && styles.choicePressed]}
                >
                  <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{slotFormatter.format(new Date(slot.startsAtUtc))}</Text>
                </Pressable>
              );
            })}
          </View>

          {availabilityQuery.isError ? (
            <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{t('publicRequest.availabilityError')}</Text></View>
          ) : null}

          {serviceId && barberId && !availabilityQuery.isFetching && availabilityQuery.data?.length === 0 ? (
            <View style={styles.noticeBox}><Text style={styles.notice}>{t('publicRequest.noSlots')}</Text></View>
          ) : null}
        </View>

        <View style={styles.flowCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
            <Text style={styles.sectionTitle}>{t('publicRequest.dataStep')}</Text>
          </View>

          <View style={styles.formStack}>
            <TextInput accessibilityLabel={t('publicRequest.name')} value={name} onChangeText={setName} placeholder={t('publicRequest.name')} placeholderTextColor={colors.textSubtle} style={styles.input} autoCapitalize="words" />
            <TextInput accessibilityLabel={t('publicRequest.phone')} value={phone} onChangeText={setPhone} placeholder={t('publicRequest.phone')} placeholderTextColor={colors.textSubtle} style={styles.input} keyboardType="phone-pad" />
            <TextInput accessibilityLabel={t('publicRequest.email')} value={email} onChangeText={setEmail} placeholder={t('publicRequest.email')} placeholderTextColor={colors.textSubtle} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput accessibilityLabel={t('publicRequest.notes')} value={notes} onChangeText={setNotes} placeholder={t('publicRequest.notes')} placeholderTextColor={colors.textSubtle} style={[styles.input, styles.multiline]} multiline maxLength={500} />
          </View>
        </View>

        {createMutation.error ? (
          <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{t('publicRequest.sendError')}</Text></View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={() => createMutation.mutate()}
          style={({ pressed }) => [styles.submit, !canSubmit && styles.disabled, pressed && canSubmit && styles.submitPressed]}
        >
          <Text style={styles.submitText}>{createMutation.isPending ? t('publicRequest.sending') : t('publicRequest.submit')}</Text>
          <Text style={styles.submitArrow}>→</Text>
        </Pressable>

        <Text style={styles.footer}>BarberTrix · {shop.name}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centerState: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  stateTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  content: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    padding: spacing.xl,
    paddingBottom: 60,
    gap: spacing.lg,
  },
  brandHeader: { alignItems: 'center', gap: spacing.sm },
  shopBadge: {
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
  shopDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  shopBadgeText: { color: colors.primaryGlow, fontSize: 11, fontWeight: '900' },
  hero: { alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text, textAlign: 'center', maxWidth: 760 },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 680 },
  flowCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 18, 33, 0.92)',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepNumberText: { color: colors.primaryGlow, fontSize: 12, fontWeight: '900' },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 180,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choicePressed: { opacity: 0.78 },
  choiceTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  choiceTitle: { fontWeight: '900', color: colors.text },
  choiceTitleSelected: { color: colors.primaryGlow },
  choiceMeta: { marginTop: 5, color: colors.textSubtle, fontSize: 12 },
  selectedGlyph: { color: colors.success, fontSize: 14, fontWeight: '900' },
  day: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  dayText: { color: colors.textMuted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  slot: {
    minWidth: 118,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  formStack: { gap: spacing.sm },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: '#08111F',
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 104, paddingTop: 14, textAlignVertical: 'top' },
  noticeBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 74, 0.20)',
    backgroundColor: 'rgba(255, 178, 74, 0.08)',
  },
  notice: { color: colors.warning, lineHeight: 20 },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.22)',
  },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
  retry: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.primaryGlow, fontWeight: '900' },
  secondaryPressed: { opacity: 0.75 },
  submit: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  submitPressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.45 },
  submitText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  submitArrow: { position: 'absolute', right: 20, color: colors.white, fontSize: 22, fontWeight: '700' },
  footer: { color: colors.textSubtle, textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
});
