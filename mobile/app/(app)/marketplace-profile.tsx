import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { mapMobileError } from '@/api/errorPolicy';
import { useI18n } from '@/i18n/I18nProvider';
import * as Location from 'expo-location';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { env } from '@/config/env';
import {
  getPublicShopProfile,
  setShopPublication,
  updatePublicShopProfile,
  uploadShopMedia,
  type PublicShopProfile,
} from '@/discovery/publicShopProfileApi';
import { ShopLocationMap, type GeoCoordinate } from '@/discovery/ShopLocationMap';
import { colors, radius, spacing } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

const emptyProfile: PublicShopProfile = {
  description: null,
  publicPhone: null,
  whatsAppPhone: null,
  logoUrl: null,
  coverImageUrl: null,
  location: {
    address: null,
    city: null,
    neighborhood: null,
    reference: null,
    latitude: null,
    longitude: null,
  },
  acceptsWalkIns: true,
  acceptsAppointments: true,
  isPublished: false,
  publishedAtUtc: null,
  publicationIssues: [],
};

export default function MarketplaceProfileScreen() {
  const { session } = useAuth();
  const { t } = useI18n();
  const showError = (error: unknown) => Alert.alert(t('errors.unexpected'), t(mapMobileError(error).key));
  const [profile, setProfile] = useState<PublicShopProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<'logo' | 'cover' | null>(null);
  const token = session?.accessToken;

  useEffect(() => {
    if (!token) return;
    getPublicShopProfile(token).then(setProfile).catch(showError).finally(() => setLoading(false));
  }, [token]);

  const patch = <K extends keyof PublicShopProfile>(key: K, value: PublicShopProfile[K]) =>
    setProfile(current => ({ ...current, [key]: value }));

  const patchLocation = <K extends keyof PublicShopProfile['location']>(
    key: K,
    value: PublicShopProfile['location'][K],
  ) => setProfile(current => ({ ...current, location: { ...current.location, [key]: value } }));

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const result = await updatePublicShopProfile(token, {
        description: profile.description,
        publicPhone: profile.publicPhone,
        whatsAppPhone: profile.whatsAppPhone,
        logoUrl: profile.logoUrl,
        coverImageUrl: profile.coverImageUrl,
        address: profile.location.address,
        city: profile.location.city,
        neighborhood: profile.location.neighborhood,
        reference: profile.location.reference,
        latitude: profile.location.latitude,
        longitude: profile.location.longitude,
        acceptsWalkIns: profile.acceptsWalkIns,
        acceptsAppointments: profile.acceptsAppointments,
      });
      setProfile(result);
      Alert.alert(t('marketplace.saved'), t('marketplace.savedBody'));
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  async function pickMedia(kind: 'logo' | 'cover') {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('marketplace.permission'), t('marketplace.permissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'logo' ? [1, 1] : [16, 9],
      quality: 0.85,
      base64: false,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert(t('marketplace.failed'), t('marketplace.readFailed'));
      return;
    }

    setMediaBusy(kind);
    try {
      // Reject oversized inputs before allocating a base64 string or making HTTP calls.
      const maxBytes = (kind === 'logo' ? 2 : 5) * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxBytes) throw new MobileApiError('', 400, 'MEDIA_TOO_LARGE');
      const maxDimension = kind === 'logo' ? 768 : 1600;
      const resize = Math.max(asset.width, asset.height) > maxDimension
        ? [{ resize: asset.width >= asset.height ? { width: maxDimension } : { height: maxDimension } }] : [];
      // Native decode + JPEG output handles iPhone HEIC without lying about its MIME.
      const normalized = await manipulateAsync(asset.uri, resize, { compress: 0.82, format: SaveFormat.JPEG, base64: true });
      if (!normalized.base64) throw new MobileApiError('', 400, 'MEDIA_EMPTY');
      if (normalized.base64.length * 3 / 4 > maxBytes) throw new MobileApiError('', 400, 'MEDIA_TOO_LARGE');
      const upload = await uploadShopMedia(token, kind, `${kind}.jpg`, 'image/jpeg', normalized.base64);
      patch(kind === 'logo' ? 'logoUrl' : 'coverImageUrl', upload.url);
    } catch (error) {
      showError(error);
    } finally {
      setMediaBusy(null);
    }
  }

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('marketplace.locationDenied'), t('marketplace.locationPermission'));
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      updateCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const reverse = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const place = reverse[0];
      if (place) {
        if (!profile.location.address) {
          patchLocation('address', [place.street, place.streetNumber].filter(Boolean).join(' ') || place.formattedAddress || null);
        }
        if (!profile.location.city) patchLocation('city', place.city ?? place.subregion ?? null);
        if (!profile.location.neighborhood) patchLocation('neighborhood', place.district ?? null);
      }
    } catch {
      Alert.alert(t('marketplace.locationFailed'), t('marketplace.locationHelp'));
    }
  }

  function updateCoordinates(coordinate: GeoCoordinate) {
    setProfile(current => ({
      ...current,
      location: { ...current.location, latitude: coordinate.latitude, longitude: coordinate.longitude },
    }));
  }

  async function togglePublication() {
    if (!token) return;
    setSaving(true);
    try {
      setProfile(await setShopPublication(token, !profile.isPublished));
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  if (session?.user.role !== 'Owner') {
    return <SafeAreaView style={styles.safe}><Text style={styles.denied}>{t('marketplace.denied')}</Text></SafeAreaView>;
  }

  if (loading) {
    return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;
  }

  const logoUri = resolveMediaUrl(profile.logoUrl);
  const coverUri = resolveMediaUrl(profile.coverImageUrl);

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={styles.back}>{t('marketplace.back')}</Text></Pressable>

        <View>
          <Text style={styles.eyebrow}>{t('marketplace.title')}</Text>
          <Text style={styles.title}>{t('marketplace.title')}</Text>
          <Text style={styles.body}>{t('marketplace.body')}</Text>
        </View>

        <View style={[styles.statusCard, profile.isPublished && styles.statusLive]}>
          <Text style={styles.statusTitle}>{profile.isPublished ? t('marketplace.published') : t('marketplace.unpublished')}</Text>
          <Text style={styles.statusText}>{profile.isPublished ? t('marketplace.publicBody') : t('marketplace.privateBody')}</Text>
        </View>

        {profile.publicationIssues.length > 0 && (
          <View style={styles.checklist}>
            <Text style={styles.sectionTitle}>{t('marketplace.checklist')}</Text>
            {profile.publicationIssues.map(issue => <Text key={issue} style={styles.issue}>• {t(publicationIssueKey(issue))}</Text>)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>{t('marketplace.information')}</Text>
          <Field label={t('marketplace.description')} multiline value={profile.description ?? ''} onChangeText={value => patch('description', value)} placeholder={t('marketplace.descriptionHint')} />
          <Field label={t('marketplace.phone')} value={profile.publicPhone ?? ''} onChangeText={value => patch('publicPhone', value)} placeholder="+1 809..." />
          <Field label="WhatsApp" value={profile.whatsAppPhone ?? ''} onChangeText={value => patch('whatsAppPhone', value)} placeholder="+1 809..." />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>{t('marketplace.images')}</Text>
          <MediaPicker label={t('marketplace.logo')} uri={logoUri} kind="logo" busy={mediaBusy === 'logo'} onPress={() => pickMedia('logo')} />
          <MediaPicker label={t('marketplace.cover')} uri={coverUri} kind="cover" busy={mediaBusy === 'cover'} onPress={() => pickMedia('cover')} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>{t('marketplace.location')}</Text>
          <Field label={t('marketplace.address')} value={profile.location.address ?? ''} onChangeText={value => patchLocation('address', value)} placeholder={t('common.addressExample')} />
          <View style={styles.row}>
            <View style={styles.flex}><Field label={t('marketplace.city')} value={profile.location.city ?? ''} onChangeText={value => patchLocation('city', value)} placeholder={t('common.cityExample')} /></View>
            <View style={styles.flex}><Field label={t('marketplace.neighborhood')} value={profile.location.neighborhood ?? ''} onChangeText={value => patchLocation('neighborhood', value)} placeholder={t('common.districtExample')} /></View>
          </View>
          <Field label={t('marketplace.reference')} value={profile.location.reference ?? ''} onChangeText={value => patchLocation('reference', value)} placeholder={t('marketplace.referenceHint')} />
          <Pressable onPress={useCurrentLocation} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}><Text style={styles.locationButtonText}>{t('marketplace.locate')}</Text></Pressable>
          <Text style={styles.mapHelp}>{t('marketplace.mapHint')}</Text>
          <ShopLocationMap latitude={profile.location.latitude} longitude={profile.location.longitude} onChange={updateCoordinates} />
        </View>

        <View style={styles.form}>
          <Toggle label={t('marketplace.walkIns')} value={profile.acceptsWalkIns} onValueChange={value => patch('acceptsWalkIns', value)} />
          <Toggle label={t('marketplace.appointments')} value={profile.acceptsAppointments} onValueChange={value => patch('acceptsAppointments', value)} />
        </View>

        <Pressable disabled={saving || !!mediaBusy} onPress={save} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (saving || !!mediaBusy) && styles.disabled]}><Text style={styles.primaryText}>{saving ? t('marketplace.saving') : t('marketplace.save')}</Text></Pressable>
        <Pressable disabled={saving} onPress={togglePublication} style={({ pressed }) => [styles.publish, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.publishText}>{profile.isPublished ? t('marketplace.unpublish') : t('marketplace.publish')}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MediaPicker({ label, uri, kind, busy, onPress }: { label: string; uri: string | null; kind: 'logo' | 'cover'; busy: boolean; onPress(): void }) {
  const { t } = useI18n();
  return (
    <View style={styles.mediaBlock}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={({ pressed }) => [styles.mediaPicker, kind === 'cover' && styles.coverPicker, pressed && styles.pressed]}>
        {uri ? <Image source={{ uri }} resizeMode="cover" style={[styles.mediaImage, kind === 'cover' && styles.coverImage]} /> : <Text style={styles.mediaPlaceholder}>{t('marketplace.select')}</Text>}
        <Text style={styles.mediaAction}>{busy ? t('marketplace.uploading') : uri ? t('marketplace.changeImage') : t('marketplace.photos')}</Text>
      </Pressable>
      <Text style={styles.mediaHint}>{kind === 'logo' ? t('marketplace.logoLimit') : t('marketplace.coverLimit')}</Text>
    </View>
  );
}

function Field(props: { label: string; value: string; placeholder: string; multiline?: boolean; onChangeText(value: string): void }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput accessibilityLabel={props.label} value={props.value} placeholder={props.placeholder} multiline={props.multiline} onChangeText={props.onChangeText} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={colors.textMuted} /></View>;
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange(value: boolean): void }) {
  return <View style={styles.toggle}><Text style={styles.label}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} /></View>;
}


function resolveMediaUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${env.apiBaseUrl}${url}` : url;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 },
  denied: { color: colors.text, padding: spacing.xl },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.xl, paddingBottom: 56, gap: spacing.xl },
  back: { color: colors.primaryGlow, fontWeight: '700' },
  eyebrow: { color: colors.primaryGlow, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 6 },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  statusCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statusLive: { borderColor: colors.primaryGlow },
  statusTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statusText: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  checklist: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  issue: { color: colors.textMuted, lineHeight: 20 },
  section: { gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionEyebrow: { color: colors.primaryGlow, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },
  form: { gap: spacing.lg },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: { color: colors.text, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md },
  mediaBlock: { gap: 8 },
  mediaPicker: { minHeight: 190, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 8 },
  coverPicker: { minHeight: 180 },
  mediaImage: { width: 128, height: 128, borderRadius: radius.md },
  coverImage: { width: '100%', height: 180, borderRadius: 0 },
  mediaPlaceholder: { color: colors.textMuted, fontWeight: '800' },
  mediaAction: { color: colors.primaryGlow, fontWeight: '900' },
  mediaHint: { color: colors.textMuted, fontSize: 12 },
  locationButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong },
  locationButtonText: { color: colors.primaryGlow, fontWeight: '900' },
  mapHelp: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  primary: { backgroundColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  primaryText: { color: colors.background, fontWeight: '900', fontSize: 16 },
  publish: { borderWidth: 1, borderColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  publishText: { color: colors.primaryGlow, fontWeight: '900', fontSize: 16 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});

function publicationIssueKey(issue: string): string {
  const keys: Record<string, string> = {
    'barbershop is inactive': 'marketplace.issueInactive',
    'add an active location with an address': 'marketplace.issueAddress',
    'confirm the location on the map': 'marketplace.issueMap',
    'add at least one active service': 'marketplace.issueService',
    'add at least one active barber': 'marketplace.issueBarber',
  };
  return keys[issue] ?? 'marketplace.issueUnknown';
}
