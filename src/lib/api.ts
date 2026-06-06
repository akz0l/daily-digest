import type { Topic } from "@/lib/topics";

const API_ENDPOINT = process.env.NEXT_PUBLIC_OTP_ENDPOINT ?? "";

interface ApiBody {
  id?: string;
  message?: string;
  active?: boolean;
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
  const res = await fetch(API_ENDPOINT + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const outer = await res.json();
  const parsed: T =
    typeof outer.body === "string" ? JSON.parse(outer.body) : outer.body;

  if (outer.statusCode !== 200) {
    throw new Error(parsed.message ?? fallbackMessage);
  }

  return parsed;
}

export async function generateOtp(
  email: string,
  topics: Topic[]
): Promise<OtpResponse> {
  return callApi<OtpResponse>(
    "/generate",
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
    "/validate",
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
