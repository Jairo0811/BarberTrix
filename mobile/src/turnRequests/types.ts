export type TurnRequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'CounterProposed'
  | 'Cancelled'
  | 'Expired';

export type PublicService = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  estimatedDurationMinutes: number;
  isActive: boolean;
};

export type PublicBarber = {
  id: string;
  name: string;
  chairNumber: number;
  status: string;
  isActive: boolean;
};

export type PublicShop = {
  id: string;
  name: string;
  slug: string;
  timeZoneId: string;
  services: PublicService[];
  barbers: PublicBarber[];
};

export type AvailabilitySlot = {
  startsAtUtc: string;
  endsAtUtc: string;
  barberId: string;
  barberName: string;
};

export type TurnRequest = {
  id: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  requestedStartsAtUtc: string;
  counterProposedStartsAtUtc?: string | null;
  effectiveStartsAtUtc: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  status: TurnRequestStatus;
  expiresAtUtc: string;
  respondedAtUtc?: string | null;
  appointmentId?: string | null;
  createdAtUtc: string;
};

export type PublicTurnRequestResponse = {
  request: TurnRequest;
  lookupToken: string;
};

export type CreateTurnRequestInput = {
  serviceId: string;
  barberId: string;
  requestedStartsAt: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
};
