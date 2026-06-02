import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";

// Tipo de incidente: 'antena' o 'disco_lleno'
// 'started_at' para disco_lleno es el momento en que se llenó/detectó el disco lleno.
// 'resolved_at' es el momento en que se vació/liberó espacio.
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  lane: integer("lane").notNull(),
  type: text("type").notNull().default("antena"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
