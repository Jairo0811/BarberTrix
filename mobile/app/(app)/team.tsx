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
import { colors, radius, spacing } from '@/theme/tokens';
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
      const [team, operational, pending] = await Promise.all([
        getTeam(token),
        getOperationalBarbers(token),
        getJoinRequests(token),
      ]);
      setMembers(team); setBarbers(operational); setRequests(pending);
    } catch (error) { showError(error); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [token, canManage]);

  const nextSuggestedChair = useMemo(() => Math.max(0, ...barbers.map(x => x.chairNumber)) + 1, [barbers]);

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
    try {
      await approveJoinRequest(token, request.id, chairNumber);
      await load();
      Alert.alert('Barbero vinculado', `${request.barberName} fue aprobado y asignado a la silla ${chairNumber}.`);
    } catch (error) { showError(error); } finally { setWorking(false); }
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

  return <SafeAreaView style={styles.safe}><BrandedBackground compact /><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
    <View><Text style={styles.eyebrow}>EQUIPO</Text><Text style={styles.title}>Team Management</Text><Text style={styles.body}>Invita empleados o revisa solicitudes de barberos independientes. La identidad del usuario permanece separada de su vínculo con la barbería.</Text></View>

    <View style={styles.card}><Text style={styles.sectionTitle}>Invitar miembro</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.textSubtle} style={styles.input} />
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Correo" placeholderTextColor={colors.textSubtle} style={styles.input} />
      <View style={styles.roles}>{roles.map(item => <Pressable key={item} onPress={() => setInviteRole(item)} style={[styles.roleChip, inviteRole === item && styles.roleChipActive]}><Text style={[styles.roleText, inviteRole === item && styles.roleTextActive]}>{labelRole(item)}</Text></Pressable>)}</View>
      {inviteRole === 'Barber' && <TextInput value={chair} onChangeText={setChair} keyboardType="number-pad" placeholder={`Silla sugerida: ${nextSuggestedChair}`} placeholderTextColor={colors.textSubtle} style={styles.input} />}
      <Pressable disabled={working || !name.trim() || !email.trim()} onPress={invite} style={[styles.primary, working && styles.disabled]}><Text style={styles.primaryText}>{working ? 'Procesando…' : 'Crear invitación'}</Text></Pressable>
      <Text style={styles.helper}>Para un barbero, BarberTrix crea primero su plaza operativa y luego envía la invitación de acceso.</Text>
    </View>

    <View style={styles.card}><Text style={styles.sectionTitle}>Solicitudes para unirse ({requests.length})</Text>
      {requests.length === 0 ? <Text style={styles.muted}>No hay solicitudes pendientes.</Text> : requests.map(request => <View key={request.id} style={styles.item}><View style={styles.itemGrow}><Text style={styles.itemTitle}>{request.barberName}</Text><Text style={styles.muted}>{request.email}</Text></View><Pressable disabled={working} onPress={() => approve(request)} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>Aprobar</Text></Pressable><Pressable disabled={working} onPress={() => reject(request)} style={styles.smallGhost}><Text style={styles.smallGhostText}>Rechazar</Text></Pressable></View>)}
    </View>

    <View style={styles.card}><Text style={styles.sectionTitle}>Miembros ({members.length})</Text>
      {members.map(member => <View key={member.id} style={styles.member}><View style={styles.itemGrow}><Text style={styles.itemTitle}>{member.name}</Text><Text style={styles.muted}>{member.email} · {labelRole(member.role)} · {member.isActive ? 'Activo' : 'Inactivo'}</Text></View>{role === 'Owner' && member.role !== 'Owner' && member.isActive && <Pressable disabled={working} onPress={() => deactivate(member)} style={styles.smallGhost}><Text style={styles.smallGhostText}>Desactivar</Text></Pressable>}</View>)}
    </View>
  </ScrollView></SafeAreaView>;
}

function labelRole(role: string) { return role === 'Barber' ? 'Barbero' : role === 'Receptionist' ? 'Recepción' : role === 'Administrator' ? 'Administrador' : role === 'Owner' ? 'Propietario' : role; }
function showError(error: unknown) { Alert.alert('No se pudo completar', error instanceof MobileApiError || error instanceof Error ? error.message : 'Ocurrió un error inesperado.'); }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},loader:{flex:1},denied:{color:colors.text,padding:spacing.xl},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:spacing.xl,paddingBottom:56,gap:spacing.xl},back:{color:colors.primaryGlow,fontWeight:'800'},eyebrow:{color:colors.primaryGlow,fontSize:12,fontWeight:'900',letterSpacing:2},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:6},body:{color:colors.textMuted,lineHeight:22,marginTop:8},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:12},sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},input:{color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:12,backgroundColor:colors.backgroundElevated},roles:{flexDirection:'row',flexWrap:'wrap',gap:8},roleChip:{borderWidth:1,borderColor:colors.border,borderRadius:99,paddingHorizontal:12,paddingVertical:8},roleChipActive:{borderColor:colors.primaryGlow,backgroundColor:colors.primarySoft},roleText:{color:colors.textMuted,fontWeight:'700'},roleTextActive:{color:colors.primaryGlow},primary:{backgroundColor:colors.primaryGlow,borderRadius:radius.md,padding:14,alignItems:'center'},primaryText:{color:colors.background,fontWeight:'900'},helper:{color:colors.textSubtle,fontSize:12,lineHeight:18},item:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:colors.border},member:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:colors.border},itemGrow:{flex:1},itemTitle:{color:colors.text,fontWeight:'800'},muted:{color:colors.textMuted,fontSize:13,marginTop:3},smallPrimary:{backgroundColor:colors.primaryGlow,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:8},smallPrimaryText:{color:colors.background,fontWeight:'800',fontSize:12},smallGhost:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,paddingHorizontal:10,paddingVertical:8},smallGhostText:{color:colors.textMuted,fontWeight:'800',fontSize:12},disabled:{opacity:.5}
});
