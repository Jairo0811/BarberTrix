import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { navigationForRole } from './navigationPolicy';
import { colors } from '@/theme/tokens';
export function MobileBottomNav({ active }: { active: 'home' | 'requests' | 'team' | 'settings' | 'discover' | 'history' }) {
 const { session } = useAuth(); const { t } = useI18n(); const role = session?.user.role;
 const items = navigationForRole(role);
 return <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 6, borderRadius: 16, backgroundColor: colors.surface }}>
 {items.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active === item.id }} onPress={() => router.replace(item.href)} style={{ flexGrow: 1, flexBasis: 64, minHeight: 52, padding: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: active === item.id ? colors.primarySoft : 'transparent' }}><Text style={{ textAlign: 'center', color: active === item.id ? colors.primaryGlow : colors.textMuted, fontWeight: '700', fontSize: 12 }}>{t(item.key)}</Text></Pressable>)}
 </View>;
}
