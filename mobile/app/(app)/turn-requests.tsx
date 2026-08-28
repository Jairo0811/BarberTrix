import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { createTurnRequestRealtimeConnection } from '@/realtime/turnRequestRealtime';
import { acceptTurnRequest, counterProposeTurnRequest, getStaffTurnRequests, rejectTurnRequest } from '@/turnRequests/turnRequestApi';
import type { TurnRequest } from '@/turnRequests/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusLabel(request: TurnRequest) {
  if (request.status === 'Pending') return 'Pendiente';
  if (request.status === 'CounterProposed') return 'Contraoferta enviada';
  if (request.status === 'Accepted') return 'Aceptada';
  if (request.status === 'Rejected') return 'Rechazada';
  if (request.status === 'Cancelled') return 'Cancelada';
  return 'Expirada';
}

export default function StaffTurnRequestsScreen() {
  const { session, refresh } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['staff-turn-requests', session?.user.barberShopId];

  const withToken = async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    const token = session?.accessToken;
    if (!token) throw new Error('La sesión no está disponible.');
    try {
      return await operation(token);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        const renewed = await refresh();
        if (renewed) return operation(renewed);
      }
      throw error;
    }
  };

  const requestQuery = useQuery({
    queryKey,
    queryFn: () => withToken(token => getStaffTurnRequests(token)),
    enabled: Boolean(session?.accessToken),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!session?.accessToken) return;
    const connection = createTurnRequestRealtimeConnection(
      () => session.accessToken,
      () => { void queryClient.invalidateQueries({ queryKey }); },
    );
    void connection.start().catch(() => undefined);
    return () => { void connection.stop(); };
  }, [queryClient, session?.accessToken, session?.user.barberShopId]);

  const mutate = useMutation({
    mutationFn: async (action: { kind: 'accept' | 'reject' | 'counter'; id: string; startsAt?: string }) => withToken(token => {
      if (action.kind === 'accept') return acceptTurnRequest(action.id, token);
      if (action.kind === 'reject') return rejectTurnRequest(action.id, token);
      return counterProposeTurnRequest(action.id, action.startsAt!, token);
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const items = useMemo(() => requestQuery.data ?? [], [requestQuery.data]);
  const actionable = items.filter(x => x.status === 'Pending' || x.status === 'CounterProposed');
  const history = items.filter(x => x.status !== 'Pending' && x.status !== 'CounterProposed').slice(0, 20);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={requestQuery.isRefetching} onRefresh={() => requestQuery.refetch()} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>M2 · SOLICITUDES</Text>
            <Text style={styles.title}>Turnos solicitados</Text>
            <Text style={styles.subtitle}>Las nuevas solicitudes llegan en tiempo real mientras la app está abierta.</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>Volver</Text></Pressable>
        </View>

        {requestQuery.isLoading ? <ActivityIndicator /> : null}
        {requestQuery.error ? <Text accessibilityRole="alert" style={styles.error}>No pudimos cargar las solicitudes. Desliza para reintentar.</Text> : null}
        {!requestQuery.isLoading && actionable.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text><Text style={styles.subtitle}>Cuando un cliente elija un barbero y horario aparecerá aquí.</Text></View> : null}

        {actionable.map(request => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <Text style={styles.customer}>{request.customerName}</Text>
                <Text style={styles.service}>{request.serviceName} · {request.barberName}</Text>
              </View>
              <Text style={styles.badge}>{statusLabel(request)}</Text>
            </View>
            <Text style={styles.time}>{formatDate(request.effectiveStartsAtUtc)}</Text>
            {request.notes ? <Text style={styles.notes}>“{request.notes}”</Text> : null}
            {request.status === 'CounterProposed' ? <Text style={styles.counter}>Esperando que el cliente confirme la nueva hora.</Text> : null}

            {request.status === 'Pending' ? (
              <View style={styles.actions}>
                <Pressable disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'accept', id: request.id })} style={styles.primary}><Text style={styles.primaryText}>Aceptar</Text></Pressable>
                <Pressable disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'reject', id: request.id })} style={styles.danger}><Text style={styles.dangerText}>Rechazar</Text></Pressable>
              </View>
            ) : null}

            {request.status === 'Pending' ? (
              <View style={styles.counterActions}>
                {[30, 60, 90].map(minutes => {
                  const proposed = new Date(new Date(request.requestedStartsAtUtc).getTime() + minutes * 60_000).toISOString();
                  return <Pressable key={minutes} disabled={mutate.isPending} onPress={() => mutate.mutate({ kind: 'counter', id: request.id, startsAt: proposed })} style={styles.counterButton}><Text style={styles.counterButtonText}>+{minutes} min</Text></Pressable>;
                })}
              </View>
            ) : null}
          </View>
        ))}

        {mutate.error ? <Text accessibilityRole="alert" style={styles.error}>{mutate.error instanceof Error ? mutate.error.message : 'No pudimos completar la acción.'}</Text> : null}

        {history.length > 0 ? <Text style={styles.sectionTitle}>Recientes</Text> : null}
        {history.map(request => (
          <View key={request.id} style={styles.historyCard}>
            <View style={styles.cardCopy}><Text style={styles.historyTitle}>{request.customerName} · {request.serviceName}</Text><Text style={styles.subtitle}>{formatDate(request.effectiveStartsAtUtc)}</Text></View>
            <Text style={styles.badge}>{statusLabel(request)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 22, paddingBottom: 42, gap: 14 },
  header: { gap: 12, marginBottom: 4 },
  headerCopy: { gap: 5 },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: '900', color: '#686861' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#111' },
  subtitle: { color: '#66665f', lineHeight: 20 },
  back: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#111', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  backText: { fontWeight: '800' },
  empty: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 16, padding: 20, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 18, padding: 18, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardCopy: { flex: 1 },
  customer: { fontSize: 20, fontWeight: '900', color: '#111' },
  service: { marginTop: 3, color: '#55554f', fontWeight: '700' },
  badge: { backgroundColor: '#ecece6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontWeight: '800' },
  time: { fontSize: 17, fontWeight: '900' },
  notes: { color: '#66665f', fontStyle: 'italic' },
  counter: { color: '#55554f', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  danger: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#9a2929', alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: '#9a2929', fontWeight: '900' },
  counterActions: { flexDirection: 'row', gap: 8 },
  counterButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: '#bdbdb5', alignItems: 'center', justifyContent: 'center' },
  counterButtonText: { fontWeight: '800' },
  sectionTitle: { marginTop: 10, fontSize: 18, fontWeight: '900' },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dfdfd8', padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  historyTitle: { fontWeight: '800', marginBottom: 3 },
  error: { color: '#a21414', fontWeight: '700' },
});
