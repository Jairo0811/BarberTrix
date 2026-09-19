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
import { colors, radius, spacing } from '@/theme/tokens';
import { ErrorState } from '@/ui/ErrorState';
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

  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void load(); }} tintColor={colors.primaryGlow} />} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>{t('team.back')}</Text></Pressable>
    <View><Text style={styles.eyebrow}>{t('team.eyebrow')}</Text><Text style={styles.title}>{t('team.title')}</Text><Text style={styles.body}>{t('team.body')}</Text></View>

    {loadError != null && <ErrorState error={loadError} retry={() => { void load(); }} />}
    <View style={styles.card}><Text style={styles.sectionTitle}>{t('team.invite')}</Text>
      {formError != null && <ErrorState error={formError} />}
      <Text style={styles.muted}>{t('team.name')}</Text><TextInput accessibilityLabel={t('team.name')} autoComplete="name" value={name} onChangeText={setName} placeholder={t('team.name')} placeholderTextColor={colors.textSubtle} style={styles.input} />
      <Text style={styles.muted}>{t('team.email')}</Text><TextInput accessibilityLabel={t('team.email')} autoComplete="email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('team.email')} placeholderTextColor={colors.textSubtle} style={styles.input} />
      <View style={styles.roles}>{roles.map(item => <Pressable key={item} onPress={() => setInviteRole(item)} style={[styles.roleChip, inviteRole === item && styles.roleChipActive]}><Text style={[styles.roleText, inviteRole === item && styles.roleTextActive]}>{labelRole(item)}</Text></Pressable>)}</View>
      {inviteRole === 'Barber' && <View><Text style={styles.muted}>{t('team.chair')}</Text><TextInput value={chair || String(nextSuggestedChair)} onChangeText={setChair} keyboardType="number-pad" accessibilityLabel={t('team.chair')} placeholderTextColor={colors.textSubtle} style={styles.input} /><Text style={styles.helper}>{t('team.suggestion', { chair: nextSuggestedChair })}</Text></View>}
      <Pressable disabled={working || loading || loadError != null || !name.trim() || !email.trim()} onPress={invite} style={[styles.primary, working && styles.disabled]}><Text style={styles.primaryText}>{working ? t('team.working') : t('team.create')}</Text></Pressable>
      <Text style={styles.helper}>{t('team.helper')}</Text>
    </View>

    <View style={styles.card}><Text style={styles.sectionTitle}>{t('team.requests', { count: requests.length })}</Text>
      {requests.length === 0 ? <Text style={styles.muted}>{t('team.empty')}</Text> : requests.map(request => <View key={request.id} style={styles.item}><View style={styles.itemGrow}><Text style={styles.itemTitle}>{request.barberName}</Text><Text style={styles.muted}>{request.email}</Text></View><Pressable disabled={working} onPress={() => approve(request)} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>{t('team.approve')}</Text></Pressable><Pressable disabled={working} onPress={() => reject(request)} style={styles.smallGhost}><Text style={styles.smallGhostText}>{t('team.reject')}</Text></Pressable></View>)}
    </View>

    <View style={styles.card}><Text style={styles.sectionTitle}>{t('team.members', { count: members.length })}</Text>
      {members.map(member => <View key={member.id} style={styles.member}><View style={styles.itemGrow}><Text style={styles.itemTitle}>{member.name}</Text><Text style={styles.muted}>{member.email} · {labelRole(member.role)} · {member.isActive ? t('team.active') : t('team.inactive')}</Text></View>{role === 'Owner' && member.role !== 'Owner' && member.isActive && <Pressable disabled={working} onPress={() => Alert.alert(t('team.deactivate'), t('team.deactivateConfirm', { name: member.name }), [{ text: t('team.cancel'), style: 'cancel' }, { text: t('team.deactivate'), style: 'destructive', onPress: () => { void deactivate(member); } }])} style={styles.smallGhost}><Text style={styles.smallGhostText}>{t('team.deactivate')}</Text></Pressable>}</View>)}
    </View>
  </ScrollView><View style={{ padding: 12 }}><MobileBottomNav active="team" /></View></SafeAreaView>;
}



const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},loader:{flex:1},denied:{color:colors.text,padding:spacing.xl},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:spacing.xl,paddingBottom:56,gap:spacing.xl},back:{color:colors.primaryGlow,fontWeight:'800'},eyebrow:{color:colors.primaryGlow,fontSize:12,fontWeight:'900',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:6},body:{color:colors.textMuted,lineHeight:22,marginTop:8},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:12},sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},input:{color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:12,backgroundColor:colors.backgroundElevated},roles:{flexDirection:'row',flexWrap:'wrap',gap:8},roleChip:{borderWidth:1,borderColor:colors.border,borderRadius:99,paddingHorizontal:12,paddingVertical:8,minHeight:48,justifyContent:'center'},roleChipActive:{borderColor:colors.primaryGlow,backgroundColor:colors.primarySoft},roleText:{color:colors.textMuted,fontWeight:'700'},roleTextActive:{color:colors.primaryGlow},primary:{backgroundColor:colors.primaryGlow,borderRadius:radius.md,padding:14,alignItems:'center'},primaryText:{color:colors.background,fontWeight:'900'},helper:{color:colors.textSubtle,fontSize:12,lineHeight:18},item:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:colors.border},member:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:colors.border},itemGrow:{flex:1},itemTitle:{color:colors.text,fontWeight:'800'},muted:{color:colors.textMuted,fontSize:13,marginTop:3},smallPrimary:{backgroundColor:colors.primaryGlow,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:8,minHeight:48,justifyContent:'center'},smallPrimaryText:{color:colors.background,fontWeight:'800',fontSize:12},smallGhost:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:8,minHeight:48,justifyContent:'center'},smallGhostText:{color:colors.textMuted,fontWeight:'800',fontSize:12},disabled:{opacity:.5}
});
