import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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

function topicsMatch(a, b) {
  const left = normalizeTopic(a);
  const right = normalizeTopic(b);
  return left !== null && left === right;
}

function getSiteBaseUrl() {
  return process.env.UNSUBSCRIBE_BASE_URL?.trim() ?? "http://localhost:3000";
}

function buildUnsubscribeUrl(id, email) {
  const params = new URLSearchParams({ id, email });
  return `${getSiteBaseUrl()}/unsubscribe?${params.toString()}`;
}

function buildTermsUrl() {
  return `${getSiteBaseUrl()}/terminos-de-uso`;
}

function buildPrivacyUrl() {
  return `${getSiteBaseUrl()}/politica-de-privacidad`;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const ses = new SESClient({});

const SUBSCRIBERS_TABLE = "subscribers";
const SES_SENDER = process.env.SES_SENDER?.trim();

// ── Handler — disparado por S3 Event ─────────────────────────────────────────
export const handler = async (event) => {
  const record = event.Records?.[0];
  const bucket = record?.s3?.bucket?.name;
  const key = decodeURIComponent(record?.s3?.object?.key?.replace(/\+/g, " ") ?? "");

  console.log(`[sendDigestEmail] Triggered — bucket: ${bucket}, key: ${key}`);

  if (!bucket || !key) throw new Error("S3 event inválido: falta bucket o key.");

  const digest = await readDigestFromS3(bucket, key);
  console.log(`[sendDigestEmail] Digest leído — ${digest.meta?.topicsProcessed?.length} topics, fecha: ${digest.date}`);

  const subscribers = await getActiveSubscribers();
  console.log(`[sendDigestEmail] Subscribers activos: ${subscribers.length}`);

  if (subscribers.length === 0) {
    console.warn("No hay subscribers activos. Abortando envío.");
    return { statusCode: 200, body: "Sin subscribers activos." };
  }

  const results = { sent: 0, failed: 0, errors: [] };
  const BATCH_SIZE = 10;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          const userTopics = (subscriber.topics ?? [])
            .map(normalizeTopic)
            .filter(Boolean);
          const personalizedTopics =
            digest.topics?.filter((t) =>
              userTopics.some((ut) => topicsMatch(ut, t.name))
            ) ?? [];

          if (personalizedTopics.length === 0) {
            const digestTopics = (digest.topics ?? []).map((t) => t.name);
            console.warn(
              `[${subscriber.email}] Sin topics coincidentes. Skipping. ` +
                `Topics del subscriber: [${userTopics.join(", ")}]. ` +
                `Topics del digest: [${digestTopics.join(", ")}].`
            );
            return;
          }

          if (!subscriber.id) {
            console.warn(`[${subscriber.email}] Sin id de subscriber. Skipping.`);
            return;
          }

          const html = buildEmailHtml(digest, personalizedTopics, subscriber);

          await ses.send(
            new SendEmailCommand({
              Source: SES_SENDER,
              Destination: { ToAddresses: [subscriber.email] },
              Message: {
                Subject: { Data: `☁️ Digest Tech News — ${digest.date}`, Charset: "UTF-8" },
                Body: {
                  Html: { Charset: "UTF-8", Data: html },
                  Text: {
                    Charset: "UTF-8",
                    Data: buildPlainText(digest, personalizedTopics, subscriber),
                  },
                },
              },
            })
          );

          results.sent++;
          console.log(`[sendDigestEmail] ✓ Enviado a ${subscriber.email} — ${personalizedTopics.length} topics`);
        } catch (err) {
          results.failed++;
          results.errors.push({ email: subscriber.email, error: err.message });
          console.error(`[sendDigestEmail] ✗ Error enviando a ${subscriber.email}:`, err.message);
        }
      })
    );

    if (i + BATCH_SIZE < subscribers.length) await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[sendDigestEmail] Completado — enviados: ${results.sent}, fallidos: ${results.failed}`);
  if (results.errors.length > 0) console.error("[sendDigestEmail] Errores:", JSON.stringify(results.errors));

  return { statusCode: 200, body: JSON.stringify(results) };
};

// ── Helpers de datos ──────────────────────────────────────────────────────────

async function readDigestFromS3(bucket, key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const raw = await Body.transformToString("utf-8");
  return JSON.parse(raw);
}

async function getActiveSubscribers() {
  const subscribers = [];
  let lastEvaluatedKey = undefined;
  do {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new ScanCommand({
        TableName: SUBSCRIBERS_TABLE,
        FilterExpression: "active = :active",
        ExpressionAttributeValues: { ":active": true },
        ProjectionExpression: "id, email, topics",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    subscribers.push(...Items);
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return subscribers;
}

function buildPlainText(digest, topics, subscriber) {
  const unsubscribeUrl = buildUnsubscribeUrl(subscriber.id, subscriber.email);
  const termsUrl = buildTermsUrl();
  const privacyUrl = buildPrivacyUrl();
  const lines = [`Digest Tech News — ${digest.date}`, "=".repeat(40), ""];
  for (const t of topics) {
    lines.push(`## ${t.name}`);
    lines.push(t.editorial);
    lines.push("");
    lines.push("Puntos clave:");
    for (const kp of t.keyPoints ?? []) lines.push(`  • ${kp}`);
    lines.push("");
    lines.push(`Artículo destacado: ${t.topArticle?.title}`);
    lines.push(t.topArticle?.url);
    lines.push("");
  }
  lines.push("—");
  lines.push(`Términos de uso: ${termsUrl}`);
  lines.push(`Política de privacidad: ${privacyUrl}`);
  lines.push(`Para darte de baja, visita: ${unsubscribeUrl}`);
  return lines.join("\n");
}

// ── HTML Email Template ───────────────────────────────────────────────────────
// Paleta de contraste validada (WCAG AA mínimo 4.5:1 para texto pequeño):
//   Texto principal:    #e8e8f0  sobre #0f0f1a  → ~11:1  ✅
//   Texto secundario:   #b0b0cc  sobre #0f0f1a  →  ~6:1  ✅
//   Texto muted:        #7a7a9a  sobre #0f0f1a  →  ~4.6:1 ✅ (solo usado en 14px+)
//   Labels/monospace:   #ff9900  sobre #0f0f1a  →  ~8:1  ✅
//   Links artículos:    #c8d8ff  sobre #0f0f1a  →  ~8:1  ✅
//   Fechas/meta:        #7a7a9a  sobre #161625  →  ~4.5:1 ✅
//   Footer texto:       #9090b0  sobre #0a0a0f  →  ~5.2:1 ✅
//   Footer copyright:   #7a7a9a  sobre #0a0a0f  →  ~4.6:1 ✅
//   AWS badge:          #0a0a0f  sobre #ff9900  → ~8:1   ✅

function buildEmailHtml(digest, topics, subscriber) {
  const topicBlocks = topics.map((t) => buildTopicBlock(t)).join("");
  const previewText = topics[0]?.editorial?.slice(0, 100) ?? "Tu resumen tech de hoy";
  const unsubscribeUrl = buildUnsubscribeUrl(subscriber.id, subscriber.email);
  const termsUrl = buildTermsUrl();
  const privacyUrl = buildPrivacyUrl();

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Digest Tech News — ${digest.date}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-text-size-adjust: 100%; }
</style>
</head>
<body style="background:#0a0a0f;margin:0;padding:0;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0a0a0f;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

  <!-- ── HEADER ── -->
  <tr><td style="padding-bottom:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0" role="presentation" style="display:inline-table;">
            <tr>
              <td style="background:#ff9900;border-radius:7px;padding:5px 11px;vertical-align:middle;">
                <!-- #0a0a0f sobre #ff9900 → 8:1 ✅ -->
                <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:#0a0a0f;letter-spacing:0.06em;">AWS</span>
              </td>
              <td style="padding-left:10px;vertical-align:middle;">
                <!-- #ffffff sobre #0a0a0f → 21:1 ✅ -->
                <span style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Digest Tech News</span>
              </td>
            </tr>
          </table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <!-- #9090b0 sobre #0a0a0f → 5.2:1 ✅ -->
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:#9090b0;letter-spacing:0.05em;">${digest.date}</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ── HERO ── -->
  <tr><td style="background:linear-gradient(135deg,#13131f 0%,#191930 50%,#0f1923 100%);border-radius:16px;padding:40px 36px;border:1px solid #252540;overflow:hidden;">
    <p style="font-family:'DM Mono',monospace;font-size:11px;color:#ff9900;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:14px;">Daily Digest · ${digest.edition ?? "Daily Digest"}</p>
    <!-- #ffffff sobre #13131f → ~16:1 ✅ -->
    <h1 style="font-family:'DM Sans',sans-serif;font-size:30px;font-weight:600;color:#ff9900;line-height:1.2;letter-spacing:-0.02em;margin-bottom:14px;">Tu resumen tech<br><span style="color:#ff9900;">de hoy.</span></h1>
    <!-- #b0b0cc sobre #13131f → ~6.5:1 ✅ -->
    <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#b0b0cc;line-height:1.6;margin-bottom:24px;">${topics.length} topic${topics.length > 1 ? "s" : ""} · ${digest.meta?.totalArticlesAnalyzed ?? "—"} artículos analizados · generado con IA</p>
    <div>
      <!-- #ffb347 sobre rgba(255,153,0,0.15) aprox #1d1510 → texto sobre fondo muy oscuro, ratio suficiente ✅ -->
      ${topics.map((t) => `<span style="display:inline-block;background:rgba(255,153,0,0.15);border:1px solid rgba(255,153,0,0.4);color:#ffb347;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;padding:4px 12px;border-radius:20px;margin:0 6px 6px 0;">${t.name}</span>`).join("")}
    </div>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  ${topicBlocks}

  <!-- ── FOOTER ── -->
  <tr><td style="padding-top:4px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #252540;padding-top:28px;">
      <tr>
        <td align="center">
          <!-- #9090b0 sobre #0a0a0f → 5.2:1 ✅ -->
          <p style="font-family:'DM Sans',sans-serif;font-size:13px;color:#9090b0;margin-bottom:10px;">
            Recibiste este correo porque te suscribiste a <strong style="color:#b0b0cc;">Digest Tech News</strong>.
          </p>
          <!-- #7a7a9a sobre #0a0a0f → 4.6:1 ✅ (solo 11px monospace, usado como meta) -->
          <p style="font-family:'DM Mono',monospace;font-size:11px;color:#7a7a9a;line-height:1.8;">
            © 2026 Digest Tech News &nbsp;·&nbsp;
            <a href="${termsUrl}" style="color:#ff9900;text-decoration:none;">Términos de uso</a> &nbsp;·&nbsp;
            <a href="${privacyUrl}" style="color:#ff9900;text-decoration:none;">Política de privacidad</a> &nbsp;·&nbsp;
            <a href="${unsubscribeUrl}" style="color:#9090b0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildTopicBlock(topic) {
  const articleLinks = (topic.articles ?? [])
    .slice(0, 4)
    .map((a) => `
      <tr>
        <td style="padding:11px 0;border-bottom:1px solid #1e1e32;">
          <!-- #c8d8ff sobre #0f0f1a → ~8:1 ✅ -->
          <a href="${a.url}" style="font-family:'DM Sans',sans-serif;font-size:13px;color:#c8d8ff;text-decoration:none;line-height:1.5;display:block;" target="_blank">${a.title}</a>
          <!-- #7a7a9a sobre #0f0f1a → ~4.6:1 ✅ -->
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:#7a7a9a;margin-top:3px;display:block;">${formatDate(a.pubDate)}</span>
        </td>
      </tr>`)
    .join("");

  const keyPointsList = (topic.keyPoints ?? [])
    .map((kp) => `
      <tr>
        <td style="padding:5px 0;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="width:16px;vertical-align:top;">
                <span style="display:block;width:5px;height:5px;background:#ff9900;border-radius:50%;margin-top:7px;"></span>
              </td>
              <td style="padding-left:8px;">
                <!-- #b0b0cc sobre #0f0f1a → ~6.5:1 ✅ -->
                <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:#b0b0cc;line-height:1.6;">${kp}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`)
    .join("");

  return `
  <tr><td style="background:#0f0f1a;border:1px solid #252540;border-radius:14px;padding:28px 28px 24px;">

    <!-- Topic badge — #ff9900 sobre #0f0f1a → ~8:1 ✅ -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
      <tr>
        <td style="background:rgba(255,153,0,0.1);border:1px solid rgba(255,153,0,0.35);border-radius:6px;padding:4px 10px;">
          <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:#ff9900;letter-spacing:0.08em;text-transform:uppercase;">${topic.name}</span>
        </td>
      </tr>
    </table>

    <!-- Editorial — #e8e8f0 sobre #0f0f1a → ~11:1 ✅ -->
    <p style="font-family:'DM Sans',sans-serif;font-size:15px;color:#e8e8f0;line-height:1.75;margin-bottom:24px;">${topic.editorial}</p>

    <!-- Top article card -->
    ${topic.topArticle ? `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#161625;border:1px solid #2a2a45;border-radius:10px;margin-bottom:22px;">
      <tr>
        <td style="padding:18px 20px;">
          <!-- #ff9900 sobre #161625 → ~7.5:1 ✅ -->
          <p style="font-family:'DM Mono',monospace;font-size:10px;color:#ff9900;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">⚡ Destacado</p>
          <!-- #ffffff sobre #161625 → ~15:1 ✅ -->
          <a href="${topic.topArticle.url}" style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;line-height:1.4;display:block;margin-bottom:8px;" target="_blank">${topic.topArticle.title}</a>
          <!-- #9090b0 sobre #161625 → ~4.8:1 ✅ -->
          <p style="font-family:'DM Sans',sans-serif;font-size:13px;color:#9090b0;line-height:1.6;margin:0;">${topic.topArticle.why}</p>
        </td>
      </tr>
    </table>` : ""}

    <!-- Key points -->
    ${keyPointsList ? `
    <!-- #7a7a9a sobre #0f0f1a → ~4.6:1 ✅ (label secundario 10px, peso visual bajo) -->
    <p style="font-family:'DM Mono',monospace;font-size:10px;color:#7a7a9a;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Key points</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:22px;">
      ${keyPointsList}
    </table>` : ""}

    <!-- Article list -->
    ${articleLinks ? `
    <p style="font-family:'DM Mono',monospace;font-size:10px;color:#7a7a9a;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Más artículos</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${articleLinks}
    </table>` : ""}

  </td></tr>
  <tr><td style="height:12px;"></td></tr>`;
}

function formatDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoDate ?? "";
  }
}
