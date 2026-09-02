import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n/I18nProvider';
import { createPublicTurnRequest, getAvailability, getPublicShop } from '@/turnRequests/turnRequestApi';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';

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
  const { slug: slugParam } = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
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
      router.replace({ pathname: '/request-status/[slug]/[requestId]', params: { slug: slug!, requestId: response.request.id } });
    },
  });

  if (!slug) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text>{t('publicRequest.invalidLink')}</Text></View></SafeAreaView>;
  if (shopQuery.isLoading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>;
  if (shopQuery.isError) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text>{t('publicRequest.loadError')}</Text><Pressable accessibilityRole="button" onPress={() => shopQuery.refetch()} style={styles.retry}><Text style={styles.retryText}>{t('publicRequest.retry')}</Text></Pressable></View></SafeAreaView>;
  if (!shop) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text>{t('publicRequest.notFound')}</Text></View></SafeAreaView>;

  const canSubmit = Boolean(serviceId && barberId && startsAt && name.trim()) && !createMutation.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{t('publicRequest.eyebrow')}</Text>
        <Text style={styles.title}>{t('publicRequest.title', { shop: shop.name })}</Text>
        <Text style={styles.subtitle}>{t('publicRequest.subtitle')}</Text>

        <Text style={styles.sectionTitle}>{t('publicRequest.serviceStep')}</Text>
        <View style={styles.wrap}>
          {activeServices.map(service => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: serviceId === service.id }} key={service.id} onPress={() => { setServiceId(service.id); setStartsAt(''); }} style={[styles.choice, serviceId === service.id && styles.choiceSelected]}>
              <Text style={styles.choiceTitle}>{service.name}</Text>
              <Text style={styles.choiceMeta}>{t('publicRequest.duration', { minutes: service.estimatedDurationMinutes })} · {service.price}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('publicRequest.barberStep')}</Text>
        <View style={styles.wrap}>
          {activeBarbers.map(barber => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: barberId === barber.id }} key={barber.id} onPress={() => { setBarberId(barber.id); setStartsAt(''); }} style={[styles.choice, barberId === barber.id && styles.choiceSelected]}>
              <Text style={styles.choiceTitle}>{barber.name}</Text>
              <Text style={styles.choiceMeta}>{t('publicRequest.chair', { chair: barber.chairNumber })}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('publicRequest.dayStep')}</Text>
        <View style={styles.row}>
          {[1, 2, 3].map(offset => {
            const value = localDate(offset);
            return <Pressable accessibilityRole="button" accessibilityState={{ selected: date === value }} key={value} onPress={() => { setDate(value); setStartsAt(''); }} style={[styles.day, date === value && styles.choiceSelected]}><Text>{dayFormatter.format(localDateFromValue(value))}</Text></Pressable>;
          })}
        </View>

        <Text style={styles.sectionTitle}>{t('publicRequest.timeStep')}</Text>
        {availabilityQuery.isFetching ? <ActivityIndicator /> : null}
        <View style={styles.wrap}>
          {(availabilityQuery.data ?? []).map(slot => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: startsAt === slot.startsAtUtc }} key={slot.startsAtUtc} onPress={() => setStartsAt(slot.startsAtUtc)} style={[styles.slot, startsAt === slot.startsAtUtc && styles.choiceSelected]}>
              <Text style={styles.choiceTitle}>{slotFormatter.format(new Date(slot.startsAtUtc))}</Text>
            </Pressable>
          ))}
        </View>
        {availabilityQuery.isError ? <Text accessibilityRole="alert" style={styles.error}>{t('publicRequest.availabilityError')}</Text> : null}
        {serviceId && barberId && !availabilityQuery.isFetching && availabilityQuery.data?.length === 0 ? <Text style={styles.notice}>{t('publicRequest.noSlots')}</Text> : null}

        <Text style={styles.sectionTitle}>{t('publicRequest.dataStep')}</Text>
        <TextInput accessibilityLabel={t('publicRequest.name')} value={name} onChangeText={setName} placeholder={t('publicRequest.name')} style={styles.input} autoCapitalize="words" />
        <TextInput accessibilityLabel={t('publicRequest.phone')} value={phone} onChangeText={setPhone} placeholder={t('publicRequest.phone')} style={styles.input} keyboardType="phone-pad" />
        <TextInput accessibilityLabel={t('publicRequest.email')} value={email} onChangeText={setEmail} placeholder={t('publicRequest.email')} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput accessibilityLabel={t('publicRequest.notes')} value={notes} onChangeText={setNotes} placeholder={t('publicRequest.notes')} style={[styles.input, styles.multiline]} multiline maxLength={500} />

        {createMutation.error ? <Text accessibilityRole="alert" style={styles.error}>{t('publicRequest.sendError')}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSubmit }} disabled={!canSubmit} onPress={() => createMutation.mutate()} style={[styles.submit, !canSubmit && styles.disabled]}>
          <Text style={styles.submitText}>{createMutation.isPending ? t('publicRequest.sending') : t('publicRequest.submit')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 22, gap: 12, paddingBottom: 42 },
  eyebrow: { fontSize: 12, letterSpacing: 1.6, fontWeight: '900', color: '#686861' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#111' },
  subtitle: { fontSize: 16, lineHeight: 23, color: '#55554f', marginBottom: 10 },
  sectionTitle: { marginTop: 12, fontSize: 17, fontWeight: '900', color: '#111' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  choice: { minWidth: 130, flexGrow: 1, borderWidth: 1, borderColor: '#d7d7d0', backgroundColor: '#fff', padding: 14, borderRadius: 14 },
  choiceSelected: { borderColor: '#111', borderWidth: 2, backgroundColor: '#efefe9' },
  choiceTitle: { fontWeight: '800', color: '#111' },
  choiceMeta: { marginTop: 4, color: '#686861', fontSize: 13 },
  day: { flex: 1, borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  slot: { minWidth: 110, borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  notice: { color: '#686861' },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff' },
  multiline: { minHeight: 92, paddingTop: 14, textAlignVertical: 'top' },
  error: { color: '#a21414', fontWeight: '700' },
  retry: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#111', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  retryText: { color: '#111', fontWeight: '800' },
  submit: { minHeight: 54, borderRadius: 14, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
