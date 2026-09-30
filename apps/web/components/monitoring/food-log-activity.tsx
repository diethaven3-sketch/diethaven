"use client";

import { useMemo } from "react";
import {
  MEAL_TYPE_LABELS,
  adherenceByDay,
  averageAdherence,
  plannedExchanges,
  type FoodLogItem,
  type Meal,
  type MealType,
} from "@repo/types";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, Thead, Tbody, Th, Td } from "../ui/table";
import { Pagination } from "../ui/pagination";
import { usePagination } from "../../lib/use-pagination";

export interface FoodLogRow {
  id: string;
  date: string;
  mealType: MealType;
  items: FoodLogItem[];
  description: string | null;
  hungerBefore: number | null;
  fullnessAfter: number | null;
  symptoms: string | null;
}

function adherenceTone(percent: number) {
  if (percent >= 80) return "success" as const;
  if (percent >= 50) return "warning" as const;
  return "danger" as const;
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Logging activity and adherence between visits (guideline §4.2.5).
 *
 * Adherence is measured against the meal plan currently attached to the
 * intervention. Superseded plans are not retained, so historical days are
 * scored against today's plan — the caption says so rather than implying the
 * figure is anchored to what was prescribed at the time.
 */
export function FoodLogActivity({ logs, activeMeals }: { logs: FoodLogRow[]; activeMeals: Meal[] | null }) {
  const planned = useMemo(() => plannedExchanges(activeMeals ?? []), [activeMeals]);
  const days = useMemo(() => adherenceByDay(logs, planned), [logs, planned]);
  const average = useMemo(() => averageAdherence(days), [days]);
  const dayPager = usePagination(days, 10);
  const entryPager = usePagination(logs, 10);

  if (logs.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-heading">Food diary</h3>
        <p className="mt-1 text-sm text-body">
          This patient has not logged any meals yet. Entries they record in the mobile app appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-heading">Food diary</h3>
            <p className="mt-1 text-sm text-body">
              {logs.length} {logs.length === 1 ? "entry" : "entries"} across {days.length}{" "}
              {days.length === 1 ? "day" : "days"}
            </p>
          </div>
          {average !== null ? (
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-body">Average adherence</p>
              <p className="text-2xl font-bold text-heading">{average}%</p>
            </div>
          ) : null}
        </div>

        {!activeMeals ? (
          <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-body">
            No meal plan is attached to an active intervention, so there is nothing to measure adherence against.
            Entries below are still shown.
          </p>
        ) : (
          <p className="mt-3 text-xs text-body">
            Adherence counts exchange quantities against the plan currently attached to this patient&apos;s
            intervention, including for past days. It says nothing about meal timing or food quality, and a day with
            nothing countable logged is left blank rather than scored zero.
          </p>
        )}
      </Card>

      {days.length > 0 && activeMeals ? (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Day</Th>
                <Th>Entries</Th>
                <Th>Adherence</Th>
                <Th>Exchanges logged against plan</Th>
              </tr>
            </Thead>
            <Tbody>
              {dayPager.pageItems.map((day) => (
                <tr key={day.date}>
                  <Td>{formatDate(day.date)}</Td>
                  <Td>{day.entries}</Td>
                  <Td>
                    {day.percent === null ? (
                      <span className="text-sm text-body">Not measurable</span>
                    ) : (
                      <Badge tone={adherenceTone(day.percent)}>{day.percent}%</Badge>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-body">
                      {day.byGroup
                        .filter((group) => group.planned > 0 || group.logged > 0)
                        .map((group) => `${group.group.toLowerCase()} ${group.logged}/${group.planned}`)
                        .join(" · ")}
                    </span>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          <Pagination {...dayPager} onPageChange={dayPager.setPage} noun="days" className="border-t border-gray-200 px-5 py-3" />
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="border-b border-gray-200 p-5">
          <h4 className="text-sm font-bold text-heading">Diary entries</h4>
        </div>
        <ul className="divide-y divide-gray-100">
          {entryPager.pageItems.map((log) => (
            <li key={log.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-heading">{MEAL_TYPE_LABELS[log.mealType]}</p>
                <p className="text-xs text-body">{new Date(log.date).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-sm text-body">
                {log.items.length > 0
                  ? log.items
                      .map((item) => (item.exchanges ? `${item.exchanges} × ${item.foodName}` : item.foodName))
                      .join(", ")
                  : (log.description ?? "No details recorded")}
              </p>
              {log.items.length > 0 && log.description ? (
                <p className="mt-1 text-sm text-body">{log.description}</p>
              ) : null}
              {log.hungerBefore || log.fullnessAfter ? (
                <p className="mt-1 text-xs text-body">
                  {log.hungerBefore ? `Hunger before ${log.hungerBefore}/5` : ""}
                  {log.hungerBefore && log.fullnessAfter ? " · " : ""}
                  {log.fullnessAfter ? `Fullness after ${log.fullnessAfter}/5` : ""}
                </p>
              ) : null}
              {log.symptoms ? <p className="mt-1 text-xs text-secondary-dark">Symptoms: {log.symptoms}</p> : null}
            </li>
          ))}
        </ul>
        <Pagination {...entryPager} onPageChange={entryPager.setPage} noun="entries" className="border-t border-gray-200 px-5 py-3" />
      </Card>
    </div>
  );
}
