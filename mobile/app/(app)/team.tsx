import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import {
  approveJoinRequest,
  createOperationalBarber,
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
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

const roles: TeamRole[] = ['Barber', 'Receptionist', 'Administrator'];

export default function TeamScreen() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const role = session?.user.role;
  const canManage = role === 'Owner' || role === 'Administrator';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [barbers, setBarbers] = useState<OperationalBarber[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Barber');
  const [chair, setChair] = useState('1');

  async function load() {
    if (!token || !canManage) return;
    setLoading(true);
    try {
      const [team, operational, pending] = await Promise.all([getTeam(token), getOperationalBarbers(token), getJoinRequests(token)]);
      setMembers(team); setBarbers(operational); setRequests(pending);
    } catch (error) { showError(error); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [token, canManage]);
  const nextSuggestedChair = useMemo(() => Math.max(0, ...barbers.map(x => x.chairNumber)) + 1, [barbers]);
  const activeMembers = members.filter(member => member.isActive).length;
  const activeBarbers = barbers.length;

  async function invite() {
    if (!token || !name.trim() || !email.trim()) return;
    setWorking(true);
    try {
      let barberId: string | null = null;
      if (inviteRole === 'Barber') {
        const chairNumber = Number(chair || nextSuggestedChair);
        if (!Number.isInteger(chairNumber) || chairNumber <= 0) throw new Error('El número de silla debe ser mayor que cero.');
        const operational = await createOperationalBarber(token, name.trim(), chairNumber);
        barberId = operational.id;
      }
      const invitation = await inviteTeamMember(token, name.trim(), email.trim(), inviteRole, barberId);
      setName(''); setEmail(''); setChair(String(nextSuggestedChair + (inviteRole === 'Barber' ? 1 : 0)));
      await load();
      Alert.alert('Invitación creada', invitation.developmentAcceptanceUrl ? `En desarrollo puedes abrir:\n${invitation.developmentAcceptanceUrl}` : `Invitación enviada a ${invitation.email}.`);
    } catch (error) { showError(error); } finally { setWorking(false); }
  }

  async function approve(request: JoinRequest) {
    if (!token) return;
    const chairNumber = nextSuggestedChair;
    setWorking(true);
    try { await approveJoinRequest(token, request.id, chairNumber); await load(); Alert.alert('Barbero vinculado', `${request.barberName} fue aprobado y asignado a la silla ${chairNumber}.`); }
    catch (error) { showError(error); } finally { setWorking(false); }
  }

  async function reject(request: JoinRequest) {
    if (!token) return;
    setWorking(true);
    try { await rejectJoinRequest(token, request.id, 'Solicitud rechazada desde BarberTrix Mobile.'); await load(); }
    catch (error) { showError(error); } finally { setWorking(false); }
  }

  async function deactivate(member: TeamMember) {
    if (!token || role !== 'Owner') return;
    setWorking(true);
    try { await deactivateTeamMember(token, member.id); await load(); }
    catch (error) { showError(error); } finally { setWorking(false); }
  }

  if (!canManage) return <SafeAreaView style={styles.safe}><Text style={styles.denied}>Esta sección está disponible para propietarios y administradores.</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ActivityIndicator style={styles.loader} color={colors.primaryGlow} size="large" /></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><BrandLogo compact /><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>← Volver</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>EQUIPO BARBERTRIX</Text><Text style={styles.title}>Tu equipo, en un solo lugar</Text><Text style={styles.body}>Invita, aprueba y administra el personal de la barbería con una vista más simple y orientada a la operación diaria.</Text></View>

    <View style={styles.metricsRow}>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{activeMembers}</Text><Text style={styles.metricLabel}>Miembros activos</Text></View>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{activeBarbers}</Text><Text style={styles.metricLabel}>Barberos</Text></View>
      <View style={styles.metricCard}><Text style={styles.metricValue}>{requests.length}</Text><Text style={styles.metricLabel}>Solicitudes</Text></View>
    </View>

    <View style={styles.card}><View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>NUEVO ACCESO</Text><Text style={styles.sectionTitle}>Invitar miembro</Text></View><View style={styles.sectionIcon}><Text style={styles.sectionIconText}>＋</Text></View></View>
      <TextInput value={name} onChangeText={setName} placeholder="Nombre completo" placeholderTextColor={colors.textSubtle} style={styles.input} />
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor={colors.textSubtle} style={styles.input} />
      <View style={styles.roles}>{roles.map(item => <Pressable key={item} onPress={() => setInviteRole(item)} style={[styles.roleChip, inviteRole === item && styles.roleChipActive]}><Text style={[styles.roleText, inviteRole === item && styles.roleTextActive]}>{labelRole(item)}</Text></Pressable>)}</View>
      {inviteRole === 'Barber' && <TextInput value={chair} onChangeText={setChair} keyboardType="number-pad" placeholder={`Silla sugerida: ${nextSuggestedChair}`} placeholderTextColor={colors.textSubtle} style={styles.input} />}
      <Pressable disabled={working || !name.trim() || !email.trim()} onPress={invite} style={({ pressed }) => [styles.primary, (working || !name.trim() || !email.trim()) && styles.disabled, pressed && styles.primaryPressed]}><Text style={styles.primaryText}>{working ? 'Procesando…' : 'Crear invitación'}</Text><Text style={styles.primaryArrow}>→</Text></Pressable>
      <Text style={styles.helper}>Para barberos, BarberTrix crea su plaza operativa y luego vincula el acceso del usuario.</Text>
    </View>

    <View style={styles.card}><View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>PENDIENTES</Text><Text style={styles.sectionTitle}>Solicitudes para unirse</Text></View><View style={styles.countBadge}><Text style={styles.countText}>{requests.length}</Text></View></View>
      {requests.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><View style={styles.itemGrow}><Text style={styles.emptyTitle}>Todo al día</Text><Text style={styles.muted}>No hay solicitudes pendientes.</Text></View></View> : requests.map(request => <View key={request.id} style={styles.item}><View style={styles.avatar}><Text style={styles.avatarText}>{request.barberName.slice(0,1).toUpperCase()}</Text></View><View style={styles.itemGrow}><Text style={styles.itemTitle}>{request.barberName}</Text><Text style={styles.muted}>{request.email}</Text></View><View style={styles.inlineActions}><Pressable disabled={working} onPress={() => approve(request)} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>Aprobar</Text></Pressable><Pressable disabled={working} onPress={() => reject(request)} style={styles.smallGhost}><Text style={styles.smallGhostText}>Rechazar</Text></Pressable></View></View>)}
    </View>

    <View style={styles.card}><View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>DIRECTORIO</Text><Text style={styles.sectionTitle}>Miembros</Text></View><View style={styles.countBadge}><Text style={styles.countText}>{members.length}</Text></View></View>
      {members.map(member => <View key={member.id} style={styles.member}><View style={styles.avatar}><Text style={styles.avatarText}>{member.name.slice(0,1).toUpperCase()}</Text></View><View style={styles.itemGrow}><Text style={styles.itemTitle}>{member.name}</Text><Text style={styles.muted}>{member.email}</Text><View style={styles.memberMeta}><View style={styles.statusDot}/><Text style={styles.memberMetaText}>{labelRole(member.role)} · {member.isActive ? 'Activo' : 'Inactivo'}</Text></View></View>{role === 'Owner' && member.role !== 'Owner' && member.isActive && <Pressable disabled={working} onPress={() => deactivate(member)} style={styles.smallGhost}><Text style={styles.smallGhostText}>Desactivar</Text></Pressable>}</View>)}
    </View>
  </ScrollView></SafeAreaView>;
}

function labelRole(role: string) { return role === 'Barber' ? 'Barbero' : role === 'Receptionist' ? 'Recepción' : role === 'Administrator' ? 'Administrador' : role === 'Owner' ? 'Propietario' : role; }
function showError(error: unknown) { Alert.alert('No se pudo completar', error instanceof MobileApiError || error instanceof Error ? error.message : 'Ocurrió un error inesperado.'); }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},loader:{flex:1},denied:{color:colors.text,padding:spacing.xl},content:{width:'100%',maxWidth:780,alignSelf:'center',padding:spacing.xl,paddingBottom:64,gap:spacing.lg},
  topbar:{minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{minHeight:44,justifyContent:'center',paddingHorizontal:8},back:{color:colors.primaryGlow,fontWeight:'900'},
  hero:{gap:7,marginBottom:4},eyebrow:{...typography.eyebrow,color:colors.primaryGlow},title:{...typography.title,color:colors.text,fontSize:31,lineHeight:37},body:{...typography.body,color:colors.textMuted,maxWidth:680},
  metricsRow:{flexDirection:'row',gap:8},metricCard:{flex:1,minHeight:86,justifyContent:'center',padding:12,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},metricValue:{color:colors.text,fontSize:25,fontWeight:'900'},metricLabel:{color:colors.textSubtle,fontSize:11,fontWeight:'800',marginTop:3},
  card:{backgroundColor:'rgba(10,18,33,.94)',borderWidth:1,borderColor:colors.border,borderRadius:radius.xl,padding:spacing.lg,gap:12},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},sectionKicker:{color:colors.primaryGlow,fontSize:10,fontWeight:'900',letterSpacing:1.4},sectionTitle:{color:colors.text,fontSize:19,fontWeight:'900',marginTop:2},sectionIcon:{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong},sectionIconText:{color:colors.primaryGlow,fontSize:20,fontWeight:'900'},countBadge:{minWidth:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceStrong,borderWidth:1,borderColor:colors.border},countText:{color:colors.text,fontWeight:'900'},
  input:{minHeight:56,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:15,backgroundColor:colors.surfaceStrong,fontSize:15},roles:{flexDirection:'row',flexWrap:'wrap',gap:8},roleChip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:13,paddingVertical:9,backgroundColor:colors.surfaceStrong},roleChipActive:{borderColor:colors.primaryGlow,backgroundColor:colors.primarySoft},roleText:{color:colors.textMuted,fontWeight:'800'},roleTextActive:{color:colors.primaryGlow},
  primary:{minHeight:56,backgroundColor:colors.primary,borderRadius:radius.md,paddingHorizontal:18,alignItems:'center',justifyContent:'center',flexDirection:'row'},primaryPressed:{backgroundColor:colors.primaryPressed},primaryText:{color:colors.white,fontWeight:'900'},primaryArrow:{position:'absolute',right:18,color:colors.white,fontSize:19,fontWeight:'900'},helper:{color:colors.textSubtle,fontSize:12,lineHeight:18},
  item:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.border},member:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.border},itemGrow:{flex:1},avatar:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.borderStrong},avatarText:{color:colors.primaryGlow,fontWeight:'900'},itemTitle:{color:colors.text,fontWeight:'900',fontSize:15},muted:{color:colors.textMuted,fontSize:12,marginTop:3},memberMeta:{flexDirection:'row',alignItems:'center',gap:6,marginTop:5},statusDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},memberMetaText:{color:colors.textSubtle,fontSize:11,fontWeight:'700'},inlineActions:{flexDirection:'row',gap:6},smallPrimary:{backgroundColor:colors.primary,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:9},smallPrimaryText:{color:colors.white,fontWeight:'900',fontSize:11},smallGhost:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:9},smallGhostText:{color:colors.textMuted,fontWeight:'800',fontSize:11},
  empty:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8},emptyIcon:{width:38,textAlign:'center',color:colors.success,fontSize:20,fontWeight:'900'},emptyTitle:{color:colors.text,fontWeight:'900'},disabled:{opacity:.5}
});
