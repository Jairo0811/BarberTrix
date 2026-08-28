import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptCounterProposal, cancelPublicTurnRequest, getPublicTurnRequest } from '@/turnRequests/turnRequestApi';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';
import type { TurnRequestStatus } from '@/turnRequests/types';

const labels: Record<TurnRequestStatus, string> = {
  Pending: 'Esperando respuesta del barbero',
  Accepted: 'Turno confirmado',
  Rejected: 'Solicitud rechazada',
  CounterProposed: 'El barbero propuso otra hora',
  Cancelled: 'Solicitud cancelada',
  Expired: 'Solicitud expirada',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function RequestStatusScreen() {
  const params = useLocalSearchParams<{ slug: string; requestId: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [lookupToken, setLookupToken] = useState<string | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId) return;
    publicRequestStore.read(requestId).then(setLookupToken).catch(() => setLookupToken(null));
  }, [requestId]);

  const queryKey = ['public-turn-request', slug, requestId];
  const requestQuery = useQuery({
    queryKey,
    queryFn: () => getPublicTurnRequest(slug!, requestId!, lookupToken!),
    enabled: Boolean(slug && requestId && lookupToken),
    refetchInterval: query => query.state.data?.status === 'Pending' || query.state.data?.status === 'CounterProposed' ? 15_000 : false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptCounterProposal(slug!, requestId!, lookupToken!),
    onSuccess: data => queryClient.setQueryData(queryKey, data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPublicTurnRequest(slug!, requestId!, lookupToken!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  if (lookupToken === undefined || requestQuery.isLoading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>;
  }

  if (!lookupToken) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>No encontramos la credencial segura de esta solicitud.</Text><Text style={styles.body}>Abre el estado desde el mismo dispositivo donde solicitaste el turno.</Text></View></SafeAreaView>;
  }

  const request = requestQuery.data;
  if (!request) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>No pudimos cargar tu solicitud.</Text><Pressable onPress={() => requestQuery.refetch()} style={styles.secondary}><Text style={styles.secondaryText}>Reintentar</Text></Pressable></View></SafeAreaView>;
  }

  const actionable = request.status === 'Pending' || request.status === 'CounterProposed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={requestQuery.isRefetching} onRefresh={() => requestQuery.refetch()} />}
      >
        <Text style={styles.eyebrow}>ESTADO DE TU SOLICITUD</Text>
        <Text style={styles.title}>{labels[request.status]}</Text>
        <View style={styles.statusCard}>
          <Text style={styles.service}>{request.serviceName}</Text>
          <Text style={styles.barber}>con {request.barberName}</Text>
          <Text style={styles.time}>Solicitado: {formatDate(request.requestedStartsAtUtc)}</Text>
          {request.counterProposedStartsAtUtc ? <Text style={styles.counter}>Nueva propuesta: {formatDate(request.counterProposedStartsAtUtc)}</Text> : null}
          {request.notes ? <Text style={styles.notes}>“{request.notes}”</Text> : null}
        </View>

        {request.status === 'CounterProposed' ? (
          <Pressable disabled={acceptMutation.isPending} onPress={() => acceptMutation.mutate()} style={styles.primary}>
            <Text style={styles.primaryText}>{acceptMutation.isPending ? 'Confirmando…' : 'Aceptar nueva hora'}</Text>
          </Pressable>
        ) : null}

        {request.status === 'Accepted' && request.appointmentId ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>¡Listo! Tu cita fue creada.</Text>
            <Text style={styles.body}>Tu misma credencial segura protege el seguimiento de la cita.</Text>
          </View>
        ) : null}

        {actionable ? (
          <Pressable disabled={cancelMutation.isPending} onPress={() => cancelMutation.mutate()} style={styles.secondary}>
            <Text style={styles.secondaryText}>{cancelMutation.isPending ? 'Cancelando…' : 'Cancelar solicitud'}</Text>
          </Pressable>
        ) : null}

        {acceptMutation.error || cancelMutation.error ? <Text accessibilityRole="alert" style={styles.error}>No pudimos completar la operación. Actualiza e inténtalo de nuevo.</Text> : null}
        <Text style={styles.hint}>Esta pantalla se actualiza automáticamente mientras la solicitud está pendiente.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: '900', color: '#686861' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#111' },
  body: { fontSize: 16, lineHeight: 23, color: '#55554f' },
  statusCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 18, padding: 20, gap: 7 },
  service: { fontSize: 22, fontWeight: '900', color: '#111' },
  barber: { fontSize: 17, fontWeight: '700', color: '#44443f' },
  time: { marginTop: 8, color: '#55554f' },
  counter: { fontWeight: '900', fontSize: 16, color: '#111' },
  notes: { marginTop: 6, color: '#686861', fontStyle: 'italic' },
  primary: { minHeight: 54, borderRadius: 14, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '800', color: '#111' },
  success: { padding: 16, borderRadius: 14, backgroundColor: '#ecece5', gap: 5 },
  successTitle: { fontWeight: '900', fontSize: 17 },
  error: { color: '#a21414', fontWeight: '700' },
  hint: { textAlign: 'center', color: '#77776f', fontSize: 13 },
});
