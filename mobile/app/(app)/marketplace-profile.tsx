import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { getPublicShopProfile, setShopPublication, updatePublicShopProfile, type PublicShopProfile } from '@/discovery/publicShopProfileApi';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

const emptyProfile: PublicShopProfile = { description: null, publicPhone: null, whatsAppPhone: null, logoUrl: null, coverImageUrl: null, acceptsWalkIns: true, acceptsAppointments: true, isPublished: false, publishedAtUtc: null, publicationIssues: [] };

export default function MarketplaceProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<PublicShopProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = session?.accessToken;

  useEffect(() => {
    if (!token) return;
    getPublicShopProfile(token).then(setProfile).catch(showError).finally(() => setLoading(false));
  }, [token]);

  const patch = <K extends keyof PublicShopProfile>(key: K, value: PublicShopProfile[K]) => setProfile(current => ({ ...current, [key]: value }));

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const result = await updatePublicShopProfile(token, {
        description: profile.description, publicPhone: profile.publicPhone, whatsAppPhone: profile.whatsAppPhone,
        logoUrl: profile.logoUrl, coverImageUrl: profile.coverImageUrl,
        acceptsWalkIns: profile.acceptsWalkIns, acceptsAppointments: profile.acceptsAppointments,
      });
      setProfile(result); Alert.alert('Perfil guardado', 'La información pública de tu barbería fue actualizada.');
    } catch (error) { showError(error); } finally { setSaving(false); }
  }

  async function togglePublication() {
    if (!token) return;
    setSaving(true);
    try { setProfile(await setShopPublication(token, !profile.isPublished)); }
    catch (error) { showError(error); } finally { setSaving(false); }
  }

  if (session?.user.role !== 'Owner') return <SafeAreaView style={styles.safe}><Text style={styles.denied}>Solo el propietario puede administrar la publicación de la barbería.</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground compact />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
        <View><Text style={styles.eyebrow}>MARKETPLACE</Text><Text style={styles.title}>Perfil público</Text><Text style={styles.body}>Controla cómo aparece tu barbería en BarberTrix Discovery. Tu negocio solo será visible cuando decidas publicarlo.</Text></View>

        <View style={[styles.statusCard, profile.isPublished && styles.statusLive]}>
          <Text style={styles.statusTitle}>{profile.isPublished ? '● Publicada' : '○ No publicada'}</Text>
          <Text style={styles.statusText}>{profile.isPublished ? 'Los clientes pueden encontrar tu barbería en Discovery.' : 'Tu barbería permanece privada mientras completas su perfil.'}</Text>
        </View>

        {profile.publicationIssues.length > 0 && <View style={styles.checklist}><Text style={styles.sectionTitle}>Antes de publicar</Text>{profile.publicationIssues.map(issue => <Text key={issue} style={styles.issue}>• {issue}</Text>)}</View>}

        <View style={styles.form}>
          <Field label="Descripción" multiline value={profile.description ?? ''} onChangeText={v => patch('description', v)} placeholder="Cuéntale a los clientes qué hace especial tu barbería." />
          <Field label="Teléfono público" value={profile.publicPhone ?? ''} onChangeText={v => patch('publicPhone', v)} placeholder="+1 809..." />
          <Field label="WhatsApp" value={profile.whatsAppPhone ?? ''} onChangeText={v => patch('whatsAppPhone', v)} placeholder="+1 809..." />
          <Field label="URL del logo" value={profile.logoUrl ?? ''} onChangeText={v => patch('logoUrl', v)} placeholder="https://..." />
          <Field label="URL de portada" value={profile.coverImageUrl ?? ''} onChangeText={v => patch('coverImageUrl', v)} placeholder="https://..." />
          <Toggle label="Aceptar Turno ahora" value={profile.acceptsWalkIns} onValueChange={v => patch('acceptsWalkIns', v)} />
          <Toggle label="Aceptar reservaciones" value={profile.acceptsAppointments} onValueChange={v => patch('acceptsAppointments', v)} />
        </View>

        <Pressable disabled={saving} onPress={save} style={({ pressed }) => [styles.primary, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar perfil'}</Text></Pressable>
        <Pressable disabled={saving} onPress={togglePublication} style={({ pressed }) => [styles.publish, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.publishText}>{profile.isPublished ? 'Retirar de Discovery' : 'Publicar en Discovery'}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; value: string; placeholder: string; multiline?: boolean; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={colors.textMuted} /></View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange(value: boolean): void }) { return <View style={styles.toggle}><Text style={styles.label}>{label}</Text><Switch value={value} onValueChange={onValueChange} /></View>; }
function showError(error: unknown) { Alert.alert('No se pudo completar', error instanceof MobileApiError ? error.message : 'Ocurrió un error inesperado.'); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, loader: { flex: 1 }, denied: { color: colors.text, padding: spacing.xl },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.xl, paddingBottom: 56, gap: spacing.xl }, back: { color: colors.primaryGlow, fontWeight: '700' },
  eyebrow: { color: colors.primaryGlow, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 6 }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  statusCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, statusLive: { borderColor: colors.primaryGlow }, statusTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, statusText: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  checklist: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 8 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, issue: { color: colors.textMuted, lineHeight: 20 }, form: { gap: spacing.lg }, field: { gap: 8 }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 }, multiline: { minHeight: 110, textAlignVertical: 'top' }, toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md },
  primary: { backgroundColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' }, primaryText: { color: colors.background, fontWeight: '900', fontSize: 16 }, publish: { borderWidth: 1, borderColor: colors.primaryGlow, borderRadius: radius.md, padding: 16, alignItems: 'center' }, publishText: { color: colors.primaryGlow, fontWeight: '900', fontSize: 16 }, pressed: { opacity: .8 }, disabled: { opacity: .5 },
});
