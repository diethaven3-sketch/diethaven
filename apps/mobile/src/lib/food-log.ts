import type { ExchangeGroup, FoodLogItem, MealType } from "@repo/types";

/** A food diary entry as the API returns it. */
export interface FoodLogEntry {
  id: string;
  date: string;
  mealType: MealType;
  items: FoodLogItem[];
  description: string | null;
  photoUrl: string | null;
  hungerBefore: number | null;
  fullnessAfter: number | null;
  symptoms: string | null;
}

export interface FoodExchangeItem {
  id: string;
  foodName: string;
  exchangeGroup: ExchangeGroup;
  portionSize: string;
}

/** Groups diary entries under their calendar date, newest day first. */
export function groupByDay(entries: FoodLogEntry[]): { date: string; entries: FoodLogEntry[] }[] {
  const byDate = new Map<string, FoodLogEntry[]>();
  for (const entry of entries) {
    const date = entry.date.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), entry]);
  }
  return [...byDate.entries()]
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDayHeading(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return "Today";

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (isoDate === yesterday) return "Yesterday";

  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** One-line summary of what an entry records, for the diary list. */
export function summariseEntry(entry: FoodLogEntry): string {
  if (entry.items.length > 0) {
    return entry.items
      .map((item) => (item.exchanges ? `${item.exchanges} × ${item.foodName}` : item.foodName))
      .join(", ");
  }
  return entry.description ?? "No details recorded";
}
