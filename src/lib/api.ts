const API_ENDPOINT = process.env.NEXT_PUBLIC_OTP_ENDPOINT ?? "";

interface ApiBody {
  id?: string;
  message?: string;
}

export async function callApi<T extends ApiBody>(
  path: string,
  body: Record<string, unknown>
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
    throw new Error(parsed.message ?? "Ocurrió un error. Intenta de nuevo.");
  }

  return parsed;
}

export async function unsubscribe(id: string, email: string): Promise<ApiBody> {
  return callApi<ApiBody>("/unsubscribe", { id, email });
}
