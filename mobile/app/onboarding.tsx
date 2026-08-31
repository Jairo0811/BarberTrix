import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { getMyJoinRequests, requestJoin, searchShops, withdrawJoinRequest, type BarberJoinRequest, type BarberShopDirectoryItem } from '@/onboarding/onboardingApi';

export default function OnboardingScreen() {
  const { status, session, signOut, refresh } = useAuth();
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<BarberShopDirectoryItem[]>([]);
  const [requests, setRequests] = useState<BarberJoinRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (search = query) => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const [shopResults, joinRequests] = await Promise.all([
        searchShops(session.accessToken, search),
        getMyJoinRequests(session.accessToken),
      ]);
      setShops(shopResults);
      setRequests(joinRequests);
      if (joinRequests.some(item => item.status === 'Approved')) {
        const token = await refresh();
        if (token) router.replace('/(app)');
      }
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No pudimos cargar tu onboarding.');
    } finally {
      setBusy(false);
    }
  }, [query, refresh, session]);

  useEffect(() => { void load(''); }, [load]);

  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated') return <Redirect href="/(app)" />;

  const pendingByShop = new Map(requests.filter(item => item.status === 'Pending').map(item => [item.barberShopId, item]));

  async function join(shop: BarberShopDirectoryItem) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      await requestJoin(session.accessToken, shop.id);
      await load(query);
      Alert.alert('Solicitud enviada', `${shop.name} podrá revisar tu solicitud desde su panel.`);
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No se pudo enviar la solicitud.');
      setBusy(false);
    }
  }

  async function withdraw(request: BarberJoinRequest) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      await withdrawJoinRequest(session.accessToken, request.id);
      await load(query);
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No se pudo retirar la solicitud.');
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>BARBERTURN · BARBERO</Text>
      <Text style={styles.title}>Encuentra tu barbería</Text>
      <Text style={styles.body}>Hola {session?.user.name}. Tu perfil profesional ya existe; ahora solicita ingreso a la barbería donde trabajas.</Text>

      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Nombre o slug de la barbería" style={styles.input} autoCapitalize="none" />
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => void load(query)} disabled={busy}>
          <Text style={styles.primaryButtonText}>Buscar</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Barberías disponibles</Text>
      {shops.map(shop => {
        const pending = pendingByShop.get(shop.id);
        return (
          <View key={shop.id} style={styles.card}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{shop.name}</Text>
              <Text style={styles.meta}>@{shop.slug} · {shop.timeZoneId}</Text>
            </View>
            {pending ? (
              <Pressable style={styles.secondaryButton} onPress={() => void withdraw(pending)} disabled={busy}>
                <Text style={styles.secondaryButtonText}>Retirar solicitud</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => void join(shop)} disabled={busy}>
                <Text style={styles.primaryButtonText}>Solicitar ingreso</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Mis solicitudes</Text>
      {requests.length === 0 ? <Text style={styles.muted}>Aún no has enviado solicitudes.</Text> : requests.map(request => (
        <View key={request.id} style={styles.requestCard}>
          <Text style={styles.cardTitle}>{request.barberShopName}</Text>
          <Text style={styles.meta}>Estado: {request.status}</Text>
          {!!request.reviewNote && <Text style={styles.meta}>Nota: {request.reviewNote}</Text>}
        </View>
      ))}

      <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void load(query)} disabled={busy}>
        <Text style={styles.secondaryButtonText}>Actualizar estado</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => void signOut()}>
        <Text style={styles.linkText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: '#f7f7f5', flexGrow: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 30, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 24 },
  searchRow: { gap: 10 },
  input: { borderWidth: 1, borderColor: '#c9c9c4', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '700' },
  card: { gap: 12, borderWidth: 1, borderColor: '#deded8', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  requestCard: { gap: 6, borderWidth: 1, borderColor: '#deded8', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  cardCopy: { gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, color: '#5d5d58' },
  muted: { color: '#6b6b65' },
  error: { color: '#a82020', fontWeight: '600' },
  primaryButton: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#111', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  secondaryButtonText: { fontWeight: '700' },
  linkButton: { paddingVertical: 12, alignItems: 'center' },
  linkText: { textDecorationLine: 'underline', fontWeight: '600' },
});
