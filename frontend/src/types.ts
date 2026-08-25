export type BarberStatus = 'Available' | 'Busy' | 'Break' | 'Offline'
export type TurnStatus = 'Waiting' | 'Called' | 'InService' | 'Completed' | 'Cancelled' | 'NoShow'

export type Barber = {
  id: string
  name: string
  chairNumber: number
  status: BarberStatus
  isActive: boolean
}

export type Service = {
  id: string
  name: string
  description?: string | null
  price: number
  estimatedDurationMinutes: number
  isActive: boolean
}

export type Turn = {
  id: string
  ticketNumber: string
  customerName?: string | null
  status: TurnStatus
  serviceId: string
  serviceName: string
  barberId?: string | null
  barberName?: string | null
  chairNumber?: number | null
}

export type Auth = {
  accessToken: string
  expiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  userId: string
  barberShopId: string
  barberId?: string | null
  name: string
  role: string
  isEmailVerified: boolean
}
