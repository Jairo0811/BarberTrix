export function rebookParams(request: { slug: string; serviceId: string; barberId: string }) {
  // Intentionally do not carry any date, slot, request ID, or capability token.
  return { slug: request.slug, serviceId: request.serviceId, barberId: request.barberId };
}
