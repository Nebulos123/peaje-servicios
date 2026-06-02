"use client";

import { useEffect, useState } from "react";
import type { IncidentDTO, ActiveMode } from "./Dashboard";

type Props = {
  lane: number;
  defaultType: ActiveMode;
  incident?: IncidentDTO | null; // null = modo creación, objeto = modo edición
  onClose: () => void;
  onSubmit: (payload: {
    lane: number;
    type: "antena" | "disco_lleno";
    startedAt: string;
    resolvedAt: string | null;
    notes: string | null;
  }) => Promise<void>;
};

function toLocalInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16);
}

export default function IncidentModal({
  lane,
  defaultType,
  incident,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!incident;
  const now = new Date();

  const [type, setType] = useState<"antena" | "disco_lleno">(
    incident?.type ?? defaultType
  );
  const [startedAt, setStartedAt] = useState(
    incident ? toLocalInputValue(incident.startedAt) : toLocalInputValue(now)
  );
  const [resolvedAt, setResolvedAt] = useState(
    incident?.resolvedAt ? toLocalInputValue(incident.resolvedAt) : ""
  );
  const [notes, setNotes] = useState(incident?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        lane,
        type,
        startedAt: new Date(startedAt).toISOString(),
        resolvedAt: resolvedAt ? new Date(resolvedAt).toISOString() : null,
        notes: notes.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm p-4 fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "✏️ Editar Registro" : "Registrar Evento"} · Vía {lane}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {isEdit && (
          <div className="mb-4 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
            Estás editando un registro existente. Los cambios se reflejarán
            inmediatamente en el historial y las estadísticas.
          </div>
        )}

        <div className="space-y-4">
          {/* Tipo de evento */}
          <Field label="Tipo de Evento">
            <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setType("antena")}
                className={`py-1.5 text-xs font-semibold rounded-md transition ${
                  type === "antena"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📡 Antena Caída
              </button>
              <button
                type="button"
                onClick={() => setType("disco_lleno")}
                className={`py-1.5 text-xs font-semibold rounded-md transition ${
                  type === "disco_lleno"
                    ? "bg-amber-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💾 Disco Lleno
              </button>
            </div>
          </Field>

          <Field
            label={
              type === "antena"
                ? "Hora de la caída de servicio"
                : "Hora de detección del disco lleno"
            }
          >
            <input
              type="datetime-local"
              required
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isEdit && (
              <p className="text-xs text-amber-300 mt-1">
                💡 Puedes cambiar esta fecha si te olvidaste de cargar el incidente
                el día correcto.
              </p>
            )}
          </Field>

          <Field
            label={
              type === "antena"
                ? "Hora de restablecimiento (opcional)"
                : "Hora de liberación de espacio (opcional)"
            }
          >
            <input
              type="datetime-local"
              value={resolvedAt}
              onChange={(e) => setResolvedAt(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              {type === "antena"
                ? "Déjalo vacío si el servicio de antena sigue colgado."
                : "Déjalo vacío si el disco de la vía sigue al 100% de capacidad."}
            </p>
          </Field>

          <Field label="Notas y observaciones (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                type === "antena"
                  ? "Causa, observaciones, ping de prueba…"
                  : "Porcentaje de disco, archivos eliminados, etc…"
              }
              className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </Field>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 px-4 py-2.5 rounded-lg disabled:opacity-50 text-white text-sm font-medium transition shadow ${
              type === "antena"
                ? "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20"
                : "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20"
            }`}
          >
            {submitting
              ? "Guardando…"
              : isEdit
              ? "Guardar Cambios"
              : "Guardar Registro"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
