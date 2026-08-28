import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PushOptInStatus } from './PushNotificationsProvider';

type Props = {
  status: PushOptInStatus;
  message: string | null;
  title: string;
  body: string;
  onEnable(): void;
};

export function PushOptInCard({ status, message, title, body, onEnable }: Props) {
  if (status === 'enabled') {
    return (
      <View accessibilityRole="summary" style={[styles.card, styles.enabled]}>
        <Text style={styles.title}>Avisos activados</Text>
        <Text style={styles.body}>Este dispositivo recibirá cambios importantes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable accessibilityRole="button" disabled={status === 'enabling'} onPress={onEnable} style={styles.button}>
        <Text style={styles.buttonText}>{status === 'enabling' ? 'Activando…' : 'Activar avisos'}</Text>
      </Pressable>
      {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, borderColor: '#d7d7d0', borderRadius: 16, backgroundColor: '#fff', gap: 8 },
  enabled: { backgroundColor: '#ecece5' },
  title: { fontSize: 17, fontWeight: '900', color: '#111' },
  body: { color: '#55554f', lineHeight: 21 },
  button: { minHeight: 46, marginTop: 4, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  error: { color: '#a21414', fontWeight: '700', lineHeight: 19 },
});
