"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/lanes";

type GroupStats = {
  totals: {
    incidents: number;
    resolved: number;
    open: number;
    totalDownMs?: number;
    totalFullMs?: number;
    avgDownMs?: number;
    avgFullMs?: number;
  };
  laneStats: {
    lane: number;
    count: number;
    open: number;
    avgIntervalDays?: number | null; // frecuencia promedio de días entre llenados
    avgDownMs?: number;
    avgFullMs?: number;
  }[];
  hourStats: { hour: number; count: number }[];
  dayStats: { day: string; count: number }[];
};

type StatsAPIResponse = {
  range: { days: number; since: string };
  antenna: GroupStats;
  disk: GroupStats;
};

export default function StatsPanel() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<StatsAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatType, setActiveStatType] = useState<"antena" | "disco_lleno">("antena");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !stats) {
    return (
      <div className="grid place-items-center py-20 text-slate-400">
        Analizando e interpretando métricas del peaje…
      </div>
    );
  }
  if (!stats) return null;

  const currentStats = activeStatType === "antena" ? stats.antenna : stats.disk;
  const totals = currentStats.totals;
  const laneStats = currentStats.laneStats;
  const hourStats = currentStats.hourStats;
  const dayStats = currentStats.dayStats;

  const maxLaneCount = Math.max(1, ...laneStats.map((l) => l.count));
  const maxHourCount = Math.max(1, ...hourStats.map((h) => h.count));
  const peakHour = hourStats.reduce(
    (acc, h) => (h.count > acc.count ? h : acc),
    { hour: 0, count: 0 }
  );
  const worstLane = laneStats[0];

  const avgDurationText =
    activeStatType === "antena"
      ? formatDuration(totals.avgDownMs ?? 0)
      : formatDuration(totals.avgFullMs ?? 0);

  const totalDurationText =
    activeStatType === "antena"
      ? formatDuration(totals.totalDownMs ?? 0)
      : formatDuration(totals.totalFullMs ?? 0);

  return (
    <div className="space-y-6">
      {/* Filtros superiores */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Panel de Estadísticas Avanzadas
          </h2>
          <p className="text-sm text-slate-400">
            Analizando datos históricos en un rango de {days} días.
          </p>
        </div>

        {/* Alternador de tipo de estadísticas */}
        <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveStatType("antena")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeStatType === "antena"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📡 Antenas Colgadas
          </button>
          <button
            onClick={() => setActiveStatType("disco_lleno")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeStatType === "disco_lleno"
                ? "bg-amber-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💾 Discos Llenos
          </button>
        </div>

        {/* Rango de días */}
        <div className="flex bg-slate-900/60 rounded-xl p-1 border border-white/5">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${
                days === d
                  ? "bg-indigo-500 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {d === 365 ? "1 año" : `${d} días`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI del tipo activo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Eventos"
          value={totals.incidents}
          accent={activeStatType === "antena" ? "indigo" : "amber"}
        />
        <StatCard
          label={activeStatType === "antena" ? "Tiempo total caído" : "Tiempo total lleno"}
          value={totalDurationText}
          accent="red"
        />
        <StatCard
          label={activeStatType === "antena" ? "Duración promedio de caída" : "Duración prom. lleno"}
          value={avgDurationText}
          accent="neutral"
        />
        <StatCard
          label="Activos ahora"
          value={totals.open}
          accent={totals.open > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Insights */}
      {totals.incidents > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          <InsightCard
            icon={activeStatType === "antena" ? "📡" : "💾"}
            title={activeStatType === "antena" ? "Vía con más caídas" : "Vía con disco más inestable"}
            value={worstLane ? `Vía ${worstLane.lane}` : "—"}
            subtitle={
              worstLane
                ? `${worstLane.count} incidentes · Promedio: ${
                    activeStatType === "antena"
                      ? formatDuration(worstLane.avgDownMs ?? 0)
                      : formatDuration(worstLane.avgFullMs ?? 0)
                  }`
                : ""
            }
            tone={activeStatType === "antena" ? "red" : "amber"}
          />
          <InsightCard
            icon="⏰"
            title="Hora de mayor saturación/caída"
            value={`${String(peakHour.hour).padStart(2, "0")}:00 – ${String(
              (peakHour.hour + 1) % 24
            ).padStart(2, "0")}:00`}
            subtitle={`${peakHour.count} incidentes registrados en este horario`}
            tone="amber"
          />
        </div>
      )}

      {/* Ranking de vías y Frecuencia de llenado */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gráfico de Ranking */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-white mb-4">
            {activeStatType === "antena"
              ? "Vías que más se reinician o caen"
              : "Vías cuyos discos se llenan con más frecuencia"}
          </h3>
          {laneStats.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              Sin incidentes registrados en este período.
            </p>
          ) : (
            <div className="space-y-3">
              {laneStats.slice(0, 10).map((l, i) => (
                <div key={l.lane} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">
                      #{i + 1} Vía {l.lane}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {l.count} {l.count === 1 ? "evento" : "eventos"}
                    </span>
                  </div>
                  <div className="h-6 bg-slate-900/60 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg transition-all ${
                        activeStatType === "antena"
                          ? "bg-gradient-to-r from-indigo-500 to-indigo-400"
                          : "bg-gradient-to-r from-amber-500 to-amber-400"
                      }`}
                      style={{
                        width: `${(l.count / maxLaneCount) * 100}%`,
                      }}
                    />
                    {activeStatType === "disco_lleno" && l.avgIntervalDays !== undefined && (
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-amber-200 font-medium">
                        {l.avgIntervalDays
                          ? `Se llena cada ${l.avgIntervalDays} días`
                          : "Solo 1 evento de llenado"}
                      </span>
                    )}
                    {activeStatType === "antena" && l.avgDownMs !== undefined && (
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-indigo-200 font-medium">
                        Prom. caída: {formatDuration(l.avgDownMs)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frecuencia de Llenado / Frecuencia de caída */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-2">
              {activeStatType === "antena"
                ? "Diagnóstico del Servicio de Antenas"
                : "Frecuencia de saturación de Discos"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {activeStatType === "antena"
                ? "Permite ver el tiempo promedio de recuperación del servicio y las vías de mayor inestabilidad conectiva."
                : "Muestra cada cuántos días se llena el disco de almacenamiento en cada vía para programar tareas preventivas de limpieza."}
            </p>

            {activeStatType === "disco_lleno" ? (
              <div className="bg-slate-900/70 border border-amber-500/10 rounded-xl p-4 space-y-3">
                <h4 className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                  Estimación de Limpieza Preventiva
                </h4>
                {laneStats.some((l) => l.avgIntervalDays) ? (
                  <div className="divide-y divide-white/5 text-sm">
                    {laneStats
                      .filter((l) => l.avgIntervalDays)
                      .slice(0, 5)
                      .map((l) => (
                        <div key={l.lane} className="py-2 flex justify-between">
                          <span className="text-slate-300">Vía {l.lane}</span>
                          <span className="text-amber-200 font-semibold tabular-nums">
                            Cada {l.avgIntervalDays} días (Llenado)
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Se requieren al menos 2 reportes de disco lleno en una misma vía para estimar la frecuencia del ciclo de llenado.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/70 border border-indigo-500/10 rounded-xl p-4 space-y-3">
                <h4 className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                  Resumen de Estabilidad de Antena
                </h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Vías activas monitoreadas:</span>
                    <span className="text-white font-semibold">46</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vías con incidentes:</span>
                    <span className="text-indigo-200 font-semibold">
                      {laneStats.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eficiencia de resolución:</span>
                    <span className="text-emerald-300 font-semibold">
                      {totals.incidents > 0
                        ? `${Math.round(
                            ((totals.resolved || 0) / totals.incidents) * 100
                          )}%`
                        : "100%"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-400">
            📊 <strong>Nota:</strong> Los datos se calculan dinámicamente según el rango seleccionado. Un promedio bajo de días entre llenados indica urgencia de programar scripts automáticos de vaciado.
          </div>
        </div>
      </div>

      {/* Distribución horaria */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-white mb-1">
          Distribución Horaria del Problema
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          ¿A qué horas del día se satura el disco o se cuelgan las antenas? (Formato 24h)
        </p>
        <div className="flex items-end gap-1 h-36 pt-4">
          {hourStats.map((h) => {
            const pct = (h.count / maxHourCount) * 100;
            const isPeak = h.count === peakHour.count && h.count > 0;
            return (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${String(h.hour).padStart(2, "0")}:00 — ${h.count} eventos`}
              >
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isPeak
                        ? "bg-gradient-to-t from-red-500 to-red-400"
                        : activeStatType === "antena"
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500"
                        : "bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500"
                    }`}
                    style={{ height: `${Math.max(pct, h.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 tabular-nums">
                  {String(h.hour).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico de tendencia */}
      {dayStats.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-white mb-1">
            Tendencia en el tiempo
          </h3>
          <p className="text-xs text-slate-400 mb-4 font-medium">
            Representación de eventos diarios en el periodo activo.
          </p>
          <DayTrend data={dayStats} activeType={activeStatType} />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "indigo" | "amber" | "red" | "emerald" | "neutral";
}) {
  const accents = {
    indigo: "text-indigo-300",
    amber: "text-amber-300",
    red: "text-red-300",
    emerald: "text-emerald-300",
    neutral: "text-slate-300",
  };
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accents[accent]}`}>
        {value}
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  tone: "red" | "amber";
}) {
  const tones = {
    red: "from-red-500/20 to-red-500/5 border-red-500/20",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20",
  };
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${tones[tone]} border p-5 flex items-center gap-4`}
    >
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {title}
        </div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

function DayTrend({
  data,
  activeType,
}: {
  data: { day: string; count: number }[];
  activeType: "antena" | "disco_lleno";
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 800;
  const height = 160;
  const padX = 30;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padY + innerH - (d.count / max) * innerH;
    return { x, y, d };
  });

  const pathLine = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const pathArea =
    points.length > 0
      ? `${pathLine} L ${points[points.length - 1].x},${padY + innerH} L ${padX},${padY + innerH} Z`
      : "";

  const themeColor = activeType === "antena" ? "99,102,241" : "245,158,11";

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 min-w-[500px]">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgb(${themeColor})`} stopOpacity="0.4" />
            <stop offset="100%" stopColor={`rgb(${themeColor})`} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padY + t * innerH}
            y2={padY + t * innerH}
            stroke="rgba(255,255,255,0.05)"
          />
        ))}
        {pathArea && <path d={pathArea} fill="url(#trendGrad)" />}
        {pathLine && (
          <path
            d={pathLine}
            fill="none"
            stroke={`rgb(${themeColor})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p) => (
          <g key={p.d.day}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={`rgb(${themeColor})`} />
            <title>{`${p.d.day}: ${p.d.count} eventos`}</title>
          </g>
        ))}
        {/* X labels */}
        {points
          .filter((_, i) => i % Math.max(1, Math.ceil(points.length / 8)) === 0)
          .map((p) => (
            <text
              key={p.d.day + "lbl"}
              x={p.x}
              y={height - 4}
              fontSize="9"
              fill="rgba(148,163,184,0.8)"
              textAnchor="middle"
            >
              {p.d.day.slice(5)}
            </text>
          ))}
      </svg>
    </div>
  );
}
