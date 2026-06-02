import { NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incidentId = Number(id);
  if (!Number.isFinite(incidentId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  // Editar fecha de inicio (para corregir olvidos)
  if (body.startedAt !== undefined) {
    const d = new Date(body.startedAt);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
    }
    updates.startedAt = d;
  }

  // Editar fecha de resolución
  if (body.resolvedAt === null) {
    updates.resolvedAt = null;
  } else if (body.resolvedAt !== undefined) {
    const d = new Date(body.resolvedAt);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Fecha de cierre inválida" }, { status: 400 });
    }
    updates.resolvedAt = d;
  } else if (body.resolve === true) {
    updates.resolvedAt = new Date();
  }

  // Editar tipo de incidente
  if (body.type !== undefined) {
    if (body.type !== "antena" && body.type !== "disco_lleno") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    updates.type = body.type;
  }

  // Editar notas
  if (typeof body.notes === "string") {
    updates.notes = body.notes.slice(0, 500);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const [updated] = await db
    .update(incidents)
    .set(updates)
    .where(eq(incidents.id, incidentId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ incident: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incidentId = Number(id);
  if (!Number.isFinite(incidentId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  await db.delete(incidents).where(eq(incidents.id, incidentId));
  return NextResponse.json({ ok: true });
}
