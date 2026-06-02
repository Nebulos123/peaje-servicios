"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LANES, formatDuration } from "@/lib/lanes";
import LaneGrid from "./LaneGrid";
import IncidentModal from "./IncidentModal";
import HistoryTable from "./HistoryTable";
import StatsPanel from "./StatsPanel";

export type IncidentDTO = {
  id: number;
  lane: number;
  type: "antena" | "disco_lleno";
  startedAt: string;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
};

type Tab = "panel" | "historial" | "estadisticas";
export type ActiveMode = "antena" | "disco_lleno";

export default function Dashboard() {
  const [incidents, setIncidents] = useState<IncidentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("panel");
  const [mode, setMode] = useState<ActiveMode>("antena");
  const [modalLane, setModalLane] = useState<number | null>(null);
  const [editingIncident, setEditingIncident] = useState<IncidentDTO | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  // Tick clock cada segundo
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      const data = await res.json();
      setIncidents(data.incidents ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Mapa: vía -> incidente abierto filtrado por el modo activo
  const openByLane = useMemo(() => {
    const map = new Map<number, IncidentDTO>();
    for (const inc of incidents) {
      if (!inc.resolvedAt && inc.type === mode) {
        map.set(inc.lane, inc);
      }
    }
    return map;
  }, [incidents, mode]);

  // Conteo por vía en el modo activo (históricos)
  const countByLane = useMemo(() => {
    const map = new Map<number, number>();
    for (const inc of incidents) {
      if (inc.type === mode) {
        map.set(inc.lane, (map.get(inc.lane) ?? 0) + 1);
      }
    }
    return map;
  }, [incidents, mode]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLaneClick = (lane: number) => {
    const open = openByLane.get(lane);
    if (open) {
      resolveIncident(open.id);
    } else {
      quickCreate(lane);
    }
  };

  const quickCreate = async (lane: number) => {
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lane, type: mode }),
      });
      if (!res.ok) throw new Error("Error");
      await loadIncidents();
      showToast(
        mode === "antena"
          ? `Vía ${lane}: caída de antena registrada`
          : `Vía ${lane}: alerta de disco lleno registrada`
      );
    } catch {
      showToast("Error al registrar");
    }
  };

  const resolveIncident = async (id: number) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolve: true }),
      });
      if (!res.ok) throw new Error("Error");
      await loadIncidents();
      showToast(
        mode === "antena"
          ? "Servicio de antena restablecido"
          : "Disco de vía liberado / vaciado"
      );
    } catch {
      showToast("Error al procesar");
    }
  };

  const deleteIncident = async (id: number) => {
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    await fetch(`/api/incidents/${id}`, { method: "DELETE" });
    await loadIncidents();
    showToast("Registro eliminado");
  };

  const updateIncident = async (
    id: number,
    payload: { resolvedAt?: string | null; notes?: string }
  ) => {
    await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadIncidents();
  };

  // Guardar incidente (crear nuevo o editar existente)
  const saveIncident = async (payload: {
    lane: number;
    type: "antena" | "disco_lleno";
    startedAt: string;
    resolvedAt: string | null;
    notes: string | null;
  }) => {
    if (editingIncident) {
      // Modo edición: PATCH
      const res = await fetch(`/api/incidents/${editingIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al editar");
      await loadIncidents();
      showToast("Registro editado correctamente");
    } else {
      // Modo creación: POST
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear");
      await loadIncidents();
      showToast(`Vía ${payload.lane} registrada manualmente`);
    }
  };

  const closeModal = () => {
    setModalLane(null);
    setEditingIncident(null);
  };

  const openCreateModal = (lane: number) => {
    setEditingIncident(null);
    setModalLane(lane);
  };

  const openEditModal = (incident: IncidentDTO) => {
    setEditingIncident(incident);
    setModalLane(incident.lane);
  };

  // KPIs
  const activeOpenCount = openByLane.size;
  const activeTodayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return incidents.filter(
      (i) => i.type === mode && new Date(i.startedAt) >= start
    ).length;
  }, [incidents, mode]);

  const activeTotalCount = useMemo(() => {
    return incidents.filter((i) => i.type === mode).length;
  }, [incidents, mode]);

  const longestActiveOpen = useMemo(() => {
    let max = 0;
    let lane: number | null = null;
    for (const inc of openByLane.values()) {
      const d = now - new Date(inc.startedAt).getTime();
      if (d > max) {
        max = d;
        lane = inc.lane;
      }
    }
    return { lane, ms: max };
  }, [openByLane, now]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                <path d="M12 2v20M5 8a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Monitoreo del Peaje
              </h1>
              <p className="text-xs text-slate-400">Panel Centralizado · {LANES.length} Vías</p>
            </div>
          </div>

          {/* Selector de modo */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode("antena")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === "antena"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📡 Antenas Colgadas
            </button>
            <button
              onClick={() => setMode("disco_lleno")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === "disco_lleno"
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💾 Discos Llenos
            </button>
          </div>

          <nav className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
            {([
              ["panel", "Panel"],
              ["historial", "Historial"],
              ["estadisticas", "Estadísticas"],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 text-sm rounded-lg transition ${
                  tab === key
                    ? "bg-indigo-500 text-white shadow shadow-indigo-500/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Banner de modo */}
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          mode === "antena" 
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200" 
            : "bg-amber-500/10 border-amber-500/20 text-amber-200"
        }`}>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <span className="text-xl">{mode === "antena" ? "📡" : "💾"}</span>
            <span>
              Modo Activo:{" "}
              <strong className="text-white">
                {mode === "antena" ? "Antenas Colgadas / Reinicios" : "Discos de Vías Llenos"}
              </strong>
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white font-medium">
            Monitoreo en tiempo real
          </span>
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiCard
            label={mode === "antena" ? "Caídas activas" : "Discos llenos ahora"}
            value={activeOpenCount.toString()}
            tone={activeOpenCount > 0 ? (mode === "antena" ? "danger" : "warn") : "ok"}
            icon={mode === "antena" ? "📡" : "💾"}
          />
          <KpiCard
            label="Registros de Hoy"
            value={activeTodayCount.toString()}
            tone="info"
            icon="📊"
          />
          <KpiCard
            label="Total histórico"
            value={activeTotalCount.toString()}
            tone="neutral"
            icon="📝"
          />
          <KpiCard
            label={mode === "antena" ? "Caída más larga" : "Alerta más larga"}
            value={
              longestActiveOpen.lane
                ? `V${longestActiveOpen.lane} · ${formatDuration(longestActiveOpen.ms)}`
                : "—"
            }
            tone={longestActiveOpen.lane ? "warn" : "ok"}
            icon="⏱️"
          />
        </section>

        {loading ? (
          <div className="grid place-items-center py-20 text-slate-400">
            Cargando datos del peaje...
          </div>
        ) : (
          <>
            {tab === "panel" && (
              <div className="fade-in space-y-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Mapa de Vías Peaje
                      </h2>
                      <p className="text-sm text-slate-400">
                        {mode === "antena" ? (
                          <>
                            Haz click en una vía para registrar un <span className="text-red-300">reinicio / cuelgue</span>, o presiona para <span className="text-emerald-300">restablecer</span>.
                          </>
                        ) : (
                          <>
                            Haz click en una vía para registrar un <span className="text-amber-300">disco lleno</span>, o presiona para <span className="text-emerald-300">vaciar / liberar espacio</span>.
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Legend color="bg-emerald-500/80" label="OK" />
                      <Legend
                        color={mode === "antena" ? "bg-red-500/90" : "bg-amber-500/90"}
                        label={mode === "antena" ? "Caída de Servicio" : "Disco Lleno"}
                      />
                      <Legend color="bg-indigo-500/80" label="Reincidente" />
                    </div>
                  </div>
                  <LaneGrid
                    lanes={LANES}
                    openByLane={openByLane}
                    countByLane={countByLane}
                    now={now}
                    mode={mode}
                    onLaneClick={handleLaneClick}
                    onLaneLongPress={(lane) => openCreateModal(lane)}
                  />
                  <p className="mt-4 text-xs text-slate-500">
                    💡 Click derecho (o mantén presionado) sobre cualquier vía para abrir el formulario detallado y agregar observaciones personalizadas.
                  </p>
                </div>

                {openByLane.size > 0 && (
                  <div className={`rounded-2xl border p-4 sm:p-6 ${
                    mode === "antena" 
                      ? "bg-red-500/5 border-red-500/20" 
                      : "bg-amber-500/5 border-amber-500/20"
                  }`}>
                    <h3 className={`text-base font-semibold mb-3 flex items-center gap-2 ${
                      mode === "antena" ? "text-red-200" : "text-amber-200"
                    }`}>
                      <span className={`h-2 w-2 rounded-full pulse-down ${
                        mode === "antena" ? "bg-red-500" : "bg-amber-500"
                      }`} />
                      {mode === "antena" ? "Vías caídas actualmente" : "Vías con discos llenos actualmente"}
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from(openByLane.values()).map((inc) => (
                        <div
                          key={inc.id}
                          className="rounded-xl bg-slate-900/70 border border-white/10 p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-white font-semibold">
                              Vía {inc.lane}
                            </div>
                            <div className="text-xs text-slate-400">
                              {mode === "antena" ? "caída" : "lleno"} hace{" "}
                              {formatDuration(now - new Date(inc.startedAt).getTime())}
                            </div>
                          </div>
                          <button
                            onClick={() => resolveIncident(inc.id)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition"
                          >
                            {mode === "antena" ? "Restablecer" : "Vaciar / Liberar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "historial" && (
              <div className="fade-in">
                <HistoryTable
                  incidents={incidents}
                  now={now}
                  onResolve={resolveIncident}
                  onDelete={deleteIncident}
                  onEdit={openEditModal}
                  onUpdate={updateIncident}
                />
              </div>
            )}

            {tab === "estadisticas" && (
              <div className="fade-in">
                <StatsPanel />
              </div>
            )}
          </>
        )}
      </main>

      {modalLane !== null && (
        <IncidentModal
          lane={modalLane}
          defaultType={mode}
          incident={editingIncident}
          onClose={closeModal}
          onSubmit={async (payload) => {
            await saveIncident(payload);
            closeModal();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 fade-in">
          <div className="rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 text-sm text-white shadow-2xl shadow-black/50">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "ok" | "danger" | "info" | "warn" | "neutral";
  icon: string;
}) {
  const tones: Record<typeof tone, string> = {
    ok: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
    danger: "from-red-500/20 to-red-500/5 border-red-500/30",
    info: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20",
    warn: "from-amber-500/20 to-amber-500/5 border-amber-500/20",
    neutral: "from-slate-500/20 to-slate-500/5 border-white/10",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-4 backdrop-blur`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-300">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
