// Match the database invariant: even inactive barbers retain their chair number.
export function suggestChair(barbers: readonly { chairNumber: number }[]): number {
  return Math.max(0, ...barbers.map(barber => barber.chairNumber)) + 1;
}
