import { useCallback, useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_URL, readAuth } from '../../../api'
import type { Barber, Service, Turn } from '../../../types'
import { getErrorMessage } from '../../../shared/utils/errors'
import { getQueueSnapshot, type QueueMetrics } from '../api/queueApi'

export function useQueueSnapshot(loadErrorMessage: string) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const snapshot = await getQueueSnapshot()
      setBarbers(snapshot.barbers)
      setServices(snapshot.services)
      setTurns(snapshot.turns)
      setMetrics(snapshot.metrics)
      setError('')
    } catch (exception) {
      setError(getErrorMessage(exception, loadErrorMessage))
    } finally {
      setLoading(false)
    }
  }, [loadErrorMessage])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`, { accessTokenFactory: () => readAuth()?.accessToken ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('queueChanged', () => { void refresh() })
    void connection.start().catch(() => undefined)
    return () => { void connection.stop() }
  }, [refresh])

  const overview = useMemo(() => ({
    waiting: metrics?.waiting ?? turns.filter(turn => turn.status === 'Waiting').length,
    inService: metrics?.inService ?? turns.filter(turn => turn.status === 'InService').length,
    completed: metrics?.completedToday ?? 0,
    availableBarbers: metrics?.availableBarbers ?? barbers.filter(barber => barber.status === 'Available').length,
  }), [barbers, metrics, turns])

  return { barbers, services, turns, overview, error, setError, loading, refresh }
}
