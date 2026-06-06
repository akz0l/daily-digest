import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const OTP_TABLE = "Otp-daily-digest";
const SUBSCRIBERS_TABLE = "subscribers";

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

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    const { id, otp, email } = body ?? {};

    if (!id || !otp || !email) {
      return response(400, { code: "MISSING_FIELDS", message: "Se requieren id, otp y email." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return response(400, { code: "INVALID_OTP_FORMAT", message: "El OTP debe ser exactamente 6 dígitos numéricos." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
      return response(400, { code: "INVALID_EMAIL", message: "Email inválido." });
    }

    const { Item: record } = await dynamo.send(
      new GetCommand({ TableName: OTP_TABLE, Key: { id } })
    );

    if (!record) {
      return response(404, { code: "OTP_NOT_FOUND", message: "El código OTP no existe. Solicita uno nuevo." });
    }

    if (record.email !== email.trim().toLowerCase()) {
      return response(403, { code: "EMAIL_MISMATCH", message: "El email no coincide con el código OTP." });
    }

    if (record.expired) {
      return response(410, { code: "OTP_EXPIRED", message: "Este código OTP ya expiró o fue bloqueado. Solicita uno nuevo." });
    }

    const now = new Date();
    if (now > new Date(record.expiresAt)) {
      await expireRecord(id, "Expirado por tiempo.");
      return response(410, { code: "OTP_EXPIRED", message: "El código OTP expiró. Solicita uno nuevo." });
    }

    if (record.retries >= record.maxRetries) {
      await expireRecord(id, "Bloqueado por exceso de intentos.");
      return response(429, { code: "OTP_BLOCKED", message: `Superaste el límite de ${record.maxRetries} intentos. Solicita un nuevo código.` });
    }

    if (record.otp !== otp) {
      const newRetries = record.retries + 1;
      const remainingAttempts = record.maxRetries - newRetries;
      const willBlock = remainingAttempts <= 0;

      await dynamo.send(
        new UpdateCommand({
          TableName: OTP_TABLE,
          Key: { id },
          UpdateExpression: "SET retries = :retries, expired = :expired, #reason = :reason",
          ExpressionAttributeNames: { "#reason": "expiredReason" },
          ExpressionAttributeValues: {
            ":retries": newRetries,
            ":expired": willBlock,
            ":reason": willBlock ? "Bloqueado por exceso de intentos." : null,
          },
        })
      );

      if (willBlock) {
        return response(429, {
          code: "OTP_BLOCKED",
          message: `Código incorrecto. Superaste el límite de ${record.maxRetries} intentos. Solicita un nuevo código.`,
          attemptsRemaining: 0,
        });
      }

      return response(401, {
        code: "OTP_INVALID",
        message: "Código incorrecto.",
        attemptsRemaining: remainingAttempts,
      });
    }

    const verifiedAt = now.toISOString();
    const subscriberTopics = sanitizeTopics(record.topics ?? []) ?? [];
    const subscriberId = await upsertSubscriber(record.email, subscriberTopics, verifiedAt);

    await dynamo.send(
      new UpdateCommand({
        TableName: OTP_TABLE,
        Key: { id },
        UpdateExpression: "SET expired = :expired, verifiedAt = :verifiedAt, #reason = :reason",
        ExpressionAttributeNames: { "#reason": "expiredReason" },
        ExpressionAttributeValues: {
          ":expired": true,
          ":verifiedAt": verifiedAt,
          ":reason": "Usado exitosamente.",
        },
      })
    );

    return response(200, {
      code: "OTP_VALID",
      message: "Correo verificado exitosamente.",
      id: subscriberId,
      email: record.email,
      topics: subscriberTopics,
      verifiedAt,
    });
  } catch (err) {
    console.error("Error en verifyOtp:", err);
    return response(500, { code: "INTERNAL_ERROR", message: "Error interno del servidor." });
  }
};

async function findSubscribersByEmail(email) {
  const matches = [];
  let lastEvaluatedKey = undefined;

  do {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new ScanCommand({
        TableName: SUBSCRIBERS_TABLE,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    matches.push(...Items);
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return matches.sort(
    (a, b) => new Date(a.subscribedAt ?? 0) - new Date(b.subscribedAt ?? 0)
  );
}

async function upsertSubscriber(email, topics, verifiedAt) {
  const existingMatches = await findSubscribersByEmail(email);

  if (existingMatches.length > 0) {
    const [primary, ...duplicates] = existingMatches;

    await dynamo.send(
      new UpdateCommand({
        TableName: SUBSCRIBERS_TABLE,
        Key: { id: primary.id },
        UpdateExpression: "SET topics = :topics, updatedAt = :updatedAt, active = :active",
        ExpressionAttributeValues: {
          ":topics": topics,
          ":updatedAt": verifiedAt,
          ":active": true,
        },
      })
    );

    await Promise.all(
      duplicates.map((duplicate) =>
        dynamo.send(
          new UpdateCommand({
            TableName: SUBSCRIBERS_TABLE,
            Key: { id: duplicate.id },
            UpdateExpression: "SET active = :active, updatedAt = :updatedAt, #reason = :reason",
            ExpressionAttributeNames: { "#reason": "deactivatedReason" },
            ExpressionAttributeValues: {
              ":active": false,
              ":updatedAt": verifiedAt,
              ":reason": "Registro duplicado consolidado por email.",
            },
          })
        )
      )
    );

    return primary.id;
  }

  const id = randomUUID();

  await dynamo.send(
    new PutCommand({
      TableName: SUBSCRIBERS_TABLE,
      Item: {
        id,
        email,
        topics,
        subscribedAt: verifiedAt,
        updatedAt: verifiedAt,
        active: true,
      },
    })
  );

  return id;
}

async function expireRecord(id, reason) {
  await dynamo.send(
    new UpdateCommand({
      TableName: OTP_TABLE,
      Key: { id },
      UpdateExpression: "SET expired = :expired, #reason = :reason",
      ExpressionAttributeNames: { "#reason": "expiredReason" },
      ExpressionAttributeValues: { ":expired": true, ":reason": reason },
    })
  );
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
