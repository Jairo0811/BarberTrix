import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { env } from '@/config/env';
import { getPublicShopProfile, setShopPublication, updatePublicShopProfile, uploadShopMedia, type PublicShopProfile } from '@/discovery/publicShopProfileApi';
import { colors, radius, spacing } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

const emptyProfile: PublicShopProfile = {
  description: null,
  publicPhone: null,
  whatsAppPhone: null,
  logoUrl: null,
  coverImageUrl: null,
  location: { address: null, city: null, neighborhood: null, reference: null, latitude: null, longitude: null },
  acceptsWalkIns: true,
  acceptsAppointments: true,
  isPublished: false,
  publishedAtUtc: null,
  publicationIssues: [],
};

export default function MarketplaceProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<PublicShopProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<'logo' | 'cover' | null>(null);
  const token = session?.accessToken;

  useEffect(() => {
    if (!token) return;
    getPublicShopProfile(token).then(setProfile).catch(showError).finally(() => setLoading(false));
  }, [token]);

  const patch = <K extends keyof PublicShopProfile>(key: K, value: PublicShopProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
  const patchLocation = <K extends keyof PublicShopProfile['location']>(key: K, value: PublicShopProfile['location'][K]) =>
    setProfile(current => ({ ...current, location: { ...current.location, [key]: value } }));

  const mapRegion = useMemo(() => ({
    latitude: profile.location.latitude ?? 18.4861,
    longitude: profile.location.longitude ?? -69.9312,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }), [profile.location.latitude, profile.location.longitude]);

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
      Alert.alert('Perfil guardado', 'La información pública de tu barbería fue actualizada.');
    } catch (error) { showError(error); } finally { setSaving(false); }
  }

  async function pickMedia(kind: 'logo' | 'cover') {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'BarberTrix necesita acceso a tus fotos para seleccionar esta imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'logo' ? [1, 1] : [16, 9],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('No se pudo completar', 'No se pudo leer la imagen seleccionada.');
      return;
    }

    setMediaBusy(kind);
    try {
      const upload = await uploadShopMedia(
        token,
        kind,
        asset.fileName ?? `${kind}.jpg`,
        asset.mimeType ?? 'image/jpeg',
        asset.base64,
      );
      patch(kind === 'logo' ? 'logoUrl' : 'coverImageUrl', upload.url);
    } catch (error) { showError(error); } finally { setMediaBusy(null); }
  }

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Ubicación desactivada', 'Permite el acceso a la ubicación para colocar tu barbería en el mapa.');
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      patchLocation('latitude', current.coords.latitude);
      patchLocation('longitude', current.coords.longitude);
      const reverse = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const place = reverse[0];
      if (place) {
        if (!profile.location.address) patchLocation('address', [place.street, place.streetNumber].filter(Boolean).join(' ') || place.formattedAddress || null);
        if (!profile.location.city) patchLocation('city', place.city ?? place.subregion ?? null);
        if (!profile.location.neighborhood) patchLocation('neighborhood', place.district ?? null);
      }
    } catch {
      Alert.alert('No se pudo ubicar', 'No pudimos obtener tu ubicación actual. Puedes mover el marcador manualmente.');
    }
  }

  function moveMarker(event: MapPressEvent) {
    patchLocation('latitude', event.nativeEvent.coordinate.latitude);
    patchLocation('longitude', event.nativeEvent.coordinate.longitude);
  }

  async function togglePublication() {
    if (!token) return;
    setSaving(true);
    try { setProfile(await setShopPublication(token, !profile.isPublished)); }
    catch (error) { showError(error); } finally { setSaving(false); }
  }

  if (session?.user.role !== 'Owner') return <SafeAreaView style={styles.safe}><Text style={styles.denied}>Solo el propietario puede administrar la publicación de la barbería.</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;

  const logoUri = resolveMediaUrl(profile.logoUrl);
  const coverUri = resolveMediaUrl(profile.coverImageUrl);

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
        <View><Text style={styles.eyebrow}>MARKETPLACE</Text><Text style={styles.title}>Perfil público</Text><Text style={styles.body}>Configura cómo aparece tu barbería en BarberTrix Discovery.</Text></View>

        <View style={[styles.statusCard, profile.isPublished && styles.statusLive]}>
          <Text style={styles.statusTitle}>{profile.isPublished ? '● Publicada' : '○ No publicada'}</Text>
          <Text style={styles.statusText}>{profile.isPublished ? 'Los clientes pueden encontrar tu barbería en Discovery.' : 'Tu barbería permanece privada mientras completas su perfil.'}</Text>
        </View>

        {profile.publicationIssues.length > 0 && <View style={styles.checklist}><Text style={styles.sectionTitle}>Antes de publicar</Text>{profile.publicationIssues.map(issue => <Text key={issue} style={styles.issue}>• {issue}</Text>)}</View>}

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>INFORMACIÓN</Text>
          <Field label="Descripción" multiline value={profile.description ?? ''} onChangeText={v => patch('description', v)} placeholder="Cuéntale a los clientes qué hace especial tu barbería." />
          <Field label="Teléfono público" value={profile.publicPhone ?? ''} onChangeText={v => patch('publicPhone', v)} placeholder="+1 809..." />
          <Field label="WhatsApp" value={profile.whatsAppPhone ?? ''} onChangeText={v => patch('whatsAppPhone', v)} placeholder="+1 809..." />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>IMÁGENES</Text>
          <MediaPicker label="Logo de la barbería" uri={logoUri} kind="logo" busy={mediaBusy === 'logo'} onPress={() => pickMedia('logo')} />
          <MediaPicker label="Portada de la barbería" uri={coverUri} kind="cover" busy={mediaBusy === 'cover'} onPress={() => pickMedia('cover')} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>UBICACIÓN</Text>
          <Field label="Dirección" value={profile.location.address ?? ''} onChangeText={v => patchLocation('address', v)} placeholder="Av. 27 de Febrero #123" />
          <View style={styles.row}>
            <View style={styles.flex}><Field label="Ciudad" value={profile.location.city ?? ''} onChangeText={v => patchLocation('city', v)} placeholder="Santo Domingo" /></View>
            <View style={styles.flex}><Field label="Sector" value={profile.location.neighborhood ?? ''} onChangeText={v => patchLocation('neighborhood', v)} placeholder="Piantini" /></View>
          </View>
          <Field label="Referencia (opcional)" value={profile.location.reference ?? ''} onChangeText={v => patchLocation('reference', v)} placeholder="Frente a..." />
          <Pressable onPress={useCurrentLocation} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}><Text style={styles.locationButtonText}>📍 Usar mi ubicación actual</Text></Pressable>
          <Text style={styles.mapHelp}>Toca el mapa o arrastra el marcador para corregir la ubicación exacta.</Text>
          <MapView key={`${mapRegion.latitude}-${mapRegion.longitude}`} initialRegion={mapRegion} onPress={moveMarker} style={styles.map}>
            {profile.location.latitude != null && profile.location.longitude != null && (
              <Marker draggable coordinate={{ latitude: profile.location.latitude, longitude: profile.location.longitude }} onDragEnd={moveMarker} />
            )}
          </MapView>
        </View>

        <View style={styles.form}>
          <Toggle label="Aceptar Turno ahora" value={profile.acceptsWalkIns} onValueChange={v => patch('acceptsWalkIns', v)} />
          <Toggle label="Aceptar reservaciones" value={profile.acceptsAppointments} onValueChange={v => patch('acceptsAppointments', v)} />
        </View>

        <Pressable disabled={saving || !!mediaBusy} onPress={save} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (saving || !!mediaBusy) && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar perfil'}</Text></Pressable>
        <Pressable disabled={saving} onPress={togglePublication} style={({ pressed }) => [styles.publish, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.publishText}>{profile.isPublished ? 'Retirar de Discovery' : 'Publicar en Discovery'}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MediaPicker({ label, uri, kind, busy, onPress }: { label: string; uri: string | null; kind: 'logo' | 'cover'; busy: boolean; onPress(): void }) {
  return <View style={styles.mediaBlock}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={({ pressed }) => [styles.mediaPicker, kind === 'cover' && styles.coverPicker, pressed && styles.pressed]}>{uri ? <Image source={{ uri }} resizeMode="cover" style={[styles.mediaImage, kind === 'cover' && styles.coverImage]} /> : <Text style={styles.mediaPlaceholder}>＋ Seleccionar imagen</Text>}<Text style={styles.mediaAction}>{busy ? 'Subiendo…' : uri ? 'Cambiar imagen' : 'Elegir desde Fotos'}</Text></Pressable><Text style={styles.mediaHint}>{kind === 'logo' ? 'JPG, PNG o WEBP · máximo 2 MB' : 'JPG, PNG o WEBP · máximo 5 MB'}</Text></View>;
}
function Field(props: { label: string; value: string; placeholder: string; multiline?: boolean; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput value={props.value} placeholder={props.placeholder} multiline={props.multiline} onChangeText={props.onChangeText} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={colors.textMuted} /></View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange(value: boolean): void }) { return <View style={styles.toggle}><Text style={styles.label}>{label}</Text><Switch value={value} onValueChange={onValueChange} /></View>; }
function showError(error: unknown) { Alert.alert('No se pudo completar', error instanceof MobileApiError ? error.message : 'Ocurrió un error inesperado.'); }
function resolveMediaUrl(url: string | null) { if (!url) return null; return url.startsWith('/') ? `${env.apiBaseUrl}${url}` : url; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, loader: { flex: 1 }, denied: { color: colors.text, padding: spacing.xl },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.xl, paddingBottom: 56, gap: spacing.xl }, back: { color: colors.primaryGlow, fontWeight: '700' },
  eyebrow: { color: colors.primaryGlow, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 6 }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  statusCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, statusLive: { borderColor: colors.primaryGlow }, statusTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, statusText: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  checklist: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 8 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, issue: { color: colors.textMuted, lineHeight: 20 },
  section: { gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, sectionEyebrow: { color: colors.primaryGlow, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },
  form: { gap: spacing.lg }, field: { gap: 8 }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, input: { color: colors.text, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 }, multiline: { minHeight: 110, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 }, toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md },
  mediaBlock: { gap: 8 }, mediaPicker: { minHeight: 190, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 8 }, coverPicker: { minHeight: 180 }, mediaImage: { width: 128, height: 128, borderRadius: radius.md }, coverImage: { width: '100%', height: 150, borderRadius: 0 }, mediaPlaceholder: { color: colors.primaryGlow, fontSize: 17, fontWeight: '800' }, mediaAction: { color: colors.primaryGlow, fontWeight: '800' }, mediaHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  locationButton: { minHeight: 48, borderWidth: 1, borderColor: colors.primaryGlow, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, locationButtonText: { color: colors.primaryGlow, fontWeight: '800' }, mapHelp: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, map: { width: '100%', height: 250, borderRadius: radius.md, overflow: 'hidden' },
  primary: { backgroundColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' }, primaryText: { color: colors.background, fontWeight: '900', fontSize: 16 }, publish: { borderWidth: 1, borderColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' }, publishText: { color: colors.primaryGlow, fontWeight: '900', fontSize: 16 }, pressed: { opacity: .8 }, disabled: { opacity: .5 },
});
