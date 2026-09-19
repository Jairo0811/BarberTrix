export type ShopSort = 'wait' | 'availability';
export function sortShops<T extends { availableBarbers: number; estimatedWaitMinutes?: number | null; name: string }>(shops: readonly T[], sort: ShopSort): T[] {
  return [...shops].sort((a, b) => {
    const available = sort === 'availability' ? b.availableBarbers - a.availableBarbers : 0;
    return available || (a.estimatedWaitMinutes ?? Infinity) - (b.estimatedWaitMinutes ?? Infinity) || a.name.localeCompare(b.name);
  });
}
