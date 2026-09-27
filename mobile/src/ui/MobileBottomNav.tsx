import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { navigationForRole } from './navigationPolicy';

type ActiveItem = 'home' | 'requests' | 'team' | 'settings' | 'discover' | 'history';

const icons: Record<ActiveItem, string> = {
  home: '⌂',
  requests: '☷',
  team: '♟',
  settings: '⚙',
  discover: '⌕',
  history: '◷',
};

export function MobileBottomNav({ active }: { active: ActiveItem }) {
  const { session } = useAuth();
  const { t } = useI18n();
  const items = navigationForRole(session?.user.role);

  return (
    <View accessibilityRole="tablist" style={styles.shell}>
      {items.map(item => {
        const id = item.id as ActiveItem;
        const selected = active === id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.replace(item.href)}
            style={({ pressed }) => [styles.item, selected && styles.itemActive, pressed && styles.itemPressed]}
          >
            <View style={[styles.iconBubble, selected && styles.iconBubbleActive]}>
              <Text style={[styles.icon, selected && styles.textActive]}>{icons[id] ?? '•'}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.label, selected && styles.textActive]}>{t(item.key)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 7,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(7, 15, 28, 0.97)',
  },
  item: {
    flex: 1,
    minWidth: 56,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  itemPressed: { opacity: 0.8 },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.025)',
  },
  iconBubbleActive: { backgroundColor: 'rgba(22,135,255,.18)' },
  icon: { color: colors.textSubtle, fontSize: 17, fontWeight: '900' },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  textActive: { color: colors.primaryGlow },
});
