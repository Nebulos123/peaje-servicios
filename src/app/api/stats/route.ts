import { NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(incidents)
    .where(gte(incidents.startedAt, since));

  // Separar datos por tipo
  const antennaRows = rows.filter((r) => r.type === "antena");
  const diskRows = rows.filter((r) => r.type === "disco_lleno");

  // --- Estadísticas de Antenas ---
  const antennaByLane = new Map<number, { count: number; totalDownMs: number; open: number }>();
  const antennaByHour = new Array(24).fill(0).map(() => ({ count: 0 }));
  const antennaByDay = new Map<string, number>();
  let antTotalDownMs = 0;
  let antResolvedCount = 0;
  let antOpenCount = 0;

  for (const r of antennaRows) {
    const start = new Date(r.startedAt);
    const end = r.resolvedAt ? new Date(r.resolvedAt) : null;
    const downMs = end ? end.getTime() - start.getTime() : 0;

    const cur = antennaByLane.get(r.lane) ?? { count: 0, totalDownMs: 0, open: 0 };
    cur.count += 1;
    cur.totalDownMs += downMs;
    if (!end) cur.open += 1;
    antennaByLane.set(r.lane, cur);

    antennaByHour[start.getHours()].count += 1;

    const dayKey = start.toISOString().slice(0, 10);
    antennaByDay.set(dayKey, (antennaByDay.get(dayKey) ?? 0) + 1);

    antTotalDownMs += downMs;
    if (end) antResolvedCount += 1;
    else antOpenCount += 1;
  }

  const antennaLaneStats = Array.from(antennaByLane.entries())
    .map(([lane, v]) => ({
      lane,
      count: v.count,
      open: v.open,
      avgDownMs: v.count > 0 ? Math.round(v.totalDownMs / v.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const antennaHourStats = antennaByHour.map((h, i) => ({ hour: i, count: h.count }));
  const antennaDayStats = Array.from(antennaByDay.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  // --- Estadísticas de Discos Llenos ---
  const diskByLane = new Map<number, { count: number; totalFullMs: number; open: number; dates: number[] }>();
  const diskByHour = new Array(24).fill(0).map(() => ({ count: 0 }));
  const diskByDay = new Map<string, number>();
  let diskTotalFullMs = 0;
  let diskResolvedCount = 0;
  let diskOpenCount = 0;

  for (const r of diskRows) {
    const start = new Date(r.startedAt);
    const end = r.resolvedAt ? new Date(r.resolvedAt) : null;
    const fullMs = end ? end.getTime() - start.getTime() : 0;

    const cur = diskByLane.get(r.lane) ?? { count: 0, totalFullMs: 0, open: 0, dates: [] };
    cur.count += 1;
    cur.totalFullMs += fullMs;
    cur.dates.push(start.getTime());
    if (!end) cur.open += 1;
    diskByLane.set(r.lane, cur);

    diskByHour[start.getHours()].count += 1;

    const dayKey = start.toISOString().slice(0, 10);
    diskByDay.set(dayKey, (diskByDay.get(dayKey) ?? 0) + 1);

    diskTotalFullMs += fullMs;
    if (end) diskResolvedCount += 1;
    else diskOpenCount += 1;
  }

  // Calcular la frecuencia promedio en días entre llenados por vía
  const diskLaneStats = Array.from(diskByLane.entries())
    .map(([lane, v]) => {
      // Ordenar fechas cronológicamente
      const sortedDates = [...v.dates].sort((a, b) => a - b);
      let avgIntervalDays: number | null = null;
      if (sortedDates.length > 1) {
        let diffSum = 0;
        for (let i = 1; i < sortedDates.length; i++) {
          diffSum += sortedDates[i] - sortedDates[i - 1];
        }
        const avgMs = diffSum / (sortedDates.length - 1);
        avgIntervalDays = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10; // 1 decimal
      }

      return {
        lane,
        count: v.count,
        open: v.open,
        avgIntervalDays, // promedio de días entre llenados
        avgFullMs: v.count > 0 ? Math.round(v.totalFullMs / v.count) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const diskHourStats = diskByHour.map((h, i) => ({ hour: i, count: h.count }));
  const diskDayStats = Array.from(diskByDay.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  return NextResponse.json({
    range: { days, since: since.toISOString() },
    antenna: {
      totals: {
        incidents: antennaRows.length,
        resolved: antResolvedCount,
        open: antOpenCount,
        totalDownMs: antTotalDownMs,
        avgDownMs: antResolvedCount > 0 ? Math.round(antTotalDownMs / antResolvedCount) : 0,
      },
      laneStats: antennaLaneStats,
      hourStats: antennaHourStats,
      dayStats: antennaDayStats,
    },
    disk: {
      totals: {
        incidents: diskRows.length,
        resolved: diskResolvedCount,
        open: diskOpenCount,
        totalFullMs: diskTotalFullMs,
        avgFullMs: diskResolvedCount > 0 ? Math.round(diskTotalFullMs / diskResolvedCount) : 0,
      },
      laneStats: diskLaneStats,
      hourStats: diskHourStats,
      dayStats: diskDayStats,
    },
  });
}
