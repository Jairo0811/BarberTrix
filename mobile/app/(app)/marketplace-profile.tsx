import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { env } from '@/config/env';
import { getPublicShopProfile, setShopPublication, updatePublicShopProfile, uploadShopMedia, type PublicShopProfile } from '@/discovery/publicShopProfileApi';
import { ShopLocationMap, type GeoCoordinate } from '@/discovery/ShopLocationMap';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

const emptyProfile: PublicShopProfile = {
  description: null, publicPhone: null, whatsAppPhone: null, logoUrl: null, coverImageUrl: null,
  location: { address: null, city: null, neighborhood: null, reference: null, latitude: null, longitude: null },
  acceptsWalkIns: true, acceptsAppointments: true, isPublished: false, publishedAtUtc: null, publicationIssues: [],
};

export default function MarketplaceProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<PublicShopProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<'logo' | 'cover' | null>(null);
  const token = session?.accessToken;

  useEffect(() => { if (!token) return; getPublicShopProfile(token).then(setProfile).catch(showError).finally(() => setLoading(false)); }, [token]);
  const patch = <K extends keyof PublicShopProfile>(key: K, value: PublicShopProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
  const patchLocation = <K extends keyof PublicShopProfile['location']>(key: K, value: PublicShopProfile['location'][K]) => setProfile(current => ({ ...current, location: { ...current.location, [key]: value } }));

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      setProfile(await updatePublicShopProfile(token, {
        description: profile.description, publicPhone: profile.publicPhone, whatsAppPhone: profile.whatsAppPhone,
        logoUrl: profile.logoUrl, coverImageUrl: profile.coverImageUrl, address: profile.location.address,
        city: profile.location.city, neighborhood: profile.location.neighborhood, reference: profile.location.reference,
        latitude: profile.location.latitude, longitude: profile.location.longitude,
        acceptsWalkIns: profile.acceptsWalkIns, acceptsAppointments: profile.acceptsAppointments,
      }));
      Alert.alert('Perfil guardado', 'La información pública de tu barbería fue actualizada.');
    } catch (error) { showError(error); } finally { setSaving(false); }
  }

  async function pickMedia(kind: 'logo' | 'cover') {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permiso necesario', 'BarberTrix necesita acceso a tus fotos para seleccionar esta imagen.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'logo' ? [1, 1] : [16, 9], quality: 0.85, base64: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) { Alert.alert('No se pudo completar', 'No se pudo leer la imagen seleccionada.'); return; }
    setMediaBusy(kind);
    try {
      const upload = await uploadShopMedia(token, kind, asset.fileName ?? `${kind}.jpg`, asset.mimeType ?? 'image/jpeg', asset.base64);
      patch(kind === 'logo' ? 'logoUrl' : 'coverImageUrl', upload.url);
    } catch (error) { showError(error); } finally { setMediaBusy(null); }
  }

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) { Alert.alert('Ubicación desactivada', 'Permite el acceso a la ubicación para colocar tu barbería en el mapa.'); return; }
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      updateCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const reverse = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const place = reverse[0];
      if (place) {
        if (!profile.location.address) patchLocation('address', [place.street, place.streetNumber].filter(Boolean).join(' ') || place.formattedAddress || null);
        if (!profile.location.city) patchLocation('city', place.city ?? place.subregion ?? null);
        if (!profile.location.neighborhood) patchLocation('neighborhood', place.district ?? null);
      }
    } catch { Alert.alert('No se pudo ubicar', 'No pudimos obtener tu ubicación actual. Puedes mover el marcador manualmente.'); }
  }

  function updateCoordinates(coordinate: GeoCoordinate) { setProfile(current => ({ ...current, location: { ...current.location, latitude: coordinate.latitude, longitude: coordinate.longitude } })); }
  async function togglePublication() { if (!token) return; setSaving(true); try { setProfile(await setShopPublication(token, !profile.isPublished)); } catch (error) { showError(error); } finally { setSaving(false); } }

  if (session?.user.role !== 'Owner') return <SafeAreaView style={styles.safe}><Text style={styles.denied}>Solo el propietario puede administrar la publicación de la barbería.</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;

  const logoUri = resolveMediaUrl(profile.logoUrl);
  const coverUri = resolveMediaUrl(profile.coverImageUrl);
  const completion = Math.max(0, 6 - profile.publicationIssues.length);

  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><BrandLogo compact /><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>← Volver</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>MARKETPLACE</Text><Text style={styles.title}>Tu barbería en Discovery</Text><Text style={styles.body}>Haz que tu perfil sea fácil de encontrar, entender y reservar desde BarberTrix.</Text></View>

    <View style={[styles.statusHero, profile.isPublished && styles.statusLive]}>
      <View style={styles.statusMain}><View style={[styles.statusDot, profile.isPublished && styles.statusDotLive]} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>{profile.isPublished ? 'Publicada' : 'No publicada'}</Text><Text style={styles.statusText}>{profile.isPublished ? 'Los clientes ya pueden encontrar tu barbería.' : 'Completa el perfil y publícalo cuando estés listo.'}</Text></View></View>
      <View style={styles.completion}><Text style={styles.completionValue}>{completion}/6</Text><Text style={styles.completionLabel}>listo</Text></View>
    </View>

    {profile.publicationIssues.length > 0 && <View style={styles.checklist}><Text style={styles.sectionKicker}>ANTES DE PUBLICAR</Text><Text style={styles.sectionTitle}>Completa estos detalles</Text>{profile.publicationIssues.map(issue => <View key={issue} style={styles.issueRow}><Text style={styles.issueBullet}>•</Text><Text style={styles.issue}>{issue}</Text></View>)}</View>}

    <View style={styles.section}><Text style={styles.sectionKicker}>INFORMACIÓN</Text><Text style={styles.sectionTitle}>Cómo te verán los clientes</Text>
      <Field label="Descripción" multiline value={profile.description ?? ''} onChangeText={value => patch('description', value)} placeholder="Cuéntale a los clientes qué hace especial tu barbería." />
      <Field label="Teléfono público" value={profile.publicPhone ?? ''} onChangeText={value => patch('publicPhone', value)} placeholder="+1 809..." />
      <Field label="WhatsApp" value={profile.whatsAppPhone ?? ''} onChangeText={value => patch('whatsAppPhone', value)} placeholder="+1 809..." />
    </View>

    <View style={styles.section}><Text style={styles.sectionKicker}>IMÁGENES</Text><Text style={styles.sectionTitle}>Primera impresión</Text>
      <MediaPicker label="Logo de la barbería" uri={logoUri} kind="logo" busy={mediaBusy === 'logo'} onPress={() => pickMedia('logo')} />
      <MediaPicker label="Portada de la barbería" uri={coverUri} kind="cover" busy={mediaBusy === 'cover'} onPress={() => pickMedia('cover')} />
    </View>

    <View style={styles.section}><Text style={styles.sectionKicker}>UBICACIÓN</Text><Text style={styles.sectionTitle}>Ayuda a que te encuentren</Text>
      <Field label="Dirección" value={profile.location.address ?? ''} onChangeText={value => patchLocation('address', value)} placeholder="Av. 27 de Febrero #123" />
      <View style={styles.row}><View style={styles.flex}><Field label="Ciudad" value={profile.location.city ?? ''} onChangeText={value => patchLocation('city', value)} placeholder="Santo Domingo" /></View><View style={styles.flex}><Field label="Sector" value={profile.location.neighborhood ?? ''} onChangeText={value => patchLocation('neighborhood', value)} placeholder="Piantini" /></View></View>
      <Field label="Referencia (opcional)" value={profile.location.reference ?? ''} onChangeText={value => patchLocation('reference', value)} placeholder="Frente a..." />
      <Pressable onPress={useCurrentLocation} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}><Text style={styles.locationButtonText}>📍 Usar mi ubicación actual</Text></Pressable>
      <Text style={styles.mapHelp}>Toca el mapa o arrastra el marcador para corregir la ubicación exacta.</Text>
      <ShopLocationMap latitude={profile.location.latitude} longitude={profile.location.longitude} onChange={updateCoordinates} />
    </View>

    <View style={styles.section}><Text style={styles.sectionKicker}>RESERVAS</Text><Text style={styles.sectionTitle}>Cómo quieres recibir clientes</Text>
      <Toggle label="Aceptar Turno ahora" value={profile.acceptsWalkIns} onValueChange={value => patch('acceptsWalkIns', value)} />
      <Toggle label="Aceptar reservaciones" value={profile.acceptsAppointments} onValueChange={value => patch('acceptsAppointments', value)} />
    </View>

    <Pressable disabled={saving || !!mediaBusy} onPress={save} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (saving || !!mediaBusy) && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text><Text style={styles.primaryArrow}>→</Text></Pressable>
    <Pressable disabled={saving} onPress={togglePublication} style={({ pressed }) => [styles.publish, profile.isPublished && styles.unpublish, pressed && styles.pressed, saving && styles.disabled]}><Text style={[styles.publishText, profile.isPublished && styles.unpublishText]}>{profile.isPublished ? 'Retirar de Discovery' : 'Publicar en Discovery'}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

function MediaPicker({ label, uri, kind, busy, onPress }: { label: string; uri: string | null; kind: 'logo' | 'cover'; busy: boolean; onPress(): void }) {
  return <View style={styles.mediaBlock}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={({ pressed }) => [styles.mediaPicker, kind === 'cover' && styles.coverPicker, pressed && styles.pressed]}>{uri ? <Image source={{ uri }} resizeMode="cover" style={[styles.mediaImage, kind === 'cover' && styles.coverImage]} /> : <View style={styles.mediaEmpty}><Text style={styles.mediaEmptyIcon}>＋</Text><Text style={styles.mediaPlaceholder}>Seleccionar imagen</Text></View>}<View style={styles.mediaActionBar}><Text style={styles.mediaAction}>{busy ? 'Subiendo…' : uri ? 'Cambiar imagen' : 'Elegir desde Fotos'}</Text></View></Pressable><Text style={styles.mediaHint}>{kind === 'logo' ? 'JPG, PNG o WEBP · máximo 2 MB' : 'JPG, PNG o WEBP · máximo 5 MB'}</Text></View>;
}
function Field(props: { label: string; value: string; placeholder: string; multiline?: boolean; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput value={props.value} placeholder={props.placeholder} multiline={props.multiline} onChangeText={props.onChangeText} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={colors.textMuted} /></View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange(value: boolean): void }) { return <View style={styles.toggle}><View style={styles.toggleCopy}><Text style={styles.label}>{label}</Text><Text style={styles.toggleHint}>{value ? 'Activado' : 'Desactivado'}</Text></View><Switch value={value} onValueChange={onValueChange} /></View>; }
function showError(error: unknown) { Alert.alert('No se pudo completar', error instanceof MobileApiError ? error.message : 'Ocurrió un error inesperado.'); }
function resolveMediaUrl(url: string | null) { if (!url) return null; return url.startsWith('/') ? `${env.apiBaseUrl}${url}` : url; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},loader:{flex:1},denied:{color:colors.text,padding:spacing.xl},content:{width:'100%',maxWidth:780,alignSelf:'center',padding:spacing.xl,paddingBottom:64,gap:spacing.lg},
  topbar:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{minHeight:44,justifyContent:'center',paddingHorizontal:8},back:{color:colors.primaryGlow,fontWeight:'900'},hero:{gap:7},eyebrow:{...typography.eyebrow,color:colors.primaryGlow},title:{...typography.title,color:colors.text,fontSize:31,lineHeight:37},body:{...typography.body,color:colors.textMuted},
  statusHero:{padding:spacing.lg,borderRadius:radius.xl,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},statusLive:{borderColor:'rgba(84,214,138,.32)',backgroundColor:colors.successSoft},statusMain:{flex:1,flexDirection:'row',alignItems:'center',gap:12},statusDot:{width:12,height:12,borderRadius:6,backgroundColor:colors.textSubtle},statusDotLive:{backgroundColor:colors.success},statusCopy:{flex:1},statusTitle:{color:colors.text,fontSize:18,fontWeight:'900'},statusText:{color:colors.textMuted,marginTop:4,lineHeight:19,fontSize:13},completion:{minWidth:62,height:62,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border},completionValue:{color:colors.text,fontSize:18,fontWeight:'900'},completionLabel:{color:colors.textSubtle,fontSize:10,fontWeight:'800'},
  checklist:{padding:spacing.lg,borderRadius:radius.xl,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:8},section:{gap:spacing.lg,padding:spacing.lg,borderRadius:radius.xl,backgroundColor:'rgba(10,18,33,.94)',borderWidth:1,borderColor:colors.border},sectionKicker:{color:colors.primaryGlow,fontSize:10,fontWeight:'900',letterSpacing:1.5},sectionTitle:{color:colors.text,fontSize:19,fontWeight:'900',marginTop:-10},issueRow:{flexDirection:'row',gap:8},issueBullet:{color:colors.warning,fontWeight:'900'},issue:{flex:1,color:colors.textMuted,lineHeight:20},
  field:{gap:8},label:{color:colors.text,fontSize:14,fontWeight:'800'},input:{minHeight:56,color:colors.text,backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:13,fontSize:15},multiline:{minHeight:110,textAlignVertical:'top'},row:{flexDirection:'row',gap:spacing.md},flex:{flex:1},
  mediaBlock:{gap:8},mediaPicker:{overflow:'hidden',minHeight:150,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceStrong},coverPicker:{minHeight:190},mediaImage:{width:'100%',height:150},coverImage:{height:190},mediaEmpty:{flex:1,minHeight:120,alignItems:'center',justifyContent:'center',gap:8},mediaEmptyIcon:{color:colors.primaryGlow,fontSize:28,fontWeight:'300'},mediaPlaceholder:{color:colors.textMuted,fontWeight:'800'},mediaActionBar:{minHeight:44,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderTopWidth:1,borderTopColor:colors.border},mediaAction:{color:colors.primaryGlow,fontWeight:'900'},mediaHint:{color:colors.textSubtle,fontSize:11},
  locationButton:{minHeight:52,borderRadius:radius.md,borderWidth:1,borderColor:colors.borderStrong,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},locationButtonText:{color:colors.primaryGlow,fontWeight:'900'},mapHelp:{color:colors.textSubtle,fontSize:12,lineHeight:18},toggle:{minHeight:62,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:14,borderRadius:radius.md,backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border},toggleCopy:{gap:2},toggleHint:{color:colors.textSubtle,fontSize:11},
  primary:{minHeight:58,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',flexDirection:'row'},primaryText:{color:colors.white,fontWeight:'900',fontSize:15},primaryArrow:{position:'absolute',right:20,color:colors.white,fontSize:20,fontWeight:'900'},publish:{minHeight:54,borderRadius:radius.md,backgroundColor:colors.successSoft,borderWidth:1,borderColor:'rgba(84,214,138,.3)',alignItems:'center',justifyContent:'center'},publishText:{color:colors.success,fontWeight:'900'},unpublish:{backgroundColor:colors.dangerSoft,borderColor:'rgba(255,122,122,.28)'},unpublishText:{color:colors.danger},pressed:{opacity:.78},disabled:{opacity:.5}
});
