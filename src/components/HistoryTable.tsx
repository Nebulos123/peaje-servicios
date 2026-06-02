"use client";

import { useMemo, useState } from "react";
import type { IncidentDTO } from "./Dashboard";
import { LANES, formatDuration } from "@/lib/lanes";

type Props = {
  incidents: IncidentDTO[];
  now: number;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (incident: IncidentDTO) => void; // abre modal de edición completa
  onUpdate: (
    id: number,
    payload: { resolvedAt?: string | null; notes?: string }
  ) => Promise<void>;
};

function fmt(d: string) {
  const date = new Date(d);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryTable({
  incidents,
  now,
  onResolve,
  onDelete,
  onEdit,
  onUpdate,
}: Props) {
  const [laneFilter, setLaneFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "antena" | "disco_lleno">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (laneFilter !== "all" && inc.lane !== Number(laneFilter)) return false;
      if (typeFilter !== "all" && inc.type !== typeFilter) return false;
      if (statusFilter === "open" && inc.resolvedAt) return false;
      if (statusFilter === "closed" && !inc.resolvedAt) return false;
      if (search && !(inc.notes ?? "").toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [incidents, laneFilter, typeFilter, statusFilter, search]);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white mr-auto">
          Historial General · {filtered.length} registros
        </h2>
        
        {/* Filtro Tipo */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "antena" | "disco_lleno")}
          className="rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">📡💾 Todos los eventos</option>
          <option value="antena">📡 Antenas Colgadas</option>
          <option value="disco_lleno">💾 Discos Llenos</option>
        </select>

        {/* Filtro Vía */}
        <select
          value={laneFilter}
          onChange={(e) => setLaneFilter(e.target.value)}
          className="rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todas las vías</option>
          {LANES.map((l) => (
            <option key={l} value={l}>
              Vía {l}
            </option>
          ))}
        </select>

        {/* Filtro Estado */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "open" | "closed")
          }
          className="rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Estado: Todos</option>
          <option value="open">En Curso</option>
          <option value="closed">Resueltos / Vacidados</option>
        </select>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar notas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm animate-fade-in">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Vía</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Inicio / Caída</th>
              <th className="text-left px-4 py-3">Fin / Restablecido</th>
              <th className="text-left px-4 py-3">Duración</th>
              <th className="text-left px-4 py-3">Notas</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No hay registros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filtered.map((inc) => {
                const open = !inc.resolvedAt;
                const duration = open
                  ? now - new Date(inc.startedAt).getTime()
                  : new Date(inc.resolvedAt!).getTime() -
                    new Date(inc.startedAt).getTime();
                
                return (
                  <tr
                    key={inc.id}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    {/* Vía */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold text-white">
                          V{inc.lane}
                        </span>
                        {open && (
                          <span className={`inline-block h-1.5 w-1.5 rounded-full pulse-down ${
                            inc.type === "antena" ? "bg-red-500" : "bg-amber-500"
                          }`} />
                        )}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      {inc.type === "antena" ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          📡 Antena
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          💾 Disco Lleno
                        </span>
                      )}
                    </td>

                    {/* Inicio */}
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {fmt(inc.startedAt)}
                    </td>

                    {/* Cierre */}
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {inc.resolvedAt ? (
                        fmt(inc.resolvedAt)
                      ) : (
                        <span className={inc.type === "antena" ? "text-red-300 font-medium" : "text-amber-300 font-medium"}>
                          {inc.type === "antena" ? "— caída activa —" : "— disco lleno —"}
                        </span>
                      )}
                    </td>

                    {/* Duración */}
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={
                          open 
                            ? (inc.type === "antena" ? "text-red-300 font-medium" : "text-amber-300 font-medium")
                            : "text-slate-300"
                        }
                      >
                        {formatDuration(duration)}
                      </span>
                    </td>

                    {/* Notas */}
                    <td className="px-4 py-3 text-slate-400 max-w-xs">
                      {editing === inc.id ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="flex-1 rounded bg-slate-800 border border-white/10 px-2 py-1 text-xs text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await onUpdate(inc.id, { notes: editNotes });
                              setEditing(null);
                            }}
                            className="text-xs px-2 py-1 rounded bg-indigo-500 text-white"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="text-xs px-2 py-1 rounded bg-white/5 text-slate-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditing(inc.id);
                            setEditNotes(inc.notes ?? "");
                          }}
                          className="cursor-text block truncate"
                          title={inc.notes ?? "Click para añadir observación"}
                        >
                          {inc.notes || (
                            <span className="text-slate-600 italic">
                              añadir nota…
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {/* Editar completo */}
                        <button
                          type="button"
                          onClick={() => onEdit(inc)}
                          className="px-2.5 py-1 text-xs rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition"
                          title="Editar registro completo (fecha, tipo, notas…)"
                        >
                          ✏️
                        </button>

                        {open && (
                          <button
                            type="button"
                            onClick={() => onResolve(inc.id)}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                            title={inc.type === "antena" ? "Restablecer servicio" : "Vaciar disco"}
                          >
                            ✓
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDelete(inc.id)}
                          className="px-2.5 py-1 text-xs rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
