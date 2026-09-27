import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { mapMobileError } from '@/api/errorPolicy';
import { useI18n } from '@/i18n/I18nProvider';
import { suggestChair } from '@/team/chairSuggestion';
import {
  approveJoinRequest,
  deactivateTeamMember,
  getJoinRequests,
  getOperationalBarbers,
  getTeam,
  inviteTeamMember,
  rejectJoinRequest,
  type JoinRequest,
  type OperationalBarber,
  type TeamMember,
  type TeamRole,
} from '@/team/teamApi';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { ErrorState } from '@/ui/ErrorState';
import { BrandLogo } from '@/ui/BrandLogo';
import { MobileBottomNav } from '@/ui/MobileBottomNav';
import { BrandedBackground } from '@/ui/BrandedBackground';

const roles: TeamRole[] = ['Barber', 'Receptionist', 'Administrator'];

export default function TeamScreen() {
  const { session } = useAuth();
  const { t } = useI18n();
  const labelRole = (value: string) => t(`mobile.role.${value}`);
  const showError = (error: unknown) => Alert.alert(t('errors.unexpected'), t(mapMobileError(error).key));
  const token = session?.accessToken;
  const role = session?.user.role;
  const canManage = role === 'Owner' || role === 'Administrator';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [barbers, setBarbers] = useState<OperationalBarber[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [formError, setFormError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Barber');
  const [chair, setChair] = useState('');

  async function load() {
    if (!token || !canManage) return;
    setLoading(true); setLoadError(null);
    try {
      const [team, operational, pending] = await Promise.all([
        getTeam(token),
        getOperationalBarbers(token),
        getJoinRequests(token),
      ]);
      setMembers(team); setBarbers(operational); setRequests(pending);
    } catch (error) { setLoadError(error); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [token, canManage]);

  const nextSuggestedChair = useMemo(() => suggestChair(barbers), [barbers]);
  const activeMembers = useMemo(() => members.filter(member => member.isActive).length, [members]);
  const activeBarbers = barbers.length;

  async function invite() {
    if (!token || !name.trim() || !email.trim()) return;
    setWorking(true); setFormError(null);
    try {
      const chairNumber = inviteRole === 'Barber' ? Number(chair || nextSuggestedChair) : undefined;
      if (chairNumber !== undefined && (!Number.isInteger(chairNumber) || chairNumber <= 0)) {
        setFormError({ status: 400 }); return;
      }
      const invitation = await inviteTeamMember(token, name.trim(), email.trim(), inviteRole, null, chairNumber);
      setName(''); setEmail(''); setChair('');
      await load();
      Alert.alert(t('team.invited'), invitation.developmentAcceptanceUrl ? invitation.developmentAcceptanceUrl : t('team.sent', { email: invitation.email }));
    } catch (error) {
      setFormError(error);
      if (mapMobileError(error).key === 'errors.chair') {
        try {
          const latest = await getOperationalBarbers(token);
          setBarbers(latest); setChair('');
          Alert.alert(t('team.chair'), t('team.chairConflict', { chair: chair || nextSuggestedChair, suggestion: suggestChair(latest) }));
        } catch { /* Keep the original conflict visible when refresh also fails. */ }
      }
    } finally { setWorking(false); }
  }

  async function approve(request: JoinRequest) {
    if (!token) return;
    const chairNumber = nextSuggestedChair;
    setWorking(true);
    try {
      await approveJoinRequest(token, request.id, chairNumber);
      await load();
      Alert.alert(t('team.linked'), t('team.approved', { name: request.barberName, chair: chairNumber }));
    } catch (error) { showError(error); } finally { setWorking(false); }
  }

  async function reject(request: JoinRequest) {
    if (!token) return;
    setWorking(true);
    try { await rejectJoinRequest(token, request.id, t('team.rejectionReason')); await load(); }
    catch (error) { showError(error); } finally { setWorking(false); }
  }

  async function deactivate(member: TeamMember) {
    if (!token || role !== 'Owner') return;
    setWorking(true);
    try { await deactivateTeamMember(token, member.id); await load(); }
    catch (error) { showError(error); } finally { setWorking(false); }
  }

  if (!canManage) return <SafeAreaView style={styles.safe}><Text style={styles.denied}>{t('team.denied')}</Text></SafeAreaView>;
  if (loading && members.length === 0) return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ScrollView
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void load(); }} tintColor={colors.primaryGlow} />}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.topbar}>
      <BrandLogo compact />
      <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>{t('team.back')}</Text></Pressable>
    </View>

    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{t('team.eyebrow')}</Text>
      <Text style={styles.title}>{t('team.title')}</Text>
      <Text style={styles.body}>{t('team.body')}</Text>
    </View>

    <View style={styles.metricsRow}>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{activeMembers}</Text><Text style={styles.metricLabel}>{t('team.active')}</Text></View>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{activeBarbers}</Text><Text style={styles.metricLabel}>{labelRole('Barber')}</Text></View>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{requests.length}</Text><Text style={styles.metricLabel}>{t('team.requests', { count: requests.length })}</Text></View>
    </View>

    {loadError != null && <ErrorState error={loadError} retry={() => { void load(); }} />}

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionKicker}>{t('team.invite')}</Text><Text style={styles.sectionTitle}>{t('team.invite')}</Text></View>
        <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>＋</Text></View>
      </View>

      {formError != null && <ErrorState error={formError} />}

      <Text style={styles.muted}>{t('team.name')}</Text>
      <TextInput accessibilityLabel={t('team.name')} autoComplete="name" value={name} onChangeText={setName} placeholder={t('team.name')} placeholderTextColor={colors.textSubtle} style={styles.input} />

      <Text style={styles.muted}>{t('team.email')}</Text>
      <TextInput accessibilityLabel={t('team.email')} autoComplete="email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('team.email')} placeholderTextColor={colors.textSubtle} style={styles.input} />

      <View style={styles.roles}>
        {roles.map(item => (
          <Pressable key={item} onPress={() => setInviteRole(item)} style={[styles.roleChip, inviteRole === item && styles.roleChipActive]}>
            <Text style={[styles.roleText, inviteRole === item && styles.roleTextActive]}>{labelRole(item)}</Text>
          </Pressable>
        ))}
      </View>

      {inviteRole === 'Barber' && (
        <View>
          <Text style={styles.muted}>{t('team.chair')}</Text>
          <TextInput value={chair || String(nextSuggestedChair)} onChangeText={setChair} keyboardType="number-pad" accessibilityLabel={t('team.chair')} placeholderTextColor={colors.textSubtle} style={styles.input} />
          <Text style={styles.helper}>{t('team.suggestion', { chair: nextSuggestedChair })}</Text>
        </View>
      )}

      <Pressable
        disabled={working || loading || loadError != null || !name.trim() || !email.trim()}
        onPress={invite}
        style={({ pressed }) => [styles.primary, (working || loading || loadError != null || !name.trim() || !email.trim()) && styles.disabled, pressed && styles.primaryPressed]}
      >
        <Text style={styles.primaryText}>{working ? t('team.working') : t('team.create')}</Text>
        <Text style={styles.primaryArrow}>→</Text>
      </Pressable>
      <Text style={styles.helper}>{t('team.helper')}</Text>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionKicker}>{t('team.requests', { count: requests.length })}</Text><Text style={styles.sectionTitle}>{t('team.requests', { count: requests.length })}</Text></View>
        <View style={styles.countBadge}><Text style={styles.countText}>{requests.length}</Text></View>
      </View>

      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✓</Text>
          <View style={styles.itemGrow}><Text style={styles.emptyTitle}>{t('team.empty')}</Text></View>
        </View>
      ) : requests.map(request => (
        <View key={request.id} style={styles.item}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{request.barberName.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.itemGrow}><Text style={styles.itemTitle}>{request.barberName}</Text><Text style={styles.muted}>{request.email}</Text></View>
          <View style={styles.inlineActions}>
            <Pressable disabled={working} onPress={() => approve(request)} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>{t('team.approve')}</Text></Pressable>
            <Pressable disabled={working} onPress={() => reject(request)} style={styles.smallGhost}><Text style={styles.smallGhostText}>{t('team.reject')}</Text></Pressable>
          </View>
        </View>
      ))}
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionKicker}>{t('team.members', { count: members.length })}</Text><Text style={styles.sectionTitle}>{t('team.members', { count: members.length })}</Text></View>
        <View style={styles.countBadge}><Text style={styles.countText}>{members.length}</Text></View>
      </View>

      {members.map(member => (
        <View key={member.id} style={styles.member}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.itemGrow}>
            <Text style={styles.itemTitle}>{member.name}</Text>
            <Text style={styles.muted}>{member.email}</Text>
            <View style={styles.memberMeta}>
              <View style={[styles.statusDot, !member.isActive && styles.statusDotInactive]} />
              <Text style={styles.memberMetaText}>{labelRole(member.role)} · {member.isActive ? t('team.active') : t('team.inactive')}</Text>
            </View>
          </View>
          {role === 'Owner' && member.role !== 'Owner' && member.isActive && (
            <Pressable
              disabled={working}
              onPress={() => Alert.alert(
                t('team.deactivate'),
                t('team.deactivateConfirm', { name: member.name }),
                [
                  { text: t('team.cancel'), style: 'cancel' },
                  { text: t('team.deactivate'), style: 'destructive', onPress: () => { void deactivate(member); } },
                ],
              )}
              style={styles.smallGhost}
            >
              <Text style={styles.smallGhostText}>{t('team.deactivate')}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  </ScrollView><View style={styles.navWrap}><MobileBottomNav active="team" /></View></SafeAreaView>;



const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},
  loader:{flex:1},
  denied:{color:colors.text,padding:spacing.xl},
  content:{width:'100%',maxWidth:780,alignSelf:'center',padding:spacing.xl,paddingBottom:64,gap:spacing.lg},
  topbar:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  backButton:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
  back:{color:colors.primaryGlow,fontWeight:'900'},
  hero:{gap:7,marginBottom:4},
  eyebrow:{...typography.eyebrow,color:colors.primaryGlow},
  title:{...typography.title,color:colors.text,fontSize:31,lineHeight:37},
  body:{...typography.body,color:colors.textMuted,maxWidth:680},
  metricsRow:{flexDirection:'row',gap:8},
  metricCard:{flex:1,minHeight:86,justifyContent:'center',padding:12,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  metricValue:{color:colors.text,fontSize:25,fontWeight:'900'},
  metricLabel:{color:colors.textSubtle,fontSize:11,fontWeight:'800',marginTop:3},
  card:{backgroundColor:'rgba(10,18,33,.94)',borderWidth:1,borderColor:colors.border,borderRadius:radius.xl,padding:spacing.lg,gap:12},
  sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  sectionKicker:{...typography.eyebrow,color:colors.primaryGlow},
  sectionTitle:{...typography.sectionTitle,color:colors.text,marginTop:2},
  sectionIcon:{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong},
  sectionIconText:{color:colors.primaryGlow,fontSize:20,fontWeight:'900'},
  countBadge:{minWidth:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border},
  countText:{color:colors.text,fontWeight:'900'},
  input:{minHeight:56,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:15,backgroundColor:colors.surfaceStrong,fontSize:15,marginTop:6},
  roles:{flexDirection:'row',flexWrap:'wrap',gap:8},
  roleChip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:13,paddingVertical:9,minHeight:48,justifyContent:'center',backgroundColor:colors.surfaceStrong},
  roleChipActive:{borderColor:colors.primaryGlow,backgroundColor:colors.primarySoft},
  roleText:{color:colors.textMuted,fontWeight:'800'},
  roleTextActive:{color:colors.primaryGlow},
  primary:{minHeight:56,backgroundColor:colors.primary,borderRadius:radius.md,paddingHorizontal:18,alignItems:'center',justifyContent:'center',flexDirection:'row'},
  primaryPressed:{backgroundColor:colors.primaryPressed},
  primaryText:{color:colors.white,fontWeight:'900'},
  primaryArrow:{position:'absolute',right:18,color:colors.white,fontSize:19,fontWeight:'900'},
  helper:{color:colors.textSubtle,fontSize:12,lineHeight:18},
  item:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.border},
  member:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.border},
  itemGrow:{flex:1},
  avatar:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong},
  avatarText:{color:colors.primaryGlow,fontWeight:'900'},
  itemTitle:{color:colors.text,fontWeight:'900',fontSize:15},
  muted:{color:colors.textMuted,fontSize:12,marginTop:3},
  memberMeta:{flexDirection:'row',alignItems:'center',gap:6,marginTop:5},
  statusDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},
  statusDotInactive:{backgroundColor:colors.textSubtle},
  memberMetaText:{color:colors.textSubtle,fontSize:11,fontWeight:'700'},
  inlineActions:{flexDirection:'row',gap:6},
  smallPrimary:{backgroundColor:colors.primary,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:9,minHeight:48,justifyContent:'center'},
  smallPrimaryText:{color:colors.white,fontWeight:'900',fontSize:11},
  smallGhost:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:9,minHeight:48,justifyContent:'center'},
  smallGhostText:{color:colors.textMuted,fontWeight:'800',fontSize:11},
  empty:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8},
  emptyIcon:{width:38,textAlign:'center',color:colors.success,fontSize:20,fontWeight:'900'},
  emptyTitle:{color:colors.text,fontWeight:'900'},
  disabled:{opacity:.5},
  navWrap:{width:'100%',maxWidth:780,alignSelf:'center',paddingHorizontal:spacing.sm,paddingBottom:spacing.sm,backgroundColor:'rgba(5,9,18,.92)'},
});
