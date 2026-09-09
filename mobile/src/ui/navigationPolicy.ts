export type NavigationItem = { id: string; key: string; href: '/discover' | '/my-turns' | '/settings' | '/(app)' | '/(app)/turn-requests' | '/(app)/team' };
export function navigationForRole(role?: string): NavigationItem[] {
  if (role === 'Client') return [
    { id: 'discover', key: 'operations.discover', href: '/discover' },
    { id: 'history', key: 'operations.myTurns', href: '/my-turns' },
    { id: 'settings', key: 'operations.profile', href: '/settings' },
  ];
  if (!['Owner', 'Administrator', 'Receptionist', 'Barber'].includes(role ?? '')) return [{ id: 'discover', key: 'operations.discover', href: '/discover' }];
  return [
    { id: 'home', key: 'operations.today', href: '/(app)' },
    { id: 'requests', key: 'home.requests', href: '/(app)/turn-requests' },
    ...(role === 'Owner' || role === 'Administrator' ? [{ id: 'team', key: 'operations.team', href: '/(app)/team' } as const] : []),
    { id: 'settings', key: 'operations.settings', href: '/settings' },
  ];
}
