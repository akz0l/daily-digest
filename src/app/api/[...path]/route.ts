import { NextRequest, NextResponse } from "next/server";

/** Rutas del front (/api/…) → rutas reales en API Gateway */
const UPSTREAM_PATHS: Record<string, string> = {
  "otp/generate": "generate",
  "otp/validate": "validate",
  unsubscribe: "unsubscribe",
  subscriber: "subscriber",
};

function normalizeUpstreamResponse(text: string, httpStatus: number) {
  try {
    const json = JSON.parse(text) as { statusCode?: number; body?: unknown };
    if (typeof json.statusCode === "number" && "body" in json) {
      const body =
        typeof json.body === "string"
          ? json.body
          : JSON.stringify(json.body ?? {});
      return { status: json.statusCode, body };
    }
  } catch {
    // Respuesta no JSON o ya viene desempaquetada
  }
  return { status: httpStatus, body: text };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const normalizedPath = path.join("/");
  const upstreamPath = UPSTREAM_PATHS[normalizedPath];

  if (!upstreamPath) {
    return NextResponse.json({ message: "Ruta no encontrada." }, { status: 404 });
  }

  const endpoint = process.env.OTP_API_ENDPOINT?.replace(/\/$/, "") ?? "";
  const apiKey = process.env.OTP_API_KEY?.trim() ?? "";

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { message: "Servicio no disponible." },
      { status: 503 }
    );
  }

  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${endpoint}/${upstreamPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body,
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo contactar el servicio." },
      { status: 502 }
    );
  }

  const raw = await upstream.text();
  const { status, body: responseBody } = normalizeUpstreamResponse(
    raw,
    upstream.status
  );

  return new NextResponse(responseBody, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
