import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { createQueueHub } from './queueHub';
import { manageRealtime, type RealtimeState } from './lifecycle';
export function useQueueRealtime(token: string | undefined, scope: string, resync: () => void) {
  const [state, setState] = useState<RealtimeState>('Offline');
  const tokenRef = useRef(token); tokenRef.current = token;
  const syncRef = useRef(resync); syncRef.current = resync;
  const enabled = Boolean(token);
  useFocusEffect(useCallback(() => {
    if (!enabled) { setState('Offline'); return; }
    const connection = createQueueHub(() => tokenRef.current ?? '');
    const sync = () => syncRef.current();
    connection.on('queueChanged', sync);
    const lifecycle = manageRealtime(connection, setState, sync, error => console.warn('[realtime] Unexpected connection failure', error));
    void lifecycle.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', value => { void lifecycle.setActive(value === 'active'); });
    return () => { subscription.remove(); connection.off('queueChanged', sync); void lifecycle.dispose(); };
  }, [enabled, scope]));
  return state;
}
