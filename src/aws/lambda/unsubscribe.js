import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const SUBSCRIBERS_TABLE = "subscribers";

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    const id = body?.id?.trim();
    const email = body?.email?.trim().toLowerCase();

    if (!id || !email) {
      return response(400, {
        code: "MISSING_FIELDS",
        message: "Se requieren id y email.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, {
        code: "INVALID_EMAIL",
        message: "Email inválido.",
      });
    }

    const { Item: subscriber } = await dynamo.send(
      new GetCommand({ TableName: SUBSCRIBERS_TABLE, Key: { id } })
    );

    if (!subscriber) {
      return response(404, {
        code: "SUBSCRIBER_NOT_FOUND",
        message: "Suscripción no encontrada.",
      });
    }

    if (subscriber.email !== email) {
      return response(403, {
        code: "EMAIL_MISMATCH",
        message: "El email no coincide con la suscripción.",
      });
    }

    if (subscriber.active === false) {
      return response(200, {
        code: "ALREADY_UNSUBSCRIBED",
        message: "Esta suscripción ya estaba cancelada.",
        email,
        active: false,
      });
    }

    const unsubscribedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: SUBSCRIBERS_TABLE,
        Key: { id },
        UpdateExpression:
          "SET active = :active, updatedAt = :updatedAt, unsubscribedAt = :unsubscribedAt, #reason = :reason",
        ExpressionAttributeNames: { "#reason": "deactivatedReason" },
        ExpressionAttributeValues: {
          ":active": false,
          ":updatedAt": unsubscribedAt,
          ":unsubscribedAt": unsubscribedAt,
          ":reason": "Cancelado por el usuario.",
        },
      })
    );

    return response(200, {
      code: "UNSUBSCRIBED",
      message: "Suscripción cancelada exitosamente.",
      email,
      active: false,
    });
  } catch (err) {
    console.error("Error en unsubscribe:", err);
    return response(500, {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor.",
    });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
