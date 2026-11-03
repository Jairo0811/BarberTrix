/** A shop counts as "open now" when at least one of its barbers is available right now (there are no business hours in the data model). */
export const isOpenNow = (shop: { availableBarbers: number }) => shop.availableBarbers > 0;

export function filterOpenNow<T extends { availableBarbers: number }>(shops: readonly T[], onlyOpen: boolean): T[] {
  return onlyOpen ? shops.filter(isOpenNow) : [...shops];
}
