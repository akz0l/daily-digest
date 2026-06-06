import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const ALLOWED_TOPICS = ["Cloud", "IA", "Ciberseguridad", "Development"];
const TOPIC_ALIASES = {
  Cloud: ["Cloud", "Nube", "Cloud Computing", "Computación en la nube"],
  IA: ["IA", "AI", "Inteligencia Artificial", "Artificial Intelligence"],
  Ciberseguridad: ["Ciberseguridad", "Cybersecurity", "Seguridad", "Security"],
  Development: ["Development", "Desarrollo", "DevOps", "Software Development"],
};
const RSS_FEEDS = {
  Cloud: [
    "https://aws.amazon.com/blogs/aws/feed/",
    "https://cloud.google.com/feeds/gcp-release-notes.xml",
    "https://azure.microsoft.com/en-us/blog/feed/",
  ],
  IA: [
    "https://openai.com/blog/rss.xml",
    "https://www.anthropic.com/rss.xml",
    "https://huggingface.co/blog/feed.xml",
  ],
  Ciberseguridad: [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://krebsonsecurity.com/feed/",
  ],
  Development: [
    "https://github.blog/feed/",
    "https://stackoverflow.blog/feed/",
    "https://thenewstack.io/feed/",
    "https://dev.to/feed",
  ],
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

function normalizeDigestTopics(topicBlocks, expectedTopics) {
  const normalizedBlocks = [];
  for (const block of topicBlocks ?? []) {
    const name = normalizeTopic(block.name);
    if (name) normalizedBlocks.push({ ...block, name });
    else console.warn(`Bloque de digest con topic desconocido ignorado: ${block.name}`);
  }
  return expectedTopics
    .map((expected) => {
      const block = normalizedBlocks.find((item) => item.name === expected);
      if (!block) console.warn(`Sin bloque de digest para topic: ${expected}`);
      return block ?? null;
    })
    .filter(Boolean);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const SUBSCRIBERS_TABLE = "subscribers";
const S3_BUCKET = process.env.DIGEST_BUCKET?.trim();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── Handler principal ─────────────────────────────────────────────────────────
export const handler = async () => {
  const executionId = randomUUID();
  const generatedAt = new Date().toISOString();

  console.log(`[${executionId}] Iniciando generateDigest — ${generatedAt}`);

  try {
    // ── PASO 1: Obtener topics únicos de subscribers activos ─────────────────
    const topics = await getActiveTopics();

    if (topics.length === 0) {
      console.warn("No hay subscribers activos o topics registrados.");
      return { statusCode: 200, body: "Sin topics que procesar." };
    }

    console.log(`[${executionId}] Topics únicos encontrados: ${topics.join(", ")}`);

    // ── PASO 2: Obtener artículos RSS por topic ───────────────────────────────
    const articlesByTopic = await fetchArticlesByTopics(topics);

    // ── PASO 3: Generar digest con Claude API ─────────────────────────────────
    const digest = await generateDigestWithClaude(topics, articlesByTopic, executionId);

    // ── PASO 4: Guardar digest en S3 ─────────────────────────────────────────
    const s3Key = buildS3Key(generatedAt);
    await saveToS3(s3Key, digest);

    console.log(`[${executionId}] Digest guardado en s3://${S3_BUCKET}/${s3Key}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ executionId, s3Key, topicsProcessed: topics }),
    };
  } catch (err) {
    console.error(`[${executionId}] Error fatal en generateDigest:`, err);
    throw err;
  }
};

// ── PASO 1: Leer subscribers activos y extraer topics únicos ─────────────────
async function getActiveTopics() {
  const allTopics = new Set();
  let lastEvaluatedKey = undefined;

  // Paginar el scan por si hay muchos subscribers
  do {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new ScanCommand({
        TableName: SUBSCRIBERS_TABLE,
        FilterExpression: "active = :active",
        ExpressionAttributeValues: { ":active": true },
        ProjectionExpression: "topics",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    for (const item of Items) {
      for (const topic of item.topics ?? []) {
        const normalized = normalizeTopic(topic);
        if (normalized) allTopics.add(normalized);
        else console.warn(`Topic desconocido ignorado: ${topic}`);
      }
    }

    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return ALLOWED_TOPICS.filter((topic) => allTopics.has(topic));
}

// ── PASO 2: Fetch RSS para cada topic ────────────────────────────────────────
async function fetchArticlesByTopics(topics) {
  const result = {};

  await Promise.all(
    topics.map(async (topic) => {
      const feeds = RSS_FEEDS[topic];
      if (!feeds) {
        console.warn(`Sin feeds RSS para topic: ${topic}`);
        result[topic] = [];
        return;
      }
      result[topic] = await fetchFromFeeds(feeds, topic);
    })
  );

  return result;
}

async function fetchFromFeeds(feedUrls, topic) {
  const articles = [];

  await Promise.all(
    feedUrls.map(async (url) => {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "CloudTechNews-Digest/1.0" },
        });

        if (!res.ok) {
          console.warn(`Feed ${url} respondió ${res.status}`);
          return;
        }

        const xml = await res.text();
        const parsed = parseRssXml(xml);
        articles.push(...parsed);
      } catch (err) {
        console.warn(`Error fetching feed ${url}:`, err.message);
      }
    })
  );

  // Ordenar por fecha descendente, tomar los 5 más recientes por topic
  return articles
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 5);
}

// Parser RSS/Atom minimalista sin dependencias externas
function parseRssXml(xml) {
  const articles = [];

  // Extraer items RSS o entries Atom
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractAttr(block, "link", "href");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
    const summary = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content");

    if (title && link) {
      articles.push({
        title: cleanHtml(title),
        link: link.trim(),
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: cleanHtml(summary ?? "").slice(0, 400),
      });
    }
  }

  return articles;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function extractAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, "i"));
  return match?.[1] ?? null;
}

function cleanHtml(str) {
  return str
    .replace(/<[^>]+>/g, "")        // strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\u2019")  // comilla tipográfica — no rompe JSON
    .replace(/&#39;/g, "\u2019")
    .replace(/&apos;/g, "\u2019")
    .replace(/&nbsp;/g, " ")
    .replace(/[\r\n\t]+/g, " ")  // newlines/tabs → espacio — evita JSON multilinea roto
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control chars
    .trim();
}

// Sanitiza un string para ser seguro dentro de un JSON string
function safeForJson(str) {
  return (str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\u0022")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

// ── PASO 3: Generar digest con Claude API ─────────────────────────────────────
async function generateDigestWithClaude(topics, articlesByTopic, executionId) {
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Construir el contexto de artículos para el prompt
  const articlesContext = topics
    .map((topic) => {
      const articles = articlesByTopic[topic] ?? [];
      if (articles.length === 0) return `## ${topic}\nSin artículos disponibles hoy.`;

      const list = articles
        .map((a, i) => `${i + 1}. [${safeForJson(a.title)}](${a.link})\n   Resumen: ${safeForJson(a.summary) || "Sin resumen disponible."}`)
        .join("\n\n");

      return `## ${topic}\n${list}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Eres el editor de "Cloud Tech News Daily Digest", un newsletter técnico de alta calidad en español para profesionales de tecnología cloud.

Hoy es ${today}.

Con base en los siguientes artículos recopilados por topic, genera un digest diario en formato JSON. Para cada topic:
- Redacta un párrafo editorial de 3-4 oraciones que sintetice las noticias más relevantes con criterio periodístico (no solo liste los artículos).
- Identifica el artículo más importante del topic y explica brevemente por qué es relevante.
- Extrae 2-3 puntos clave concretos (bullet points cortos).

El tono debe ser profesional pero accesible, orientado a ingenieros y arquitectos cloud.

ARTÍCULOS DISPONIBLES:
${articlesContext}

TOPICS OBLIGATORIOS — genera exactamente un bloque por cada uno.
El campo "name" DEBE ser EXACTAMENTE uno de estos valores (sin traducir ni expandir):
${topics.map((t) => `"${t}"`).join(", ")}

REGLAS CRÍTICAS para el JSON de respuesta:
- Responde ÚNICAMENTE con JSON válido. Sin backticks, sin texto antes o después.
- PROHIBIDO traducir o expandir el campo "name". Usa "IA", NO "Inteligencia Artificial".
- NUNCA uses comillas dobles (") dentro de los valores string. Usa comillas tipográficas (“ ”) o reescribe la oración.
- NUNCA incluyas saltos de línea (\n) dentro de valores string. Usa punto y seguido en su lugar.
- Todos los strings deben ser en una sola línea.
- Si un título de artículo contiene caracteres especiales, simplifica el texto.
{
  "date": "${today}",
  "edition": "Daily Digest",
  "topics": [
    {
      "name": "nombre del topic",
      "editorial": "párrafo editorial redactado",
      "topArticle": {
        "title": "título del artículo más importante",
        "url": "url del artículo",
        "why": "por qué es relevante (1-2 oraciones)"
      },
      "keyPoints": ["punto 1", "punto 2", "punto 3"],
      "articles": [
        { "title": "título", "url": "url", "pubDate": "fecha ISO" }
      ]
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const rawText = data.content.find((b) => b.type === "text")?.text ?? "";

  // Parsear el JSON de Claude con limpieza defensiva
  let clean = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extraer solo el bloque JSON si hay texto extra antes/después
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];

  let digestContent;
  try {
    digestContent = JSON.parse(clean);
  } catch (parseErr) {
    // Intento de reparación: escapar comillas no escapadas dentro de strings
    console.warn("JSON parse falló, intentando reparación...", parseErr.message);
    console.log("RAW_CLAUDE_OUTPUT:", clean); // Para debug en CloudWatch
    // Reemplazar comillas dobles problemáticas dentro de valores (heurística)
    const repaired = clean
      .replace(/:\s*"([^"]*)"([^",}\]\n])/g, (m, p1, p2) => `: "${p1}\u0022${p2}`)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // strip control chars
    digestContent = JSON.parse(repaired);
  }

  digestContent.topics = normalizeDigestTopics(digestContent.topics, topics);

  // Enriquecer el digest con metadata de ejecución
  return {
    ...digestContent,
    meta: {
      executionId,
      generatedAt: new Date().toISOString(),
      topicsProcessed: topics,
      totalArticlesAnalyzed: Object.values(articlesByTopic).reduce((acc, arr) => acc + arr.length, 0),
      model: "claude-sonnet-4-20250514",
    },
  };
}

// ── PASO 4: Guardar en S3 ─────────────────────────────────────────────────────
function buildS3Key(isoDate) {
  const d = new Date(isoDate);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `digests/${yyyy}/${mm}/${dd}/digest.json`;
  // Ejemplo: digests/2026/06/05/digest.json
}

async function saveToS3(key, data) {
  // Log del digest antes de intentar S3 — si falla el upload, el JSON queda en CloudWatch
  console.log("DIGEST_OUTPUT:", JSON.stringify(data));
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      Metadata: {
        "generated-at": data.meta.generatedAt,
        "topics-count": String(data.meta.topicsProcessed.length),
      },
    })
  );
}
