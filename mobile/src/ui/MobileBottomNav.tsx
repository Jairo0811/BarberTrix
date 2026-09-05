import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type ActiveItem = 'home' | 'requests';
type Props = { active: ActiveItem };
type Labels = { home: string; requests: string };

const defaultLabels: Labels = { home: 'Home', requests: 'Requests' };
const labelsByLocale: Record<string, Labels> = {
  'es-419': { home: 'Inicio', requests: 'Solicitudes' },
  'es-ES': { home: 'Inicio', requests: 'Solicitudes' },
  en: defaultLabels,
  'pt-BR': { home: 'Início', requests: 'Solicitações' },
  fr: { home: 'Accueil', requests: 'Demandes' },
  ht: { home: 'Akèy', requests: 'Demann' },
  de: { home: 'Start', requests: 'Anfragen' },
  it: { home: 'Home', requests: 'Richieste' },
  ja: { home: 'ホーム', requests: 'リクエスト' },
  ko: { home: '홈', requests: '요청' },
  'zh-CN': { home: '首页', requests: '请求' },
};

export function MobileBottomNav({ active }: Props) {
  const { locale } = useI18n();
  const labels = labelsByLocale[locale] ?? defaultLabels;
  return (
    <View accessibilityRole="tablist" style={styles.shell}>
      <NavItem active={active === 'home'} icon="⌂" label={labels.home} onPress={() => router.replace('/(app)')} />
      <NavItem active={active === 'requests'} icon="☷" label={labels.requests} onPress={() => router.replace('/(app)/turn-requests')} />
    </View>
  );
}

function NavItem({ active, icon, label, onPress }: { active: boolean; icon: string; label: string; onPress(): void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}>
    <View style={[styles.iconBubble, active && styles.iconBubbleActive]}><Text style={[styles.icon, active && styles.textActive]}>{icon}</Text></View>
    <Text style={[styles.label, active && styles.textActive]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  shell:{flexDirection:'row',gap:spacing.sm,padding:7,borderRadius:radius.xl,borderWidth:1,borderColor:colors.border,backgroundColor:'rgba(7, 15, 28, 0.97)'},
  item:{flex:1,minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,borderRadius:radius.lg},
  itemActive:{backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong},
  itemPressed:{opacity:.8},
  iconBubble:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.025)'},
  iconBubbleActive:{backgroundColor:'rgba(22,135,255,.18)'},
  icon:{color:colors.textSubtle,fontSize:18,fontWeight:'900'},
  label:{color:colors.textMuted,fontSize:13,fontWeight:'900'},
  textActive:{color:colors.primaryGlow},
});
