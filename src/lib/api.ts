import type { Topic } from "@/lib/topics";

const API_BASE = "/api";

interface ApiBody {
  id?: string;
  message?: string;
  active?: boolean;
  code?: string;
}

export interface OtpResponse {
  id: string;
  message: string;
}

export async function callApi<T extends ApiBody>(
  path: string,
  body: Record<string, unknown>,
  fallbackMessage = "Ocurrió un error. Intenta de nuevo."
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let parsed: T;
  try {
    parsed = await res.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!res.ok) {
    throw new Error(parsed.message ?? fallbackMessage);
  }

  return parsed;
}

export async function generateOtp(
  email: string,
  topics: Topic[]
): Promise<OtpResponse> {
  return callApi<OtpResponse>(
    "/otp/generate",
    { email, topics },
    "No se pudo enviar el código. Intenta de nuevo."
  );
}

export async function validateOtp(
  id: string,
  otp: string,
  email: string
): Promise<OtpResponse> {
  return callApi<OtpResponse>(
    "/otp/validate",
    { id, otp, email },
    "No se pudo verificar el código. Intenta de nuevo."
  );
}

export async function unsubscribe(id: string, email: string): Promise<ApiBody> {
  return callApi<ApiBody>(
    "/unsubscribe",
    { id, email },
    "No se pudo cancelar la suscripción. Intenta de nuevo."
  );
}

export async function checkActiveSubscriber(email: string): Promise<boolean> {
  const result = await callApi<ApiBody>(
    "/subscriber",
    { email },
    "No se pudo verificar la suscripción. Intenta de nuevo."
  );
  return result.active === true;
}
