"use client";

import type { IncidentDTO, ActiveMode } from "./Dashboard";
import { formatDuration } from "@/lib/lanes";

type Props = {
  lanes: number[];
  openByLane: Map<number, IncidentDTO>;
  countByLane: Map<number, number>;
  now: number;
  mode: ActiveMode;
  onLaneClick: (lane: number) => void;
  onLaneLongPress: (lane: number) => void;
};

export default function LaneGrid({
  lanes,
  openByLane,
  countByLane,
  now,
  mode,
  onLaneClick,
  onLaneLongPress,
}: Props) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
      {lanes.map((lane) => {
        const open = openByLane.get(lane);
        const count = countByLane.get(lane) ?? 0;
        const isOpen = !!open;
        const isFrequent = count >= 5;

        const base =
          "relative aspect-square rounded-xl border transition-all flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden";

        let stateClass = "";
        if (isOpen) {
          if (mode === "antena") {
            stateClass =
              "bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-300/40 shadow-lg shadow-red-500/30 pulse-down";
          } else {
            stateClass =
              "bg-gradient-to-br from-amber-500/90 to-amber-700/90 border-amber-300/40 shadow-lg shadow-amber-500/30 pulse-down";
          }
        } else if (isFrequent) {
          stateClass =
            "bg-gradient-to-br from-indigo-500/30 to-indigo-700/20 border-indigo-400/30 hover:from-indigo-500/40";
        } else if (count > 0) {
          stateClass =
            "bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border-emerald-400/20 hover:from-emerald-500/30";
        } else {
          stateClass = "bg-white/5 border-white/10 hover:bg-white/10";
        }

        const tooltip = isOpen
          ? `Vía ${lane} [${mode === "antena" ? "Antena Caída" : "Disco Lleno"}] · click izquierdo para resolver`
          : `Vía ${lane} · ${count} eventos · click izquierdo para registrar · click derecho para formulario detallado`;

        return (
          <button
            key={lane}
            onClick={() => onLaneClick(lane)}
            onContextMenu={(e) => {
              e.preventDefault();
              onLaneLongPress(lane);
            }}
            className={`${base} ${stateClass}`}
            title={tooltip}
          >
            <span className="text-xs text-white/70 absolute top-1 left-2">V</span>
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {lane}
            </span>
            {isOpen ? (
              <span className="text-[10px] text-white/90 mt-0.5 font-medium tabular-nums">
                {formatDuration(now - new Date(open.startedAt).getTime())}
              </span>
            ) : (
              <span className="text-[10px] text-white/60 mt-0.5">
                {count} {count === 1 ? "evento" : "eventos"}
              </span>
            )}
            {count > 0 && !isOpen && (
              <span className="absolute top-1 right-1 text-[10px] bg-black/40 text-white/90 rounded-full px-1.5 py-0.5 tabular-nums">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
