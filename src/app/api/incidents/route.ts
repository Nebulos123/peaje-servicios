import { NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isValidLane } from "@/lib/lanes";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.startedAt))
    .limit(1000);
  return NextResponse.json({ incidents: rows });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lane = Number(body.lane);
    const type = String(body.type ?? "antena");
    const notes: string | null = body.notes ? String(body.notes).slice(0, 500) : null;
    const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
    const resolvedAt = body.resolvedAt ? new Date(body.resolvedAt) : null;

    if (!isValidLane(lane)) {
      return NextResponse.json({ error: "Vía inválida" }, { status: 400 });
    }
    if (type !== "antena" && type !== "disco_lleno") {
      return NextResponse.json({ error: "Tipo de incidente inválido" }, { status: 400 });
    }
    if (isNaN(startedAt.getTime())) {
      return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
    }
    if (resolvedAt && isNaN(resolvedAt.getTime())) {
      return NextResponse.json({ error: "Fecha de cierre inválida" }, { status: 400 });
    }

    const [created] = await db
      .insert(incidents)
      .values({
        lane,
        type,
        startedAt,
        resolvedAt: resolvedAt ?? null,
        notes,
      })
      .returning();

    return NextResponse.json({ incident: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear incidente" }, { status: 500 });
  }
}
