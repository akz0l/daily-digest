import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ALLOWED_TOPICS = ["Cloud", "IA", "Ciberseguridad", "Development"];
const TOPIC_ALIASES = {
  Cloud: ["Cloud", "Nube", "Cloud Computing", "Computación en la nube"],
  IA: ["IA", "AI", "Inteligencia Artificial", "Artificial Intelligence"],
  Ciberseguridad: ["Ciberseguridad", "Cybersecurity", "Seguridad", "Security"],
  Development: ["Development", "Desarrollo", "DevOps", "Software Development"],
};

function normalizeTopic(topic) {
  const trimmed = String(topic ?? "").trim();
  if (!trimmed) return null;
  for (const canonical of ALLOWED_TOPICS) {
    const aliases = TOPIC_ALIASES[canonical] ?? [canonical];
    if (aliases.some((alias) => alias.toLowerCase() === trimmed.toLowerCase())) {
      return canonical;
    }
  }
  return null;
}

function sanitizeTopics(topics) {
  if (!Array.isArray(topics)) return null;
  const normalized = [];
  for (const topic of topics) {
    const value = normalizeTopic(topic);
    if (!value) return null;
    if (!normalized.includes(value)) normalized.push(value);
  }
  return normalized.length > 0 ? normalized : null;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

const TABLE_NAME = "Otp-daily-digest";
const SES_SENDER = process.env.SES_SENDER?.trim();
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN?.trim() ?? "http://localhost:3000";
const OTP_TTL_MINUTES = 10;
const MAX_RETRIES = 3;
const MAX_TOPICS = 10;

function getSiteBaseUrl() {
  return process.env.UNSUBSCRIBE_BASE_URL?.trim() ?? "http://localhost:3000";
}

function buildTermsUrl() {
  return `${getSiteBaseUrl()}/terminos-de-uso`;
}

function buildPrivacyUrl() {
  return `${getSiteBaseUrl()}/politica-de-privacidad`;
}

function generateOtp(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    const email = body?.email?.trim().toLowerCase();
    const topics = body?.topics;

    // ── Validar email ────────────────────────────────────────────────────────
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, { code: "INVALID_EMAIL", message: "Email inválido o no proporcionado." });
    }

    // ── Validar topics ───────────────────────────────────────────────────────
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return response(400, { code: "MISSING_TOPICS", message: "Debes seleccionar al menos un topic." });
    }

    if (topics.length > MAX_TOPICS) {
      return response(400, { code: "TOO_MANY_TOPICS", message: `Puedes seleccionar un máximo de ${MAX_TOPICS} topics.` });
    }

    const sanitizedTopics = sanitizeTopics(topics);

    if (!sanitizedTopics) {
      return response(400, {
        code: "INVALID_TOPICS",
        message: `Uno o más topics son inválidos. Permitidos: ${ALLOWED_TOPICS.join(", ")}.`,
      });
    }

    // ── Generar OTP y guardar en DynamoDB ────────────────────────────────────
    const id = randomUUID();
    const otp = generateOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    const item = {
      id,
      email,
      otp,
      topics: sanitizedTopics,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl: Math.floor(expiresAt.getTime() / 1000),
      expired: false,
      retries: 0,
      maxRetries: MAX_RETRIES,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // ── Enviar email con SES ─────────────────────────────────────────────────
    await ses.send(
      new SendEmailCommand({
        Source: SES_SENDER,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: {
            Data: "Tu código de verificación - Daily Digest Tech News",
            Charset: "UTF-8",
          },
          Body: {
            Html: { Charset: "UTF-8", Data: buildEmailHtml(otp, OTP_TTL_MINUTES, sanitizedTopics) },
            Text: {
              Charset: "UTF-8",
              Data: `Tu código de verificación es: ${otp}\nExpira en ${OTP_TTL_MINUTES} minutos.\nTopics seleccionados: ${sanitizedTopics.join(", ")}`,
            },
          },
        },
      })
    );

    return response(200, { id, message: "Código enviado exitosamente." });
  } catch (err) {
    console.error("Error en sendOtp:", err);
    return response(500, { code: "INTERNAL_ERROR", message: "Error interno del servidor." });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
    body: JSON.stringify(body),
  };
}

function buildEmailHtml(otp, ttlMinutes, topics) {
  const termsUrl = buildTermsUrl();
  const privacyUrl = buildPrivacyUrl();
  const topicPills = topics
    .map((t) => `<span style="display:inline-block;background:#fff8ec;border:1px solid #FF9900;color:#b36b00;font-size:12px;font-weight:500;padding:3px 10px;border-radius:20px;margin:3px 3px 0 0;">${t}</span>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0f1923;padding:20px 32px;">
          <span style="background:#FF9900;color:#0f1923;font-weight:700;font-size:13px;padding:4px 10px;border-radius:6px;">AWS</span>
          <span style="color:#ffffff;font-size:15px;font-weight:500;margin-left:12px;">Daily Digest Tech News</span>
        </td></tr>
        <tr><td style="border-top:4px solid #FF9900;"></td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#0f1923;">Tu código de verificación</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Ingresa este código para confirmar tu suscripción. Expira en ${ttlMinutes} minutos.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#0f1923;">${otp}</span>
          </div>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;">Topics seleccionados:</p>
          <div style="margin-bottom:28px;">${topicPills}</div>
          <p style="margin:0;font-size:13px;color:#9ca3af;">Si no solicitaste este código, puedes ignorar este mensaje. Nunca compartas este código con nadie.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Daily Tech News · <a href="${termsUrl}" style="color:#FF9900;text-decoration:none;">Términos de uso</a> · <a href="${privacyUrl}" style="color:#FF9900;text-decoration:none;">Política de privacidad</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
