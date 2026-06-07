import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PATHS = new Set([
  "otp/generate",
  "otp/validate",
  "unsubscribe",
  "subscriber",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const normalizedPath = path.join("/");

  if (!ALLOWED_PATHS.has(normalizedPath)) {
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

  const upstream = await fetch(`${endpoint}/${normalizedPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body,
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
